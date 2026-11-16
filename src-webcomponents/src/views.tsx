/**
 * What the element draws: the panel, the status tile, and the contents of its dialogs.
 *
 * The same parts as the MUI panel of the vis-2 widget and the devices tile (`src-shared/src/AlarmPanel.tsx`,
 * `AlarmTile.tsx`, `Details.tsx`, `CircuitsDialog.tsx`, `PasswordDialog.tsx`), in plain React and CSS: the element
 * brings no MUI. Colors, radius and font come from the theme of the host (`--iob-*`, see `styles.ts`), and a state
 * maps to one of the four severities (`@alarm/ui`), as in the widgets.
 */
import { useEffect, useRef, useState, type JSX } from 'react';

import { AlarmCommand, ID, MODES, ZONES, stateKey, type AlarmMode } from '@alarm/states';
import { stateSeverity, type Severity } from '@alarm/ui';

import type { PanelContent, WordKey } from './constants';
import type { Translate } from './i18n';
import { headerIcon, Icon, MODE_ICON, type IconName } from './icons';
import {
    getCircuitGroups,
    getLastLog,
    getOthers,
    getZones,
    type AlarmConfig,
    type AlarmModel,
    type CircuitGroup,
    type ZoneModel,
} from './model';

export interface PanelProps {
    model: AlarmModel;
    /** Null while the configuration of the instance is read: no zones and no other alarms are drawn then */
    config: AlarmConfig | null;
    /** Heading of the panel */
    title: string;
    showZones: boolean;
    showDelay: boolean;
    showCircuits: boolean;
    showDetails: boolean;
    t: Translate;
    /** A mode was clicked: write `use.list`, or ask for the password first */
    onMode: (mode: AlarmMode) => void;
    /** Write a state of the instance, by local ID */
    onWrite: (id: string, value: ioBroker.StateValue) => void;
    /** Show the circuits that are open */
    onCircuits: () => void;
}

/**
 * The circuits of every group that has a sensor, as the dialog lists them
 *
 * @param model what the states say
 * @param config what the configuration says
 * @param t the words
 */
export function getGroups(model: AlarmModel, config: AlarmConfig | null, t: Translate): CircuitGroup[] {
    const others = getOthers(model, config, number => t('alarm_other_alarm', number));
    return getCircuitGroups(model, others, group => t(`alarm_circuits_${group}`));
}

/**
 * The alarm panel: top to bottom the name, what the system is doing, the four modes, arming with a delay and the
 * zones; two buttons beside the name open the open circuits and unfold the details.
 */
export function Panel(props: PanelProps): JSX.Element {
    const { model, config, t, onWrite } = props;
    const [detailsOpen, setDetailsOpen] = useState(false);

    // a group the user never put a sensor into has states all the same: nothing to show for it
    const zones = getZones(model, config);
    const others = getOthers(model, config, number => t('alarm_other_alarm', number));
    const openCircuits = getGroups(model, config, t).reduce((count, group) => count + group.names.length, 0);

    return (
        <div className="panel">
            <div className="head">
                <div
                    className="title"
                    title={props.title}
                >
                    {props.title}
                </div>
                {props.showCircuits ? (
                    <button
                        type="button"
                        className="icon-button"
                        title={t('alarm_circuits')}
                        aria-label={t('alarm_circuits')}
                        onClick={props.onCircuits}
                    >
                        <Icon name="layers" />
                        {openCircuits ? <span className="dot" /> : null}
                    </button>
                ) : null}
                {props.showDetails ? (
                    <button
                        type="button"
                        className="icon-button"
                        title={t('alarm_details')}
                        aria-label={t('alarm_details')}
                        aria-expanded={detailsOpen}
                        onClick={() => setDetailsOpen(open => !open)}
                    >
                        <Icon
                            name="expand"
                            className={`chevron${detailsOpen ? ' open' : ''}`}
                        />
                    </button>
                ) : null}
            </div>

            <StatusAlert
                model={model}
                t={t}
            />

            {others
                .filter(other => other.triggered)
                .map(other => (
                    <div
                        key={other.key}
                        className="alert filled sev-error"
                        role="alert"
                    >
                        <Icon name="problem" />
                        <div className="message">
                            {other.sensors.length ? (
                                <>
                                    <div className="alert-title">{other.name}</div>
                                    {other.sensors.join(', ')}
                                </>
                            ) : (
                                other.name
                            )}
                        </div>
                    </div>
                ))}

            <div className="modes">
                {MODES.map(mode => (
                    <button
                        key={mode}
                        type="button"
                        className={`mode${model.mode === mode ? ' selected' : ''}`}
                        aria-pressed={model.mode === mode}
                        title={t(`alarm_mode_${mode}`)}
                        onClick={() => props.onMode(mode)}
                    >
                        <Icon name={MODE_ICON[mode]} />
                        <span>{t(`alarm_mode_${mode}`)}</span>
                    </button>
                ))}
            </div>

            {props.showDelay ? (
                <button
                    type="button"
                    className={`button full delay${model.arming ? ' contained sev-warning' : ''}`}
                    onClick={() => onWrite(ID.useList, AlarmCommand.armWithDelay)}
                >
                    <Icon name="clock" />
                    <span>{t('alarm_with_delay')}</span>
                </button>
            ) : null}

            {props.showZones && zones.length ? (
                <div className="chips zones">
                    {zones.map(zone => (
                        <ZoneChip
                            key={zone.number}
                            zone={zone}
                            t={t}
                            onClick={() => onWrite(ZONES[zone.number - 1].switchId, !zone.on)}
                        />
                    ))}
                </div>
            ) : null}

            {props.showDetails && detailsOpen ? (
                <Details
                    model={model}
                    t={t}
                    onWrite={onWrite}
                />
            ) : null}
        </div>
    );
}

/** What the system is doing, and how long it still takes. A burglary is filled in rather than outlined */
function StatusAlert({ model, t }: { model: AlarmModel; t: Translate }): JSX.Element {
    const severity = stateSeverity(model.state);
    const countdown = model.countdown ?? model.silentCountdown;

    return (
        <div className={`status sev-${severity}`}>
            <div
                className={`alert sev-${severity}${severity === 'error' ? ' filled' : ''}${countdown ? ' counting' : ''}`}
                role="status"
            >
                <Icon name={headerIcon(model.state, model.arming)} />
                <div className="message">{t(stateKey(model.state) as WordKey)}</div>
                {countdown ? <div className="action">{t('alarm_seconds', countdown)}</div> : null}
            </div>
            {countdown ? <div className={`progress sev-${severity === 'error' ? 'error' : 'warning'}`} /> : null}
        </div>
    );
}

/** A zone: outlined while quiet, filled amber as soon as something in it has moved, grey while it is off */
function ZoneChip({ zone, t, onClick }: { zone: ZoneModel; t: Translate; onClick: () => void }): JSX.Element {
    const label = `${t('alarm_zone', zone.number)} · ${t(zone.on ? 'alarm_on' : 'alarm_off')}`;
    const kind = !zone.on ? 'off' : zone.changed ? 'filled sev-warning' : 'sev-success';
    const icon: IconName = !zone.on ? 'off' : zone.changed ? 'problem' : 'check';

    return (
        <button
            type="button"
            className={`chip ${kind}`}
            title={label}
            aria-pressed={zone.on}
            onClick={onClick}
        >
            <Icon name={icon} />
            <span>{label}</span>
        </button>
    );
}

interface Flag {
    key: WordKey;
    severity: Severity;
}

const FLAG_ICON: Record<Severity, IconName> = {
    error: 'problem',
    warning: 'problem',
    info: 'check',
    success: 'check',
};

/**
 * What the chevron unfolds: the flags the adapter raises next to the plain state, the presence simulation, the two
 * commands without a mode of their own, and the last line of the log of today. A flag is only drawn while it is
 * raised, so a quiet system shows one chip - whether it is ready to be armed.
 */
function Details({
    model,
    t,
    onWrite,
}: {
    model: AlarmModel;
    t: Translate;
    onWrite: (id: string, value: ioBroker.StateValue) => void;
}): JSX.Element {
    const flags: Flag[] = [
        model.armable ? { key: 'alarm_ready', severity: 'success' } : { key: 'alarm_not_armable', severity: 'warning' },
    ];
    if (model.burglary) {
        flags.push({ key: 'alarm_burglary', severity: 'error' });
    }
    if (model.silentAlarm) {
        flags.push({ key: 'alarm_silent_alarm', severity: 'error' });
    }
    if (model.siren) {
        flags.push({ key: 'alarm_siren', severity: 'error' });
    }
    if (model.activationFailed) {
        flags.push({ key: 'alarm_failed', severity: 'warning' });
    }
    if (model.armedWithWarnings) {
        flags.push({ key: 'alarm_with_warnings', severity: 'warning' });
    }
    if (model.notificationChanges) {
        flags.push({ key: 'alarm_notification_changes', severity: 'warning' });
    }
    const lastLog = getLastLog(model.log);

    return (
        <div className="details">
            <div className="divider" />
            <div className="chips">
                {flags.map(flag => (
                    <span
                        key={flag.key}
                        className={`chip small flag sev-${flag.severity}`}
                    >
                        <Icon name={FLAG_ICON[flag.severity]} />
                        <span>{t(flag.key)}</span>
                    </span>
                ))}
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={model.presence}
                className={`switch${model.presence ? ' on' : ''}`}
                onClick={() => onWrite(ID.presence, !model.presence)}
            >
                <span className="track">
                    <span className="thumb" />
                </span>
                <span className="label">{t('alarm_presence')}</span>
            </button>
            <div className="actions wrap">
                <button
                    type="button"
                    className="button error grow"
                    onClick={() => onWrite(ID.panic, true)}
                >
                    <Icon name="panic" />
                    <span>{t('alarm_panic')}</span>
                </button>
                <button
                    type="button"
                    className="button primary grow"
                    onClick={() => onWrite(ID.quitChanges, true)}
                >
                    <Icon name="doneAll" />
                    <span>{t('alarm_acknowledge')}</span>
                </button>
            </div>
            {lastLog ? <div className="log">{lastLog}</div> : null}
        </div>
    );
}

export interface TileProps {
    model: AlarmModel;
    /** Drawn above the state */
    caption: string;
    t: Translate;
    /** Open the full panel */
    onOpen: () => void;
}

/**
 * The alarm system in a small box: shield, state and the countdown while one runs. Nothing here switches anything -
 * a mis-tap would arm or disarm a house; a click opens the full panel.
 */
export function Tile({ model, caption, t, onOpen }: TileProps): JSX.Element {
    const severity = stateSeverity(model.state);
    const countdown = model.countdown ?? model.silentCountdown;
    // a long state does not fit a small tile and is cut off: the whole of it is in the tooltip
    const state = t(stateKey(model.state) as WordKey);

    return (
        <button
            type="button"
            className={`tile sev-${severity}`}
            title={caption ? `${caption}: ${state}` : state}
            onClick={onOpen}
        >
            <span className="avatar">
                <Icon name={headerIcon(model.state, model.arming)} />
            </span>
            <span className="texts">
                {caption ? <span className="caption">{caption}</span> : null}
                <span className="state">{state}</span>
                {countdown ? <span className="countdown">{t('alarm_seconds', countdown)}</span> : null}
            </span>
        </button>
    );
}

/** The element in its box: the panel, the tile, or both - the CSS shows the one that fits (`content-auto`) */
export function AlarmView({
    content,
    editMode,
    panel,
    tile,
}: {
    content: PanelContent;
    editMode: boolean;
    panel: PanelProps;
    tile: TileProps;
}): JSX.Element {
    return (
        <div className={`alarm content-${content}${editMode ? ' edit' : ''}`}>
            {content !== 'status' ? <Panel {...panel} /> : null}
            {content !== 'panel' ? <Tile {...tile} /> : null}
        </div>
    );
}

/** A hint instead of the panel: no instance chosen */
export function Hint({ text, editMode }: { text: string; editMode: boolean }): JSX.Element {
    return (
        <div className={`hint${editMode ? ' edit' : ''}`}>
            <Icon name="shield" />
            <span>{text}</span>
        </div>
    );
}

/** The content of the circuits dialog: what is open right now, by group */
export function CircuitsList({ groups, t }: { groups: CircuitGroup[]; t: Translate }): JSX.Element {
    return (
        <div className="circuits">
            {groups.map(group => (
                <section key={group.key}>
                    <h4>{group.label}</h4>
                    <ul>
                        {group.names.length ? (
                            group.names.map(name => (
                                <li key={name}>
                                    <Icon
                                        name="problem"
                                        className="open"
                                    />
                                    <span>{name}</span>
                                </li>
                            ))
                        ) : (
                            <li className="empty">
                                <Icon
                                    name="check"
                                    className="closed"
                                />
                                <span>{t('alarm_circuits_empty')}</span>
                            </li>
                        )}
                    </ul>
                </section>
            ))}
        </div>
    );
}

export interface PasswordFormProps {
    /** Value of `info.wrong_password`; shown as an error once something has been submitted */
    wrongPassword: boolean;
    t: Translate;
    onSubmit: (password: string) => void;
    onCancel: () => void;
}

/**
 * The content of the password dialog. The password is not checked here: it is written to `use.disable_password`,
 * and the adapter compares it with its configuration and disarms or raises `info.wrong_password`. The element closes
 * the dialog when the system is off.
 */
export function PasswordForm({ wrongPassword, t, onSubmit, onCancel }: PasswordFormProps): JSX.Element {
    const [password, setPassword] = useState('');
    // `info.wrong_password` stays true until a correct password clears it: an attempt made days ago must not
    // colour a dialog that has just been opened
    const [submitted, setSubmitted] = useState(false);
    const input = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // the host puts the content into its dialog after it was drawn: focus once it is there
        const timer = setTimeout(() => input.current?.focus(), 50);
        return () => clearTimeout(timer);
    }, []);

    const error = submitted && wrongPassword;
    const submit = (): void => {
        if (password) {
            setSubmitted(true);
            setPassword('');
            onSubmit(password);
        }
    };

    return (
        <form
            className="password"
            onSubmit={event => {
                event.preventDefault();
                submit();
            }}
        >
            <label className={`field${error ? ' error' : ''}`}>
                <span>{t('alarm_password')}</span>
                <input
                    ref={input}
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={event => setPassword(event.currentTarget.value)}
                />
                <span className="help">{error ? t('alarm_password_wrong') : ' '}</span>
            </label>
            <div className="actions">
                <button
                    type="button"
                    className="button"
                    onClick={onCancel}
                >
                    {t('alarm_cancel')}
                </button>
                <button
                    type="submit"
                    className="button contained primary"
                    disabled={!password}
                >
                    {t('alarm_ok')}
                </button>
            </div>
        </form>
    );
}
