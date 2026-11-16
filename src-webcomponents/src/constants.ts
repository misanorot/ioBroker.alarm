/** Tag of the custom element; a host checks that the module defines exactly this one */
export const TAG = 'iob-alarm-panel';

/** The built module, next to its manifest */
export const MODULE_FILE = 'alarm-panel.js';

/** The manifest the build writes next to the module; `common.webComponents` names this one */
export const MANIFEST_FILE = 'alarm-panel.json';

/** Where `tasks.ts` puts the module in the admin folder; the React import is relative to it */
export const MODULE_PATH = `webcomponents/${MODULE_FILE}`;

/** The languages of ioBroker; every text of the manifest and of the element comes in all of them */
export const LANGUAGES = ['en', 'de', 'ru', 'pt', 'nl', 'fr', 'it', 'es', 'pl', 'uk', 'zh-cn'] as const;

/**
 * The words the element shows, from the dictionary of the widgets (`src-shared/i18n`). The build picks them
 * (`vite.config.ts`), so the module carries these and not the labels of the settings.
 */
export const WORD_KEYS = [
    'alarm_title',
    'alarm_circuits',
    'alarm_details',
    'alarm_mode_off',
    'alarm_mode_arm',
    'alarm_mode_inside',
    'alarm_mode_night',
    'alarm_with_delay',
    'alarm_zone',
    'alarm_on',
    'alarm_off',
    'alarm_seconds',
    'alarm_state_deactivated',
    'alarm_state_sharp',
    'alarm_state_sharp_inside',
    'alarm_state_burglary',
    'alarm_state_night_rest',
    'alarm_state_gets_activated',
    'alarm_state_activation_failed',
    'alarm_state_activation_aborted',
    'alarm_state_silent_alarm',
    'alarm_state_unknown',
    'alarm_ready',
    'alarm_not_armable',
    'alarm_burglary',
    'alarm_silent_alarm',
    'alarm_siren',
    'alarm_failed',
    'alarm_with_warnings',
    'alarm_notification_changes',
    'alarm_presence',
    'alarm_panic',
    'alarm_acknowledge',
    'alarm_circuits_alarm',
    'alarm_circuits_inside',
    'alarm_circuits_notification',
    'alarm_circuits_empty',
    'alarm_other_alarm',
    'alarm_password_title',
    'alarm_password',
    'alarm_password_wrong',
    'alarm_cancel',
    'alarm_ok',
    'alarm_no_instance',
] as const;

export type WordKey = (typeof WORD_KEYS)[number];

/** What the element shows in its box: the panel, the state only (a click opens the panel), or what fits */
export type PanelContent = 'auto' | 'status' | 'panel';

/** The values of the settings of the manifest; a setting without a value is missing */
export type AlarmSettings = {
    /** The alarm instance, `alarm.0` */
    instance?: string;
    /** Heading of the panel; empty: the translated "Alarm system" */
    panelTitle?: string;
    content?: string;
    showZones?: boolean;
    showDelay?: boolean;
    /** The button that lists the open circuits */
    showCircuits?: boolean;
    /** The button that unfolds the indicators, the presence simulation and the panic button */
    showDetails?: boolean;
    /** Disarm only after the password of the alarm system has been entered */
    askPassword?: boolean;
};

/**
 * The alarm instance of the setting. JSON-Config gives `alarm.0`; the long (`system.adapter.alarm.0`) and the short
 * form (`0`) are taken as well.
 *
 * @param value the value of the setting `instance`
 * @returns `alarm.0`, or null if the value names no instance of ioBroker.alarm
 */
export function getInstance(value: string | undefined): string | null {
    const match = value?.trim().match(/^(?:(?:system\.adapter\.)?alarm\.)?(\d+)$/);
    return match ? `alarm.${match[1]}` : null;
}

/**
 * What the element shows, `auto` for an unknown value
 *
 * @param value the value of the setting `content`
 */
export function getContent(value: string | undefined): PanelContent {
    return value === 'status' || value === 'panel' ? value : 'auto';
}
