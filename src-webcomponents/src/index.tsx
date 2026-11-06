/**
 * The alarm panel of ioBroker.alarm as a web component: `<iob-alarm-panel>`.
 *
 * One module for every host - vis-2, devices, Aura, admin (`@iobroker/web-components`). Its manifest is a file of
 * its own (`alarm-panel.json`, written by the build from `manifest.ts`), so a host loads this module only when it
 * shows the element. The host sets `socket` and `settings`, and if it has them `theme`, `editMode` and `dialogs`.
 *
 * It is the panel of the vis-2 widget and the devices tile (`src-shared/`) without MUI: it reads the states below
 * one instance `alarm.<n>` and the configuration of that instance, and writes the command states the adapter
 * listens to - `use.list` for a mode, `use.disable_password` where a password is asked for, the zone switches,
 * `presence.on_off`, `use.panic` and `use.quit_changes`. The adapter does the rest, as for the widgets.
 *
 * What shows depends on the box (see `styles.ts`): the panel, or in a small box the state only, where a click opens
 * the panel in a dialog of the host. The open circuits and the password are dialogs of the host as well.
 *
 * React is not in the module: it comes from `lib/esm/react-19.js` beside `adapter/`, see `vite.config.ts`.
 */
import type { ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { DIALOG_CLOSE_EVENT, type WebComponentSocket } from '@iobroker/web-components';
import { defineWebComponent, getThemeCssVariables, IobWebComponent } from '@iobroker/web-components/element';

import { ID, MODE_COMMAND, PANEL_IDS, TILE_IDS, type AlarmMode } from '@alarm/states';

import { getContent, getInstance, TAG, type AlarmSettings } from './constants';
import { getTranslate, type Translate } from './i18n';
import { toConfig, toModel, UNKNOWN_CONFIG, type AlarmConfig, type AlarmModel, type Values } from './model';
import { STYLES } from './styles';
import { AlarmView, CircuitsList, getGroups, Hint, Panel, PasswordForm, type PanelProps } from './views';

/** The configuration of one instance, read once per instance and socket */
interface ConfigRead {
    socket: WebComponentSocket;
    instance: string;
    /** Null until it has arrived */
    config: AlarmConfig | null;
}

/** What the element shows now: also what its open dialogs draw */
interface View {
    instance: string;
    model: AlarmModel;
    config: AlarmConfig | null;
    t: Translate;
}

/** As wide as the MUI dialog of the devices tile (`maxWidth="xs"`) */
const DIALOG_WIDTH = 444;

class AlarmPanelElement extends IobWebComponent<AlarmSettings> {
    readonly #mount: HTMLDivElement;

    #root: Root | null = null;

    #configRead: ConfigRead | null = null;

    #view: View | null = null;

    /** The drawings of the open dialogs, run with every drawing of the element */
    readonly #dialogDrawings = new Set<() => void>();

    /** Closes the open dialogs */
    readonly #dialogClosers = new Set<() => void>();

    /** The panel is open in a dialog: all states of the panel are needed, not only those of the tile */
    #panelOpen = false;

    #circuitsOpen = false;

    /** Closes the password dialog, while it is open */
    #closePassword: (() => void) | null = null;

    constructor() {
        super();
        const shadow = this.attachShadow({ mode: 'open' });
        const style = document.createElement('style');
        style.textContent = STYLES;
        this.#mount = document.createElement('div');
        this.#mount.className = 'mount';
        shadow.append(style, this.#mount);
    }

    disconnectedCallback(): void {
        super.disconnectedCallback();
        this.#configRead = null;
        // a host that only moves the element connects it again in the same task: keep React and the dialogs then
        queueMicrotask(() => {
            if (!this.isConnected) {
                for (const close of [...this.#dialogClosers]) {
                    close();
                }
                this.#root?.unmount();
                this.#root = null;
            }
        });
    }

    protected override getStateIds(settings: AlarmSettings): string[] {
        const instance = getInstance(settings.instance);
        if (!instance) {
            return [];
        }
        // the tile shows a few states only; the panel - also the one in a dialog - all of them
        const ids = getContent(settings.content) === 'status' && !this.#panelOpen ? TILE_IDS : PANEL_IDS;
        return ids.map(id => `${instance}.${id}`);
    }

    protected override render(): void {
        this.#root ||= createRoot(this.#mount);
        this.#mount.className = this.#mountClass();
        const settings = this.settings;
        const t = getTranslate(this.systemLang);
        const instance = getInstance(settings.instance);

        if (!instance) {
            this.#view = null;
            this.#root.render(
                <Hint
                    text={t('alarm_no_instance')}
                    editMode={this.editMode}
                />,
            );
            this.#drawDialogs();
            return;
        }

        this.#readConfig(instance);
        const model = toModel(this.#values(instance));
        const view: View = { instance, model, config: this.#configRead?.config ?? null, t };
        this.#view = view;

        // the adapter answers a correct password by disarming, not by telling the panel so
        if (this.#closePassword && model.mode === 'off') {
            this.#closePassword();
        }

        this.#root.render(
            <AlarmView
                content={getContent(settings.content)}
                editMode={this.editMode}
                panel={this.#panelProps(view)}
                tile={{
                    model,
                    caption: settings.panelTitle || '',
                    t,
                    onOpen: () => void this.#openPanel(),
                }}
            />,
        );
        this.#drawDialogs();
    }

    #mountClass(): string {
        return `mount${this.theme.type === 'dark' ? ' dark' : ''}`;
    }

    /** The values of the subscribed states of the instance, by local ID */
    #values(instance: string): Values {
        const values: Values = {};
        for (const id of PANEL_IDS) {
            const state = this.states[`${instance}.${id}`];
            if (state !== undefined) {
                values[id] = state ? state.val : null;
            }
        }
        return values;
    }

    /**
     * Read which zones and other alarm groups have a sensor - once per instance: a group is added in the admin, not
     * while a view is open
     */
    #readConfig(instance: string): void {
        const socket = this.socket;
        if (!socket || (this.#configRead?.socket === socket && this.#configRead.instance === instance)) {
            return;
        }
        const read: ConfigRead = { socket, instance, config: null };
        this.#configRead = read;
        const done = (config: AlarmConfig): void => {
            if (this.#configRead === read) {
                read.config = config;
                if (this.isConnected) {
                    this.render();
                }
            }
        };
        socket
            .getObject(`system.adapter.${instance}`)
            .then(obj => done(toConfig(obj?.native)))
            .catch((error: unknown) => {
                console.warn(`<${TAG}>: cannot read the configuration of ${instance}: ${String(error)}`);
                done(UNKNOWN_CONFIG);
            });
    }

    #write(instance: string, id: string, value: ioBroker.StateValue): void {
        // `setState` of the base class writes nothing in edit mode
        this.setState(`${instance}.${id}`, value).catch((error: unknown) =>
            console.error(`<${TAG}>: cannot write ${instance}.${id}: ${String(error)}`),
        );
    }

    #panelProps(view: View): PanelProps {
        const settings = this.settings;
        const { instance, model, t } = view;
        return {
            model,
            config: view.config,
            title: settings.panelTitle || t('alarm_title'),
            showZones: settings.showZones !== false,
            showDelay: settings.showDelay !== false,
            showCircuits: settings.showCircuits !== false,
            showDetails: settings.showDetails !== false,
            t,
            onMode: (mode: AlarmMode) => {
                if (this.editMode) {
                    return;
                }
                if (mode === 'off' && settings.askPassword && model.mode !== 'off') {
                    void this.#askPassword();
                } else {
                    this.#write(instance, ID.useList, MODE_COMMAND[mode]);
                }
            },
            onWrite: (id, value) => this.#write(instance, id, value),
            onCircuits: () => void this.#openCircuits(),
        };
    }

    #drawDialogs(): void {
        for (const draw of this.#dialogDrawings) {
            draw();
        }
    }

    /**
     * Ask the base class for the states again: it subscribes what `getStateIds` names now. Setting the same settings
     * is what makes it ask
     */
    #resubscribe(): void {
        // eslint-disable-next-line no-self-assign
        this.settings = this.settings;
    }

    /**
     * Show content of the element in a dialog of the host - or of the browser, if the host has none. The content
     * is drawn again with every drawing of the element, so it shows the states as they are.
     *
     * @param title title of the dialog
     * @param content what to draw; `close` closes the dialog
     * @param opened called once, before the dialog shows, with what closes it
     */
    async #openInDialog(
        title: string | undefined,
        content: (close: () => void) => ReactNode,
        opened?: (close: () => void) => void,
    ): Promise<void> {
        const element = document.createElement('div');
        const shadow = element.attachShadow({ mode: 'open' });
        const style = document.createElement('style');
        style.textContent = STYLES;
        const mount = document.createElement('div');
        shadow.append(style, mount);
        const root = createRoot(mount);
        const close = (): void => {
            element.dispatchEvent(new CustomEvent(DIALOG_CLOSE_EVENT, { detail: null, bubbles: true, composed: true }));
        };
        const draw = (): void => {
            // the host moves the content into its dialog, out of this element: it takes the theme along
            for (const [name, value] of Object.entries(getThemeCssVariables(this.theme))) {
                element.style.setProperty(name, value);
            }
            mount.className = `${this.#mountClass()} dialog`;
            root.render(content(close));
        };
        this.#dialogDrawings.add(draw);
        this.#dialogClosers.add(close);
        opened?.(close);
        draw();
        try {
            await this.openDialog({ title, element, width: DIALOG_WIDTH });
        } finally {
            this.#dialogDrawings.delete(draw);
            this.#dialogClosers.delete(close);
            root.unmount();
        }
    }

    /** The full panel, from the tile */
    async #openPanel(): Promise<void> {
        if (this.editMode || this.#panelOpen) {
            return;
        }
        this.#panelOpen = true;
        this.#resubscribe();
        try {
            // no title: the panel has its own heading
            await this.#openInDialog(undefined, () => {
                const view = this.#view;
                return view ? (
                    <Panel {...this.#panelProps(view)} />
                ) : (
                    <Hint
                        text={getTranslate(this.systemLang)('alarm_no_instance')}
                        editMode={false}
                    />
                );
            });
        } finally {
            this.#panelOpen = false;
            this.#resubscribe();
        }
    }

    /** The circuits that are open right now, by group */
    async #openCircuits(): Promise<void> {
        const view = this.#view;
        if (this.editMode || this.#circuitsOpen || !view) {
            return;
        }
        this.#circuitsOpen = true;
        try {
            await this.#openInDialog(view.t('alarm_circuits'), () => {
                const current = this.#view;
                return current ? (
                    <CircuitsList
                        groups={getGroups(current.model, current.config, current.t)}
                        t={current.t}
                    />
                ) : null;
            });
        } finally {
            this.#circuitsOpen = false;
        }
    }

    /**
     * The password of the alarm system before disarming. The adapter checks it; the dialog stays open on a wrong
     * one and closes when the system is off
     */
    async #askPassword(): Promise<void> {
        const view = this.#view;
        if (this.editMode || this.#closePassword || !view) {
            return;
        }
        const instance = view.instance;
        try {
            await this.#openInDialog(
                view.t('alarm_password_title'),
                close => {
                    const current = this.#view;
                    return current ? (
                        <PasswordForm
                            wrongPassword={current.model.wrongPassword}
                            t={current.t}
                            onSubmit={password => this.#write(instance, ID.disableWithPassword, password)}
                            onCancel={close}
                        />
                    ) : null;
                },
                close => {
                    this.#closePassword = () => {
                        this.#closePassword = null;
                        close();
                    };
                },
            );
        } finally {
            this.#closePassword = null;
        }
    }
}

defineWebComponent(TAG, AlarmPanelElement);
