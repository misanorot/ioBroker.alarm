/**
 * The alarm adapter's state tree, as the panel needs it.
 *
 * Every id here is relative to one instance (`alarm.0`), because that is what the widget is
 * configured with: the adapter always creates the same objects, so there is nothing to pick per
 * data point. The numbers mirror `STATE_LIST`, `USE_LIST` and the `common.states` of
 * `io-package.json` - they are the adapter's contract with anything that drives it from outside.
 */

/** Value of `status.state_list`: what the alarm system is doing right now. */
export enum AlarmState {
    deactivated = 0,
    sharp = 1,
    sharpInside = 2,
    burglary = 3,
    nightRest = 4,
    getsActivated = 5,
    activationFailed = 6,
    activationAborted = 7,
    silentAlarm = 8,
}

/** Value of `use.list`: what the alarm system has been told to do. Writing it switches the mode. */
export enum AlarmCommand {
    off = 0,
    arm = 1,
    inside = 2,
    armWithDelay = 3,
    night = 4,
}

/** The four buttons of the panel, and what `use.list` reports for each of them. */
export type AlarmMode = 'off' | 'arm' | 'inside' | 'night';

export const MODES: readonly AlarmMode[] = ['off', 'arm', 'inside', 'night'];

export const MODE_COMMAND: Record<AlarmMode, AlarmCommand> = {
    off: AlarmCommand.off,
    arm: AlarmCommand.arm,
    inside: AlarmCommand.inside,
    night: AlarmCommand.night,
};

/** States the panel subscribes to. Local ids - the instance is put in front at subscribe time. */
export const ID = {
    stateList: 'status.state_list',
    activated: 'status.activated',
    sharpInsideActivated: 'status.sharp_inside_activated',
    sleep: 'status.sleep',
    burglarAlarm: 'status.burglar_alarm',
    silentAlarm: 'status.silent_alarm',
    siren: 'status.siren',
    sirenInside: 'status.siren_inside',
    activationFailed: 'status.activation_failed',
    activatedWithWarnings: 'status.activated_with_warnings',
    armable: 'status.enableable',
    countdown: 'status.activation_countdown',
    silentCountdown: 'status.silent_countdown',

    useList: 'use.list',
    panic: 'use.panic',
    quitChanges: 'use.quit_changes',
    disableWithPassword: 'use.disable_password',
    toggleWithPassword: 'use.toggle_password',
    toggleWithDelayAndPassword: 'use.toggle_with_delay_and_password',

    presence: 'presence.on_off',

    wrongPassword: 'info.wrong_password',
    alarmCircuits: 'info.alarm_circuit_list',
    insideCircuits: 'info.sharp_inside_circuit_list',
    notificationCircuits: 'info.notification_circuit_list',
    notificationChanges: 'info.notification_circuit_changes',
    log: 'info.log_today',
} as const;

/**
 * The three zones, in the order the adapter names them.
 *
 * `configKey` names the zone's table in the instance configuration. The adapter creates the two
 * states of a zone whether or not anything was put into that table, so the table is the only place
 * that says whether a zone exists at all - see {@link useConfiguredZones}.
 */
export const ZONES = [
    { switchId: 'zone.one_on_off', changedId: 'zone.one', configKey: 'zone_one' },
    { switchId: 'zone.two_on_off', changedId: 'zone.two', configKey: 'zone_two' },
    { switchId: 'zone.three_on_off', changedId: 'zone.three', configKey: 'zone_three' },
] as const;

/**
 * The two alarm groups beside the alarm system itself - fire and water in the adapter's defaults.
 *
 * They are independent of arming: a smoke detector reports whether or not the house is armed. Like
 * the zones, their states exist whether or not anything was configured, and `configKey` names the
 * table that decides it. `nameKey` is the name the user gave the group in the same configuration.
 */
export const OTHER_ALARMS = [
    {
        changedId: 'other_alarms.one_changes',
        listId: 'other_alarms.one_list',
        configKey: 'one',
        nameKey: 'one_name',
    },
    {
        changedId: 'other_alarms.two_changes',
        listId: 'other_alarms.two_list',
        configKey: 'two',
        nameKey: 'two_name',
    },
] as const;

/** Every state the panel reads. The tile takes a shorter list, see {@link TILE_IDS}. */
export const PANEL_IDS: readonly string[] = [
    ...Object.values(ID),
    ...ZONES.map(zone => zone.switchId),
    ...ZONES.map(zone => zone.changedId),
    ...OTHER_ALARMS.map(other => other.changedId),
    ...OTHER_ALARMS.map(other => other.listId),
];

/** What a status tile shows - it draws no zones, no circuits and no log. */
export const TILE_IDS: readonly string[] = [
    ID.stateList,
    ID.countdown,
    ID.silentCountdown,
    ID.useList,
    ID.burglarAlarm,
    ID.silentAlarm,
    ID.armable,
];

/**
 * Translation key of a state of `status.state_list`.
 *
 * @param state the value the adapter reports
 */
export function stateKey(state: AlarmState | null): string {
    switch (state) {
        case AlarmState.deactivated:
            return 'alarm_state_deactivated';
        case AlarmState.sharp:
            return 'alarm_state_sharp';
        case AlarmState.sharpInside:
            return 'alarm_state_sharp_inside';
        case AlarmState.burglary:
            return 'alarm_state_burglary';
        case AlarmState.nightRest:
            return 'alarm_state_night_rest';
        case AlarmState.getsActivated:
            return 'alarm_state_gets_activated';
        case AlarmState.activationFailed:
            return 'alarm_state_activation_failed';
        case AlarmState.activationAborted:
            return 'alarm_state_activation_aborted';
        case AlarmState.silentAlarm:
            return 'alarm_state_silent_alarm';
        default:
            return 'alarm_state_unknown';
    }
}

/**
 * The mode the system is in, read from `use.list`.
 *
 * `use.list` is the right source rather than `status.state_list`: the adapter writes the reached
 * mode back to it on every transition, and it keeps that value through a burglary - where
 * `status.state_list` reports the alarm and no longer which mode was armed.
 *
 * @param useList value of `use.list`
 */
export function modeOf(useList: number | null): AlarmMode | null {
    switch (useList) {
        case AlarmCommand.off:
            return 'off';
        case AlarmCommand.arm:
            return 'arm';
        case AlarmCommand.inside:
            return 'inside';
        case AlarmCommand.night:
            return 'night';
        default:
            // `armWithDelay` is transient: it stands for a running countdown, not for a mode.
            return null;
    }
}
