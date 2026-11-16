/**
 * The manifest of `<iob-alarm-panel>`. Read by the build only (`vite.config.ts`), which writes it as
 * `alarm-panel.json` next to the module - a host reads that file for its palette and its settings without loading
 * the module.
 *
 * The texts are not written here: the name and the description are those of the devices tile
 * (`common.deviceWidgets` in `io-package.json`), the labels of the settings come from the dictionary of the widgets
 * (`src-shared/i18n`). The same name is what lets vis-2 and devices hide the web component behind their own widget.
 */
import type { WebComponentManifest, WebComponentText } from '@iobroker/web-components';

// with the extension: `vite.config.ts` imports this file, and Vite may load its config natively
import { MODULE_FILE, TAG } from './constants.ts';

/** The words of the dictionary the settings are labelled with */
export const MANIFEST_WORD_KEYS = [
    'alarm_instance',
    'alarm_widget_title',
    'alarm_widget_title_help',
    'alarm_content',
    'alarm_content_auto',
    'alarm_content_status',
    'alarm_content_panel',
    'alarm_show_zones',
    'alarm_show_zones_help',
    'alarm_show_delay',
    'alarm_show_circuits',
    'alarm_show_details',
    'alarm_ask_password',
    'alarm_ask_password_help',
] as const;

export type ManifestWordKey = (typeof MANIFEST_WORD_KEYS)[number];

/**
 * The manifest, with the texts of the adapter
 *
 * @param word a word of the dictionary in every language
 * @param widget name and description of the devices tile
 * @param widget.name the label of the devices tile
 * @param widget.description the description of the devices tile
 */
export function buildManifest(
    word: (key: ManifestWordKey) => WebComponentText,
    widget: { name: WebComponentText; description: WebComponentText },
): WebComponentManifest {
    return {
        $schema: 'https://raw.githubusercontent.com/ioBroker/web-components/main/schemas/manifest.json',
        manifestVersion: 1,
        tag: TAG,
        name: widget.name,
        description: widget.description,
        // relative to this file: the icon of the devices tile, /adapter/alarm/dm-widgets/alarm-panel.svg
        icon: '../dm-widgets/alarm-panel.svg',
        module: MODULE_FILE,
        // as the vis-2 widget: wide enough for the four modes on one line
        size: { width: 360, height: 420 },
        settings: {
            type: 'panel',
            items: {
                instance: {
                    type: 'instance',
                    adapter: 'alarm',
                    label: word('alarm_instance'),
                },
                panelTitle: {
                    type: 'text',
                    label: word('alarm_widget_title'),
                    help: word('alarm_widget_title_help'),
                },
                content: {
                    type: 'select',
                    label: word('alarm_content'),
                    default: 'auto',
                    options: [
                        { value: 'auto', label: word('alarm_content_auto') },
                        { value: 'status', label: word('alarm_content_status') },
                        { value: 'panel', label: word('alarm_content_panel') },
                    ],
                },
                showZones: {
                    type: 'checkbox',
                    label: word('alarm_show_zones'),
                    help: word('alarm_show_zones_help'),
                    default: true,
                },
                showDelay: {
                    type: 'checkbox',
                    label: word('alarm_show_delay'),
                    default: true,
                },
                showCircuits: {
                    type: 'checkbox',
                    label: word('alarm_show_circuits'),
                    default: true,
                },
                showDetails: {
                    type: 'checkbox',
                    label: word('alarm_show_details'),
                    default: true,
                },
                askPassword: {
                    type: 'checkbox',
                    label: word('alarm_ask_password'),
                    help: word('alarm_ask_password_help'),
                    default: false,
                },
            },
        },
    };
}
