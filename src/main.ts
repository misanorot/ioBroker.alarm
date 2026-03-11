import * as utils from '@iobroker/adapter-core';
import * as schedule from 'node-schedule';
import SunCalc from 'suncalc2';
import type { AlarmAdapterConfig, CircuitRow, OtherAlarmRow, ShortsInRow, ShortsRow, ZoneRow } from './types';

type PresenceTimer = {
    name_id: string;
    name: string;
    option_presence: string;
    presence_time_from: string;
    presence_time_to: string;
    presence_length: number;
    presenceLengthTimer: null | NodeJS.Timeout;
    presenceDelayTimer: null | NodeJS.Timeout;
    presence_delay: number;
    presence_val_on: number | boolean | '1' | '0';
    presence_val_off: number | boolean | '1' | '0';
    presence_trigger_light: string;
    presence_light_lux: number;
    wasOn: boolean;
};

class Alarm extends utils.Adapter {
    declare config: AlarmAdapterConfig;

    private silent_i = false;
    private alarm_i = false;
    private clean_ids: string[] = [];
    private alarm_ids: string[] = [];
    private inside_ids: string[] = [];
    private notification_ids: string[] = [];
    private leave_ids: string[] = [];
    private one_ids: string[] = [];
    private two_ids: string[] = [];
    private one_states: Record<string, ioBroker.StateValue> = {};
    private two_states: Record<string, ioBroker.StateValue> = {};
    private zone_one_ids: string[] = [];
    private zone_two_ids: string[] = [];
    private zone_three_ids: string[] = [];
    private zone_one_states: Record<string, ioBroker.StateValue> = {};
    private zone_two_states: Record<string, ioBroker.StateValue> = {};
    private zone_three_states: Record<string, ioBroker.StateValue> = {};
    private states: Record<string, ioBroker.StateValue> = {};
    private send_instances: string[] = [];
    private log_list: string | string[] = '';
    private alarm_repeat!: number;
    private is_alarm = false;
    private is_inside = false;
    private is_notification = false;
    private is_panic = false;
    private ids_shorts_input: string[] = [];
    private names_alarm: string | undefined;
    private names_inside: string | undefined;
    private names_notification: string | undefined;
    private names_one: string | undefined;
    private names_two: string | undefined;
    private names_zone_one: string | undefined;
    private names_zone_two: string | undefined;
    private names_zone_three: string | undefined;
    private change_ids: Record<string, ioBroker.StateValue> = {};
    private opt_presence: ioBroker.StateValue = false;
    private opt_one: ioBroker.StateValue = true;
    private opt_two: ioBroker.StateValue = true;
    private opt_three: ioBroker.StateValue = true;
    private activated: ioBroker.StateValue = false;
    private night_rest: ioBroker.StateValue = false;
    private inside: ioBroker.StateValue = false;
    private burgle = false;
    private timer: ReturnType<typeof setInterval> | null = null;
    private speech_timeout: ReturnType<typeof setTimeout> | null = null;
    private silent_timer: ReturnType<typeof setTimeout> | null = null;
    private siren_inside_timer: ReturnType<typeof setTimeout> | null = null;
    private timer_notification_changes: ReturnType<typeof setTimeout> | null = null;
    private siren_timer: ReturnType<typeof setTimeout> | null = null;
    private silent_interval: ReturnType<typeof setInterval> | null = null;
    private silent_countdown: ReturnType<typeof setInterval> | null = null;
    private alarm_interval: ReturnType<typeof setInterval> | null = null;
    private text_alarm_interval: ReturnType<typeof setInterval> | null = null;
    private text_changes_interval: ReturnType<typeof setInterval> | null = null;
    private optLog: boolean;
    private shorts_in: ShortsInRow[];
    private shorts: ShortsRow[];
    private schedule_from!: schedule.Job;
    private schedule_to!: schedule.Job;
    private schedule_reset!: schedule.Job;
    private presenceDelay_timer: ReturnType<typeof setTimeout> | null = null;
    private sunrise = false;
    private sunset = false;
    private presenceInterval: ReturnType<typeof setInterval> | undefined;
    private presenceTimers: Record<string, PresenceTimer> = {};
    private presenceRun = false;
    private sunsetStr: string | undefined;
    private sunriseStr: string | undefined;

    public constructor(options: Partial<utils.AdapterOptions> = {}) {
        super({
            ...options,
            name: 'alarm',
        });
        this.on('ready', () => this.main());
        this.on('stateChange', (id: string, state: ioBroker.State | null | undefined) => this.onStateChange(id, state));
        this.on('unload', cb => this.onUnload(cb));
    }

    private onUnload(callback: () => void): void {
        try {
            this.log.info('cleaned everything up...');
            this.schedule_from.cancel();
            this.schedule_to.cancel();
            this.schedule_reset.cancel();
            clearInterval(this.timer);
            clearTimeout(this.silent_timer);
            clearTimeout(this.speech_timeout);
            clearTimeout(this.siren_timer);
            clearInterval(this.silent_interval);
            clearInterval(this.silent_countdown);
            clearInterval(this.alarm_interval);
            clearInterval(this.text_alarm_interval);
            clearInterval(this.text_changes_interval);
            this.clearAllPresenceTimer();
            callback();
        } catch (e) {
            this.log.debug(String(e));
            callback();
        }
    }

    private async onStateChange(id: string, state: ioBroker.State | null | undefined): Promise<void> {
        if (state) {
            await this.change(id, state);
        } else {
            this.log.info(`state ${id} deleted`);
        }
    }

    private async main(): Promise<void> {
        this.optLog = this.config.opt_log;
        this.shorts = this.config.shorts;
        this.shorts_in = this.config.shorts_in;
        this.alarm_repeat = parseInt(this.config.alarm_repeat);
        const stateA = await this.getStateAsync('status.activated').catch(e => this.log.warn(e));
        if (!stateA) {
            this.activated = false;
            await this.setStateAsync('status.activated', false, true);
        } else {
            this.activated = stateA.val;
        }
        const stateP = await this.getStateAsync('presence.on_off').catch(e => this.log.warn(e));
        if (!stateP) {
            this.opt_presence = false;
            await this.setStateAsync('presence.on_off', false, true);
        } else {
            this.opt_presence = stateP.val;
        }
        const stateOne = await this.getStateAsync('zone.one_on_off').catch(e => this.log.warn(e));
        if (!stateOne) {
            this.opt_one = false;
            await this.setStateAsync('zone.one_on_off', false, true);
        } else {
            this.opt_one = stateOne.val;
        }
        const stateTwo = await this.getStateAsync('zone.two_on_off').catch(e => this.log.warn(e));
        if (!stateTwo) {
            this.opt_two = false;
            await this.setStateAsync('zone.two_on_off', false, true);
        } else {
            this.opt_two = stateTwo.val;
        }
        const stateThree = await this.getStateAsync('zone.three_on_off').catch(e => this.log.warn(e));
        if (!stateThree) {
            this.opt_three = false;
            await this.setStateAsync('zone.three_on_off', false, true);
        } else {
            this.opt_three = stateThree.val;
        }
        const stateS = await this.getStateAsync('status.sleep').catch(e => this.log.warn(e));
        if (!stateS) {
            this.night_rest = false;
            await this.setStateAsync('status.sleep', false, true);
        } else {
            this.night_rest = stateS.val;
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
        this.send_instances = this.splitArr(this.config.sendTo);
        this.log.debug(`Messages to: ${JSON.stringify(this.send_instances)}`);
        this.ids_shorts_input = this.getShortIds(this.shorts_in);
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
        if (!this.config.opt_warning && this.is_alarm) {
            await this.setStateAsync('info.log', `${this.config.log_act_not} ${this.names_alarm}`, true);
            if (this.optLog) {
                this.log.info(`${this.config.log_act_not} ${this.names_alarm}`);
            }
            if (this.config.send_activation) {
                this.messages(`${this.config.log_act_not} ${this.names_alarm}`);
            }
            await this.setStateAsync('status.activation_failed', true, true);
            await this.setStateAsync('status.state_list', 6, true);
            await this.setStateAsync('status.state', 'activation failed', true);
            await this.setStateAsync('use.list', 0, true);
            if (this.config.opt_say_names) {
                say = `${say} ${this.names_alarm}`;
            }
            this.sayit(say, 3);
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
        if (this.is_alarm) {
            await this.setStateAsync('status.activated_with_warnings', true, true);
            await this.setStateAsync('status.state', 'activated with warnings', true);
            await this.setStateAsync('info.log', `${this.config.log_act_warn} ${this.names_alarm}`, true);
            if (this.optLog) {
                this.log.info(`${this.config.log_act_warn} ${this.names_alarm}`);
            }
            if (this.config.send_activated_with_warnings) {
                this.messages(`${this.config.log_act_warn} ${this.names_alarm}`);
            }
        } else {
            await this.setStateAsync('info.log', `${this.config.log_act}`, true);
            if (this.optLog) {
                this.log.info(`${this.config.log_act}`);
            }
            this.sayit(this.config.text_activated, 1);
            if (this.config.send_activation) {
                this.messages(`${this.config.log_act}`);
            }
        }
    }

    private async disableSystem(): Promise<void> {
        this.burgle = false;
        clearTimeout(this.silent_timer);
        clearTimeout(this.siren_timer);
        clearInterval(this.silent_interval);
        clearInterval(this.silent_countdown);
        clearInterval(this.alarm_interval);
        clearInterval(this.text_alarm_interval);
        clearInterval(this.text_changes_interval);
        this.clearAllPresenceTimer();
        this.silent_timer = null;
        this.siren_timer = null;
        this.silent_interval = null;
        this.silent_countdown = null;
        this.alarm_interval = null;
        this.text_alarm_interval = null;
        this.text_changes_interval = null;
        if (this.activated || this.is_panic) {
            this.is_panic = false;
            await this.setStateAsync('info.log', `${this.config.log_deact}`, true);
            this.sayit(this.config.text_deactivated, 2);
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
        } else if (this.night_rest) {
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
        if (this.silent_timer && silent) {
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
                this.silent_interval = setInterval(async () => {
                    if (this.silent_i) {
                        await this.setStateAsync('status.silent_flash', true, true);
                        this.silent_i = false;
                    } else {
                        await this.setStateAsync('status.silent_flash', false, true);
                        this.silent_i = true;
                    }
                }, this.config.silent_flash * 1000);
            }
            let silent_countdown_time =
                (this.timeMode(this.config.time_silent_select) * this.config.time_silent) / 1000;
            this.silent_countdown = setInterval(async () => {
                if (silent_countdown_time > 0) {
                    silent_countdown_time = silent_countdown_time - 1;
                    await this.setStateAsync('status.silent_countdown', silent_countdown_time, true);
                } else {
                    await this.setStateAsync('status.silent_countdown', null, true);
                    clearInterval(this.silent_countdown);
                }
            }, 1000);
            this.silent_timer = setTimeout(
                async () => {
                    this.burgle = true;
                    if (this.config.send_alarm) {
                        this.messages(`${this.config.log_burgle} ${name}`);
                    }
                    clearTimeout(this.silent_timer);
                    clearInterval(this.silent_interval);
                    this.clearAllPresenceTimer();
                    this.sayit(say, 6);
                    this.text_alarm_interval = setInterval(() => {
                        if (count < this.alarm_repeat) {
                            this.sayit(say, 6);
                            count++;
                        } else {
                            clearInterval(this.text_alarm_interval);
                        }
                    }, this.config.text_alarm_pause * 1000);
                    await this.setStateAsync('status.burglar_alarm', true, true);
                    await this.setStateAsync('status.silent_alarm', false, true);
                    await this.setStateAsync('status.silent_flash', false, true);
                    await this.setStateAsync('status.siren_inside', true, true);
                    this.siren_inside_timer = setTimeout(
                        async () => {
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
            clearTimeout(this.silent_timer);
            clearInterval(this.silent_interval);
            clearInterval(this.silent_countdown);
            this.clearAllPresenceTimer();
            if (this.config.send_alarm_inside && indoor) {
                this.messages(`${this.config.log_burgle} ${name}`);
            }
            if (this.config.send_alarm && !indoor) {
                this.messages(`${this.config.log_burgle} ${name}`);
            }
            this.sayit(say, 6);
            this.text_alarm_interval = setInterval(() => {
                if (count < this.alarm_repeat) {
                    this.sayit(say, 6);
                    count++;
                } else {
                    clearInterval(this.text_alarm_interval);
                }
            }, this.config.text_alarm_pause * 1000);
            await this.setStateAsync('status.burglar_alarm', true, true);
            await this.setStateAsync('status.silent_alarm', false, true);
            await this.setStateAsync('status.silent_flash', false, true);
            await this.setStateAsync('status.siren_inside', true, true);
            this.siren_inside_timer = setTimeout(
                async () => {
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
            this.siren_timer = setTimeout(
                async () => {
                    await this.setStateAsync('status.siren', false, true);
                    clearTimeout(this.siren_timer);
                },
                this.timeMode(this.config.time_alarm_select) * this.config.time_alarm,
            );
        }
    }

    private async panic(): Promise<void> {
        let count = 0;
        this.is_panic = true;
        await this.setStateAsync('info.log', `${this.config.log_panic}`, true);
        if (this.optLog) {
            this.log.info(`${this.config.log_panic}`);
        }
        if (this.config.send_alarm) {
            this.messages(`${this.config.log_panic}`);
        }
        this.sayit(this.config.text_alarm, 6);
        this.text_alarm_interval = setInterval(() => {
            if (count < this.alarm_repeat) {
                this.sayit(this.config.text_alarm, 6);
                count++;
            } else {
                clearInterval(this.text_alarm_interval);
            }
        }, this.config.text_alarm_pause * 1000);

        await this.setStateAsync('status.burglar_alarm', true, true);

        if (this.config.alarm_flash > 0) {
            this.alarm_interval = setInterval(async () => {
                if (this.alarm_i) {
                    await this.setStateAsync('status.alarm_flash', true, true);
                    this.alarm_i = false;
                } else {
                    await this.setStateAsync('status.alarm_flash', false, true);
                    this.alarm_i = true;
                }
            }, this.config.alarm_flash * 1000);
        }
        await this.setStateAsync('status.siren', true, true);
        await this.setStateAsync('status.state', 'burgle', true);
        await this.setStateAsync('status.state_list', 3, true);
        await this.setStateAsync('homekit.CurrentState', 4, true);
        this.siren_timer = setTimeout(
            async () => {
                await this.setStateAsync('status.siren', false, true);
            },
            this.timeMode(this.config.time_alarm_select) * this.config.time_alarm,
        );
    }

    private async change(id: string, state: ioBroker.State): Promise<void> {
        let is_not_change = false;
        for (const i in this.states) {
            if (i === id) {
                if (this.states[id] === state.val) {
                    is_not_change = true;
                    break;
                }
                this.states[id] = state.val;
                await this.refreshLists();
                this.log.debug(`Inside states, state change: ${id} val: ${state.val}`);
            }
        }
        for (const i in this.one_states) {
            if (i === id) {
                if (this.one_states[id] === state.val) {
                    is_not_change = true;
                    break;
                }
                this.one_states[id] = state.val;
                await this.refreshLists();
                this.log.debug(`Inside one, state change: ${id} val: ${state.val}`);
            }
        }
        for (const i in this.two_states) {
            if (i === id) {
                if (this.two_states[id] === state.val) {
                    is_not_change = true;
                    break;
                }
                this.two_states[id] = state.val;
                await this.refreshLists();
                this.log.debug(`Inside two, state change: ${id} val: ${state.val}`);
            }
        }
        for (const i in this.zone_one_states) {
            if (i === id) {
                if (this.zone_one_states[id] === state.val) {
                    is_not_change = true;
                    break;
                }
                this.zone_one_states[id] = state.val;
                await this.refreshLists();
                this.log.debug(`Inside zone_one, state change: ${id} val: ${state.val}`);
            }
        }
        for (const i in this.zone_two_states) {
            if (i === id) {
                if (this.zone_two_states[id] === state.val) {
                    is_not_change = true;
                    break;
                }
                this.zone_two_states[id] = state.val;
                await this.refreshLists();
                this.log.debug(`Inside zone_two, state change: ${id} val: ${state.val}`);
            }
        }
        for (const i in this.zone_three_states) {
            if (i === id) {
                if (this.zone_three_states[id] === state.val) {
                    is_not_change = true;
                    break;
                }
                this.zone_three_states[id] = state.val;
                await this.refreshLists();
                this.log.debug(`Inside zone_three, state change: ${id} val: ${state.val}`);
            }
        }
        if (is_not_change) {
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
            if (this.opt_presence) {
                this.presenceDelay_timer = setTimeout(
                    () => {
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
            this.opt_presence = state.val;
            if (!state.val) {
                this.clearAllPresenceTimer();
            }
            return;
        }
        if (id === `${this.namespace}.zone.one_on_off`) {
            this.opt_one = state.val;
            return;
        }
        if (id === `${this.namespace}.zone.two_on_off`) {
            this.opt_two = state.val;
            return;
        }
        if (id === `${this.namespace}.zone.three_on_off`) {
            this.opt_three = state.val;
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
            clearTimeout(this.siren_inside_timer);
            clearTimeout(this.timer_notification_changes);
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
        if (this.ids_shorts_input.includes(id)) {
            this.shortcutsInside(id, state.val);
            return;
        }
        if (
            this.leave_ids.includes(id) &&
            !this.activated &&
            !this.isTrue(id, state, 'main') &&
            this.timer &&
            this.config.opt_leave
        ) {
            await this.leaving(id, state);
            return;
        }
        if (this.alarm_ids.includes(id) && this.activated && this.isTrue(id, state, 'main')) {
            if (!this.zone(id)) {
                return;
            }
            await this.burglary(id, state, this.isSilent(id));
            return;
        }
        if (this.inside_ids.includes(id) && this.inside && this.isTrue(id, state, 'main')) {
            if (!this.zone(id)) {
                return;
            }
            await this.burglary(id, state, this.isSilent(id, true), true);
        }
        if (this.notification_ids.includes(id) && this.isTrue(id, state, 'main')) {
            if (!this.zone(id)) {
                return;
            }
            if (!this.activated && !this.inside && !this.night_rest) {
                return;
            }
            const name = this.getName(id);
            await this.setStateAsync('info.log', `${this.config.log_warn} ${name}`, true);
            await this.setStateAsync('info.notification_circuit_changes', true, true);
            if (this.night_rest) {
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
                this.sayit(say, 9);
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
                this.sayit(say, 5);
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
                this.sayit(say, 5);
            }
            this.timer_notification_changes = setTimeout(
                async () => {
                    await this.setStateAsync('info.notification_circuit_changes', false, true);
                },
                this.timeMode(this.config.time_warning_select) * this.config.time_warning,
            );
        }
        if (this.one_ids.includes(id) && this.isTrue(id, state, 'one')) {
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
            this.sayit(say, 12);
            await this.setStateAsync('other_alarms.one_changes', true, true);
        }
        if (this.two_ids.includes(id) && this.isTrue(id, state, 'two')) {
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
            this.sayit(say, 13);
            await this.setStateAsync('other_alarms.two_changes', true, true);
        }
        if (this.zone_one_ids.includes(id) && this.isTrue(id, state, 'zone_one')) {
            if (!this.opt_one) {
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
        if (this.zone_two_ids.includes(id) && this.isTrue(id, state, 'zone_two')) {
            if (!this.opt_two) {
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
        if (this.zone_three_ids.includes(id) && this.isTrue(id, state, 'zone_three')) {
            if (!this.opt_three) {
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
        this.clean_ids.forEach(ele => {
            if (ele) {
                this.log.debug(`SUBSCRIPTION for: ${ele}`);
                this.subscribeForeignStates(ele);
            } else {
                this.log.debug(`NO SUBSCRIPTION for monitoring circuits`);
            }
        });
        this.ids_shorts_input.forEach(ele => {
            if (ele) {
                this.log.debug(`SUBSCRIPTION for input shortcuts: ${ele}`);
                this.subscribeForeignStates(ele);
            } else {
                this.log.debug(`NO SUBSCRIPTION for input shortcuts`);
            }
        });
        this.one_ids.forEach(ele => {
            if (ele) {
                this.log.debug(`SUBSCRIPTION for other alarm one: ${ele}`);
                this.subscribeForeignStates(ele);
            } else {
                this.log.debug(`NO SUBSCRIPTION for other alarm one`);
            }
        });
        this.two_ids.forEach(ele => {
            if (ele) {
                this.log.debug(`SUBSCRIPTION for other alarm two: ${ele}`);
                this.subscribeForeignStates(ele);
            } else {
                this.log.debug(`NO SUBSCRIPTION for other alarm two`);
            }
        });
        this.zone_one_ids.forEach(ele => {
            if (ele) {
                this.log.debug(`SUBSCRIPTION for zone_one: ${ele}`);
                this.subscribeForeignStates(ele);
            } else {
                this.log.debug(`NO SUBSCRIPTION for zone_one`);
            }
        });
        this.zone_two_ids.forEach(ele => {
            if (ele) {
                this.log.debug(`SUBSCRIPTION for zone_two: ${ele}`);
                this.subscribeForeignStates(ele);
            } else {
                this.log.debug(`NO SUBSCRIPTION for zone_two`);
            }
        });
        this.zone_three_ids.forEach(ele => {
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
        if (this.send_instances.length) {
            const reg = new RegExp('telegram');
            this.send_instances.forEach(ele => {
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
        this.speech_timeout = setTimeout(() => {
            this.setForeignState(id, message, err => {
                if (err) {
                    this.log.warn(err as unknown as string);
                }
            });
        }, delay * 1000);
    }

    private sayit(message: string, opt_val: number): void {
        const tts_instance = this.config.sayit;
        if (this.night_rest && this.config.opt_night_silent) {
            return;
        }
        tts_instance?.forEach(ele => {
            if (ele.enabled) {
                switch (opt_val) {
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
            return !!this.opt_one;
        }
        if (id === `${this.namespace}.zone.two`) {
            return !!this.opt_two;
        }
        if (id === `${this.namespace}.zone.three`) {
            return !!this.opt_three;
        }
        return true;
    }

    private async alarmSiren(): Promise<void> {
        await this.setStateAsync('status.siren', true, true);
        this.siren_timer = setTimeout(
            async () => {
                await this.setStateAsync('status.siren', false, true);
                clearTimeout(this.siren_timer);
            },
            this.timeMode(this.config.time_alarm_select) * this.config.time_alarm,
        );
    }

    private alarmFlash(): void {
        if (this.config.alarm_flash > 0) {
            this.alarm_interval = setInterval(async () => {
                if (this.alarm_i) {
                    await this.setStateAsync('status.alarm_flash', true, true);
                    this.alarm_i = false;
                } else {
                    await this.setStateAsync('status.alarm_flash', false, true);
                    this.alarm_i = true;
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
        this.clean_ids.forEach(ele => {
            this.one_ids.forEach(item => {
                if (item === ele) {
                    this.log.warn(`You use double states in main and other alarms, PLEASE FIX IT: ${item}`);
                }
            });
            this.two_ids.forEach(item => {
                if (item === ele) {
                    this.log.warn(`You use double states in main and other alarms, PLEASE FIX IT: ${item}`);
                }
            });
            this.zone_one_ids.forEach(item => {
                if (item === ele) {
                    this.log.warn(`You use double states in main and other alarms, PLEASE FIX IT: ${item}`);
                }
            });
            this.zone_two_ids.forEach(item => {
                if (item === ele) {
                    this.log.warn(`You use double states in main and other alarms, PLEASE FIX IT: ${item}`);
                }
            });
            this.zone_three_ids.forEach(item => {
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
            if (this.is_inside) {
                let say = this.config.text_warning;
                if (this.config.send_activation_warnings_inside) {
                    this.messages(`${this.config.log_warn_b_w} ${this.names_inside}`);
                }
                await this.setStateAsync('info.log', `${this.config.log_warn_b_w} ${this.names_inside}`, true);
                if (this.optLog) {
                    this.log.info(`${this.config.log_warn_b_w} ${this.names_inside}`);
                }
                if (this.config.opt_say_names) {
                    say = `${say} ${this.names_inside}`;
                }
                this.sayit(say, 4);
            } else {
                await this.setStateAsync('info.log', `${this.config.log_warn_act}`, true);
                if (this.optLog) {
                    this.log.info(`${this.config.log_warn_act}`);
                }
                if (this.config.send_activation_inside) {
                    this.messages(`${this.config.log_warn_act}`);
                }
                this.sayit(this.config.text_warn_begin, 10);
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
                clearTimeout(this.siren_inside_timer);
                clearTimeout(this.timer_notification_changes);
                await this.setStateAsync('info.log', `${this.config.log_warn_deact}`, true);
                if (this.optLog) {
                    this.log.info(`${this.config.log_warn_deact}`);
                }
                if (this.config.send_activation_inside) {
                    this.messages(`${this.config.log_warn_deact}`);
                }
                this.sayit(this.config.text_warn_end, 0);
                await this.setStateAsync('status.sharp_inside_activated', false, true);
                await this.disableStates();
            }
        }
    }

    private async sleepBegin(auto?: boolean): Promise<void> {
        if (this.night_rest || this.burgle) {
            return;
        }
        if ((auto && this.inside) || (auto && this.activated)) {
            this.log.warn(`Cannot set alarm system to night rest, it is sharp or sharp inside`);
            return;
        }
        this.activated = false;
        this.night_rest = true;
        await this.insideEnds();
        if (this.optLog) {
            this.log.info(`${this.config.log_sleep_b}`);
        }
        await this.setStateAsync('info.log', `${this.config.log_sleep_b}`, true);
        if (!this.is_notification) {
            this.sayit(this.config.text_nightrest_beginn, 7);
        }
        await this.setStateAsync('status.state', 'night rest', true);
        await this.setStateAsync('status.state_list', 4, true);
        await this.setStateAsync('homekit.CurrentState', 2, true);
        await this.setStateAsync('homekit.TargetState', 2, true);
        await this.setStateAsync('use.list', 4, true);
        if (this.is_notification) {
            let say = this.config.text_warning;
            if (this.config.send_activation_warnings_night) {
                this.messages(`${this.config.log_nights_b_w} ${this.names_notification}`);
            }
            await this.setStateAsync('info.log', `${this.config.log_nights_b_w} ${this.names_notification}`, true);
            if (this.optLog) {
                this.log.info(`${this.config.log_nights_b_w} ${this.names_notification}`);
            }
            if (this.config.opt_say_names) {
                say = `${say} ${this.names_notification}`;
            }
            this.sayit(say, 4);
        }
    }

    private async sleepEnd(off?: boolean): Promise<void> {
        if (this.night_rest) {
            this.night_rest = false;
            if (off) {
                await this.setStateAsync('info.log', `${this.config.log_sleep_e}`, true);
                this.sayit(this.config.text_nightrest_end, 8);
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
        this.check(this.alarm_ids, 'main', async (_val: boolean, ids: string[]) => {
            this.log.debug(`Alarm circuit list: ${ids.join(', ')}`);
            if (ids.length > 0) {
                this.is_alarm = true;
                this.names_alarm = this.getName(ids, 'main');
                await this.setStateAsync('info.alarm_circuit_list', this.names_alarm, true);
                await this.setStateAsync('info.alarm_circuit_list_html', this.getNameHtml(ids), true);
            } else {
                this.is_alarm = false;
                this.names_alarm = '';
                await this.setStateAsync('info.alarm_circuit_list', '', true);
                await this.setStateAsync('info.alarm_circuit_list_html', '', true);
            }
        });
        this.check(this.inside_ids, 'main', async (_val: boolean, ids: string[]) => {
            this.log.debug(`Inside circuit list: ${ids.join(', ')}`);
            if (ids.length > 0) {
                this.is_inside = true;
                this.names_inside = this.getName(ids, 'main');
                await this.setStateAsync('info.sharp_inside_circuit_list', this.names_inside, true);
                await this.setStateAsync('info.sharp_inside_circuit_list_html', this.getNameHtml(ids), true);
            } else {
                this.is_inside = false;
                this.names_inside = '';
                await this.setStateAsync('info.sharp_inside_circuit_list', '', true);
                await this.setStateAsync('info.sharp_inside_circuit_list_html', '', true);
            }
        });
        this.check(this.notification_ids, 'main', async (_val: boolean, ids: string[]) => {
            this.log.debug(`Notification circuit list: ${ids.join(', ')}`);
            if (ids.length > 0) {
                this.is_notification = true;
                this.names_notification = this.getName(ids, 'main');
                await this.setStateAsync('info.notification_circuit_list', this.names_notification, true);
                await this.setStateAsync('info.notification_circuit_list_html', this.getNameHtml(ids), true);
            } else {
                this.is_notification = false;
                this.names_notification = '';
                await this.setStateAsync('info.notification_circuit_list', '', true);
                await this.setStateAsync('info.notification_circuit_list_html', '', true);
            }
        });
        this.check(this.one_ids, 'one', async (_val: boolean, ids: string[]) => {
            this.log.debug(`One list: ${ids.join(', ')}`);
            if (ids.length > 0) {
                this.names_one = this.getName(ids, 'one');
                await this.setStateAsync('other_alarms.one_list', this.names_one, true);
                await this.setStateAsync('other_alarms.one_list_html', this.getNameHtml(ids, 'one'), true);
            } else {
                this.names_one = '';
                await this.setStateAsync('other_alarms.one_list', '', true);
                await this.setStateAsync('other_alarms.one_list_html', '', true);
            }
        });
        this.check(this.two_ids, 'two', async (_val: boolean, ids: string[]) => {
            this.log.debug(`Two list: ${ids.join(', ')}`);
            if (ids.length > 0) {
                this.names_two = this.getName(ids, 'two');
                await this.setStateAsync('other_alarms.two_list', this.names_two, true);
                await this.setStateAsync('other_alarms.two_list_html', this.getNameHtml(ids, 'two'), true);
            } else {
                this.names_two = '';
                await this.setStateAsync('other_alarms.two_list', '', true);
                await this.setStateAsync('other_alarms.two_list_html', '', true);
            }
        });
        this.check(this.zone_one_ids, 'zone_one', async (_val: boolean, ids: string[]) => {
            this.log.debug(`Zone_one list: ${ids.join(', ')}`);
            if (ids.length > 0) {
                this.names_zone_one = this.getName(ids, 'zone_one');
                this.log.debug(`Names in zone one: ${this.names_zone_one}`);
                await this.setStateAsync('zone.one', true, true);
            } else {
                this.names_zone_one = '';
                this.log.debug(`Names in zone one: ${this.names_zone_one}`);
                await this.setStateAsync('zone.one', false, true);
            }
        });
        this.check(this.zone_two_ids, 'zone_two', async (_val: boolean, ids: string[]) => {
            this.log.debug(`Zone_two list: ${ids.join(', ')}`);
            if (ids.length > 0) {
                this.names_zone_two = this.getName(ids, 'zone_two');
                this.log.debug(`Names in zone two: ${this.names_zone_two}`);
                await this.setStateAsync('zone.two', true, true);
            } else {
                this.names_zone_two = '';
                this.log.debug(`Names in zone two: ${this.names_zone_two}`);
                await this.setStateAsync('zone.two', false, true);
            }
        });
        this.check(this.zone_three_ids, 'zone_three', async (_val: boolean, ids: string[]) => {
            this.log.debug(`Zone_three list: ${ids.join(', ')}`);
            if (ids.length > 0) {
                this.names_zone_three = this.getName(ids, 'zone_three');
                this.log.debug(`Names in zone three: ${this.names_zone_three}`);
                await this.setStateAsync('zone.three', true, true);
            } else {
                this.names_zone_three = '';
                this.log.debug(`Names in zone three: ${this.names_zone_three}`);
                await this.setStateAsync('zone.three', false, true);
            }
        });
        if (this.is_alarm) {
            await this.setStateAsync('status.enableable', false, true);
        }
        if (this.config.opt_warning && this.is_alarm) {
            await this.setStateAsync('status.enableable', true, true);
        }
        if (!this.is_alarm) {
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
        const temp_arr = str.split(/[,;\s]+/);
        const clean_arr: string[] = [];
        temp_arr.forEach(ele => {
            if (ele) {
                clean_arr.push(ele.trim());
            }
        });
        return clean_arr;
    }

    private splitStates(arr: CircuitRow[]): void {
        arr.forEach(ele => {
            if (ele.enabled) {
                if (ele.alarm) {
                    this.alarm_ids.push(ele.name_id);
                }
                if (ele.warning) {
                    this.inside_ids.push(ele.name_id);
                }
                if (ele.night) {
                    this.notification_ids.push(ele.name_id);
                }
                if (ele.leave) {
                    this.leave_ids.push(ele.name_id);
                }
            } else {
                this.log.debug(`State not used but configured: ${ele.name_id}`);
            }
        });
    }

    private getIds(): void {
        let ids: string[] = [];
        ids = ids.concat(this.alarm_ids, this.inside_ids, this.notification_ids, this.leave_ids);
        this.clean_ids = Array.from(new Set(ids));
    }

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

    private check(arr: string[], table: string, callback: (val: boolean, ids: string[]) => void | Promise<void>): void {
        if (typeof table === 'undefined' || table === null) {
            this.log.warn(`Issue in function check, please report this the developer!`);
            return;
        }
        let tempStates: Record<string, ioBroker.StateValue>;
        if (table === 'main') {
            tempStates = this.states;
        } else if (table === 'one') {
            tempStates = this.one_states;
        } else if (table === 'two') {
            tempStates = this.two_states;
        } else if (table === 'zone_one') {
            tempStates = this.zone_one_states;
        } else if (table === 'zone_two') {
            tempStates = this.zone_two_states;
        } else if (table === 'zone_three') {
            tempStates = this.zone_three_states;
        } else {
            this.log.warn(`Issue in function check, please report this the developer!`);
            return;
        }
        const temp_arr: string[] = [];
        if (arr.length > 0) {
            arr.forEach(ele => {
                if (tempStates[ele] && !this.search(ele, table)) {
                    temp_arr.push(ele);
                } else if (tempStates[ele] == false && this.search(ele, table)) {
                    temp_arr.push(ele);
                }
            });
            if (temp_arr.length > 0) {
                void callback(true, temp_arr);
            } else {
                void callback(false, temp_arr);
            }
        }
    }

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

    private async getStateValueAsync(id: string): Promise<ioBroker.StateValue | null> {
        const state = await this.getForeignStateAsync(id);
        if (!state || state.val === null || state.val === undefined) {
            this.log.error(`state is null: ${id}`);
            return null;
        }
        return state.val;
    }

    private async getStatesDelay(id: string): Promise<ioBroker.StateValue | null> {
        return await this.getStateValueAsync(id);
    }

    private async fetchStates(): Promise<void> {
        for (const id of this.clean_ids) {
            this.states[id] = await this.getStatesDelay(id);
        }
        this.log.debug(JSON.stringify(this.states));
    }

    private async getOtherStates(): Promise<void> {
        if (this.config.one) {
            this.config.one.forEach(ele => {
                if (ele.enabled) {
                    this.one_ids.push(ele.name_id);
                }
            });
            for (const id of this.one_ids) {
                this.one_states[id] = await this.getStatesDelay(id);
            }
        }
        if (this.config.two) {
            this.config.two.forEach(ele => {
                if (ele.enabled) {
                    this.two_ids.push(ele.name_id);
                }
            });
            for (const id of this.two_ids) {
                this.two_states[id] = await this.getStatesDelay(id);
            }
        }
        this.log.debug(
            `other alarm are one: ${JSON.stringify(this.one_states)} two: ${JSON.stringify(this.two_states)}`,
        );
    }

    private async getZoneStates(): Promise<void> {
        if (this.config.zone_one) {
            this.config.zone_one.forEach(ele => {
                if (ele.enabled) {
                    this.zone_one_ids.push(ele.name_id);
                }
            });
            for (const id of this.zone_one_ids) {
                this.zone_one_states[id] = await this.getStatesDelay(id);
            }
        }
        if (this.config.zone_two) {
            this.config.zone_two.forEach(ele => {
                if (ele.enabled) {
                    this.zone_two_ids.push(ele.name_id);
                }
            });
            for (const id of this.zone_two_ids) {
                this.zone_two_states[id] = await this.getStatesDelay(id);
            }
        }
        if (this.config.zone_three) {
            this.config.zone_three.forEach(ele => {
                if (ele.enabled) {
                    this.zone_three_ids.push(ele.name_id);
                }
            });
            for (const id of this.zone_three_ids) {
                this.zone_three_states[id] = await this.getStatesDelay(id);
            }
        }
        this.log.debug(
            `zone one: ${JSON.stringify(this.zone_one_states)} zone two: ${JSON.stringify(this.zone_two_states)} zone three: ${JSON.stringify(this.zone_three_states)}`,
        );
    }

    private async leaving(_id: string, _state: ioBroker.State): Promise<void> {
        this.log.info(`Leaving state triggerd`);
        clearInterval(this.timer);
        this.timer = null;
        await this.setStateAsync('status.activation_countdown', null, true);
        await this.setStateAsync('status.gets_activated', false, true);
        await this.enableSystem();
    }

    private async countdown(count: boolean): Promise<void> {
        const time = this.timeMode(this.config.time_activate_select);
        let counter = (this.config.time_activate * time) / 1000;
        if (count && !this.timer && !this.activated) {
            const say = `${this.config.time_activate} ${this.config.text_countdown}`;
            if (this.is_alarm) {
                if (this.config.send_activation_warnings) {
                    this.messages(`${this.config.log_act_notice} ${this.names_alarm}`);
                }
                let warnSay = this.config.text_warning;
                if (this.config.opt_say_names) {
                    warnSay = `${warnSay} ${this.names_alarm}`;
                }
                this.sayit(warnSay, 4);
            }
            if (this.is_alarm) {
                setTimeout(() => {
                    this.sayit(say, 11);
                }, 5000);
            } else {
                this.sayit(say, 11);
            }
            await this.setStateAsync('status.gets_activated', true, true);
            await this.setStateAsync('status.state', 'gets activated', true);
            await this.setStateAsync('status.state_list', 5, true);
            this.timer = setInterval(async () => {
                if (counter > 0) {
                    counter--;
                    await this.setStateAsync('status.activation_countdown', counter, true);
                } else {
                    clearInterval(this.timer);
                    this.timer = null;
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
                this.sayit(this.config.text_aborted, 14);
                if (this.optLog) {
                    this.log.info(`${this.config.log_aborted}`);
                }
            }
            await this.disableSystem();
        }
    }

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

    private shortcutsInside(id: string, val: ioBroker.StateValue): void {
        const change = this.isChanged(id, val);
        this.shorts_in.forEach(async ele => {
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

    private getShortIds(ids: ShortsInRow[]): string[] {
        const idsArr = ids || [];
        const temp_ids: string[] = [];
        idsArr.forEach(ele => {
            if (ele.enabled) {
                temp_ids.push(ele.name_id);
            }
        });
        return temp_ids;
    }

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
                if (ele.enabled && ele.select_id == id && this.bools(ele.trigger_val) === setVal) {
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

    private isChanged(id: string, val: ioBroker.StateValue): boolean {
        if (this.change_ids[id] === val) {
            this.log.debug(`No changes inside shortcuts! ${id}`);
            return false;
        }
        this.change_ids[id] = val;
        return true;
    }

    private timeStamp(): string {
        const date = new Date();
        return `${`0${date.getHours()}`.slice(-2)}:${`0${date.getMinutes()}`.slice(-2)}`;
    }

    private async logging(content: string): Promise<void> {
        const state = await this.getStateAsync('info.log_today').catch(e => this.log.warn(e));
        if (!state) {
            this.log_list = '';
            await this.setStateAsync('info.log_today', this.log_list, true);
        } else {
            this.log_list = state.val as string;
            const log_list_arr = this.log_list.split('<br>');
            log_list_arr.unshift(`${this.timeStamp()}: ${content}`);
            await this.setStateAsync('info.log_today', log_list_arr.join('<br>'), true);
        }
    }

    private async setAllPresenceTimer(callback: () => void): Promise<void> {
        if (this.config.presence) {
            await this.getAstro();
            this.presenceRun = true;
            this.presenceTimers = {};
            this.config.presence.forEach(ele => {
                if (ele.enabled && ele.name_id !== '') {
                    const tempObj: PresenceTimer = {
                        name_id: ele.name_id,
                        name: ele.name,
                        presence_time_from: ele.presence_time_from,
                        presence_time_to: ele.presence_time_to,
                        option_presence: ele.option_presence,
                        presence_length: this.getTimeLength(
                            ele.presence_length * this.timeMode(ele.presence_length_select),
                            ele.presence_length_shuffle,
                        ),
                        presenceLengthTimer: null,
                        presence_delay: this.getTimeLength(
                            ele.presence_delay * this.timeMode(ele.presence_delay_select),
                            ele.presence_delay_shuffle,
                        ),
                        presenceDelayTimer: null,
                        presence_val_on: this.getValType(ele.presence_val_on),
                        presence_val_off: this.getValType(ele.presence_val_off),
                        presence_trigger_light: ele.presence_trigger_light,
                        presence_light_lux: ele.presence_light_lux,
                        wasOn: false,
                    };

                    this.presenceTimers[ele.name_id] = tempObj;
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

    private clearAllPresenceTimer(): void {
        this.presenceRun = false;
        clearTimeout(this.presenceDelay_timer);
        clearInterval(this.presenceInterval);
        for (const item in this.presenceTimers) {
            if (Object.prototype.hasOwnProperty.call(this.presenceTimers, item)) {
                clearTimeout(this.presenceTimers[item].presenceLengthTimer);
                clearTimeout(this.presenceTimers[item].presenceDelayTimer);
            }
        }
    }

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
            switch (pt.option_presence) {
                case 'time':
                    if (pt.presence_time_from == '' || pt.presence_time_to == '') {
                        this.log.warn(
                            `Please check the times when configuring attendance: ${pt.name} -- ${pt.name_id} `,
                        );
                        return;
                    }
                    if (this.timeInRange(pt.presence_time_from, pt.presence_time_to) && !pt.wasOn) {
                        this.log.debug(
                            `Delay for: ${pt.name} -- ${pt.name_id}  starts ${pt.presence_delay}ms, because time is in range.`,
                        );
                        pt.wasOn = true;
                        pt.presenceDelayTimer = setTimeout(() => {
                            this.log.debug(
                                `Delay for: ${pt.name} -- ${pt.name_id}  ends and switch ON ${pt.presence_length}ms.`,
                            );
                            this.setForeignState(pt.name_id, this.bools(pt.presence_val_on), err => {
                                if (err) {
                                    this.log.warn(`Cannot set state: ${err}`);
                                }
                            });
                            pt.presenceLengthTimer = setTimeout(() => {
                                this.log.debug(`Switch ON for: ${pt.name} -- ${pt.name_id}  ends and switch OFF.`);
                                this.setForeignState(pt.name_id, this.bools(pt.presence_val_off), err => {
                                    if (err) {
                                        this.log.warn(`Cannot set state: ${err}`);
                                    }
                                });
                            }, pt.presence_length);
                        }, pt.presence_delay);
                    } else {
                        this.log.debug(`${pt.name} -- ${pt.name_id}  was ON or is not in time range`);
                    }
                    break;
                case 'sunrise':
                    if (this.sunrise && !pt.wasOn) {
                        this.log.debug(
                            `Delay for: ${pt.name} -- ${pt.name_id}  starts ${pt.presence_delay}ms, by sunrise`,
                        );
                        pt.wasOn = true;
                        pt.presenceDelayTimer = setTimeout(() => {
                            this.log.debug(
                                `Delay for: ${pt.name} -- ${pt.name_id}  ends and switch ON ${pt.presence_length}ms.`,
                            );
                            this.setForeignState(pt.name_id, this.bools(pt.presence_val_on), err => {
                                if (err) {
                                    this.log.warn(`Cannot set state: ${err}`);
                                }
                            });
                            pt.presenceLengthTimer = setTimeout(() => {
                                this.log.debug(`Switch ON for: ${pt.name} -- ${pt.name_id}  ends and switch OFF.`);
                                this.setForeignState(pt.name_id, this.bools(pt.presence_val_off), err => {
                                    if (err) {
                                        this.log.warn(`Cannot set state: ${err}`);
                                    }
                                });
                            }, pt.presence_length);
                        }, pt.presence_delay);
                    } else {
                        this.log.debug(`${pt.name} -- ${pt.name_id}  was ON or is no sunrise`);
                    }
                    break;
                case 'sunset':
                    if (this.sunset && !pt.wasOn) {
                        this.log.debug(
                            `Delay for: ${pt.name} -- ${pt.name_id}  starts ${pt.presence_delay}ms, by sunset`,
                        );
                        pt.wasOn = true;
                        pt.presenceDelayTimer = setTimeout(() => {
                            this.log.debug(
                                `Delay for: ${pt.name} -- ${pt.name_id}  ends and switch ON ${pt.presence_length}ms.`,
                            );
                            this.setForeignState(pt.name_id, this.bools(pt.presence_val_on), err => {
                                if (err) {
                                    this.log.warn(`Cannot set state: ${err}`);
                                }
                            });
                            pt.presenceLengthTimer = setTimeout(() => {
                                this.log.debug(`Switch ON for: ${pt.name} -- ${pt.name_id}  ends and switch OFF.`);
                                this.setForeignState(pt.name_id, this.bools(pt.presence_val_off), err => {
                                    if (err) {
                                        this.log.warn(`Cannot set state: ${err}`);
                                    }
                                });
                            }, pt.presence_length);
                        }, pt.presence_delay);
                    } else {
                        this.log.debug(`${pt.name} -- ${pt.name_id}  was ON or is no sunset`);
                    }
                    break;
                case 'light': {
                    const lightVal = await this.getForeignStateAsync(pt.presence_trigger_light).catch(e => {
                        this.log.warn(`Check your light ID ${pt.name} -- ${pt.name_id}  in presence config! +++ ${e}`);
                        return undefined;
                    });
                    if (lightVal && (lightVal.val as number) < pt.presence_light_lux && !pt.wasOn) {
                        this.log.debug(
                            `Delay for: ${pt.name} -- ${pt.name_id}  starts ${pt.presence_delay}ms, because light value is not under the limit.`,
                        );
                        pt.wasOn = true;
                        pt.presenceDelayTimer = setTimeout(() => {
                            this.log.debug(
                                `Delay for: ${pt.name} -- ${pt.name_id}  ends and switch ON ${pt.presence_length}ms.`,
                            );
                            this.setForeignState(pt.name_id, this.bools(pt.presence_val_on), err => {
                                if (err) {
                                    this.log.warn(`Cannot set state: ${err}`);
                                }
                            });
                            pt.presenceLengthTimer = setTimeout(() => {
                                this.log.debug(`Switch ON for: ${pt.name} -- ${pt.name_id}  ends and switch OFF.`);
                                this.setForeignState(pt.name_id, this.bools(pt.presence_val_off), err => {
                                    if (err) {
                                        this.log.warn(`Cannot set state: ${err}`);
                                    }
                                });
                            }, pt.presence_length);
                        }, pt.presence_delay);
                    } else {
                        this.log.debug(`${pt.name} -- ${pt.name_id}  was ON or light value is not under the limit.`);
                    }
                    break;
                }
                default:
                    this.log.warn(
                        `Please check presence configuration for: ${pt.name} -- ${pt.name_id} , value: ${pt.option_presence}`,
                    );
            }
        }
    }

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

    private getTimeLength(durance: number, high: number): number {
        const low = 1;
        return durance * (Math.floor(Math.random() * (high - low + 1)) + low);
    }

    private currentDate(): Date {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }

    private addTime(strTime: string): Date {
        const time = strTime.split(':');
        const d = this.currentDate();
        d.setHours(parseInt(time[0]));
        d.setMinutes(parseInt(time[1]));
        return d;
    }

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

    private setSchedules(): void {
        this.schedule_reset = schedule.scheduleJob({ hour: 0, minute: 0 }, async () => {
            await this.setStateAsync('info.log_today', '', true);
            if (this.opt_presence && this.activated && this.presenceRun) {
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
            this.schedule_from = schedule.scheduleJob(
                { hour: parseInt(from[0]), minute: parseInt(from[1]) },
                async () => {
                    await this.setStateAsync('status.sleep', true, true);
                    await this.sleepBegin(true);
                },
            );
            this.schedule_to = schedule.scheduleJob({ hour: parseInt(to[0]), minute: parseInt(to[1]) }, async () => {
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

if (require.main !== module) {
    module.exports = (options?: Partial<utils.AdapterOptions>): Alarm => new Alarm(options);
} else {
    (() => new Alarm())();
}
