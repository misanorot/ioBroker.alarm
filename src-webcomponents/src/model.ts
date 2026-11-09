/**
 * What the element draws, derived from the states and the configuration of one alarm instance.
 *
 * The same rules as `useAlarmModel` and `useAlarmConfig` in `src-shared/src/useAlarm.ts`, as plain functions: those
 * are React hooks typed against the `Connection` of gui-components, while here the base class of the element
 * subscribes the states. The state tree itself (`@alarm/states`) is shared, not copied.
 */
import { AlarmState, ID, OTHER_ALARMS, ZONES, modeOf, type AlarmMode } from '@alarm/states';

/** The values of the states, by local ID (`status.state_list`); missing while a state has not arrived */
export type Values = Record<string, ioBroker.StateValue>;

/** One zone of the alarm system */
export interface ZoneModel {
    /** 1, 2 or 3 - the number of the zone in the configuration of the adapter */
    number: number;
    /** Whether the zone takes part in the alarm; written by the panel */
    on: boolean;
    /** Whether something in the zone has changed since it was last acknowledged */
    changed: boolean;
}

/** One of the alarm groups beside the alarm system itself */
export interface OtherAlarmModel {
    /** Whether something in the group is triggered right now */
    triggered: boolean;
    /** Names of the sensors of the group that are triggered */
    sensors: string[];
}

/** Everything the panel shows */
export interface AlarmModel {
    state: AlarmState | null;
    /** The armed mode, or null while the system is between modes */
    mode: AlarmMode | null;
    /** True while the arming countdown runs */
    arming: boolean;
    /** Seconds left of the arming countdown, or null */
    countdown: number | null;
    /** Seconds left before a silent alarm becomes a full one, or null */
    silentCountdown: number | null;
    burglary: boolean;
    silentAlarm: boolean;
    siren: boolean;
    activationFailed: boolean;
    armedWithWarnings: boolean;
    /** Whether the system can be armed at all - false while a circuit of the alarm group is open */
    armable: boolean;
    presence: boolean;
    zones: ZoneModel[];
    /** Names of the circuits that are open right now, per group */
    circuits: { alarm: string[]; inside: string[]; notification: string[] };
    notificationChanges: boolean;
    others: OtherAlarmModel[];
    log: string;
    /** Value of `info.wrong_password` */
    wrongPassword: boolean;
}

function asNumber(value: ioBroker.StateValue | undefined): number | null {
    return typeof value === 'number' ? value : null;
}

function asBoolean(value: ioBroker.StateValue | undefined): boolean {
    return value === true;
}

function asString(value: unknown): string {
    return typeof value === 'string' ? value : '';
}

/**
 * The adapter joins the open circuits of a group with commas; an empty state means none is open
 *
 * @param value value of one of the `info.*_circuit_list` states
 */
function asList(value: ioBroker.StateValue | undefined): string[] {
    return typeof value === 'string' && value
        ? value
              .split(',')
              .map(name => name.trim())
              .filter(name => !!name)
        : [];
}

/**
 * The raw values of the states as the panel draws them
 *
 * @param values the values by local ID
 */
export function toModel(values: Values): AlarmModel {
    const countdown = asNumber(values[ID.countdown]);
    const state: AlarmState | null = asNumber(values[ID.stateList]);

    return {
        state,
        mode: modeOf(asNumber(values[ID.useList])),
        arming: state === AlarmState.getsActivated || !!countdown,
        countdown: countdown || null,
        silentCountdown: asNumber(values[ID.silentCountdown]) || null,
        burglary: asBoolean(values[ID.burglarAlarm]),
        silentAlarm: asBoolean(values[ID.silentAlarm]),
        siren: asBoolean(values[ID.siren]) || asBoolean(values[ID.sirenInside]),
        activationFailed: asBoolean(values[ID.activationFailed]),
        armedWithWarnings: asBoolean(values[ID.activatedWithWarnings]),
        // unknown until the state has arrived: a panel that greys its buttons out on startup would look broken
        armable: values[ID.armable] !== false,
        presence: asBoolean(values[ID.presence]),
        zones: ZONES.map((zone, index) => ({
            number: index + 1,
            on: values[zone.switchId] !== false,
            changed: asBoolean(values[zone.changedId]),
        })),
        circuits: {
            alarm: asList(values[ID.alarmCircuits]),
            inside: asList(values[ID.insideCircuits]),
            notification: asList(values[ID.notificationCircuits]),
        },
        notificationChanges: asBoolean(values[ID.notificationChanges]),
        others: OTHER_ALARMS.map(other => ({
            triggered: asBoolean(values[other.changedId]),
            sensors: asList(values[other.listId]),
        })),
        log: asString(values[ID.log]),
        wrongPassword: asBoolean(values[ID.wrongPassword]),
    };
}

/** What the configuration of the instance says about the groups the panel can draw */
export interface AlarmConfig {
    /** Whether each of the three zones has a sensor */
    zones: boolean[];
    /** Per alarm group beside the alarm system: its name, and whether it has a sensor */
    others: { name: string; configured: boolean }[];
}

/**
 * A group takes part only through the rows the adapter subscribes to: enabled, and naming an object - the same rule
 * as `getZoneStates` and `getOtherStates` of the adapter
 *
 * @param table one of `native.zone_one` ... `zone_three`, `native.one`, `native.two`
 */
function hasSensor(table: unknown): boolean {
    return (
        Array.isArray(table) &&
        table.some(row => {
            const entry = row as { enabled?: unknown; name_id?: unknown } | null;
            return !!entry && !!entry.enabled && !!entry.name_id;
        })
    );
}

/**
 * Which zones and which other alarm groups exist. The adapter creates their states whether or not anything was put
 * into their tables, so only the configuration of the instance says it - and it holds the names the user gave the
 * two other alarms.
 *
 * @param native `native` of `system.adapter.alarm.<n>`
 */
export function toConfig(native: Record<string, unknown> | null | undefined): AlarmConfig {
    const config = native || {};
    return {
        zones: ZONES.map(zone => hasSensor(config[zone.configKey])),
        others: OTHER_ALARMS.map(other => ({
            name: asString(config[other.nameKey]),
            configured: hasSensor(config[other.configKey]),
        })),
    };
}

/**
 * For a user who may operate the panel but not read the instance object: showing a group without a sensor is the
 * lesser evil - a fire alarm that stays hidden would be the worse one by far
 */
export const UNKNOWN_CONFIG: AlarmConfig = {
    zones: ZONES.map(() => true),
    others: OTHER_ALARMS.map(() => ({ name: '', configured: true })),
};

/** An alarm group beside the alarm system that has a sensor, with its name */
export interface OtherAlarm extends OtherAlarmModel {
    key: string;
    name: string;
}

/**
 * The zones that have a sensor; none while the configuration has not arrived, so that the panel does not draw all of
 * them and take most away again a moment later
 *
 * @param model what the states say
 * @param config what the configuration says, null while it is read
 */
export function getZones(model: AlarmModel, config: AlarmConfig | null): ZoneModel[] {
    return config ? model.zones.filter(zone => config.zones[zone.number - 1]) : [];
}

/**
 * The alarm groups beside the alarm system that have a sensor
 *
 * @param model what the states say
 * @param config what the configuration says, null while it is read
 * @param defaultName the name of a group the user gave none, by its number
 */
export function getOthers(
    model: AlarmModel,
    config: AlarmConfig | null,
    defaultName: (number: number) => string,
): OtherAlarm[] {
    return model.others.flatMap((other, index) =>
        config?.others[index]?.configured
            ? [{ ...other, key: `other${index}`, name: config.others[index].name || defaultName(index + 1) }]
            : [],
    );
}

/** One section of the circuits dialog: a group of sensors and the names of those that are triggered */
export interface CircuitGroup {
    key: string;
    /** Already translated - the two other alarms are named by the user */
    label: string;
    names: string[];
}

/**
 * What is open right now, by group
 *
 * @param model what the states say
 * @param others the alarm groups beside the alarm system, see `getOthers`
 * @param label the name of a group of the alarm system
 */
export function getCircuitGroups(
    model: AlarmModel,
    others: OtherAlarm[],
    label: (group: 'alarm' | 'inside' | 'notification') => string,
): CircuitGroup[] {
    return [
        { key: 'alarm', label: label('alarm'), names: model.circuits.alarm },
        { key: 'inside', label: label('inside'), names: model.circuits.inside },
        { key: 'notification', label: label('notification'), names: model.circuits.notification },
        ...others.map(other => ({ key: other.key, label: other.name, names: other.sensors })),
    ];
}

/**
 * The last line of the log of today
 *
 * @param log value of `info.log_today`
 */
export function getLastLog(log: string): string | undefined {
    return log
        .split('\n')
        .map(line => line.trim())
        .filter(line => !!line)
        .pop();
}
