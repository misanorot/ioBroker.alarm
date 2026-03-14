import * as utils from '@iobroker/adapter-core';
import * as schedule from 'node-schedule';
import SunCalc from 'suncalc2';
import type {
    AlarmAdapterConfig,
    CircuitRow,
    OtherAlarmRow,
    PresenceOption,
    ShortsInRow,
    ShortsRow,
    ZoneRow,
} from './types';

type PresenceTimer = {
    nameID: string;
    name: string;
    optionPresence: PresenceOption;
    presenceTimeFrom: string;
    presenceTimeTo: string;
    presenceLength: number;
    presenceLengthTimer: null | NodeJS.Timeout;
    presenceDelayTimer: null | NodeJS.Timeout;
    presenceDelay: number;
    presenceValueON: number | boolean | '1' | '0';
    presenceValueOff: number | boolean | '1' | '0';
    presenceTriggerLight: string;
    presenceLightLux: number;
    wasOn: boolean;
};

/**
 * Home alarm system adapter for ioBroker.
 *
 * Implements a full-featured alarm system with zones, presence simulation,
 * night rest mode, speech output, shortcut actions, and scheduled arming/disarming.
 */
class Alarm extends utils.Adapter {
    declare config: AlarmAdapterConfig;

    private silentI = false;
    private alarmI = false;
    private cleanIds: string[] = [];
    private alarmIds: string[] = [];
    private insideIds: string[] = [];
    private notificationIds: string[] = [];
    private leaveIds: string[] = [];
    private oneIds: string[] = [];
    private twoIds: string[] = [];
    private oneStates: Record<string, ioBroker.StateValue> = {};
    private twoStates: Record<string, ioBroker.StateValue> = {};
    private zoneOneIds: string[] = [];
    private zoneTwoIds: string[] = [];
    private zoneThreeIds: string[] = [];
    private zoneOneStates: Record<string, ioBroker.StateValue> = {};
    private zoneTwoStates: Record<string, ioBroker.StateValue> = {};
    private zoneThreeStates: Record<string, ioBroker.StateValue> = {};
    private states: Record<string, ioBroker.StateValue> = {};
    private sendInstances: string[] = [];
    private logEntries: string | string[] = '';
    private alarmRepeat!: number;
    private isAlarm = false;
    private isInside = false;
    private isNotification = false;
    private isPanic = false;
    private idsShortsInput: string[] = [];
    private namesAlarm: string | undefined;
    private namesInside: string | undefined;
    private namesNotification: string | undefined;
    private namesOne: string | undefined;
    private namesTwo: string | undefined;
    private namesZoneOne: string | undefined;
    private namesZoneTwo: string | undefined;
    private namesZoneThree: string | undefined;
    private changeIds: Record<string, ioBroker.StateValue> = {};
    private optPresence: ioBroker.StateValue = false;
    private optOne: ioBroker.StateValue = true;
    private optTwo: ioBroker.StateValue = true;
    private optThree: ioBroker.StateValue = true;
    private activated: ioBroker.StateValue = false;
    private nightRest: ioBroker.StateValue = false;
    private inside: ioBroker.StateValue = false;
    private burgle = false;
    private timer: ReturnType<typeof setInterval> | null = null;
    private speechTimeout: ReturnType<typeof setTimeout> | null = null;
    private silentTimer: ReturnType<typeof setTimeout> | null = null;
    private sirenInsideTimer: ReturnType<typeof setTimeout> | null = null;
    private timerNotificationChanges: ReturnType<typeof setTimeout> | null = null;
    private sirenTimer: ReturnType<typeof setTimeout> | null = null;
    private silentInterval: ReturnType<typeof setInterval> | null = null;
    private silentCountdown: ReturnType<typeof setInterval> | null = null;
    private alarmInterval: ReturnType<typeof setInterval> | null = null;
    private textAlarmInterval: ReturnType<typeof setInterval> | null = null;
    private textChangesInterval: ReturnType<typeof setInterval> | null = null;
    private optLog: boolean;
    private shortsIn: ShortsInRow[];
    private shorts: ShortsRow[];
    private scheduleFrom!: schedule.Job;
    private scheduleTo!: schedule.Job;
    private scheduleReset!: schedule.Job;
    private presenceDelayTimer: ReturnType<typeof setTimeout> | null = null;
    private sunrise = false;
    private sunset = false;
    private presenceInterval: ReturnType<typeof setInterval> | undefined;
    private presenceTimers: Record<string, PresenceTimer> = {};
    private presenceRun = false;
    private sunsetStr: string | undefined;
    private sunriseStr: string | undefined;

    /**
     * Creates a new Alarm adapter instance.
     * Registers event handlers for ready, stateChange, and unload lifecycle events.
     *
     * @param options - Partial adapter options forwarded to the base class
     */
    public constructor(options: Partial<utils.AdapterOptions> = {}) {
        super({
            ...options,
            name: 'alarm',
        });
        this.on('ready', () => this.main());
        this.on('stateChange', (id: string, state: ioBroker.State | null | undefined) => this.onStateChange(id, state));
        this.on('unload', cb => this.onUnload(cb));
    }

    /**
     * Cleanup handler called when the adapter is being stopped.
     * Cancels all scheduled jobs, clears all timers/intervals, and stops presence simulation.
     *
     * @param callback - Callback to signal that cleanup is complete
     */
    private onUnload(callback: () => void): void {
        try {
            this.log.info('cleaned everything up...');
            this.scheduleFrom.cancel();
            this.scheduleTo.cancel();
            this.scheduleReset.cancel();
            if (this.timer) {
                clearInterval(this.timer);
                this.timer = null;
            }
            if (this.silentTimer) {
                clearTimeout(this.silentTimer);
                this.silentTimer = null;
            }
            if (this.speechTimeout) {
                clearTimeout(this.speechTimeout);
                this.speechTimeout = null;
            }
            if (this.sirenTimer) {
                clearTimeout(this.sirenTimer);
                this.sirenTimer = null;
            }
            if (this.silentInterval) {
                clearInterval(this.silentInterval);
                this.silentInterval = null;
            }
            if (this.silentCountdown) {
                clearInterval(this.silentCountdown);
                this.silentCountdown = null;
            }
            if (this.alarmInterval) {
                clearInterval(this.alarmInterval);
                this.alarmInterval = null;
            }
            if (this.textAlarmInterval) {
                clearInterval(this.textAlarmInterval);
                this.textAlarmInterval = null;
            }
            if (this.textChangesInterval) {
                clearInterval(this.textChangesInterval);
                this.textChangesInterval = null;
            }
            this.clearAllPresenceTimer();
            callback();
        } catch (e) {
            this.log.debug(String(e));
            callback();
        }
    }

    /**
     * Handles ioBroker state change events.
     * Delegates to {@link change} for processing or logs deletion of states.
     *
     * @param id - Full state ID that changed
     * @param state - New state object, or null/undefined if the state was deleted
     */
    private async onStateChange(id: string, state: ioBroker.State | null | undefined): Promise<void> {
        if (state) {
            await this.change(id, state);
        } else {
            this.log.info(`state ${id} deleted`);
        }
    }

    /**
     * Main initialization routine called when the adapter is ready.
     *
     * Performs the following steps:
     * - Reads persisted alarm states (activated, presence, zones, night rest, inside)
     * - Splits configured circuits into alarm/inside/notification/leave ID lists
     * - Resolves messaging instances for notifications
     * - Collects shortcut input IDs
     * - Fetches current state values for all monitored circuits
     * - Fetches other alarm and zone states
     * - Sets up state subscriptions
     * - Configures cron schedules for night rest and daily reset
     * - Refreshes circuit lists and checks for duplicate state usage
     */
    private async main(): Promise<void> {
        this.optLog = this.config.opt_log;
        this.shorts = this.config.shorts;
        this.shortsIn = this.config.shorts_in;
        this.alarmRepeat = parseInt(this.config.alarm_repeat);
        const stateA = await this.getStateAsync('status.activated').catch(e => this.log.warn(e));
        if (!stateA) {
            this.activated = false;
            await this.setStateAsync('status.activated', false, true);
        } else {
            this.activated = stateA.val;
        }
        const stateP = await this.getStateAsync('presence.on_off').catch(e => this.log.warn(e));
        if (!stateP) {
            this.optPresence = false;
            await this.setStateAsync('presence.on_off', false, true);
        } else {
            this.optPresence = stateP.val;
        }
        const stateOne = await this.getStateAsync('zone.one_on_off').catch(e => this.log.warn(e));
        if (!stateOne) {
            this.optOne = false;
            await this.setStateAsync('zone.one_on_off', false, true);
        } else {
            this.optOne = stateOne.val;
        }
        const stateTwo = await this.getStateAsync('zone.two_on_off').catch(e => this.log.warn(e));
        if (!stateTwo) {
            this.optTwo = false;
            await this.setStateAsync('zone.two_on_off', false, true);
        } else {
            this.optTwo = stateTwo.val;
        }
        const stateThree = await this.getStateAsync('zone.three_on_off').catch(e => this.log.warn(e));
        if (!stateThree) {
            this.optThree = false;
            await this.setStateAsync('zone.three_on_off', false, true);
        } else {
            this.optThree = stateThree.val;
        }
        const stateS = await this.getStateAsync('status.sleep').catch(e => this.log.warn(e));
        if (!stateS) {
            this.nightRest = false;
            await this.setStateAsync('status.sleep', false, true);
        } else {
            this.nightRest = stateS.val;
        }
        const stateI = await this.getStateAsync('status.sharp_inside_activated').catch(e => this.log.warn(e));
        if (!stateI) {
            this.inside = false;
            await this.setStateAsync('status.sharp_inside_activated', false, true);
        } else {
            this.inside = stateI.val;
        }
        if (this.config.circuits) {
            this.splitStates(this.config.circuits);
        } else {
            this.log.info('no states configured!');
        }
        this.sendInstances = this.splitArr(this.config.sendTo);
        this.log.debug(`Messages to: ${JSON.stringify(this.sendInstances)}`);
        this.idsShortsInput = this.getShortIds(this.shortsIn);
        this.getIds();
        await this.fetchStates();
        await this.getOtherStates();
        await this.getZoneStates();
        this.setSubs();
        this.setSchedules();
        await this.refreshLists();
        this.checkDoubles();
    }

    private async enableSystem(_id?: string, _state?: ioBroker.State): Promise<void> {
        if (this.activated || this.burgle) {
            return;
        }
        let say = this.config.text_failed;
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
            await this.setStateAsync('status.activation_countdown', null, true);
            await this.setStateAsync('status.gets_activated', false, true);
        }
        if (!this.config.opt_warning && this.isAlarm) {
            await this.setStateAsync('info.log', `${this.config.log_act_not} ${this.namesAlarm}`, true);
            if (this.optLog) {
                this.log.info(`${this.config.log_act_not} ${this.namesAlarm}`);
            }
            if (this.config.send_activation) {
                this.messages(`${this.config.log_act_not} ${this.namesAlarm}`);
            }
            await this.setStateAsync('status.activation_failed', true, true);
            await this.setStateAsync('status.state_list', 6, true);
            await this.setStateAsync('status.state', 'activation failed', true);
            await this.setStateAsync('use.list', 0, true);
            if (this.config.opt_say_names) {
                say = `${say} ${this.namesAlarm}`;
            }
            this.sayIt(say, 3);
            return;
        }
        await this.insideEnds();
        await this.sleepEnd();
        await this.setStateAsync('status.sharp_inside_activated', false, true);
        await this.setStateAsync('status.activated', true, true);
        await this.setStateAsync('status.deactivated', false, true);
        await this.setStateAsync('status.activation_failed', false, true);
        await this.setStateAsync('status.state', 'sharp', true);
        await this.setStateAsync('status.state_list', 1, true);
        await this.setStateAsync('homekit.CurrentState', 1, true);
        await this.setStateAsync('homekit.TargetState', 1, true);
        await this.setStateAsync('use.list', 1, true);
        if (this.isAlarm) {
            await this.setStateAsync('status.activated_with_warnings', true, true);
            await this.setStateAsync('status.state', 'activated with warnings', true);
            await this.setStateAsync('info.log', `${this.config.log_act_warn} ${this.namesAlarm}`, true);
            if (this.optLog) {
                this.log.info(`${this.config.log_act_warn} ${this.namesAlarm}`);
            }
            if (this.config.send_activated_with_warnings) {
                this.messages(`${this.config.log_act_warn} ${this.namesAlarm}`);
            }
        } else {
            await this.setStateAsync('info.log', `${this.config.log_act}`, true);
            if (this.optLog) {
                this.log.info(`${this.config.log_act}`);
            }
            this.sayIt(this.config.text_activated, 1);
            if (this.config.send_activation) {
                this.messages(`${this.config.log_act}`);
            }
        }
    }

    private async disableSystem(): Promise<void> {
        this.burgle = false;
        if (this.silentTimer) {
            clearTimeout(this.silentTimer);
            this.silentTimer = null;
        }
        if (this.sirenTimer) {
            clearTimeout(this.sirenTimer);
            this.sirenTimer = null;
        }
        if (this.silentInterval) {
            clearInterval(this.silentInterval);
            this.silentInterval = null;
        }
        if (this.silentCountdown) {
            clearInterval(this.silentCountdown);
            this.silentCountdown = null;
        }
        if (this.alarmInterval) {
            clearInterval(this.alarmInterval);
            this.alarmInterval = null;
        }
        if (this.textAlarmInterval) {
            clearInterval(this.textAlarmInterval);
            this.textAlarmInterval = null;
        }
        if (this.textChangesInterval) {
            clearInterval(this.textChangesInterval);
            this.textChangesInterval = null;
        }
        this.clearAllPresenceTimer();
        this.silentTimer = null;
        this.sirenTimer = null;
        this.silentInterval = null;
        this.silentCountdown = null;
        this.alarmInterval = null;
        this.textAlarmInterval = null;
        this.textChangesInterval = null;
        if (this.activated || this.isPanic) {
            this.isPanic = false;
            await this.setStateAsync('info.log', `${this.config.log_deact}`, true);
            this.sayIt(this.config.text_deactivated, 2);
            if (this.optLog) {
                this.log.info(`${this.config.log_deact}`);
            }
            await this.setStateAsync('status.activated_with_warnings', false, true);
            await this.setStateAsync('status.activation_failed', false, true);
            await this.setStateAsync('status.activated', false, true);
            if (this.config.send_activation) {
                this.messages(`${this.config.log_deact}`);
            }
            await this.disableStates();
        } else if (this.inside) {
            await this.insideEnds(true);
        } else if (this.nightRest) {
            await this.sleepEnd(true);
        } else {
            return;
        }
    }

    private async burglary(id: string, _state: ioBroker.State, silent: boolean, indoor?: boolean): Promise<void> {
        let count = 0;
        const name = this.getName(id);
        let say = this.config.text_alarm;
        if (this.config.opt_say_names) {
            say = `${say} ${name}`;
        }
        if (this.burgle) {
            await this.setStateAsync('info.log', `${this.config.log_burgle} ${name}`, true);
            if (this.optLog) {
                this.log.info(`${this.config.log_burgle} ${name}`);
            }
            return;
        }
        if (this.silentTimer && silent) {
            return;
        }
        await this.setStateAsync('info.log', `${this.config.log_burgle} ${name}`, true);
        if (this.optLog) {
            this.log.info(`${this.config.log_burgle} ${name}`);
        }
        if (silent) {
            await this.setStateAsync('status.silent_alarm', true, true);
            await this.setStateAsync('status.state', 'silent alarm', true);
            await this.setStateAsync('status.state_list', 8, true);
            if (this.config.send_alarm_silent_inside && indoor) {
                this.messages(`${this.config.log_burgle} ${name}`);
            }
            if (this.config.send_alarm_silent && !indoor) {
                this.messages(`${this.config.log_burgle} ${name}`);
            }
            if (this.config.silent_flash > 0) {
                this.silentInterval = setInterval(async () => {
                    if (this.silentI) {
                        await this.setStateAsync('status.silent_flash', true, true);
                        this.silentI = false;
                    } else {
                        await this.setStateAsync('status.silent_flash', false, true);
                        this.silentI = true;
                    }
                }, this.config.silent_flash * 1000);
            }
            let silentCountdownTime = (this.timeMode(this.config.time_silent_select) * this.config.time_silent) / 1000;
            this.silentCountdown = setInterval(async () => {
                if (silentCountdownTime > 0) {
                    silentCountdownTime = silentCountdownTime - 1;
                    await this.setStateAsync('status.silent_countdown', silentCountdownTime, true);
                } else {
                    await this.setStateAsync('status.silent_countdown', null, true);
                    if (this.silentCountdown) {
                        clearInterval(this.silentCountdown);
                        this.silentCountdown = null;
                    }
                }
            }, 1000);
            this.silentTimer = setTimeout(
                async () => {
                    this.burgle = true;
                    if (this.config.send_alarm) {
                        this.messages(`${this.config.log_burgle} ${name}`);
                    }
                    if (this.silentTimer) {
                        clearTimeout(this.silentTimer);
                        this.silentTimer = null;
                    }
                    if (this.silentInterval) {
                        clearInterval(this.silentInterval);
                        this.silentInterval = null;
                    }
                    this.clearAllPresenceTimer();
                    this.sayIt(say, 6);
                    this.textAlarmInterval = setInterval(() => {
                        if (count < this.alarmRepeat) {
                            this.sayIt(say, 6);
                            count++;
                        } else {
                            if (this.textAlarmInterval) {
                                clearInterval(this.textAlarmInterval);
                                this.textAlarmInterval = null;
                            }
                        }
                    }, this.config.text_alarm_pause * 1000);
                    await this.setStateAsync('status.burglar_alarm', true, true);
                    await this.setStateAsync('status.silent_alarm', false, true);
                    await this.setStateAsync('status.silent_flash', false, true);
                    await this.setStateAsync('status.siren_inside', true, true);
                    this.sirenInsideTimer = setTimeout(
                        async () => {
                            this.sirenInsideTimer = null;
                            await this.setStateAsync('status.siren_inside', false, true);
                        },
                        this.timeMode(this.config.time_warning_select) * this.config.time_warning,
                    );
                    if (this.config.opt_siren && indoor) {
                        await this.alarmSiren();
                        this.alarmFlash();
                    }
                    if (!indoor) {
                        await this.setStateAsync('status.siren', true, true);
                        await this.alarmSiren();
                        this.alarmFlash();
                    }
                    await this.setStateAsync('status.state', 'burgle', true);
                    await this.setStateAsync('status.state_list', 3, true);
                    await this.setStateAsync('homekit.CurrentState', 4, true);
                },
                this.timeMode(this.config.time_silent_select) * this.config.time_silent,
            );
        } else if (!silent) {
            this.burgle = true;
            if (this.silentTimer) {
                clearTimeout(this.silentTimer);
                this.silentTimer = null;
            }
            if (this.silentInterval) {
                clearInterval(this.silentInterval);
                this.silentInterval = null;
            }
            if (this.silentCountdown) {
                clearInterval(this.silentCountdown);
                this.silentCountdown = null;
            }
            this.clearAllPresenceTimer();
            if (this.config.send_alarm_inside && indoor) {
                this.messages(`${this.config.log_burgle} ${name}`);
            }
            if (this.config.send_alarm && !indoor) {
                this.messages(`${this.config.log_burgle} ${name}`);
            }
            this.sayIt(say, 6);
            this.textAlarmInterval = setInterval(() => {
                if (count < this.alarmRepeat) {
                    this.sayIt(say, 6);
                    count++;
                } else {
                    if (this.textAlarmInterval) {
                        clearInterval(this.textAlarmInterval);
                        this.textAlarmInterval = null;
                    }
                }
            }, this.config.text_alarm_pause * 1000);
            await this.setStateAsync('status.burglar_alarm', true, true);
            await this.setStateAsync('status.silent_alarm', false, true);
            await this.setStateAsync('status.silent_flash', false, true);
            await this.setStateAsync('status.siren_inside', true, true);
            this.sirenInsideTimer = setTimeout(
                async () => {
                    this.sirenInsideTimer = null;
                    await this.setStateAsync('status.siren_inside', false, true);
                },
                this.timeMode(this.config.time_warning_select) * this.config.time_warning,
            );
            if (this.config.opt_siren && indoor) {
                await this.alarmSiren();
                this.alarmFlash();
            }
            if (!indoor) {
                await this.setStateAsync('status.siren', true, true);
                await this.alarmSiren();
                this.alarmFlash();
            }
            await this.setStateAsync('status.state', 'burgle', true);
            await this.setStateAsync('status.state_list', 3, true);
            await this.setStateAsync('homekit.CurrentState', 4, true);
            this.sirenTimer = setTimeout(
                async () => {
                    await this.setStateAsync('status.siren', false, true);
                    if (this.sirenTimer) {
                        clearTimeout(this.sirenTimer);
                        this.sirenTimer = null;
                    }
                },
                this.timeMode(this.config.time_alarm_select) * this.config.time_alarm,
            );
        }
    }

    private async panic(): Promise<void> {
        let count = 0;
        this.isPanic = true;
        await this.setStateAsync('info.log', `${this.config.log_panic}`, true);
        if (this.optLog) {
            this.log.info(`${this.config.log_panic}`);
        }
        if (this.config.send_alarm) {
            this.messages(`${this.config.log_panic}`);
        }
        this.sayIt(this.config.text_alarm, 6);
        this.textAlarmInterval = setInterval(() => {
            if (count < this.alarmRepeat) {
                this.sayIt(this.config.text_alarm, 6);
                count++;
            } else {
                if (this.textAlarmInterval) {
                    clearInterval(this.textAlarmInterval);
                    this.textAlarmInterval = null;
                }
            }
        }, this.config.text_alarm_pause * 1000);

        await this.setStateAsync('status.burglar_alarm', true, true);

        if (this.config.alarm_flash > 0) {
            this.alarmInterval = setInterval(async () => {
                if (this.alarmI) {
                    await this.setStateAsync('status.alarm_flash', true, true);
                    this.alarmI = false;
                } else {
                    await this.setStateAsync('status.alarm_flash', false, true);
                    this.alarmI = true;
                }
            }, this.config.alarm_flash * 1000);
        }
        await this.setStateAsync('status.siren', true, true);
        await this.setStateAsync('status.state', 'burgle', true);
        await this.setStateAsync('status.state_list', 3, true);
        await this.setStateAsync('homekit.CurrentState', 4, true);
        this.sirenTimer = setTimeout(
            async () => {
                this.sirenTimer = null;
                await this.setStateAsync('status.siren', false, true);
            },
            this.timeMode(this.config.time_alarm_select) * this.config.time_alarm,
        );
    }

    private async change(id: string, state: ioBroker.State): Promise<void> {
        let isNotChange = false;
        for (const i in this.states) {
            if (i === id) {
                if (this.states[id] === state.val) {
                    isNotChange = true;
                    break;
                }
                this.states[id] = state.val;
                await this.refreshLists();
                this.log.debug(`Inside states, state change: ${id} val: ${state.val}`);
            }
        }
        for (const i in this.oneStates) {
            if (i === id) {
                if (this.oneStates[id] === state.val) {
                    isNotChange = true;
                    break;
                }
                this.oneStates[id] = state.val;
                await this.refreshLists();
                this.log.debug(`Inside one, state change: ${id} val: ${state.val}`);
            }
        }
        for (const i in this.twoStates) {
            if (i === id) {
                if (this.twoStates[id] === state.val) {
                    isNotChange = true;
                    break;
                }
                this.twoStates[id] = state.val;
                await this.refreshLists();
                this.log.debug(`Inside two, state change: ${id} val: ${state.val}`);
            }
        }
        for (const i in this.zoneOneStates) {
            if (i === id) {
                if (this.zoneOneStates[id] === state.val) {
                    isNotChange = true;
                    break;
                }
                this.zoneOneStates[id] = state.val;
                await this.refreshLists();
                this.log.debug(`Inside zone_one, state change: ${id} val: ${state.val}`);
            }
        }
        for (const i in this.zoneTwoStates) {
            if (i === id) {
                if (this.zoneTwoStates[id] === state.val) {
                    isNotChange = true;
                    break;
                }
                this.zoneTwoStates[id] = state.val;
                await this.refreshLists();
                this.log.debug(`Inside zone_two, state change: ${id} val: ${state.val}`);
            }
        }
        for (const i in this.zoneThreeStates) {
            if (i === id) {
                if (this.zoneThreeStates[id] === state.val) {
                    isNotChange = true;
                    break;
                }
                this.zoneThreeStates[id] = state.val;
                await this.refreshLists();
                this.log.debug(`Inside zone_three, state change: ${id} val: ${state.val}`);
            }
        }
        if (isNotChange) {
            return;
        }
        if (id === `${this.namespace}.use.list`) {
            switch (state.val) {
                case 0:
                    await this.countdown(false);
                    break;
                case 1:
                    if (!this.activated) {
                        await this.enableSystem(id, state);
                    }
                    break;
                case 2:
                    await this.insideBegins();
                    break;
                case 3:
                    await this.countdown(true);
                    break;
                case 4:
                    await this.sleepBegin();
                    break;
                default:
                    this.log.warn('Use wrong value in use.list');
                    break;
            }
            return;
        }
        if (id === `${this.namespace}.homekit.TargetState`) {
            switch (state.val) {
                case 0:
                    await this.insideBegins();
                    break;
                case 1:
                    if (!this.activated) {
                        await this.enableSystem(id, state);
                    }
                    break;
                case 2:
                    await this.sleepBegin();
                    break;
                case 3:
                    await this.countdown(false);
                    break;
                default:
                    this.log.warn('Use wrong value in homekit.TargetState');
                    break;
            }
            return;
        }
        if (id === `${this.namespace}.status.activated`) {
            this.activated = state.val;
            this.shortcuts('status.activated', state.val);
            if (this.optPresence) {
                this.presenceDelayTimer = setTimeout(
                    () => {
                        this.presenceDelayTimer = null;
                        void this.setAllPresenceTimer(() => {
                            this.presenceInterval = setInterval(async (): Promise<void> => {
                                await this.checkPresence();
                            }, 60000);
                        });
                    },
                    this.timeMode(this.config.presence_activate_delay_select) * this.config.presence_activate_delay,
                );
            }
            return;
        }
        if (id === `${this.namespace}.presence.on_off`) {
            this.optPresence = state.val;
            if (!state.val) {
                this.clearAllPresenceTimer();
            }
            return;
        }
        if (id === `${this.namespace}.zone.one_on_off`) {
            this.optOne = state.val;
            return;
        }
        if (id === `${this.namespace}.zone.two_on_off`) {
            this.optTwo = state.val;
            return;
        }
        if (id === `${this.namespace}.zone.three_on_off`) {
            this.optThree = state.val;
            return;
        }
        if (id === `${this.namespace}.status.sleep`) {
            this.shortcuts('status.sleep', state.val);
            return;
        }
        if (id === `${this.namespace}.status.gets_activated`) {
            this.shortcuts('status.gets_activated', state.val);
            return;
        }
        if (id === `${this.namespace}.status.state_list`) {
            this.shortcuts('status.state_list', state.val);
            return;
        }
        if (id === `${this.namespace}.status.sharp_inside_activated`) {
            this.shortcuts('status.sharp_inside_activated', state.val);
            return;
        }
        if (id === `${this.namespace}.status.silent_alarm`) {
            this.shortcuts('status.silent_alarm', state.val);
            return;
        }
        if (id === `${this.namespace}.status.alarm_flash`) {
            this.shortcuts('status.alarm_flash', state.val);
            return;
        }
        if (id === `${this.namespace}.status.enableable`) {
            this.shortcuts('status.enableable', state.val);
            return;
        }
        if (id === `${this.namespace}.status.silent_flash`) {
            this.shortcuts('status.silent_flash', state.val);
            return;
        }
        if (id === `${this.namespace}.use.quit_changes`) {
            if (this.sirenInsideTimer) {
                clearTimeout(this.sirenInsideTimer);
                this.sirenInsideTimer = null;
            }
            if (this.timerNotificationChanges) {
                clearTimeout(this.timerNotificationChanges);
                this.timerNotificationChanges = null;
            }
            await this.setStateAsync('status.activation_failed', false, true);
            await this.setStateAsync('status.siren_inside', false, true);
            await this.setStateAsync('info.notification_circuit_changes', false, true);
            await this.setStateAsync('other_alarms.one_changes', false, true);
            await this.setStateAsync('other_alarms.two_changes', false, true);
            return;
        }
        if (id === `${this.namespace}.status.deactivated`) {
            this.shortcuts('status.deactivated', state.val);
            return;
        }
        if (id === `${this.namespace}.status.burglar_alarm`) {
            this.shortcuts('status.burglar_alarm', state.val);
            return;
        }
        if (id === `${this.namespace}.status.siren`) {
            this.shortcuts('status.siren', state.val);
            return;
        }
        if (id === `${this.namespace}.status.activation_failed`) {
            this.shortcuts('status.activation_failed', state.val);
            return;
        }
        if (id === `${this.namespace}.status.activated_with_warnings`) {
            this.shortcuts('status.activated_with_warnings', state.val);
            return;
        }
        if (id === `${this.namespace}.status.activation_countdown`) {
            this.shortcuts('status.activation_countdown', state.val);
            return;
        }
        if (id === `${this.namespace}.status.state`) {
            this.shortcuts('status.state', state.val);
            return;
        }
        if (id === `${this.namespace}.status.siren_inside`) {
            this.shortcuts('status.siren_inside', state.val);
            return;
        }
        if (id === `${this.namespace}.info.notification_circuit_changes`) {
            this.shortcuts('info.notification_circuit_changes', state.val);
            return;
        }
        if (id === `${this.namespace}.other_alarms.one_changes`) {
            this.shortcuts('other_alarms.one_changes', state.val);
            return;
        }
        if (id === `${this.namespace}.other_alarms.two_changes`) {
            this.shortcuts('other_alarms.two_changes', state.val);
            return;
        }
        if (id === `${this.namespace}.use.enable` && state.val) {
            await this.enableSystem(id, state);
            return;
        }
        if (id === `${this.namespace}.use.disable` && state.val) {
            await this.countdown(false);
            return;
        }
        if (id === `${this.namespace}.use.panic` && state.val) {
            await this.panic();
            return;
        }
        if (id === `${this.namespace}.use.activate_nightrest` && state.val) {
            await this.sleepBegin();
            return;
        }
        if (id === `${this.namespace}.use.activate_sharp_inside` && state.val) {
            await this.insideBegins();
            return;
        }
        if (id === `${this.namespace}.use.enable_with_delay` && state.val) {
            await this.countdown(true);
            return;
        }
        if (id === `${this.namespace}.use.disable_password`) {
            if (state.val == '') {
                return;
            }
            if ((await this.checkMyPassword(state.val, 'use.disable_password')) && (this.activated || this.inside)) {
                await this.countdown(false);
                return;
            }
            try {
                await this.setStateAsync('info.wrong_password', true, true);
            } catch (err) {
                this.log.error(err as unknown as string);
            }
            await this.setStateAsync(id, '', true);
            if (this.optLog) {
                this.log.info(`${this.config.log_pass}`);
            }
            this.log.debug(`Password denied ${state.val}`);
            if (this.config.send_failed) {
                this.messages(`${this.config.log_pass}`);
            }
            return;
        }
        if (id === `${this.namespace}.use.toggle_password`) {
            if (state.val == '') {
                return;
            }
            if ((await this.checkMyPassword(state.val, 'use.toggle_password')) && !this.activated) {
                await this.enableSystem(id, state);
                return;
            } else if ((await this.checkMyPassword(state.val, 'use.toggle_password')) && this.activated) {
                await this.countdown(false);
                return;
            }
            try {
                await this.setStateAsync('info.wrong_password', true, true);
            } catch (err) {
                this.log.error(err as unknown as string);
            }
            await this.setStateAsync(id, '', true);
            if (this.optLog) {
                this.log.info(`${this.config.log_pass}`);
            }
            this.log.debug(`Password denied ${state.val}`);
            if (this.config.send_failed) {
                this.messages(`${this.config.log_pass}`);
            }
            return;
        }
        if (id === `${this.namespace}.use.toggle_with_delay_and_password`) {
            if (state.val == '') {
                return;
            }
            if ((await this.checkMyPassword(state.val, 'use.toggle_with_delay_and_password')) && !this.activated) {
                await this.countdown(true);
                return;
            }
            if ((await this.checkMyPassword(state.val, 'use.toggle_with_delay_and_password')) && this.activated) {
                await this.countdown(false);
                return;
            }
            try {
                await this.setStateAsync('info.wrong_password', true, true);
            } catch (err) {
                this.log.error(err as unknown as string);
            }
            await this.setStateAsync(id, '', true);
            if (this.optLog) {
                this.log.info(`${this.config.log_pass}`);
            }
            this.log.debug(`Password denied ${state.val}`);
            if (this.config.send_failed) {
                this.messages(`${this.config.log_pass}`);
            }
            return;
        }
        if (id === `${this.namespace}.info.log`) {
            await this.logging(state.val as string);
            return;
        }
        if (this.idsShortsInput.includes(id)) {
            this.shortcutsInside(id, state.val);
            return;
        }
        if (
            this.leaveIds.includes(id) &&
            !this.activated &&
            !this.isTrue(id, state, 'main') &&
            this.timer &&
            this.config.opt_leave
        ) {
            await this.leaving(id, state);
            return;
        }
        if (this.alarmIds.includes(id) && this.activated && this.isTrue(id, state, 'main')) {
            if (!this.zone(id)) {
                return;
            }
            await this.burglary(id, state, this.isSilent(id));
            return;
        }
        if (this.insideIds.includes(id) && this.inside && this.isTrue(id, state, 'main')) {
            if (!this.zone(id)) {
                return;
            }
            await this.burglary(id, state, this.isSilent(id, true), true);
        }
        if (this.notificationIds.includes(id) && this.isTrue(id, state, 'main')) {
            if (!this.zone(id)) {
                return;
            }
            if (!this.activated && !this.inside && !this.nightRest) {
                return;
            }
            const name = this.getName(id);
            await this.setStateAsync('info.log', `${this.config.log_warn} ${name}`, true);
            await this.setStateAsync('info.notification_circuit_changes', true, true);
            if (this.nightRest) {
                let say = this.config.text_changes_night;
                if (this.optLog) {
                    this.log.info(`${this.config.log_night} ${name}`);
                }
                if (this.config.send_notification_changes) {
                    this.messages(`${this.config.log_night} ${name}`);
                }
                if (this.config.opt_say_names) {
                    say = `${say} ${name}`;
                }
                this.sayIt(say, 9);
            } else if (this.inside) {
                let say = this.config.text_changes;
                if (this.optLog) {
                    this.log.info(`${this.config.log_warn} ${name}`);
                }
                if (this.config.send_notification_changes) {
                    this.messages(`${this.config.log_warn} ${name}`);
                }
                if (this.config.opt_say_names) {
                    say = `${say} ${name}`;
                }
                this.sayIt(say, 5);
            } else if (this.activated) {
                let say = this.config.text_changes;
                if (this.optLog) {
                    this.log.info(`${this.config.log_warn} ${name}`);
                }
                if (this.config.send_notification_changes) {
                    this.messages(`${this.config.log_warn} ${name}`);
                }
                if (this.config.opt_say_names) {
                    say = `${say} ${name}`;
                }
                this.sayIt(say, 5);
            }
            this.timerNotificationChanges = setTimeout(
                async () => {
                    this.timerNotificationChanges = null;
                    await this.setStateAsync('info.notification_circuit_changes', false, true);
                },
                this.timeMode(this.config.time_warning_select) * this.config.time_warning,
            );
        }
        if (this.oneIds.includes(id) && this.isTrue(id, state, 'one')) {
            const name = this.getName(id, 'one');
            let say = this.config.text_one;
            if (this.optLog) {
                this.log.info(`${this.config.log_one} ${name}`);
            }
            if (this.config.send_one_changes) {
                this.messages(`${this.config.log_one} ${name}`);
            }
            if (this.config.opt_say_names) {
                say = `${say} ${name}`;
            }
            this.sayIt(say, 12);
            await this.setStateAsync('other_alarms.one_changes', true, true);
        }
        if (this.twoIds.includes(id) && this.isTrue(id, state, 'two')) {
            const name = this.getName(id, 'two');
            let say = this.config.text_two;
            if (this.optLog) {
                this.log.info(`${this.config.log_two} ${name}`);
            }
            if (this.config.send_two_changes) {
                this.messages(`${this.config.log_two} ${name}`);
            }
            if (this.config.opt_say_names) {
                say = `${say} ${name}`;
            }
            this.sayIt(say, 13);
            await this.setStateAsync('other_alarms.two_changes', true, true);
        }
        if (this.zoneOneIds.includes(id) && this.isTrue(id, state, 'zone_one')) {
            if (!this.optOne) {
                return;
            }
            const name = this.getName(id, 'zone_one');
            if (this.optLog) {
                this.log.info(`${this.config.log_zone_one} ${name}`);
            }
            if (this.config.send_zone_one) {
                this.messages(`${this.config.log_zone_one} ${name}`);
            }
        }
        if (this.zoneTwoIds.includes(id) && this.isTrue(id, state, 'zone_two')) {
            if (!this.optTwo) {
                return;
            }
            const name = this.getName(id, 'zone_two');
            if (this.optLog) {
                this.log.info(`${this.config.log_zone_two} ${name}`);
            }
            if (this.config.send_zone_two) {
                this.messages(`${this.config.log_zone_two} ${name}`);
            }
        }
        if (this.zoneThreeIds.includes(id) && this.isTrue(id, state, 'zone_three')) {
            if (!this.optThree) {
                return;
            }
            const name = this.getName(id, 'zone_three');
            if (this.optLog) {
                this.log.info(`${this.config.log_zone_three} ${name}`);
            }
            if (this.config.send_zone_three) {
                this.messages(`${this.config.log_zone_three} ${name}`);
            }
        }
    }

    private setSubs(): void {
        this.cleanIds.forEach(ele => {
            if (ele) {
                this.log.debug(`SUBSCRIPTION for: ${ele}`);
                this.subscribeForeignStates(ele);
            } else {
                this.log.debug(`NO SUBSCRIPTION for monitoring circuits`);
            }
        });
        this.idsShortsInput.forEach(ele => {
            if (ele) {
                this.log.debug(`SUBSCRIPTION for input shortcuts: ${ele}`);
                this.subscribeForeignStates(ele);
            } else {
                this.log.debug(`NO SUBSCRIPTION for input shortcuts`);
            }
        });
        this.oneIds.forEach(ele => {
            if (ele) {
                this.log.debug(`SUBSCRIPTION for other alarm one: ${ele}`);
                this.subscribeForeignStates(ele);
            } else {
                this.log.debug(`NO SUBSCRIPTION for other alarm one`);
            }
        });
        this.twoIds.forEach(ele => {
            if (ele) {
                this.log.debug(`SUBSCRIPTION for other alarm two: ${ele}`);
                this.subscribeForeignStates(ele);
            } else {
                this.log.debug(`NO SUBSCRIPTION for other alarm two`);
            }
        });
        this.zoneOneIds.forEach(ele => {
            if (ele) {
                this.log.debug(`SUBSCRIPTION for zone_one: ${ele}`);
                this.subscribeForeignStates(ele);
            } else {
                this.log.debug(`NO SUBSCRIPTION for zone_one`);
            }
        });
        this.zoneTwoIds.forEach(ele => {
            if (ele) {
                this.log.debug(`SUBSCRIPTION for zone_two: ${ele}`);
                this.subscribeForeignStates(ele);
            } else {
                this.log.debug(`NO SUBSCRIPTION for zone_two`);
            }
        });
        this.zoneThreeIds.forEach(ele => {
            if (ele) {
                this.log.debug(`SUBSCRIPTION for zone_three: ${ele}`);
                this.subscribeForeignStates(ele);
            } else {
                this.log.debug(`NO SUBSCRIPTION for zone_three`);
            }
        });
        this.subscribeStates('info.log');
        this.subscribeStates('status.siren_inside');
        this.subscribeStates('info.notification_circuit_changes');
        this.subscribeStates('other_alarms.one_changes');
        this.subscribeStates('other_alarms.two_changes');
        this.subscribeStates('use.*');
        this.subscribeStates('status.*');
        this.subscribeStates('presence.*');
        this.subscribeStates('zone.*');
        this.subscribeStates('homekit.TargetState');
    }

    private messages(content: string): void {
        if (this.sendInstances.length) {
            const reg = new RegExp('telegram');
            this.sendInstances.forEach(ele => {
                if (reg.test(ele) && this.config.opt_telegram) {
                    this.log.debug(
                        `Send message to ${ele} with special parameter, message: text: ${content}, user: ${this.config.user}, chatID: ${this.config.chatID}`,
                    );
                    this.sendTo(ele, 'send', { text: content, user: this.config.user, chatId: this.config.chatID });
                } else {
                    this.log.debug(`Send message to ${ele}, message: ${content}`);
                    this.sendTo(ele, content);
                }
            });
        }
    }

    private speechOutput(id: string, message: string, time: number | string): void {
        let delay: number;
        time = parseInt(time as string);
        if (Number.isInteger(time)) {
            delay = time;
        } else {
            delay = 0;
        }
        this.log.debug(`speech output instance: ${id}: ${message}, delay ${delay}s`);
        this.speechTimeout = setTimeout(() => {
            this.speechTimeout = null;
            this.setForeignState(id, message, err => {
                if (err) {
                    this.log.warn(err as unknown as string);
                }
            });
        }, delay * 1000);
    }

    private sayIt(message: string, optVal: number): void {
        const ttsInstance = this.config.sayit;
        if (this.nightRest && this.config.opt_night_silent) {
            return;
        }
        ttsInstance?.forEach(ele => {
            if (ele.enabled) {
                switch (optVal) {
                    case 1:
                        if (ele.opt_say_one) {
                            this.speechOutput(ele.name_id, message, ele.speech_delay);
                        }
                        break;
                    case 2:
                        if (ele.opt_say_two) {
                            this.speechOutput(ele.name_id, message, ele.speech_delay);
                        }
                        break;
                    case 3:
                        if (ele.opt_say_three) {
                            this.speechOutput(ele.name_id, message, ele.speech_delay);
                        }
                        break;
                    case 4:
                        if (ele.opt_say_four) {
                            this.speechOutput(ele.name_id, message, ele.speech_delay);
                        }
                        break;
                    case 5:
                        if (ele.opt_say_five) {
                            this.speechOutput(ele.name_id, message, ele.speech_delay);
                        }
                        break;
                    case 6:
                        if (ele.opt_say_six) {
                            this.speechOutput(ele.name_id, message, ele.speech_delay);
                        }
                        break;
                    case 7:
                        if (ele.opt_say_seven) {
                            this.speechOutput(ele.name_id, message, ele.speech_delay);
                        }
                        break;
                    case 8:
                        if (ele.opt_say_eigth) {
                            this.speechOutput(ele.name_id, message, ele.speech_delay);
                        }
                        break;
                    case 9:
                        if (ele.opt_say_nine) {
                            this.speechOutput(ele.name_id, message, ele.speech_delay);
                        }
                        break;
                    case 10:
                        if (ele.opt_say_nine_plus) {
                            this.speechOutput(ele.name_id, message, ele.speech_delay);
                        }
                        break;
                    case 0:
                        if (ele.opt_say_zero) {
                            this.speechOutput(ele.name_id, message, ele.speech_delay);
                        }
                        break;
                    case 11:
                        if (ele.opt_say_count) {
                            this.speechOutput(ele.name_id, message, ele.speech_delay);
                        }
                        break;
                    case 12:
                        if (ele.opt_say_fire) {
                            this.speechOutput(ele.name_id, message, ele.speech_delay);
                        }
                        break;
                    case 13:
                        if (ele.opt_say_water) {
                            this.speechOutput(ele.name_id, message, ele.speech_delay);
                        }
                        break;
                    case 14:
                        if (ele.opt_say_aborted) {
                            this.speechOutput(ele.name_id, message, ele.speech_delay);
                        }
                        break;
                    default:
                        this.log.debug(`no speech output!`);
                }
            }
        });
    }

    private zone(id: string): boolean {
        if (id === `${this.namespace}.zone.one`) {
            return !!this.optOne;
        }
        if (id === `${this.namespace}.zone.two`) {
            return !!this.optTwo;
        }
        if (id === `${this.namespace}.zone.three`) {
            return !!this.optThree;
        }
        return true;
    }

    private async alarmSiren(): Promise<void> {
        await this.setStateAsync('status.siren', true, true);
        this.sirenTimer = setTimeout(
            async () => {
                await this.setStateAsync('status.siren', false, true);
                if (this.sirenTimer) {
                    clearTimeout(this.sirenTimer);
                    this.sirenTimer = null;
                }
            },
            this.timeMode(this.config.time_alarm_select) * this.config.time_alarm,
        );
    }

    private alarmFlash(): void {
        if (this.config.alarm_flash > 0) {
            this.alarmInterval = setInterval(async () => {
                if (this.alarmI) {
                    await this.setStateAsync('status.alarm_flash', true, true);
                    this.alarmI = false;
                } else {
                    await this.setStateAsync('status.alarm_flash', false, true);
                    this.alarmI = true;
                }
            }, this.config.alarm_flash * 1000);
        }
    }

    private async disableStates(): Promise<void> {
        await this.setStateAsync('status.deactivated', true, true);
        await this.setStateAsync('status.state', 'deactivated', true);
        await this.setStateAsync('status.state_list', 0, true);
        await this.setStateAsync('homekit.CurrentState', 3, true);
        await this.setStateAsync('homekit.TargetState', 3, true);
        await this.setStateAsync('use.list', 0, true);
        await this.setStateAsync('status.siren_inside', false, true);
        await this.setStateAsync('status.siren', false, true);
        await this.setStateAsync('info.notification_circuit_changes', false, true);
        await this.setStateAsync('status.silent_flash', false, true);
        await this.setStateAsync('status.alarm_flash', false, true);
        await this.setStateAsync('status.burglar_alarm', false, true);
        await this.setStateAsync('status.silent_alarm', false, true);
    }

    private checkDoubles(): void {
        this.cleanIds.forEach(ele => {
            this.oneIds.forEach(item => {
                if (item === ele) {
                    this.log.warn(`You use double states in main and other alarms, PLEASE FIX IT: ${item}`);
                }
            });
            this.twoIds.forEach(item => {
                if (item === ele) {
                    this.log.warn(`You use double states in main and other alarms, PLEASE FIX IT: ${item}`);
                }
            });
            this.zoneOneIds.forEach(item => {
                if (item === ele) {
                    this.log.warn(`You use double states in main and other alarms, PLEASE FIX IT: ${item}`);
                }
            });
            this.zoneTwoIds.forEach(item => {
                if (item === ele) {
                    this.log.warn(`You use double states in main and other alarms, PLEASE FIX IT: ${item}`);
                }
            });
            this.zoneThreeIds.forEach(item => {
                if (item === ele) {
                    this.log.warn(`You use double states in main and other alarms, PLEASE FIX IT: ${item}`);
                }
            });
        });
    }

    private isSilent(id: string, indoor?: boolean): boolean {
        if (indoor) {
            const temp = this.config.circuits.findIndex(obj => {
                const reg = new RegExp(id);
                return reg.test(obj.name_id);
            });
            return this.config.circuits[temp].delay_inside;
        }
        const temp = this.config.circuits.findIndex(obj => {
            const reg = new RegExp(id);
            return reg.test(obj.name_id);
        });
        return this.config.circuits[temp].delay;
    }

    private timeMode(value: string): number {
        switch (value) {
            case 'sec':
                return 1000;
            case 'min':
                return 60000;
            default:
                return 1000;
        }
    }

    private async insideBegins(): Promise<void> {
        if (!this.inside && !this.burgle) {
            this.activated = false;
            this.inside = true;
            await this.sleepEnd();
            if (this.isInside) {
                let say = this.config.text_warning;
                if (this.config.send_activation_warnings_inside) {
                    this.messages(`${this.config.log_warn_b_w} ${this.namesInside}`);
                }
                await this.setStateAsync('info.log', `${this.config.log_warn_b_w} ${this.namesInside}`, true);
                if (this.optLog) {
                    this.log.info(`${this.config.log_warn_b_w} ${this.namesInside}`);
                }
                if (this.config.opt_say_names) {
                    say = `${say} ${this.namesInside}`;
                }
                this.sayIt(say, 4);
            } else {
                await this.setStateAsync('info.log', `${this.config.log_warn_act}`, true);
                if (this.optLog) {
                    this.log.info(`${this.config.log_warn_act}`);
                }
                if (this.config.send_activation_inside) {
                    this.messages(`${this.config.log_warn_act}`);
                }
                this.sayIt(this.config.text_warn_begin, 10);
            }
            await this.setStateAsync('status.sharp_inside_activated', true, true);
            await this.setStateAsync('status.state', 'sharp inside', true);
            await this.setStateAsync('status.state_list', 2, true);
            await this.setStateAsync('homekit.CurrentState', 0, true);
            await this.setStateAsync('homekit.TargetState', 0, true);
            await this.setStateAsync('use.list', 2, true);
            await this.setStateAsync('status.activated', false, true);
            await this.setStateAsync('status.deactivated', false, true);
        }
    }

    private async insideEnds(off?: boolean): Promise<void> {
        if (this.inside) {
            this.inside = false;
            if (off) {
                if (this.sirenInsideTimer) {
                    clearTimeout(this.sirenInsideTimer);
                }
                if (this.timerNotificationChanges) {
                    clearTimeout(this.timerNotificationChanges);
                }
                await this.setStateAsync('info.log', `${this.config.log_warn_deact}`, true);
                if (this.optLog) {
                    this.log.info(`${this.config.log_warn_deact}`);
                }
                if (this.config.send_activation_inside) {
                    this.messages(`${this.config.log_warn_deact}`);
                }
                this.sayIt(this.config.text_warn_end, 0);
                await this.setStateAsync('status.sharp_inside_activated', false, true);
                await this.disableStates();
            }
        }
    }

    private async sleepBegin(auto?: boolean): Promise<void> {
        if (this.nightRest || this.burgle) {
            return;
        }
        if ((auto && this.inside) || (auto && this.activated)) {
            this.log.warn(`Cannot set alarm system to night rest, it is sharp or sharp inside`);
            return;
        }
        this.activated = false;
        this.nightRest = true;
        await this.insideEnds();
        if (this.optLog) {
            this.log.info(`${this.config.log_sleep_b}`);
        }
        await this.setStateAsync('info.log', `${this.config.log_sleep_b}`, true);
        if (!this.isNotification) {
            this.sayIt(this.config.text_nightrest_beginn, 7);
        }
        await this.setStateAsync('status.state', 'night rest', true);
        await this.setStateAsync('status.state_list', 4, true);
        await this.setStateAsync('homekit.CurrentState', 2, true);
        await this.setStateAsync('homekit.TargetState', 2, true);
        await this.setStateAsync('use.list', 4, true);
        if (this.isNotification) {
            let say = this.config.text_warning;
            if (this.config.send_activation_warnings_night) {
                this.messages(`${this.config.log_nights_b_w} ${this.namesNotification}`);
            }
            await this.setStateAsync('info.log', `${this.config.log_nights_b_w} ${this.namesNotification}`, true);
            if (this.optLog) {
                this.log.info(`${this.config.log_nights_b_w} ${this.namesNotification}`);
            }
            if (this.config.opt_say_names) {
                say = `${say} ${this.namesNotification}`;
            }
            this.sayIt(say, 4);
        }
    }

    private async sleepEnd(off?: boolean): Promise<void> {
        if (this.nightRest) {
            this.nightRest = false;
            if (off) {
                await this.setStateAsync('info.log', `${this.config.log_sleep_e}`, true);
                this.sayIt(this.config.text_nightrest_end, 8);
                if (this.optLog) {
                    this.log.info(`${this.config.log_sleep_e}`);
                }
                await this.setStateAsync('status.state', 'deactivated', true);
                if (!this.inside) {
                    await this.setStateAsync('status.state_list', 0, true);
                    await this.setStateAsync('homekit.CurrentState', 3, true);
                    await this.setStateAsync('homekit.TargetState', 3, true);
                    await this.setStateAsync('use.list', 0, true);
                }
            }
        }
    }

    private async refreshLists(): Promise<void> {
        this.check(this.alarmIds, 'main', async (_val: boolean, ids: string[]) => {
            this.log.debug(`Alarm circuit list: ${ids.join(', ')}`);
            if (ids.length > 0) {
                this.isAlarm = true;
                this.namesAlarm = this.getName(ids, 'main');
                await this.setStateAsync('info.alarm_circuit_list', this.namesAlarm, true);
                await this.setStateAsync('info.alarm_circuit_list_html', this.getNameHtml(ids), true);
            } else {
                this.isAlarm = false;
                this.namesAlarm = '';
                await this.setStateAsync('info.alarm_circuit_list', '', true);
                await this.setStateAsync('info.alarm_circuit_list_html', '', true);
            }
        });
        this.check(this.insideIds, 'main', async (_val: boolean, ids: string[]) => {
            this.log.debug(`Inside circuit list: ${ids.join(', ')}`);
            if (ids.length > 0) {
                this.isInside = true;
                this.namesInside = this.getName(ids, 'main');
                await this.setStateAsync('info.sharp_inside_circuit_list', this.namesInside, true);
                await this.setStateAsync('info.sharp_inside_circuit_list_html', this.getNameHtml(ids), true);
            } else {
                this.isInside = false;
                this.namesInside = '';
                await this.setStateAsync('info.sharp_inside_circuit_list', '', true);
                await this.setStateAsync('info.sharp_inside_circuit_list_html', '', true);
            }
        });
        this.check(this.notificationIds, 'main', async (_val: boolean, ids: string[]) => {
            this.log.debug(`Notification circuit list: ${ids.join(', ')}`);
            if (ids.length > 0) {
                this.isNotification = true;
                this.namesNotification = this.getName(ids, 'main');
                await this.setStateAsync('info.notification_circuit_list', this.namesNotification, true);
                await this.setStateAsync('info.notification_circuit_list_html', this.getNameHtml(ids), true);
            } else {
                this.isNotification = false;
                this.namesNotification = '';
                await this.setStateAsync('info.notification_circuit_list', '', true);
                await this.setStateAsync('info.notification_circuit_list_html', '', true);
            }
        });
        this.check(this.oneIds, 'one', async (_val: boolean, ids: string[]) => {
            this.log.debug(`One list: ${ids.join(', ')}`);
            if (ids.length > 0) {
                this.namesOne = this.getName(ids, 'one');
                await this.setStateAsync('other_alarms.one_list', this.namesOne, true);
                await this.setStateAsync('other_alarms.one_list_html', this.getNameHtml(ids, 'one'), true);
            } else {
                this.namesOne = '';
                await this.setStateAsync('other_alarms.one_list', '', true);
                await this.setStateAsync('other_alarms.one_list_html', '', true);
            }
        });
        this.check(this.twoIds, 'two', async (_val: boolean, ids: string[]) => {
            this.log.debug(`Two list: ${ids.join(', ')}`);
            if (ids.length > 0) {
                this.namesTwo = this.getName(ids, 'two');
                await this.setStateAsync('other_alarms.two_list', this.namesTwo, true);
                await this.setStateAsync('other_alarms.two_list_html', this.getNameHtml(ids, 'two'), true);
            } else {
                this.namesTwo = '';
                await this.setStateAsync('other_alarms.two_list', '', true);
                await this.setStateAsync('other_alarms.two_list_html', '', true);
            }
        });
        this.check(this.zoneOneIds, 'zone_one', async (_val: boolean, ids: string[]) => {
            this.log.debug(`Zone_one list: ${ids.join(', ')}`);
            if (ids.length > 0) {
                this.namesZoneOne = this.getName(ids, 'zone_one');
                this.log.debug(`Names in zone one: ${this.namesZoneOne}`);
                await this.setStateAsync('zone.one', true, true);
            } else {
                this.namesZoneOne = '';
                this.log.debug(`Names in zone one: ${this.namesZoneOne}`);
                await this.setStateAsync('zone.one', false, true);
            }
        });
        this.check(this.zoneTwoIds, 'zone_two', async (_val: boolean, ids: string[]) => {
            this.log.debug(`Zone_two list: ${ids.join(', ')}`);
            if (ids.length > 0) {
                this.namesZoneTwo = this.getName(ids, 'zone_two');
                this.log.debug(`Names in zone two: ${this.namesZoneTwo}`);
                await this.setStateAsync('zone.two', true, true);
            } else {
                this.namesZoneTwo = '';
                this.log.debug(`Names in zone two: ${this.namesZoneTwo}`);
                await this.setStateAsync('zone.two', false, true);
            }
        });
        this.check(this.zoneThreeIds, 'zone_three', async (_val: boolean, ids: string[]) => {
            this.log.debug(`Zone_three list: ${ids.join(', ')}`);
            if (ids.length > 0) {
                this.namesZoneThree = this.getName(ids, 'zone_three');
                this.log.debug(`Names in zone three: ${this.namesZoneThree}`);
                await this.setStateAsync('zone.three', true, true);
            } else {
                this.namesZoneThree = '';
                this.log.debug(`Names in zone three: ${this.namesZoneThree}`);
                await this.setStateAsync('zone.three', false, true);
            }
        });
        if (this.isAlarm) {
            await this.setStateAsync('status.enableable', false, true);
        }
        if (this.config.opt_warning && this.isAlarm) {
            await this.setStateAsync('status.enableable', true, true);
        }
        if (!this.isAlarm) {
            await this.setStateAsync('status.enableable', true, true);
        }
    }

    private async checkMyPassword(pass: ioBroker.StateValue, id: string): Promise<boolean> {
        if (pass == this.config.password) {
            this.log.debug(`Password accept`);
            try {
                await this.setStateAsync('info.wrong_password', false, true);
            } catch (err) {
                this.log.error(err as unknown as string);
            }
            await this.setStateAsync(id, '', true);
            return true;
        }
        return false;
    }

    private isTrue(id: string, state: ioBroker.State, other: string): boolean {
        let test = false;
        if (!this.search(id, other) && state.val) {
            test = true;
        } else if (this.search(id, other) && !state.val) {
            test = true;
        }
        return test;
    }

    private splitArr(str: string): string[] {
        const tempArr = str.split(/[,;\s]+/);
        const cleanArr: string[] = [];
        tempArr.forEach(ele => {
            if (ele) {
                cleanArr.push(ele.trim());
            }
        });
        return cleanArr;
    }

    /**
     * Distributes enabled circuit rows into their respective ID arrays.
     *
     * For each enabled circuit, pushes its ID into alarm, inside, notification,
     * and/or leave arrays based on its configured flags.
     *
     * @param arr - Array of circuit configuration rows from adapter config
     */
    private splitStates(arr: CircuitRow[]): void {
        arr.forEach(ele => {
            if (ele.enabled) {
                if (ele.alarm) {
                    this.alarmIds.push(ele.name_id);
                }
                if (ele.warning) {
                    this.insideIds.push(ele.name_id);
                }
                if (ele.night) {
                    this.notificationIds.push(ele.name_id);
                }
                if (ele.leave) {
                    this.leaveIds.push(ele.name_id);
                }
            } else {
                this.log.debug(`State not used but configured: ${ele.name_id}`);
            }
        });
    }

    /**
     * Builds a de-duplicated list of all monitored circuit state IDs.
     * Combines alarm, inside, notification, and leave IDs into `cleanIds`.
     */
    private getIds(): void {
        let ids: string[] = [];
        ids = ids.concat(this.alarmIds, this.insideIds, this.notificationIds, this.leaveIds);
        this.cleanIds = Array.from(new Set(ids));
    }

    /**
     * Looks up the `negativ` (inverted logic) flag for a circuit in the specified config table.
     *
     * @param id - The state ID to search for
     * @param table - Config table name: `'main'`, `'one'`, `'two'`, `'zone_one'`, `'zone_two'`, or `'zone_three'`
     * @returns `true` if the circuit has inverted logic enabled
     */
    private search(id: string, table: string): boolean {
        if (typeof table === 'undefined' || table === null) {
            this.log.warn(`Issue in function search, please report this the developer!`);
            return;
        }
        let tableObj: CircuitRow[] | OtherAlarmRow[] | ZoneRow[];
        if (table === 'main') {
            tableObj = this.config.circuits;
        } else if (table === 'one') {
            tableObj = this.config.one;
        } else if (table === 'two') {
            tableObj = this.config.two;
        } else if (table === 'zone_one') {
            tableObj = this.config.zone_one;
        } else if (table === 'zone_two') {
            tableObj = this.config.zone_two;
        } else if (table === 'zone_three') {
            tableObj = this.config.zone_three;
        } else {
            this.log.warn(`Issue in function search, please report this the developer!`);
        }
        const obj = tableObj.find(obj => {
            const reg = new RegExp(id);
            return reg.test(obj.name_id);
        });
        return obj?.negativ;
    }

    /**
     * Evaluates which IDs from the given array are currently in a triggered state.
     *
     * Accounts for inverted logic via {@link search}. Calls the callback with
     * `true` and the list of triggered IDs, or `false` with an empty list.
     *
     * @param arr - Array of state IDs to evaluate
     * @param table - Config table name used to resolve inverted logic
     * @param callback - Called with the evaluation result and list of triggered IDs
     */
    private check(arr: string[], table: string, callback: (val: boolean, ids: string[]) => void | Promise<void>): void {
        if (typeof table === 'undefined' || table === null) {
            this.log.warn(`Issue in function check, please report this the developer!`);
            return;
        }
        let tempStates: Record<string, ioBroker.StateValue>;
        if (table === 'main') {
            tempStates = this.states;
        } else if (table === 'one') {
            tempStates = this.oneStates;
        } else if (table === 'two') {
            tempStates = this.twoStates;
        } else if (table === 'zone_one') {
            tempStates = this.zoneOneStates;
        } else if (table === 'zone_two') {
            tempStates = this.zoneTwoStates;
        } else if (table === 'zone_three') {
            tempStates = this.zoneThreeStates;
        } else {
            this.log.warn(`Issue in function check, please report this the developer!`);
            return;
        }
        const tempArr: string[] = [];
        if (arr.length > 0) {
            arr.forEach(ele => {
                if (tempStates[ele] && !this.search(ele, table)) {
                    tempArr.push(ele);
                } else if (tempStates[ele] == false && this.search(ele, table)) {
                    tempArr.push(ele);
                }
            });
            if (tempArr.length > 0) {
                void callback(true, tempArr);
            } else {
                void callback(false, tempArr);
            }
        }
    }

    /**
     * Resolves human-readable names for one or more circuit state IDs.
     *
     * Looks up the `name` property from the appropriate config table.
     * When given an array, returns comma-separated names; when given a single ID, returns that name.
     *
     * @param ids - Single state ID or array of state IDs to resolve
     * @param table - Config table name; defaults to `'main'` (circuits)
     * @returns Comma-separated name string for arrays, or a single name string
     */
    private getName(ids: string | string[], table?: string): string {
        const name: string[] = [];
        let tableObj: CircuitRow[] | OtherAlarmRow[] | ZoneRow[];
        if (table === 'main') {
            tableObj = this.config.circuits;
        } else if (table === 'one') {
            tableObj = this.config.one;
        } else if (table === 'two') {
            tableObj = this.config.two;
        } else if (table === 'zone_one') {
            tableObj = this.config.zone_one;
        } else if (table === 'zone_two') {
            tableObj = this.config.zone_two;
        } else if (table === 'zone_three') {
            tableObj = this.config.zone_three;
        } else {
            tableObj = this.config.circuits;
        }
        if (Array.isArray(ids)) {
            ids.forEach(id => {
                const temp = tableObj.findIndex(obj => {
                    const reg = new RegExp(id);
                    return reg.test(obj.name_id);
                });
                name.push(tableObj[temp].name);
            });
            return name.join();
        }
        const obj = tableObj.find(obj => {
            const reg = new RegExp(ids);
            return reg.test(obj.name_id);
        });
        return obj.name;
    }

    /**
     * Resolves human-readable names for one or more circuit state IDs as HTML.
     *
     * Same as {@link getName} but joins multiple names with `<br>` line breaks
     * for HTML display in the admin UI.
     *
     * @param ids - Single state ID or array of state IDs to resolve
     * @param table - Config table name; defaults to `'main'` (circuits)
     * @returns HTML-formatted name string with `<br>` separators
     */
    private getNameHtml(ids: string | string[], table?: string): string {
        const name: string[] = [];
        let tableObj: CircuitRow[] | OtherAlarmRow[] | ZoneRow[];
        if (table === 'main') {
            tableObj = this.config.circuits;
        } else if (table === 'one') {
            tableObj = this.config.one;
        } else if (table === 'two') {
            tableObj = this.config.two;
        } else if (table === 'zone_one') {
            tableObj = this.config.zone_one;
        } else if (table === 'zone_two') {
            tableObj = this.config.zone_two;
        } else if (table === 'zone_three') {
            tableObj = this.config.zone_three;
        } else {
            tableObj = this.config.circuits;
        }
        if (Array.isArray(ids)) {
            ids.forEach(id => {
                const item = tableObj.find(obj => {
                    const reg = new RegExp(id);
                    return reg.test(obj.name_id);
                });
                name.push(item.name);
            });
            return name.join('<br>');
        }
        const obj = tableObj.find(obj => {
            const reg = new RegExp(ids);
            return reg.test(obj.name_id);
        });
        return obj?.name;
    }

    /**
     * Fetches the value of a foreign state by its ID.
     *
     * Logs an error if the state does not exist or its value is null/undefined.
     *
     * @param id - Full state ID to read
     * @returns The state value, or `null` if the state is unavailable
     */
    private async getStateValueAsync(id: string): Promise<ioBroker.StateValue | null> {
        const state = await this.getForeignStateAsync(id);
        if (!state || state.val === null || state.val === undefined) {
            this.log.error(`state is null: ${id}`);
            return null;
        }
        return state.val;
    }

    /**
     * Wrapper for {@link getStateValueAsync} used during sequential state fetching.
     *
     * @param id - Full state ID to read
     * @returns The state value, or `null` if the state is unavailable
     */
    private async getStatesDelay(id: string): Promise<ioBroker.StateValue | null> {
        return await this.getStateValueAsync(id);
    }

    /**
     * Fetches and caches the current values of all main circuit states.
     * Populates the `states` map with `{stateId: value}` entries for all `cleanIds`.
     */
    private async fetchStates(): Promise<void> {
        for (const id of this.cleanIds) {
            this.states[id] = await this.getStatesDelay(id);
        }
        this.log.debug(JSON.stringify(this.states));
    }

    /**
     * Fetches and caches the current values of "other alarm" states (one and two).
     * Collects enabled IDs from config tables and populates `oneStates` and `twoStates`.
     */
    private async getOtherStates(): Promise<void> {
        if (this.config.one) {
            this.config.one.forEach(ele => {
                if (ele.enabled) {
                    this.oneIds.push(ele.name_id);
                }
            });
            for (const id of this.oneIds) {
                this.oneStates[id] = await this.getStatesDelay(id);
            }
        }
        if (this.config.two) {
            this.config.two.forEach(ele => {
                if (ele.enabled) {
                    this.twoIds.push(ele.name_id);
                }
            });
            for (const id of this.twoIds) {
                this.twoStates[id] = await this.getStatesDelay(id);
            }
        }
        this.log.debug(`other alarm are one: ${JSON.stringify(this.oneStates)} two: ${JSON.stringify(this.twoStates)}`);
    }

    /**
     * Fetches and caches the current values of zone states (one, two, and three).
     * Collects enabled IDs from zone config tables and populates zone state maps.
     */
    private async getZoneStates(): Promise<void> {
        if (this.config.zone_one) {
            this.config.zone_one.forEach(ele => {
                if (ele.enabled) {
                    this.zoneOneIds.push(ele.name_id);
                }
            });
            for (const id of this.zoneOneIds) {
                this.zoneOneStates[id] = await this.getStatesDelay(id);
            }
        }
        if (this.config.zone_two) {
            this.config.zone_two.forEach(ele => {
                if (ele.enabled) {
                    this.zoneTwoIds.push(ele.name_id);
                }
            });
            for (const id of this.zoneTwoIds) {
                this.zoneTwoStates[id] = await this.getStatesDelay(id);
            }
        }
        if (this.config.zone_three) {
            this.config.zone_three.forEach(ele => {
                if (ele.enabled) {
                    this.zoneThreeIds.push(ele.name_id);
                }
            });
            for (const id of this.zoneThreeIds) {
                this.zoneThreeStates[id] = await this.getStatesDelay(id);
            }
        }
        this.log.debug(
            `zone one: ${JSON.stringify(this.zoneOneStates)} zone two: ${JSON.stringify(this.zoneTwoStates)} zone three: ${JSON.stringify(this.zoneThreeStates)}`,
        );
    }

    /**
     * Handles a "leaving" event that triggers immediate system activation.
     *
     * When a leave-circuit is triggered during countdown, cancels the countdown timer
     * and immediately arms the system via {@link enableSystem}.
     *
     * @param _id - State ID of the leave circuit that was triggered
     * @param _state - State object of the triggering leave circuit
     */
    private async leaving(_id: string, _state: ioBroker.State): Promise<void> {
        this.log.info(`Leaving state triggerd`);
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        await this.setStateAsync('status.activation_countdown', null, true);
        await this.setStateAsync('status.gets_activated', false, true);
        await this.enableSystem();
    }

    /**
     * Manages the activation countdown or disables the system.
     *
     * When `count` is `true`: starts a countdown timer that decrements every second.
     * If alarm circuits are open, sends warning notifications. After the countdown
     * reaches zero, arms the system via {@link enableSystem}.
     *
     * When `count` is `false`: cancels any running countdown and calls {@link disableSystem}.
     * If a countdown was active, announces the abort.
     *
     * @param count - `true` to start the activation countdown, `false` to cancel/disable
     */
    private async countdown(count: boolean): Promise<void> {
        const time = this.timeMode(this.config.time_activate_select);
        let counter = (this.config.time_activate * time) / 1000;
        if (count && !this.timer && !this.activated) {
            const say = `${this.config.time_activate} ${this.config.text_countdown}`;
            if (this.isAlarm) {
                if (this.config.send_activation_warnings) {
                    this.messages(`${this.config.log_act_notice} ${this.namesAlarm}`);
                }
                let warnSay = this.config.text_warning;
                if (this.config.opt_say_names) {
                    warnSay = `${warnSay} ${this.namesAlarm}`;
                }
                this.sayIt(warnSay, 4);
            }
            if (this.isAlarm) {
                setTimeout(() => this.sayIt(say, 11), 5000);
            } else {
                this.sayIt(say, 11);
            }
            await this.setStateAsync('status.gets_activated', true, true);
            await this.setStateAsync('status.state', 'gets activated', true);
            await this.setStateAsync('status.state_list', 5, true);
            this.timer = setInterval(async () => {
                if (counter > 0) {
                    counter--;
                    await this.setStateAsync('status.activation_countdown', counter, true);
                } else {
                    if (this.timer) {
                        clearInterval(this.timer);
                        this.timer = null;
                    }
                    await this.setStateAsync('status.activation_countdown', counter, true);
                    await this.setStateAsync('status.gets_activated', false, true);
                    await this.enableSystem();
                }
            }, 1000);
        } else if (count && this.timer) {
            return;
        } else if (count && this.activated) {
            return;
        } else {
            if (this.timer) {
                clearInterval(this.timer);
                this.timer = null;
                await this.setStateAsync('status.activation_countdown', null, true);
                await this.setStateAsync('status.gets_activated', false, true);
                await this.setStateAsync('status.state_list', 7, true);
                this.sayIt(this.config.text_aborted, 14);
                if (this.optLog) {
                    this.log.info(`${this.config.log_aborted}`);
                }
            }
            await this.disableSystem();
        }
    }

    /**
     * Converts a state value to its appropriate boolean or numeric type.
     *
     * Handles string `'true'`/`'false'` conversion to booleans and
     * numeric strings to numbers.
     *
     * @param val - The state value to convert
     * @returns Converted boolean or number value
     */
    private bools(val: ioBroker.StateValue): boolean | number {
        switch (val) {
            case 'true':
                return true;
            case 'false':
                return false;
            default:
                if (isNaN(Number(val))) {
                    return val as number;
                }
                return Number(val);
        }
    }

    /**
     * Processes input shortcut triggers from external states.
     *
     * When a monitored external state matches a configured input shortcut's
     * ID and value, sets the corresponding internal adapter state to `true`.
     *
     * @param id - The external state ID that changed
     * @param val - The current value of the external state
     */
    private shortcutsInside(id: string, val: ioBroker.StateValue): void {
        const change = this.isChanged(id, val);
        this.shortsIn.forEach(async ele => {
            if (ele.name_id == id) {
                if (ele.value === val || this.bools(ele.value) == val) {
                    if (ele.trigger_val === 'any' || change) {
                        this.log.debug(`Input shortcut changed: ${ele.name_id}`);
                        try {
                            await this.setStateAsync(ele.select_id, true, true);
                        } catch (err) {
                            this.log.warn(`Cannot set state: ${err}`);
                        }
                    }
                }
            }
        });
    }

    /**
     * Extracts the state IDs from enabled input shortcut rows.
     *
     * @param ids - Array of input shortcut configuration rows
     * @returns Array of state IDs for all enabled input shortcuts
     */
    private getShortIds(ids: ShortsInRow[]): string[] {
        const idsArr = ids || [];
        const tempIds: string[] = [];
        idsArr.forEach(ele => {
            if (ele.enabled) {
                tempIds.push(ele.name_id);
            }
        });
        return tempIds;
    }

    /**
     * Processes output shortcut triggers when internal adapter states change.
     *
     * When an internal state matches a configured shortcut's trigger, sets
     * the corresponding external foreign state to the configured value.
     * For `status.state_list`, translates numeric values to string identifiers
     * before matching. Shortcuts are executed with a 250ms stagger between each.
     *
     * @param id - The internal adapter state ID that changed (without namespace prefix)
     * @param val - The current value of the changed state
     */
    private shortcuts(id: string, val: ioBroker.StateValue): void {
        const change = this.isChanged(id, val);
        let setVal = val;
        if (id === 'status.state_list') {
            switch (val) {
                case 0:
                    setVal = 'deactivated';
                    break;
                case 1:
                    setVal = 'sharp';
                    break;
                case 2:
                    setVal = 'sharp_inside';
                    break;
                case 3:
                    setVal = 'burglary';
                    break;
                case 4:
                    setVal = 'night_rest';
                    break;
                case 5:
                    setVal = 'gets_activated';
                    break;
                case 6:
                    setVal = 'activation_failed';
                    break;
                case 7:
                    setVal = 'activation_aborted';
                    break;
                case 8:
                    setVal = 'silent_alarm';
                    break;
                default:
                    setVal = val;
                    this.log.warn(`Wrong list state at shortcuts: ${val}`);
            }
        }
        if (this.shorts && change) {
            this.shorts.forEach((ele, i) => {
                if (ele.enabled && ele.select_id === id && this.bools(ele.trigger_val) === setVal) {
                    setTimeout(() => {
                        this.setForeignState(ele.name_id, this.bools(ele.value), err => {
                            if (err) {
                                this.log.warn(`Cannot set state: ${err}`);
                            }
                        });
                    }, i * 250);
                }
            });
        }
    }

    /**
     * Tracks whether a state value has actually changed compared to the last known value.
     *
     * Used by shortcuts to prevent re-triggering on duplicate values.
     *
     * @param id - The state ID to track
     * @param val - The current value to compare against the stored value
     * @returns `true` if the value differs from the stored value, `false` otherwise
     */
    private isChanged(id: string, val: ioBroker.StateValue): boolean {
        if (this.changeIds[id] === val) {
            this.log.debug(`No changes inside shortcuts! ${id}`);
            return false;
        }
        this.changeIds[id] = val;
        return true;
    }

    /**
     * Returns the current time as a zero-padded `HH:MM` string.
     *
     * @returns Formatted time string
     */
    private timeStamp(): string {
        const date = new Date();
        return `${`0${date.getHours()}`.slice(-2)}:${`0${date.getMinutes()}`.slice(-2)}`;
    }

    /**
     * Appends a timestamped log entry to the `info.log_today` state.
     *
     * New entries are prepended to the existing HTML-formatted log (separated by `<br>`).
     *
     * @param content - The log message text to record
     */
    private async logging(content: string): Promise<void> {
        const state = await this.getStateAsync('info.log_today').catch(e => this.log.warn(e));
        if (!state) {
            this.logEntries = '';
            await this.setStateAsync('info.log_today', this.logEntries, true);
        } else {
            this.logEntries = state.val as string;
            const logListArr = this.logEntries.split('<br>');
            logListArr.unshift(`${this.timeStamp()}: ${content}`);
            await this.setStateAsync('info.log_today', logListArr.join('<br>'), true);
        }
    }

    /**
     * Initializes all presence simulation timers from the adapter configuration.
     *
     * Fetches astronomical data (sunrise/sunset), builds a `presenceTimers` map
     * for each enabled presence entry with randomized durations and delays,
     * then invokes the callback to start periodic presence checks.
     *
     * @param callback - Called after all timers are initialized (typically starts the check interval)
     */
    private async setAllPresenceTimer(callback: () => void): Promise<void> {
        if (this.config.presence) {
            await this.getAstro();
            this.presenceRun = true;
            this.presenceTimers = {};
            this.config.presence.forEach(ele => {
                if (ele.enabled && ele.name_id !== '') {
                    this.presenceTimers[ele.name_id] = {
                        nameID: ele.name_id,
                        name: ele.name,
                        presenceTimeFrom: ele.presence_time_from,
                        presenceTimeTo: ele.presence_time_to,
                        optionPresence: ele.option_presence,
                        presenceLength: this.getTimeLength(
                            ele.presence_length * this.timeMode(ele.presence_length_select),
                            ele.presence_length_shuffle,
                        ),
                        presenceLengthTimer: null,
                        presenceDelay: this.getTimeLength(
                            ele.presence_delay * this.timeMode(ele.presence_delay_select),
                            ele.presence_delay_shuffle,
                        ),
                        presenceDelayTimer: null,
                        presenceValueON: this.getValType(ele.presence_val_on),
                        presenceValueOff: this.getValType(ele.presence_val_off),
                        presenceTriggerLight: ele.presence_trigger_light,
                        presenceLightLux: ele.presence_light_lux,
                        wasOn: false,
                    };
                } else if (!ele.enabled) {
                    this.log.debug(`Presence state not used but configured: ${ele.name_id}`);
                } else if (ele.name_id !== '') {
                    this.log.debug(`Presence ID is empty: ${ele.name_id}`);
                } else {
                    this.log.debug(`Some issue in presence states`);
                }
            });
            callback();
        }
    }

    /**
     * Stops all presence simulation timers and intervals.
     * Clears the periodic check interval, delay timer, and all per-device
     * length and delay timers.
     */
    private clearAllPresenceTimer(): void {
        this.presenceRun = false;
        if (this.presenceDelayTimer) {
            clearTimeout(this.presenceDelayTimer);
            this.presenceDelayTimer = null;
        }
        if (this.presenceInterval) {
            clearInterval(this.presenceInterval);
            this.presenceInterval = null;
        }
        for (const item in this.presenceTimers) {
            if (Object.prototype.hasOwnProperty.call(this.presenceTimers, item)) {
                if (this.presenceTimers[item].presenceLengthTimer) {
                    clearTimeout(this.presenceTimers[item].presenceLengthTimer);
                    this.presenceTimers[item].presenceLengthTimer = null;
                }
                if (this.presenceTimers[item].presenceDelayTimer) {
                    clearTimeout(this.presenceTimers[item].presenceDelayTimer);
                    this.presenceTimers[item].presenceDelayTimer = null;
                }
            }
        }
    }

    /**
     * Evaluates all presence timers and triggers device switching based on their mode.
     *
     * Only runs when the system is armed and not in "sharp inside" mode.
     * Supports four trigger modes:
     * - `'time'` – activates when the current time is within the configured range
     * - `'sunrise'` – activates during the sunrise window
     * - `'sunset'` – activates during the sunset window
     * - `'light'` – activates when the light sensor value falls below the configured lux threshold
     *
     * Each device is switched ON after a random delay, then switched OFF after a random duration.
     */
    private async checkPresence(): Promise<void> {
        if (!this.activated || this.inside) {
            return;
        }
        this.sunrise = this.timeInRange(this.sunriseStr, '12:00');
        this.sunset = this.timeInRange(this.sunsetStr, '22:00');
        for (const item in this.presenceTimers) {
            if (!Object.prototype.hasOwnProperty.call(this.presenceTimers, item)) {
                continue;
            }
            const pt = this.presenceTimers[item];
            switch (pt.optionPresence) {
                case 'time':
                    if (pt.presenceTimeFrom == '' || pt.presenceTimeTo == '') {
                        this.log.warn(
                            `Please check the times when configuring attendance: ${pt.name} -- ${pt.nameID} `,
                        );
                        return;
                    }
                    if (this.timeInRange(pt.presenceTimeFrom, pt.presenceTimeTo) && !pt.wasOn) {
                        this.log.debug(
                            `Delay for: ${pt.name} -- ${pt.nameID}  starts ${pt.presenceDelay}ms, because time is in range.`,
                        );
                        pt.wasOn = true;
                        pt.presenceDelayTimer = setTimeout(() => {
                            pt.presenceDelayTimer = null;
                            this.log.debug(
                                `Delay for: ${pt.name} -- ${pt.nameID}  ends and switch ON ${pt.presenceLength}ms.`,
                            );
                            this.setForeignState(pt.nameID, this.bools(pt.presenceValueON), err => {
                                if (err) {
                                    this.log.warn(`Cannot set state: ${err}`);
                                }
                            });
                            pt.presenceLengthTimer = setTimeout(() => {
                                pt.presenceLengthTimer = null;
                                this.log.debug(`Switch ON for: ${pt.name} -- ${pt.nameID}  ends and switch OFF.`);
                                this.setForeignState(pt.nameID, this.bools(pt.presenceValueOff), err => {
                                    if (err) {
                                        this.log.warn(`Cannot set state: ${err}`);
                                    }
                                });
                            }, pt.presenceLength);
                        }, pt.presenceDelay);
                    } else {
                        this.log.debug(`${pt.name} -- ${pt.nameID}  was ON or is not in time range`);
                    }
                    break;
                case 'sunrise':
                    if (this.sunrise && !pt.wasOn) {
                        this.log.debug(
                            `Delay for: ${pt.name} -- ${pt.nameID}  starts ${pt.presenceDelay}ms, by sunrise`,
                        );
                        pt.wasOn = true;
                        pt.presenceDelayTimer = setTimeout(() => {
                            pt.presenceDelayTimer = null;
                            this.log.debug(
                                `Delay for: ${pt.name} -- ${pt.nameID}  ends and switch ON ${pt.presenceLength}ms.`,
                            );
                            this.setForeignState(pt.nameID, this.bools(pt.presenceValueON), err => {
                                if (err) {
                                    this.log.warn(`Cannot set state: ${err}`);
                                }
                            });
                            pt.presenceLengthTimer = setTimeout(() => {
                                pt.presenceLengthTimer = null;
                                this.log.debug(`Switch ON for: ${pt.name} -- ${pt.nameID}  ends and switch OFF.`);
                                this.setForeignState(pt.nameID, this.bools(pt.presenceValueOff), err => {
                                    if (err) {
                                        this.log.warn(`Cannot set state: ${err}`);
                                    }
                                });
                            }, pt.presenceLength);
                        }, pt.presenceDelay);
                    } else {
                        this.log.debug(`${pt.name} -- ${pt.nameID}  was ON or is no sunrise`);
                    }
                    break;
                case 'sunset':
                    if (this.sunset && !pt.wasOn) {
                        this.log.debug(
                            `Delay for: ${pt.name} -- ${pt.nameID}  starts ${pt.presenceDelay}ms, by sunset`,
                        );
                        pt.wasOn = true;
                        pt.presenceDelayTimer = setTimeout(() => {
                            pt.presenceDelayTimer = null;
                            this.log.debug(
                                `Delay for: ${pt.name} -- ${pt.nameID}  ends and switch ON ${pt.presenceLength}ms.`,
                            );
                            this.setForeignState(pt.nameID, this.bools(pt.presenceValueON), err => {
                                if (err) {
                                    this.log.warn(`Cannot set state: ${err}`);
                                }
                            });
                            pt.presenceLengthTimer = setTimeout(() => {
                                pt.presenceLengthTimer = null;
                                this.log.debug(`Switch ON for: ${pt.name} -- ${pt.nameID}  ends and switch OFF.`);
                                this.setForeignState(pt.nameID, this.bools(pt.presenceValueOff), err => {
                                    if (err) {
                                        this.log.warn(`Cannot set state: ${err}`);
                                    }
                                });
                            }, pt.presenceLength);
                        }, pt.presenceDelay);
                    } else {
                        this.log.debug(`${pt.name} -- ${pt.nameID}  was ON or is no sunset`);
                    }
                    break;
                case 'light': {
                    const lightVal = await this.getForeignStateAsync(pt.presenceTriggerLight).catch(e => {
                        this.log.warn(`Check your light ID ${pt.name} -- ${pt.nameID}  in presence config! +++ ${e}`);
                        return undefined;
                    });
                    if (lightVal && (lightVal.val as number) < pt.presenceLightLux && !pt.wasOn) {
                        this.log.debug(
                            `Delay for: ${pt.name} -- ${pt.nameID}  starts ${pt.presenceDelay}ms, because light value is not under the limit.`,
                        );
                        pt.wasOn = true;
                        pt.presenceDelayTimer = setTimeout(() => {
                            pt.presenceDelayTimer = null;
                            this.log.debug(
                                `Delay for: ${pt.name} -- ${pt.nameID}  ends and switch ON ${pt.presenceLength}ms.`,
                            );
                            this.setForeignState(pt.nameID, this.bools(pt.presenceValueON), err => {
                                if (err) {
                                    this.log.warn(`Cannot set state: ${err}`);
                                }
                            });
                            pt.presenceLengthTimer = setTimeout(() => {
                                pt.presenceLengthTimer = null;
                                this.log.debug(`Switch ON for: ${pt.name} -- ${pt.nameID}  ends and switch OFF.`);
                                this.setForeignState(pt.nameID, this.bools(pt.presenceValueOff), err => {
                                    if (err) {
                                        this.log.warn(`Cannot set state: ${err}`);
                                    }
                                });
                            }, pt.presenceLength);
                        }, pt.presenceDelay);
                    } else {
                        this.log.debug(`${pt.name} -- ${pt.nameID}  was ON or light value is not under the limit.`);
                    }
                    break;
                }
                default:
                    this.log.warn(
                        `Please check presence configuration for: ${pt.name} -- ${pt.nameID} , value: ${pt.optionPresence as string}`,
                    );
            }
        }
    }

    /**
     * Converts a string value to its appropriate typed representation for presence device control.
     *
     * Handles `'true'`/`'false'` → boolean, `'1'`/`'0'` → string literals,
     * numeric strings → numbers.
     *
     * @param val - The string value to convert
     * @returns Typed value: boolean, string `'1'`/`'0'`, or number
     */
    private getValType(val: string): number | boolean | '1' | '0' {
        switch (val) {
            case 'true':
                return true;
            case 'false':
                return false;
            case '1':
                return '1';
            case '0':
                return '0';
            default:
        }
        if (isNaN(Number(val))) {
            return val as unknown as number;
        }
        return Number(val);
    }

    /**
     * Fetches the system's geographic coordinates from ioBroker configuration
     * and calculates sunrise/sunset times via {@link setSun}.
     */
    private async getAstro(): Promise<void> {
        const obj = await this.getForeignObjectAsync('system.config');
        if (obj?.common?.longitude && obj.common.latitude) {
            const longitude = obj.common.longitude;
            const latitude = obj.common.latitude;
            this.log.debug(`longitude: ${longitude} | latitude: ${latitude}`);
            this.setSun(longitude, latitude);
        } else {
            this.log.error('System location settings cannot be called up. Please check configuration!');
        }
    }

    /**
     * Calculates and stores today's sunrise and sunset times using SunCalc.
     *
     * @param longitude - Geographic longitude of the system location
     * @param latitude - Geographic latitude of the system location
     */
    private setSun(longitude: number, latitude: number): void {
        try {
            const times = SunCalc.getTimes(new Date(), latitude, longitude);
            this.log.debug('calculate astrodata ...');
            this.sunsetStr = `${`0${times.sunset.getHours()}`.slice(-2)}:${`0${times.sunset.getMinutes()}`.slice(-2)}`;
            this.sunriseStr = `${`0${times.sunrise.getHours()}`.slice(-2)}:${`0${times.sunrise.getMinutes()}`.slice(-2)}`;
            this.log.debug(`Sunrise today: ${this.sunriseStr}`);
            this.log.debug(`Sunset today: ${this.sunsetStr}`);
        } catch (e) {
            this.log.debug(String(e));
            this.log.warn('cannot calculate astrodata ... please check your config for latitude und longitude!!');
        }
    }

    /**
     * Calculates a randomized time duration for presence simulation.
     *
     * Multiplies the base duration by a random factor between 1 and `high` (inclusive)
     * to produce variation in presence device switching times.
     *
     * @param durance - Base duration in milliseconds
     * @param high - Upper bound of the random multiplier
     * @returns Randomized duration in milliseconds
     */
    private getTimeLength(durance: number, high: number): number {
        const low = 1;
        return durance * (Math.floor(Math.random() * (high - low + 1)) + low);
    }

    /**
     * Returns today's date at midnight (00:00:00) with no time component.
     *
     * @returns A Date object set to the start of today
     */
    private currentDate(): Date {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }

    /**
     * Parses an `HH:MM` time string and returns a Date object for today at that time.
     *
     * @param strTime - Time string in `HH:MM` format
     * @returns Date object set to today at the specified time
     */
    private addTime(strTime: string): Date {
        const time = strTime.split(':');
        const d = this.currentDate();
        d.setHours(parseInt(time[0]));
        d.setMinutes(parseInt(time[1]));
        return d;
    }

    /**
     * Checks whether the current time falls within a given time range.
     *
     * Handles ranges that cross midnight (e.g., `22:00` to `06:00`).
     *
     * @param strLower - Start of the range in `HH:MM` format
     * @param strUpper - End of the range in `HH:MM` format
     * @returns `true` if the current time is within the specified range
     */
    private timeInRange(strLower: string, strUpper: string): boolean {
        const now = new Date();
        strLower = strLower.toString();
        strUpper = strUpper.toString();
        const lower = this.addTime(strLower);
        const upper = this.addTime(strUpper);
        let inRange: boolean;
        if (upper > lower) {
            inRange = now >= lower && now <= upper;
        } else {
            inRange = !(now >= upper && now <= lower);
        }
        return inRange;
    }

    /**
     * Configures cron-based scheduled jobs using `node-schedule`.
     *
     * Sets up three schedules:
     * - **Daily reset** (midnight): clears `info.log_today` and restarts presence timers
     * - **Night rest start** (`night_from`): activates sleep mode
     * - **Night rest end** (`night_to`): deactivates sleep mode and disarms if not armed/inside
     */
    private setSchedules(): void {
        this.scheduleReset = schedule.scheduleJob({ hour: 0, minute: 0 }, async () => {
            await this.setStateAsync('info.log_today', '', true);
            if (this.optPresence && this.activated && this.presenceRun) {
                await this.setAllPresenceTimer(() => {
                    this.log.debug(`Restart presence timers for a new day!`);
                    this.presenceInterval = setInterval(async () => {
                        await this.checkPresence();
                    }, 60000);
                });
            }
        });
        if (this.config.night_from && this.config.night_to) {
            let from: string[], to: string[];
            try {
                from = this.config.night_from.split(':');
                to = this.config.night_to.split(':');
            } catch (e) {
                this.log.warn(`Cannot read night rest time: ${e}`);
                return;
            }
            this.scheduleFrom = schedule.scheduleJob(
                { hour: parseInt(from[0]), minute: parseInt(from[1]) },
                async () => {
                    await this.setStateAsync('status.sleep', true, true);
                    await this.sleepBegin(true);
                },
            );
            this.scheduleTo = schedule.scheduleJob({ hour: parseInt(to[0]), minute: parseInt(to[1]) }, async () => {
                await this.setStateAsync('status.sleep', false, true);
                if (!this.activated && !this.inside) {
                    await this.countdown(false);
                }
            });
            this.log.debug(
                `Night rest configured from ${parseInt(from[0])}:${parseInt(from[1])} to ${parseInt(to[0])}:${parseInt(to[1])}`,
            );
        } else {
            this.log.debug('No night rest configured');
        }
    }
}

/**
 * Module entry point.
 * When required as a module (by ioBroker), exports a factory function.
 * When executed directly, creates a new Alarm adapter instance.
 */
if (require.main !== module) {
    module.exports = (options?: Partial<utils.AdapterOptions>): Alarm => new Alarm(options);
} else {
    (() => new Alarm())();
}
