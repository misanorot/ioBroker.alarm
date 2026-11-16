/**
 * Reading the alarm instance, and writing to it.
 *
 * Both hosts hand the panel the same thing - a `Connection` of gui-components (vis-2 through
 * `props.context.socket`, the devices app through `stateContext.getSocket()`) - so the panel talks
 * to ioBroker directly instead of through a host abstraction.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Connection } from '@iobroker/gui-components';

import { AlarmState, ID, OTHER_ALARMS, ZONES, modeOf } from './states';
import type { AlarmMode } from './states';

export type Values = Record<string, ioBroker.StateValue>;

/**
 * Subscribes to a fixed list of states below one instance and returns their values by local id.
 *
 * The values arrive one by one - `subscribeState` calls back with the current value right after
 * subscribing - so the panel renders with what it has and fills in as the rest comes.
 *
 * @param socket connection of the host; null while the host is still connecting
 * @param instance the alarm instance, `alarm.0`; empty while none is configured
 * @param ids local state ids, e.g. `status.state_list`
 */
export function useStates(socket: Connection | null, instance: string, ids: readonly string[]): Values {
    const [values, setValues] = useState<Values>({});
    // The list is a constant of the module, but a caller may still build it inline: keyed by its
    // contents, an equal list does not resubscribe on every render. The full ids are then derived
    // from that key rather than from `ids` itself, so the effect below has no dependency that
    // changes identity while saying the same thing.
    const key = ids.join(',');
    const fullIds = useMemo(() => (instance ? key.split(',').map(id => `${instance}.${id}`) : []), [instance, key]);

    useEffect(() => {
        if (!socket || !fullIds.length) {
            setValues({});
            return;
        }

        let alive = true;
        const prefixLength = instance.length + 1;

        const onChange = (id: string, state: ioBroker.State | null | undefined): void => {
            if (!alive) {
                return;
            }
            const local = id.substring(prefixLength);
            const value = state ? state.val : null;
            setValues(old => (old[local] === value ? old : { ...old, [local]: value }));
        };

        // A new instance must not be rendered with the values of the old one.
        setValues({});
        void socket.subscribeState(fullIds, onChange);

        return () => {
            alive = false;
            socket.unsubscribeState(fullIds, onChange);
        };
    }, [socket, instance, fullIds]);

    return values;
}

/** One zone of the alarm system, as the panel draws it. */
export interface ZoneModel {
    /** 1, 2 or 3 - the zone's number in the adapter's configuration. */
    number: number;
    /** Whether the zone takes part in the alarm; written by the panel. */
    on: boolean;
    /** Whether something in the zone has changed since it was last acknowledged. */
    changed: boolean;
}

/** One of the alarm groups beside the alarm system itself, as the panel draws it. */
export interface OtherAlarmModel {
    /** Whether something in the group is triggered right now. */
    triggered: boolean;
    /** Names of the sensors of the group that are triggered. */
    sensors: string[];
}

/** Everything the panel shows, derived from the raw state values. */
export interface AlarmModel {
    state: AlarmState | null;
    /** The armed mode, or null while the system is between modes. */
    mode: AlarmMode | null;
    /** True while the arming countdown runs. */
    arming: boolean;
    /** Seconds left of the arming countdown, or null. */
    countdown: number | null;
    /** Seconds left before a silent alarm becomes a full one, or null. */
    silentCountdown: number | null;
    burglary: boolean;
    silentAlarm: boolean;
    siren: boolean;
    activationFailed: boolean;
    armedWithWarnings: boolean;
    /** Whether the system can be armed at all - false while a circuit of the alarm group is open. */
    armable: boolean;
    presence: boolean;
    zones: ZoneModel[];
    /** Names of the circuits that are open right now, per group. */
    circuits: { alarm: string[]; inside: string[]; notification: string[] };
    notificationChanges: boolean;
    others: OtherAlarmModel[];
    log: string;
}

function asNumber(value: ioBroker.StateValue): number | null {
    return typeof value === 'number' ? value : null;
}

function asBoolean(value: ioBroker.StateValue): boolean {
    return value === true;
}

function asString(value: ioBroker.StateValue): string {
    return typeof value === 'string' ? value : '';
}

/**
 * The adapter joins the open circuits of a group with commas; an empty state means none is open.
 *
 * @param value value of one of the `info.*_circuit_list` states
 */
function asList(value: ioBroker.StateValue): string[] {
    return typeof value === 'string' && value
        ? value
              .split(',')
              .map(name => name.trim())
              .filter(name => !!name)
        : [];
}

/**
 * Turns the raw state values into what the panel draws.
 *
 * @param values what {@link useStates} returned
 */
export function useAlarmModel(values: Values): AlarmModel {
    return useMemo(() => {
        const countdown = asNumber(values[ID.countdown]);
        const state = asNumber(values[ID.stateList]);

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
            // Unknown until the state has arrived: a panel that greys its buttons out on startup
            // would look broken.
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
        };
    }, [values]);
}

/**
 * A zone takes part only through the rows the adapter subscribes to.
 *
 * The same rule as `getZoneStates` and `getOtherStates` in the adapter: a row counts when it is
 * enabled and names an object. A group whose table holds nothing but disabled or empty rows never
 * reports anything, so its states sit there forever at their default.
 *
 * @param table one of `native.zone_one` … `zone_three`, `native.one`, `native.two`
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

/** What the instance configuration says about the groups the panel can draw. */
export interface AlarmConfig {
    /** Whether each of the three zones has a sensor. */
    zones: boolean[];
    /** Per alarm group beside the alarm system: its name, and whether it has a sensor. */
    others: { name: string; configured: boolean }[];
}

/**
 * Which zones and which other alarm groups actually exist.
 *
 * The adapter creates the states of a zone and of both other alarms whether or not anything was
 * put into their tables, so the states say nothing about whether the group exists - only the
 * instance configuration does, and it is also the only place that holds the names the user gave
 * the two other alarms.
 *
 * Read once per instance: a group is added in the admin, not while a view is open, and a panel
 * that re-read it on every state change would ask for the object a hundred times a night.
 *
 * Returns null while the configuration has not arrived, so that the panel draws no groups rather
 * than drawing all of them and taking most away again a moment later.
 *
 * @param socket connection of the host; null while the host is still connecting
 * @param instance the alarm instance, `alarm.0`; empty while none is configured
 */
export function useAlarmConfig(socket: Connection | null, instance: string): AlarmConfig | null {
    const [config, setConfig] = useState<AlarmConfig | null>(null);

    useEffect(() => {
        if (!socket || !instance) {
            setConfig(null);
            return;
        }

        let alive = true;
        setConfig(null);

        socket
            .getObject(`system.adapter.${instance}`)
            .then(obj => {
                if (alive) {
                    const native = (obj?.native ?? {}) as Record<string, unknown>;
                    setConfig({
                        zones: ZONES.map(zone => hasSensor(native[zone.configKey])),
                        others: OTHER_ALARMS.map(other => ({
                            name: asString(native[other.nameKey] as ioBroker.StateValue),
                            configured: hasSensor(native[other.configKey]),
                        })),
                    });
                }
            })
            .catch((error: unknown) => {
                // A user who may operate the panel is not necessarily allowed to read the instance
                // object. Showing a group that has no sensor is the lesser evil of the two
                // mistakes - and a fire alarm that stays hidden would be the worse one by far.
                console.warn(`Cannot read the configuration of ${instance}: ${error as string}`);
                if (alive) {
                    setConfig({
                        zones: ZONES.map(() => true),
                        others: OTHER_ALARMS.map(() => ({ name: '', configured: true })),
                    });
                }
            });

        return () => {
            alive = false;
        };
    }, [socket, instance]);

    return config;
}

/**
 * Writes one state of the alarm instance. Does nothing while the widget is being edited.
 *
 * @param socket connection of the host
 * @param instance the alarm instance, `alarm.0`
 * @param readOnly true in the vis-2 editor, where a click must not switch anything
 */
export function useWriter(
    socket: Connection | null,
    instance: string,
    readOnly?: boolean,
): (id: string, value: ioBroker.StateValue) => void {
    // Kept in a ref so the callback stays the same across renders: the buttons take it as a prop.
    const target = useRef({ socket, instance, readOnly });
    target.current = { socket, instance, readOnly };

    return useCallback((id: string, value: ioBroker.StateValue): void => {
        const { socket: connection, instance: prefix, readOnly: locked } = target.current;
        if (!connection || !prefix || locked) {
            return;
        }
        void connection.setState(`${prefix}.${id}`, value, false).catch(error => {
            console.error(`Cannot write ${prefix}.${id}: ${error as string}`);
        });
    }, []);
}
