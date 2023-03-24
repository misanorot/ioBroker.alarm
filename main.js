// @ts-nocheck
'use strict';

/*
 * Created with @iobroker/create-adapter v2.3.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');
// eslint-disable-next-line no-unused-vars
const { start } = require('repl');

// Load your modules here, e.g.:
// const fs = require("fs");
const schedule = require('node-schedule');
const SunCalc = require('suncalc2');

let silent_i = false,
	alarm_i = false;

let clean_ids = [];

const alarm_ids = [],
	inside_ids = [],
	notification_ids = [],
	leave_ids = [],
	one_ids = [],
	two_ids = [],
	one_states = {},
	two_states = {},
	zone_one_ids = [],
	zone_two_ids = [],
	zone_three_ids = [],
	zone_one_states = {},
	zone_two_states = {},
	zone_three_states = {},
	states = {};

let send_instances = [];

let log_list = '';

let alarm_repeat;
//changes_repeat;

let is_alarm = false,
	is_inside = false,
	is_notification = false,
	is_panic = false,
	ids_shorts_input = [],
	names_alarm,
	names_inside,
	names_notification,
	names_one,
	names_two,
	// eslint-disable-next-line no-unused-vars
	names_zone_one,
	// eslint-disable-next-line no-unused-vars
	names_zone_two,
	// eslint-disable-next-line no-unused-vars
	names_zone_three;

const change_ids = {};

let opt_presence = false;

let activated = false,
	night_rest = false,
	inside = false,
	burgle = false;

let timer = null;

let speech_timeout = null,
	silent_timer = null,
	siren_inside_timer = null,
	timer_notification_changes = null,
	siren_timer = null,
	silent_interval = null,
	silent_contdown = null,
	alarm_interval = null,
	text_alarm_interval = null,
	text_changes_interval = null;

let log,
	shorts_in,
	shorts;

let schedule_from,
	schedule_to,
	schedule_reset;

let presenceDelay_timer = null;
let sunrise = false;
let sunset = false;
let presenceInterval;
let presenceTimers = {};
let presenceRun = false;

let sunsetStr, sunriseStr;

class Alarm extends utils.Adapter {

	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		super({
			...options,
			name: 'alarm',
		});
		this.on('ready', this.onReady.bind(this));
		this.on('stateChange', this.onStateChange.bind(this));
		// this.on('objectChange', this.onObjectChange.bind(this));
		// this.on('message', this.onMessage.bind(this));
		this.on('unload', this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		// Initialize your adapter here
		this.main();

	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
			this.log.info('cleaned everything up...');
			schedule_from.cancel();
			schedule_to.cancel();
			schedule_reset.cancel();
			clearInterval(timer);
			clearTimeout(silent_timer);
			clearTimeout(speech_timeout);
			clearTimeout(siren_timer);
			clearInterval(silent_interval);
			clearInterval(silent_contdown);
			clearInterval(alarm_interval);
			clearInterval(text_alarm_interval);
			clearInterval(text_changes_interval);
			this.clearAllPresenceTimer();
			callback();
		} catch (e) {
			callback();
		}
	}

	/**
	 * Is called if a subscribed state changes
	 * @param {string} id
	 * @param {ioBroker.State | null | undefined} state
	 */
	onStateChange(id, state) {
		if (state) {
			// The state was changed
			//this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
			this.change(id, state);
		} else {
			// The state was deleted
			this.log.info(`state ${id} deleted`);
		}
	}

	// If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
	// /**
	//  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
	//  * Using this method requires "common.messagebox" property to be set to true in io-package.json
	//  * @param {ioBroker.Message} obj
	//  */
	// onMessage(obj) {
	// 	if (typeof obj === 'object' && obj.message) {
	// 		if (obj.command === 'send') {
	// 			// e.g. send email or pushover or whatever
	// 			this.log.info('send command');

	// 			// Send response in callback if required
	// 			if (obj.callback) this.sendTo(obj.from, obj.command, 'Message received', obj.callback);
	// 		}
	// 	}
	// }
	async main() {
		log = this.config.opt_log;
		shorts = this.config.shorts;
		shorts_in = this.config.shorts_in;
		alarm_repeat = parseInt(this.config.alarm_repeat);
		//changes_repeat = parseInt(this.config.changes_repeat);
		const stateA = await this.getStateAsync('status.activated').catch((e) => this.log.warn(e));
		if (stateA == null) {
			activated = false;
			this.setState('status.activated', false, true);
		} else activated = stateA.val;
		const stateP = await this.getStateAsync('presence.on_off').catch((e) => this.log.warn(e));
		if (stateP == null) {
			opt_presence = false;
			this.setState('presence.on_off', false, true);
		} else opt_presence = stateP.val;
		const stateS = await this.getStateAsync('status.sleep').catch((e) => this.log.warn(e));
		if (stateS == null) {
			night_rest = false;
			this.setState('status.sleep', false, true);
		} else night_rest = stateS.val;
		const stateI = await this.getStateAsync('status.sharp_inside_activated').catch((e) => this.log.warn(e));
		if (stateI == null) {
			inside = false;
			this.setState('status.sharp_inside_activated', false, true);
		} else inside = stateI.val;
		if (this.config.circuits) this.split_states(this.config.circuits);
		else this.log.info('no states configured!');
		send_instances = this.split_arr(this.config.sendTo);
		this.log.debug(`Messages to: ${JSON.stringify(send_instances)}`);
		ids_shorts_input = this.get_short_ids(shorts_in);
		await this.get_ids();
		await this.get_states();
		await this.get_other_states();
		await this.get_zone_states();
		await this.set_subs();
		await this.set_schedules();
		await this.refreshLists();
		await this.check_doubles();
	}
	//################# ENABLE ####################################################

	enableSystem(_id, _state) {
		if (activated || burgle) return;
		let say = this.config.text_failed;
		if (timer) {
			clearInterval(timer);
			timer = null;
			this.setState('status.activation_countdown', null, true);
			this.setState('status.gets_activated', false, true);
		}
		if (!this.config.opt_warning && is_alarm) {
			this.setState('info.log', `${this.config.log_act_not} ${names_alarm}`, true);
			if (log) this.log.info(`${this.config.log_act_not} ${names_alarm}`);
			if (this.config.send_activation) this.messages(`${this.config.log_act_not} ${names_alarm}`);
			this.setState('status.activation_failed', true, true);
			this.setState('status.state_list', 6, true);
			this.setState('status.state', 'activation failed', true);
			this.setState('use.list', 0, true);
			if (this.config.opt_say_names) {
				say = say + ' ' + names_alarm;
			}
			this.sayit(say, 3);
			return;
		}
		this.inside_ends();
		this.sleep_end();
		this.setState('status.sharp_inside_activated', false, true);
		this.setState('status.activated', true, true);
		this.setState('status.deactivated', false, true);
		this.setState('status.activation_failed', false, true);
		this.setState('status.state', 'sharp', true);
		this.setState('status.state_list', 1, true);
		this.setState('homekit.CurrentState', 1, true);
		this.setState('homekit.TargetState', 1, true);
		this.setState('use.list', 1, true);
		if (is_alarm) {
			this.setState('status.activated_with_warnings', true, true);
			this.setState('status.state', 'activated with warnings', true);
			this.setState('info.log', `${this.config.log_act_warn} ${names_alarm}`, true);
			if (log) this.log.info(`${this.config.log_act_warn} ${names_alarm}`);
			if (this.config.send_activated_with_warnings) this.messages(`${this.config.log_act_warn} ${names_alarm}`);
		} else {
			this.setState('info.log', `${this.config.log_act}`, true);
			if (log) this.log.info(`${this.config.log_act}`);
			this.sayit(this.config.text_activated, 1);
			if (this.config.send_activation) this.messages(`${this.config.log_act}`);
		}
	}
	//##############################################################################

	//################# DISABLE ####################################################

	disableSystem() {
		burgle = false;
		clearTimeout(silent_timer);
		clearTimeout(siren_timer);
		clearInterval(silent_interval);
		clearInterval(silent_contdown);
		clearInterval(alarm_interval);
		clearInterval(text_alarm_interval);
		clearInterval(text_changes_interval);
		this.clearAllPresenceTimer();
		silent_timer = null;
		siren_timer = null;
		silent_interval = null,
		silent_contdown = null,
		alarm_interval = null;
		text_alarm_interval = null;
		text_changes_interval = null;
		if (activated || is_panic) {
			is_panic = false;
			this.setState('info.log', `${this.config.log_deact}`, true);
			this.sayit(this.config.text_deactivated, 2);
			if (log) this.log.info(`${this.config.log_deact}`);
			this.setState('status.activated_with_warnings', false, true);
			this.setState('status.activation_failed', false, true);
			this.setState('status.activated', false, true);
			if (this.config.send_activation) this.messages(`${this.config.log_deact}`);
			this.disableStates();
		} else if (inside) {
			this.inside_ends(true);
		} else if (night_rest) {
			this.sleep_end(true);
		} else {
			return;
		}
	}
	//##############################################################################

	//################# BURGALARY ####################################################

	burglary(id, _state, silent, indoor) {
		let count = 0;
		const name = this.get_name(id);
		if (burgle) {
			this.setState('info.log', `${this.config.log_burgle} ${name}`, true);
			if (log) this.log.info(`${this.config.log_burgle} ${name}`);
			return;
		}
		if (silent_timer && silent) return;
		this.setState('info.log', `${this.config.log_burgle} ${name}`, true);
		if (log) this.log.info(`${this.config.log_burgle} ${name}`);
		if (silent) {
			this.setState('status.silent_alarm', true, true);
			this.setState('status.state', 'silent alarm', true);
			if (this.config.send_alarm_silent_inside && indoor) this.messages(`${this.config.log_burgle} ${name}`);
			if (this.config.send_alarm_silent && !indoor) this.messages(`${this.config.log_burgle} ${name}`);
			if (this.config.silent_flash > 0) {
				silent_interval = setInterval(() => {
					if (silent_i) {
						this.setState('status.silent_flash', true, true);
						silent_i = false;
					} else {
						this.setState('status.silent_flash', false, true);
						silent_i = true;
					}
				}, this.config.silent_flash * 1000);
			}
			let silent_contdown_time = this.timeMode(this.config.time_silent_select) * this.config.time_silent / 1000;
			silent_contdown = setInterval(() => {
				if (silent_contdown_time > 0) {
					silent_contdown_time = silent_contdown_time - 1;
					this.setState('status.silent_countdown', silent_contdown_time, true);
				} else {
					this.setState('status.silent_countdown', null, true);
					clearInterval(silent_contdown);
				}
			}, 1000);
			silent_timer = setTimeout(() => {
				burgle = true;
				if (this.config.send_alarm) this.messages(`${this.config.log_burgle} ${name}`);
				clearTimeout(silent_timer);
				clearInterval(silent_interval);
				this.sayit(this.config.text_alarm, 6);
				text_alarm_interval = setInterval(() => {
					if (count < alarm_repeat) {
						this.sayit(this.config.text_alarm, 6);
						count++;
					} else {
						clearInterval(text_alarm_interval);
					}
				}, this.config.text_alarm_pause * 1000);
				this.setState('status.burglar_alarm', true, true);
				this.setState('status.silent_alarm', false, true);
				this.setState('status.silent_flash', false, true);
				this.setState('status.siren_inside', true, true);
				siren_inside_timer = setTimeout(() => {
					this.setState('status.siren_inside', false, true);
				}, this.timeMode(this.config.time_warning_select) * this.config.time_warning);
				if (this.config.opt_siren && indoor) {
					this.alarmSiren();
					this.alarmFlash();
				}
				if (!indoor) {
					this.setState('status.siren', true, true);
					this.alarmSiren();
					this.alarmFlash();
				}
				this.setState('status.state', 'burgle', true);
				this.setState('status.state_list', 3, true);
				this.setState('homekit.CurrentState', 4, true);
			}, this.timeMode(this.config.time_silent_select) * this.config.time_silent);
		}
		else if (!silent) {
			burgle = true;
			clearTimeout(silent_timer);
			clearInterval(silent_interval);
			clearInterval(silent_contdown);
			this.clearAllPresenceTimer();
			if (this.config.send_alarm_inside && indoor) this.messages(`${this.config.log_burgle} ${name}`);
			if (this.config.send_alarm && !indoor) this.messages(`${this.config.log_burgle} ${name}`);
			this.sayit(this.config.text_alarm, 6);
			text_alarm_interval = setInterval(() => {
				if (count < alarm_repeat) {
					this.sayit(this.config.text_alarm, 6);
					count++;
				} else {
					clearInterval(text_alarm_interval);
				}
			}, this.config.text_alarm_pause * 1000);
			this.setState('status.burglar_alarm', true, true);
			this.setState('status.silent_alarm', false, true);
			this.setState('status.silent_flash', false, true);
			this.setState('status.siren_inside', true, true);
			siren_inside_timer = setTimeout(() => {
				this.setState('status.siren_inside', false, true);
			}, this.timeMode(this.config.time_warning_select) * this.config.time_warning);
			if (this.config.opt_siren && indoor) {
				this.alarmSiren();
				this.alarmFlash();
			}
			if (!indoor) {
				this.setState('status.siren', true, true);
				this.alarmSiren();
				this.alarmFlash();
			}
			this.setState('status.state', 'burgle', true);
			this.setState('status.state_list', 3, true);
			this.setState('homekit.CurrentState', 4, true);
			siren_timer = setTimeout(() => {
				this.setState('status.siren', false, true);
				clearTimeout(siren_timer);
			}, this.timeMode(this.config.time_alarm_select) * this.config.time_alarm);
		}
	}
	//##############################################################################

	//################# PANIC ####################################################

	panic() {
		let count = 0;
		is_panic = true;
		this.setState('info.log', `${this.config.log_panic}`, true);
		if (log) this.log.info(`${this.config.log_panic}`);
		if (this.config.send_alarm) this.messages(`${this.config.log_panic}`);
		this.sayit(this.config.text_alarm, 6);
		text_alarm_interval = setInterval(() => {
			if (count < alarm_repeat) {
				this.sayit(this.config.text_alarm, 6);
				count++;
			} else {
				clearInterval(text_alarm_interval);
			}
		}, this.config.text_alarm_pause * 1000);
		this.setState('status.burglar_alarm', true, true);
		if (this.config.alarm_flash > 0) {
			alarm_interval = setInterval(() => {
				if (alarm_i) {
					this.setState('status.alarm_flash', true, true);
					alarm_i = false;
				} else {
					this.setState('status.alarm_flash', false, true);
					alarm_i = true;
				}
			}, this.config.alarm_flash * 1000);
		}
		this.setState('status.siren', true, true);
		this.setState('status.state', 'burgle', true);
		this.setState('status.state_list', 3, true);
		this.setState('homekit.CurrentState', 4, true);
		siren_timer = setTimeout(() => {
			this.setState('status.siren', false, true);
		}, this.timeMode(this.config.time_alarm_select) * this.config.time_alarm);
	}

	//##############################################################################

	//################# CHANGES ####################################################

	change(id, state) {
		let is_not_change = false;
		for (const i in states) {
			if (i === id) {
				if (states[id] === state.val) {
					is_not_change = true;
					break;
				}
				states[id] = state.val;
				this.refreshLists();
				this.log.debug(`Inside states, state change: ${id} val: ${state.val}`);
			}
		}
		for (const i in one_states) {
			if (i === id) {
				if (one_states[id] === state.val) {
					is_not_change = true;
					break;
				}
				one_states[id] = state.val;
				this.refreshLists();
				this.log.debug(`Inside one, state change: ${id} val: ${state.val}`);
			}
		}
		for (const i in two_states) {
			if (i === id) {
				if (two_states[id] === state.val) {
					is_not_change = true;
					break;
				}
				two_states[id] = state.val;
				this.refreshLists();
				this.log.debug(`Inside two, state change: ${id} val: ${state.val}`);
			}
		}
		for (const i in zone_one_states) {
			if (i === id) {
				if (zone_one_states[id] === state.val) {
					is_not_change = true;
					break;
				}
				zone_one_states[id] = state.val;
				this.refreshLists();
				this.log.debug(`Inside zone_one, state change: ${id} val: ${state.val}`);
			}
		}
		for (const i in zone_two_states) {
			if (i === id) {
				if (zone_two_states[id] === state.val) {
					is_not_change = true;
					break;
				}
				zone_two_states[id] = state.val;
				this.refreshLists();
				this.log.debug(`Inside zone_two, state change: ${id} val: ${state.val}`);
			}
		}
		for (const i in zone_three_states) {
			if (i === id) {
				if (zone_three_states[id] === state.val) {
					is_not_change = true;
					break;
				}
				zone_three_states[id] = state.val;
				this.refreshLists();
				this.log.debug(`Inside zone_three, state change: ${id} val: ${state.val}`);
			}
		}
		if (is_not_change) return;
		else if (id === this.namespace + '.use.list') {
			switch (state.val) {
				case 0:
					this.countdown(false);
					break;
				case 1:
					if (!activated) this.enableSystem(id, state);
					break;
				case 2:
					this.inside_begins();
					break;
				case 3:
					this.countdown(true);
					break;
				case 4:
					this.sleep_begin();
					break;
				default:
					this.log.warn('Use wrong value in use.list');
					break;

			}
			return;
		}
		else if (id === this.namespace + '.homekit.TargetState') {
			switch (state.val) {
				case 0:
					this.inside_begins();
					break;
				case 1:
					if (!activated) this.enableSystem(id, state);
					break;
				case 2:
					this.sleep_begin();
					break;
				case 3:
					this.countdown(false);
					break;
				default:
					this.log.warn('Use wrong value in homekit.TargetState');
					break;

			}
			return;
		}
		else if (id === this.namespace + '.status.activated') {
			activated = state.val;
			this.shortcuts('status.activated', state.val);
			if (opt_presence) {
				presenceDelay_timer = setTimeout(() => {
					this.setAllPresenceTimer(() => {
						presenceInterval = setInterval(() => { this.checkPresence(); }, 60000);
					});
				}, this.timeMode(this.config.presence_activate_delay_select) * this.config.presence_activate_delay);
			}
			return;
		}
		else if (id === this.namespace + '.presence.on_off') {
			opt_presence = state.val;
			if (!state.val) {
				this.clearAllPresenceTimer();
			}
			return;
		}
		else if (id === this.namespace + '.status.sleep') {
			//  night_rest = state.val;
			this.shortcuts('status.sleep', state.val);
			return;
		}
		else if (id === this.namespace + '.status.gets_activated') {
			this.shortcuts('status.gets_activated', state.val);
			return;
		}
		else if (id === this.namespace + '.status.state_list') {
			this.shortcuts('status.state_list', state.val);
			return;
		}
		else if (id === this.namespace + '.status.sharp_inside_activated') {
			this.shortcuts('status.sharp_inside_activated', state.val);
			return;
		}
		else if (id === this.namespace + '.status.silent_alarm') {
			this.shortcuts('status.silent_alarm', state.val);
			return;
		}
		else if (id === this.namespace + '.status.alarm_flash') {
			this.shortcuts('status.alarm_flash', state.val);
			return;
		}
		else if (id === this.namespace + '.status.enableable') {
			this.shortcuts('status.enableable', state.val);
			return;
		}
		else if (id === this.namespace + '.status.silent_flash') {
			this.shortcuts('status.silent_flash', state.val);
			return;
		}
		else if (id === this.namespace + '.use.quit_changes') {
			clearTimeout(siren_inside_timer);
			clearTimeout(timer_notification_changes);
			this.setState('status.activation_failed', false, true);
			this.setState('status.siren_inside', false, true);
			this.setState('info.notification_circuit_changes', false, true);
			this.setState('other_alarms.one_changes', false, true);
			this.setState('other_alarms.two_changes', false, true);
			return;
		}
		else if (id === this.namespace + '.status.deactivated') {
			this.shortcuts('status.deactivated', state.val);
			return;
		}
		else if (id === this.namespace + '.status.burglar_alarm') {
			this.shortcuts('status.burglar_alarm', state.val);
			return;
		}
		else if (id === this.namespace + '.status.siren') {
			this.shortcuts('status.siren', state.val);
			return;
		}
		else if (id === this.namespace + '.status.activation_failed') {
			this.shortcuts('status.activation_failed', state.val);
			return;
		}
		else if (id === this.namespace + '.status.activated_with_warnings') {
			this.shortcuts('status.activated_with_warnings', state.val);
			return;
		}
		else if (id === this.namespace + '.status.activation_countdown') {
			this.shortcuts('status.activation_countdown', state.val);
			return;
		}
		else if (id === this.namespace + '.status.state') {
			this.shortcuts('status.state', state.val);
			return;
		}
		else if (id === this.namespace + '.status.siren_inside') {
			this.shortcuts('status.siren_inside', state.val);
			return;
		}
		else if (id === this.namespace + '.info.notification_circuit_changes') {
			this.shortcuts('info.notification_circuit_changes', state.val);
			return;
		}
		else if (id === this.namespace + '.other_alarms.one_changes') {
			this.shortcuts('other_alarms.one_changes', state.val);
			return;
		}
		else if (id === this.namespace + '.other_alarms.two_changes') {
			this.shortcuts('other_alarms.two_changes', state.val);
			return;
		}
		else if (id === this.namespace + '.use.enable' && state.val) {
			this.enableSystem(id, state);
			return;
		}
		else if (id === this.namespace + '.use.disable' && state.val) {
			this.countdown(false);
			return;
		}
		else if (id === this.namespace + '.use.panic' && state.val) {
			this.panic();
			return;
		}
		else if (id === this.namespace + '.use.activate_nightrest' && state.val) {
			this.sleep_begin();
			return;
		}
		else if (id === this.namespace + '.use.activate_sharp_inside' && state.val) {
			this.inside_begins();
			return;
		}
		else if (id === this.namespace + '.use.enable_with_delay' && state.val) {
			this.countdown(true);
			return;
		}
		else if (id === this.namespace + '.use.disable_password') {
			if (state.val == '') return;
			if (this.checkMyPassword(state.val, 'use.disable_password') && (activated || inside)) {
				this.countdown(false);
				return;
			} else {
				this.setState('info.wrong_password', true, true, (err) => {
					if (err) this.log.error(err);
					this.setState(id, '', true);
				});
				if (log) this.log.info(`${this.config.log_pass}`);
				this.log.debug(`Password denied ${state.val}`);
				//this.setState('info.log', `${this.log_pass}`, true);
				if (this.config.send_failed) this.messages(`${this.config.log_pass}`);
				return;
			}
		}
		else if (id === this.namespace + '.use.toggle_password') {
			if (state.val == '') return;
			if (this.checkMyPassword(state.val, 'use.toggle_password') && !activated) {
				this.enableSystem(id, state);
				return;
			} else if (this.checkMyPassword(state.val, 'use.toggle_password') && activated) {
				this.countdown(false);
				//disableSystem();
				return;
			} else {
				this.setState('info.wrong_password', true, true, (err) => {
					if (err) this.log.error(err);
					this.setState(id, '', true);
				});
				if (log) this.log.info(`${this.config.log_pass}`);
				this.log.debug(`Password denied ${state.val}`);
				//this.setState('info.log', `${this.log_pass}`, true);
				if (this.config.send_failed) this.messages(`${this.config.log_pass}`);
				return;
			}
		}
		else if (id === this.namespace + '.use.toggle_with_delay_and_password') {
			if (state.val == '') return;
			if (this.checkMyPassword(state.val, 'use.toggle_with_delay_and_password') && !activated) {
				this.countdown(true);
				return;
			} else if (this.checkMyPassword(state.val, 'use.toggle_with_delay_and_password') && activated) {
				this.countdown(false);
				//disableSystem();
				return;
			} else {
				this.setState('info.wrong_password', true, true, (err) => {
					if (err) this.log.error(err);
					this.setState(id, '', true);
				});
				if (log) this.log.info(`${this.config.log_pass}`);
				this.log.debug(`Password denied ${state.val}`);
				//this.setState('info.log', `${this.log_pass}`, true);
				if (this.config.send_failed) this.messages(`${this.config.log_pass}`);
				return;
			}
		}
		else if (id === this.namespace + '.info.log') {
			this.logging(state.val);
			return;
		}
		else if (ids_shorts_input.includes(id)) {
			this.shortcuts_inside(id, state.val);
			return;
		}
		if (leave_ids.includes(id) && !activated && !this.isTrue(id, state, 'main') && timer && this.config.opt_leave) {
			this.leaving(id, state);
			return;
		}
		if (alarm_ids.includes(id) && activated && this.isTrue(id, state, 'main')) {
			this.burglary(id, state, this.isSilent(id));
			return;
		}
		if (inside_ids.includes(id) && inside && this.isTrue(id, state, 'main')) {
			this.burglary(id, state, this.isSilent(id, true), true);
		}

		if (notification_ids.includes(id) && this.isTrue(id, state, 'main')) {
			if (!activated && !inside && !night_rest) return;
			const name = this.get_name(id);
			this.setState('info.log', `${this.config.log_warn} ${name}`, true);
			this.setState('info.notification_circuit_changes', true, true);
			if (night_rest) {
				let say = this.config.text_changes_night;
				if (log) this.log.info(`${this.config.log_night} ${name}`);
				if (this.config.send_notification_changes) this.messages(`${this.config.log_night} ${name}`);
				if (this.config.opt_say_names) {
					say = say + ' ' + name;
				}
				this.sayit(say, 9);
			} else if (inside) {
				let say = this.config.text_changes;
				if (log) this.log.info(`${this.config.log_warn} ${name}`);
				if (this.config.send_notification_changes) this.messages(`${this.config.log_warn} ${name}`);
				if (this.config.opt_say_names) {
					say = say + ' ' + name;
				}
				this.sayit(say, 5);
			} else if (activated) {
				if (log) this.log.info(`${this.config.log_warn} ${name}`);
				if (this.config.send_notification_changes) this.messages(`${this.config.log_warn} ${name}`);
			}
			timer_notification_changes = setTimeout(() => {
				this.setState('info.notification_circuit_changes', false, true);
			}, this.timeMode(this.config.time_warning_select) * this.config.time_warning);
		}
		if (one_ids.includes(id) && this.isTrue(id, state, 'one')) {
			const name = this.get_name(id, 'one');
			let say = this.config.text_one;
			if (log) this.log.info(`${this.config.log_one} ${name}`);
			if (this.config.send_one_changes) this.messages(`${this.config.log_one} ${name}`);
			if (this.config.opt_say_names) {
				say = say + ' ' + name;
			}
			this.sayit(say, 12);
			this.setState('other_alarms.one_changes', true, true);
		}
		if (two_ids.includes(id) && this.isTrue(id, state, 'two')) {
			const name = this.get_name(id, 'two');
			let say = this.config.text_two;
			if (log) this.log.info(`${this.config.log_two} ${name}`);
			if (this.config.send_two_changes) this.messages(`${this.config.log_two} ${name}`);
			if (this.config.opt_say_names) {
				say = say + ' ' + name;
			}
			this.sayit(say, 13);
			this.setState('other_alarms.two_changes', true, true);
		}
		if (zone_one_ids.includes(id) && this.isTrue(id, state, 'zone_one')) {
			const name = this.get_name(id, 'zone_one');
			if (log) this.log.info(`${this.config.log_zone_one} ${name}`);
			if (this.config.send_zone_one) this.messages(`${this.config.log_zone_one} ${name}`);
		}
		if (zone_two_ids.includes(id) && this.isTrue(id, state, 'zone_two')) {
			const name = this.get_name(id, 'zone_two');
			if (log) this.log.info(`${this.config.log_zone_two} ${name}`);
			if (this.config.send_zone_two) this.messages(`${this.config.log_zone_two} ${name}`);
		}
		if (zone_three_ids.includes(id) && this.isTrue(id, state, 'zone_three')) {
			const name = this.get_name(id, 'zone_three');
			if (log) this.log.info(`${this.config.log_zone_three} ${name}`);
			if (this.config.send_zone_three) this.messages(`${this.config.log_zone_three} ${name}`);
		}
	}
	//##############################################################################

	//################# SUBSCRIBTIONS ##############################################

	set_subs() {
		clean_ids.forEach((ele) => {
			if (ele) {
				this.log.debug(`SUBSCRIBTION for: ${ele}`);
				this.subscribeForeignStates(ele);
			} else {
				this.log.debug(`NO SUBSCRIBTION for monitoring circuits`);
			}
		});
		ids_shorts_input.forEach((ele) => {
			if (ele) {
				this.log.debug(`SUBSCRIBTION for input shortcuts: ${ele}`);
				this.subscribeForeignStates(ele);
			} else {
				this.log.debug(`NO SUBSCRIBTION for input shortcuts`);
			}
		});
		one_ids.forEach((ele) => {
			if (ele) {
				this.log.debug(`SUBSCRIBTION for other alarm one: ${ele}`);
				this.subscribeForeignStates(ele);
			} else {
				this.log.debug(`NO SUBSCRIBTION for other alarm one`);
			}
		});
		two_ids.forEach((ele) => {
			if (ele) {
				this.log.debug(`SUBSCRIBTION for other alarm two: ${ele}`);
				this.subscribeForeignStates(ele);
			} else {
				this.log.debug(`NO SUBSCRIBTION for other alarm two`);
			}
		});
		zone_one_ids.forEach((ele) => {
			if (ele) {
				this.log.debug(`SUBSCRIBTION for zone_one: ${ele}`);
				this.subscribeForeignStates(ele);
			} else {
				this.log.debug(`NO SUBSCRIBTION for zone_one`);
			}
		});
		zone_two_ids.forEach((ele) => {
			if (ele) {
				this.log.debug(`SUBSCRIBTION for zone_two: ${ele}`);
				this.subscribeForeignStates(ele);
			} else {
				this.log.debug(`NO SUBSCRIBTION for zone_two`);
			}
		});
		zone_three_ids.forEach((ele) => {
			if (ele) {
				this.log.debug(`SUBSCRIBTION for zone_three: ${ele}`);
				this.subscribeForeignStates(ele);
			} else {
				this.log.debug(`NO SUBSCRIBTION for zone_three`);
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
		this.subscribeStates('homekit.TargetState');
	}
	//##############################################################################

	//################# MESSAGES ###################################################

	messages(content) {
		if (send_instances.length) {
			const reg = new RegExp('telegram');
			send_instances.forEach((ele) => {
				if (reg.test(ele) && this.config.opt_telegram) {
					this.log.debug(`Send message to ${ele} with special parameter, message: text: ${content}, user: ${this.user}, chatID: ${this.chatID}`);
					this.sendTo(ele, 'send', { 'text': content, 'user': this.config.user, 'chatId': this.config.chatID });
				} else {
					this.log.debug(`Send message to ${ele}, message: ${content}`);
					this.sendTo(ele, content);
				}
			});
		}
	}

	speechOutput(id, message, time) {
		let delay;
		time = parseInt(time);
		if (Number.isInteger(time)) {
			delay = time;
		} else {
			delay = 0;
		}
		this.log.debug(`speech output instance: ${id}: ${message}, delay ${delay}s`);
		speech_timeout = setTimeout(() => {
			this.setForeignState(id, message, (err) => {
				if (err) this.log.warn(err);
			});
		}, delay * 1000);
	}


	sayit(message, opt_val) {
		const tts_instance = this.config.sayit;
		if (night_rest && this.config.opt_night_silent) return;
		if (tts_instance) {
			tts_instance.forEach((ele) => {
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
						default:
							this.log.debug(`no speech output!`);
					}
				}
			});
		}

	}
	//##############################################################################

	//################# HELPERS ####################################################

	alarmSiren() {
		this.setState('status.siren', true, true);
		siren_timer = setTimeout(() => {
			this.setState('status.siren', false, true);
			clearTimeout(siren_timer);
		}, this.timeMode(this.config.time_alarm_select) * this.config.time_alarm);
	}

	alarmFlash() {
		if (this.config.alarm_flash > 0) {
			alarm_interval = setInterval(() => {
				if (alarm_i) {
					this.setState('status.alarm_flash', true, true);
					alarm_i = false;
				} else {
					this.setState('status.alarm_flash', false, true);
					alarm_i = true;
				}
			}, this.config.alarm_flash * 1000);
		}
	}

	disableStates() {
		this.setState('status.deactivated', true, true);
		this.setState('status.state', 'deactivated', true);
		this.setState('status.state_list', 0, true);
		this.setState('homekit.CurrentState', 3, true);
		this.setState('homekit.TargetState', 3, true);
		this.setState('use.list', 0, true);
		this.setState('status.siren_inside', false, true);
		this.setState('status.siren', false, true);
		this.setState('info.notification_circuit_changes', false, true);
		this.setState('status.silent_flash', false, true);
		this.setState('status.alarm_flash', false, true);
		this.setState('status.burglar_alarm', false, true);
		this.setState('status.silent_alarm', false, true);
	}


	async check_doubles() {
		clean_ids.forEach((ele, _i) => {
			one_ids.forEach((item, _i) => {
				if (item === ele) this.log.warn(`You use double states in main and other alarms, PLEASE FIX IT: ${item}`);
			});
			two_ids.forEach((item, _i) => {
				if (item === ele) this.log.warn(`You use double states in main and other alarms, PLEASE FIX IT: ${item}`);
			});
			zone_one_ids.forEach((item, _i) => {
				if (item === ele) this.log.warn(`You use double states in main and other alarms, PLEASE FIX IT: ${item}`);
			});
			zone_two_ids.forEach((item, _i) => {
				if (item === ele) this.log.warn(`You use double states in main and other alarms, PLEASE FIX IT: ${item}`);
			});
			zone_three_ids.forEach((item, _i) => {
				if (item === ele) this.log.warn(`You use double states in main and other alarms, PLEASE FIX IT: ${item}`);
			});
		});

	}

	isSilent(id, indoor) {
		if (indoor) {
			const temp = this.config.circuits.findIndex((obj) => {
				const reg = new RegExp(id);
				return reg.test(obj.name_id);
			});
			return this.config.circuits[temp].delay_inside;
		} else {
			const temp = this.config.circuits.findIndex((obj) => {
				const reg = new RegExp(id);
				return reg.test(obj.name_id);
			});
			return this.config.circuits[temp].delay;
		}

	}

	timeMode(value) {
		let temp;
		switch (value) {
			case 'sec':
				temp = 1000;
				break;
			case 'min':
				temp = 60000;
				break;
			default:
				temp = 1000;
		}
		return temp;
	}


	inside_begins() {
		if (!inside && !burgle) {
			activated = false;
			inside = true;
			this.sleep_end();
			if (is_inside) {
				let say = this.config.text_warning;
				if (this.config.send_activation_warnings_inside) this.messages(`${this.config.log_warn_b_w} ${names_inside}`);
				this.setState('info.log', `${this.config.log_warn_b_w} ${names_inside}`, true);
				if (log) this.log.info(`${this.config.log_warn_b_w} ${names_inside}`);
				if (this.config.opt_say_names) {
					say = say + ' ' + names_inside;
				}
				this.sayit(say, 4);
			} else {
				this.setState('info.log', `${this.config.log_warn_act}`, true);
				if (log) this.log.info(`${this.config.log_warn_act}`);
				if (this.config.send_activation_inside) this.messages(`${this.config.log_warn_act}`);
				this.sayit(this.config.text_warn_begin, 10);
			}
			this.setState('status.sharp_inside_activated', true, true);
			this.setState('status.state', 'sharp inside', true);
			this.setState('status.state_list', 2, true);
			this.setState('homekit.CurrentState', 0, true);
			this.setState('homekit.TargetState', 0, true);
			this.setState('use.list', 2, true);
			this.setState('status.activated', false, true);
			this.setState('status.deactivated', false, true);
		}
	}

	inside_ends(off) {
		if (inside) {
			inside = false;
			if (off) {
				clearTimeout(siren_inside_timer);
				clearTimeout(timer_notification_changes);
				this.setState('info.log', `${this.config.log_warn_deact}`, true);
				if (log) this.log.info(`${this.config.log_warn_deact}`);
				if (this.config.send_activation_inside) this.messages(`${this.config.log_warn_deact}`);
				this.sayit(this.config.text_warn_end, 0);
				this.setState('status.sharp_inside_activated', false, true);
				this.disableStates();
			}

		}
	}

	sleep_begin(auto) {
		if (night_rest) return;
		if (auto && inside || auto && activated) {
			this.log.warn(`Cannot set alarm system to night rest, it is sharp or sharp inside`);
			return;
		}
		activated = false;
		night_rest = true;
		this.inside_ends();
		if (log) this.log.info(`${this.config.log_sleep_b}`);
		this.setState('info.log', `${this.config.log_sleep_b}`, true);
		if (!is_notification) this.sayit(this.config.text_nightrest_beginn, 7);
		this.setState('status.state', 'night rest', true);
		this.setState('status.state_list', 4, true);
		this.setState('homekit.CurrentState', 2, true);
		this.setState('homekit.TargetState', 2, true);
		this.setState('use.list', 4, true);
		if (is_notification) {
			let say = this.config.text_warning;
			if (this.config.send_activation_warnings_night) this.messages(`${this.config.log_nights_b_w} ${names_notification}`);
			this.setState('info.log', `${this.config.log_nights_b_w} ${names_notification}`, true);
			if (log) this.log.info(`${this.config.log_nights_b_w} ${names_notification}`);
			if (this.config.opt_say_names) {
				say = say + ' ' + names_notification;
			}
			this.sayit(say, 4);
		}
	}

	sleep_end(off) {
		if (night_rest) {
			night_rest = false;
			if (off) {
				this.setState('info.log', `${this.config.log_sleep_e}`, true);
				this.sayit(this.config.text_nightrest_end, 8);
				if (log) this.log.info(`${this.config.log_sleep_e}`);
				this.setState('status.state', 'deactivated', true);
				if (!inside) {
					this.setState('status.state_list', 0, true);
					this.setState('homekit.CurrentState', 3, true);
					this.setState('homekit.TargetState', 3, true);
					this.setState('use.list', 0, true);
				}
			}
		}
	}

	refreshLists() {
		this.check(alarm_ids, 'main', (_val, ids) => {
			this.log.debug(`Alarm circuit list: ${ids}`);
			if (ids.length > 0) {
				is_alarm = true;
				names_alarm = this.get_name(ids, 'main');
				this.setState('info.alarm_circuit_list', names_alarm, true);
				this.setState('info.alarm_circuit_list_html', this.get_name_html(ids), true);
			} else {
				is_alarm = false;
				names_alarm = '';
				this.setState('info.alarm_circuit_list', '', true);
				this.setState('info.alarm_circuit_list_html', '', true);
			}
		});
		this.check(inside_ids, 'main', (_val, ids) => {
			this.log.debug(`Inside circuit list: ${ids}`);
			if (ids.length > 0) {
				is_inside = true;
				names_inside = this.get_name(ids, 'main');
				this.setState('info.sharp_inside_circuit_list', names_inside, true);
				this.setState('info.sharp_inside_circuit_list_html', this.get_name_html(ids), true);
			} else {
				is_inside = false;
				names_inside = '';
				this.setState('info.sharp_inside_circuit_list', '', true);
				this.setState('info.sharp_inside_circuit_list_html', '', true);
			}
		});
		this.check(notification_ids, 'main', (_val, ids) => {
			this.log.debug(`Notification circuit list: ${ids}`);
			if (ids.length > 0) {
				is_notification = true;
				names_notification = this.get_name(ids, 'main');
				this.setState('info.notification_circuit_list', names_notification, true);
				this.setState('info.notification_circuit_list_html', this.get_name_html(ids), true);
			} else {
				is_notification = false;
				names_notification = '';
				this.setState('info.notification_circuit_list', '', true);
				this.setState('info.notification_circuit_list_html', '', true);
			}
		});
		this.check(one_ids, 'one', (_val, ids) => {
			this.log.debug(`One list: ${ids}`);
			if (ids.length > 0) {
				names_one = this.get_name(ids, 'one');
				this.setState('other_alarms.one_list', names_one, true);
				this.setState('other_alarms.one_list_html', this.get_name_html(ids, 'one'), true);
			} else {
				names_one = '';
				this.setState('other_alarms.one_list', '', true);
				this.setState('other_alarms.one_list_html', '', true);
			}
		});
		this.check(two_ids, 'two', (_val, ids) => {
			this.log.debug(`Two list: ${ids}`);
			if (ids.length > 0) {
				names_two = this.get_name(ids, 'two');
				this.setState('other_alarms.two_list', names_two, true);
				this.setState('other_alarms.two_list_html', this.get_name_html(ids, 'two'), true);
			} else {
				names_two = '';
				this.setState('other_alarms.two_list', '', true);
				this.setState('other_alarms.two_list_html', '', true);
			}
		});
		this.check(zone_one_ids, 'zone_one', (_val, ids) => {
			this.log.debug(`Zone_one list: ${ids}`);
			if (ids.length > 0) {
				names_zone_one = this.get_name(ids, 'zone_one');
				this.setState('zone.one', true, true);
			} else {
				names_zone_one = '';
				this.setState('zone.one', false, true);
			}
		});
		this.check(zone_two_ids, 'zone_two', (_val, ids) => {
			this.log.debug(`Zone_two list: ${ids}`);
			if (ids.length > 0) {
				names_zone_two = this.get_name(ids, 'zone_two');
				this.setState('zone.two', true, true);
			} else {
				names_zone_two = '';
				this.setState('zone.two', false, true);
			}
		});
		this.check(zone_three_ids, 'zone_three', (_val, ids) => {
			this.log.debug(`Zone_three list: ${ids}`);
			if (ids.length > 0) {
				names_zone_three = this.get_name(ids, 'zone_three');
				this.setState('zone.three', true, true);
			} else {
				names_zone_three = '';
				this.setState('zone.three', false, true);
			}
		});
		if (is_alarm) this.setState('status.enableable', false, true);
		if (this.config.opt_warning && is_alarm) this.setState('status.enableable', true, true);
		if (!is_alarm) this.setState('status.enableable', true, true);
	}


	checkMyPassword(pass, id) {
		if (this.config.password === pass) {
			this.log.debug(`Password accept`);
			this.setState('info.wrong_password', false, true, (err) => {
				if (err) this.log.error(err);
				this.setState(id, '', true);
			});
			return true;
		}
		else {
			return false;
		}
	}

	isTrue(id, state, other) {
		let test = false;
		if (!this.search(id, other) && state.val) test = true;
		else if (this.search(id, other) && !state.val) test = true;
		return test;
	}

	split_arr(str) {
		const temp_arr = str.split(/[,;\s]+/);
		const clean_arr = [];
		temp_arr.forEach((ele) => {
			if (ele) clean_arr.push(ele.trim());
		});
		return clean_arr;
	}

	split_states(arr) {
		arr.forEach((ele) => {
			if (ele.enabled) {
				if (ele.alarm) alarm_ids.push(ele.name_id);
				if (ele.warning) inside_ids.push(ele.name_id);
				if (ele.night) notification_ids.push(ele.name_id);
				if (ele.leave) leave_ids.push(ele.name_id);
			} else {
				this.log.debug(`State not used but configured: ${ele.name_id}`);
			}
		});
	}

	get_ids() {
		let ids = [];
		ids = ids.concat(alarm_ids, inside_ids, notification_ids, leave_ids);
		clean_ids = Array.from(new Set(ids));
	}

	//test negativ
	search(id, table) {
		if (typeof table === 'undefined' || table === null) {
			this.log.warn(`Issue in function search, plaese report this the developer!`);
			return;
		}
		let tableObj;
		if (table === 'main') tableObj = this.config.circuits;
		else if (table === 'one') tableObj = this.config.one;
		else if (table === 'two') tableObj = this.config.two;
		else if (table === 'zone_one') tableObj = this.config.zone_one;
		else if (table === 'zone_two') tableObj = this.config.zone_two;
		else if (table === 'zone_three') tableObj = this.config.zone_three;
		else this.log.warn(`Issue in function search, plaese report this the developer!`);

		const temp = tableObj.findIndex((obj) => {
			const reg = new RegExp(id);
			return reg.test(obj.name_id);
		});
		return tableObj[temp].negativ;
	}

	check(arr, table, callback) {
		if (typeof table === 'undefined' || table === null) {
			this.log.warn(`Issue in function check, plaese report this the developer!`);
			return;
		}
		let tempStates;
		if (table === 'main') tempStates = states;
		else if (table === 'one') tempStates = one_states;
		else if (table === 'two') tempStates = two_states;
		else if (table === 'zone_one') tempStates = zone_one_states;
		else if (table === 'zone_two') tempStates = zone_two_states;
		else if (table === 'zone_three') tempStates = zone_three_states;
		else {
			this.log.warn(`Issue in function check, plaese report this the developer!`);
			return;
		}
		const temp_arr = [];
		if (arr.length > 0) {
			arr.forEach((ele) => {
				if (tempStates[ele] && !this.search(ele, table)) {
					temp_arr.push(ele);
				} else if (tempStates[ele] == false && this.search(ele, table)) {
					temp_arr.push(ele);
				}
			});
			if (temp_arr.length > 0) {
				callback(true, temp_arr);
			} else {
				callback(false, temp_arr);
			}
		}
	}


	get_name(ids, table) {
		const name = [];
		let tableObj;
		if (table === 'main') tableObj = this.config.circuits;
		else if (table === 'one') tableObj = this.config.one;
		else if (table === 'two') tableObj = this.config.two;
		else if (table === 'zone_one') tableObj = this.config.zone_one;
		else if (table === 'zone_two') tableObj = this.config.zone_two;
		else if (table === 'zone_three') tableObj = this.config.zone_three;
		else tableObj = this.config.circuits; // For empty table call
		if (Array.isArray(ids)) {
			ids.forEach((id) => {
				const temp = tableObj.findIndex((obj) => {
					const reg = new RegExp(id);
					return reg.test(obj.name_id);
				});
				name.push(tableObj[temp].name);
			});
			return name.join();
		} else {
			const temp = tableObj.findIndex((obj) => {
				const reg = new RegExp(ids);
				return reg.test(obj.name_id);
			});
			return tableObj[temp].name;
		}
	}

	get_name_html(ids, table) {
		const name = [];
		let tableObj;
		if (table === 'main') tableObj = this.config.circuits;
		else if (table === 'one') tableObj = this.config.one;
		else if (table === 'two') tableObj = this.config.two;
		else if (table === 'zone_one') tableObj = this.config.zone_one;
		else if (table === 'zone_two') tableObj = this.config.zone_two;
		else if (table === 'zone_three') tableObj = this.config.zone_three;
		else tableObj = this.config.circuits;
		if (Array.isArray(ids)) {
			ids.forEach((id) => {
				const temp = tableObj.findIndex((obj) => {
					const reg = new RegExp(id);
					return reg.test(obj.name_id);
				});
				name.push(tableObj[temp].name);
			});
			return name.join('<br>');
		} else {
			const temp = tableObj.findIndex((obj) => {
				const reg = new RegExp(ids);
				return reg.test(obj.name_id);
			});
			return tableObj[temp].name;
		}
	}

	async get_state_async(id) {
		return new Promise((resolve, reject) => {
			this.getForeignState(id, (err, state) => {
				if (err) reject(err);
				else if (state == null || state.val == null) {
					this.log.error(`state is null: ${id}`);
					resolve(null);
				}
				else resolve(state.val);
			});
		});
	}

	async get_states_delay(id) {
		const value = await this.get_state_async(id);
		return value;
	}

	async get_states() {
		for (const id of clean_ids) {
			const state = await this.get_states_delay(id);
			states[id] = state;
		}
		this.log.debug(JSON.stringify(states));
	}

	async get_other_states() {
		if (this.config.one) {
			this.config.one.forEach((ele) => {
				if (ele.enabled) one_ids.push(ele.name_id);
			});
			for (const id of one_ids) {
				const state = await this.get_states_delay(id);
				one_states[id] = state;
			}
		}
		if (this.config.two) {
			this.config.two.forEach((ele) => {
				if (ele.enabled) two_ids.push(ele.name_id);
			});
			for (const id of two_ids) {
				const state = await this.get_states_delay(id);
				two_states[id] = state;
			}
		}
		this.log.debug(`other alarm are one: ${JSON.stringify(one_states)} two: ${JSON.stringify(two_states)}`);
	}

	async get_zone_states() {
		if (this.config.zone_one) {
			this.config.zone_one.forEach((ele) => {
				if (ele.enabled) zone_one_ids.push(ele.name_id);
			});
			for (const id of zone_one_ids) {
				const state = await this.get_states_delay(id);
				zone_one_states[id] = state;
			}
		}
		if (this.config.zone_two) {
			this.config.zone_two.forEach((ele) => {
				if (ele.enabled) zone_two_ids.push(ele.name_id);
			});
			for (const id of zone_two_ids) {
				const state = await this.get_states_delay(id);
				zone_two_states[id] = state;
			}
		}
		if (this.config.zone_three) {
			this.config.zone_three.forEach((ele) => {
				if (ele.enabled) zone_three_ids.push(ele.name_id);
			});
			for (const id of zone_three_ids) {
				const state = await this.get_states_delay(id);
				zone_three_states[id] = state;
			}
		}
		this.log.debug(`zone one: ${JSON.stringify(zone_one_states)} zone two: ${JSON.stringify(zone_two_states)} zone three: ${JSON.stringify(zone_three_states)}`);
	}

	leaving(_id, _state) {
		this.log.info(`Leaving state triggerd`);
		clearInterval(timer);
		timer = null;
		this.setState('status.activation_countdown', null, true);
		this.setState('status.gets_activated', false, true);
		this.enableSystem();
	}

	countdown(count) {
		const time = this.timeMode(this.config.time_activate_select);
		let counter = this.config.time_activate * time / 1000;
		let say = this.config.time_activate + ' ' + this.config.text_countdown;
		if (count && !timer && !activated) {
			if (is_alarm && this.config.send_activation_warnings) {
				this.messages(`${this.config.log_act_notice} ${names_alarm}`);
				say = say + ' ' + this.config.text_warning;
				if (this.config.opt_say_names) {
					say = say + ' ' + names_alarm;
				}
				this.sayit(say, 4);
			} else if (is_alarm) {
				let say = this.config.text_failed;
				if (this.config.opt_say_names) {
					say = say + ' ' + names_alarm;
				}
				this.sayit(say, 3);
				return;
			}
			this.sayit(say, 11);
			this.setState('status.gets_activated', true, true);
			this.setState('status.state', 'gets activated', true);
			this.setState('status.state_list', 5, true);
			timer = setInterval(() => {
				if (counter > 0) {
					counter--;
					this.setState('status.activation_countdown', counter, true);
				} else {
					clearInterval(timer);
					timer = null;
					this.setState('status.activation_countdown', counter, true);
					this.setState('status.gets_activated', false, true);
					this.enableSystem();
				}
			}, 1000);
		} else if (count && timer) {
			return;
		} else if (count && activated) {
			return;
		} else {
			if (timer) {
				clearInterval(timer);
				timer = null;
				this.setState('status.activation_countdown', null, true);
				this.setState('status.gets_activated', false, true);
				this.setState('status.state_list', 7, true);
			}
			this.disableSystem();
		}
	}

	bools(val) {
		switch (val) {
			case 'true':
				return true;
			case 'false':
				return false;
			default:
				if (isNaN(Number(val))) {
					return val;
				} else {
					return Number(val);
				}
		}
	}

	shortcuts_inside(id, val) {
		const change = this.is_changed(id, val);
		shorts_in.forEach((ele) => {
			if (ele.name_id == id) {
				if (ele.value === val || this.bools(ele.value) == val) {
					if (ele.trigger_val == 'any' || change) {
						this.log.debug(`Input shorcut changed: ${ele.name_id}`);
						this.setState(ele.select_id, true, true, (err) => {
							if (err) this.log.warn(`Cannot set state: ${err}`);
						});
					}
				}
			}
		});
	}

	get_short_ids(ids) {
		const idsArr = ids || [];
		const temp_ids = [];
		idsArr.forEach((ele) => {
			if (ele.enabled) {
				temp_ids.push(ele.name_id);
			}
		});
		return temp_ids;
	}

	shortcuts(id, val) {
		const change = this.is_changed(id, val);
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
				default:
					setVal = val;
					this.log.warn(`Wrong list state at shortcuts: ${val}`);
			}
		}
		if (shorts && change) {
			shorts.forEach((ele, i) => {
				if (ele.enabled && ele.select_id == id && this.bools(ele.trigger_val) === setVal) {
					setTimeout(() => {
						this.setForeignState(ele.name_id, this.bools(ele.value), (err) => {
							if (err) this.log.warn(`Cannot set state: ${err}`);
						});
					}, i * 250);
				}
			});
		}
	}


	is_changed(id, val) {
		if (change_ids[id] === val) {
			this.log.debug(`No changes inside shortcuts! ${id}`);
			return false;
		} else {
			change_ids[id] = val;
			return true;
		}
	}


	timeStamp() {
		const date = new Date();
		return ('0' + date.getHours()).slice(-2) + ':' + ('0' + date.getMinutes()).slice(-2);
	}


	async logging(content) {
		const state = await this.getStateAsync('info.log_today').catch((e) => this.log.warn(e));
		if (state == null) {
			log_list = '';
			this.setState('info.log_today', log_list, true);
		} else {
			log_list = state.val;
			log_list = log_list.split('<br>');
			log_list.unshift(this.timeStamp() + ': ' + content);
			//if (log_list.length > 25) log_list.splice(0,1);
			this.setState('info.log_today', log_list.join('<br>'), true);
		}
	}

	//##############################################################################


	//#########################   PRESENCE ###########################################

	setAllPresenceTimer(callback) {
		if (this.config.presence) {
			this.getAstro();
			presenceRun = true;
			presenceTimers = {};
			this.config.presence.forEach((ele) => {
				if (ele.enabled && ele.name_id !== '') {
					const tempObj = {};
					tempObj.name_id = ele.name_id;
					tempObj.name = ele.name;
					tempObj.presence_time_from = ele.presence_time_from;
					tempObj.presence_time_to = ele.presence_time_to;
					tempObj.option_presence = ele.option_presence;
					tempObj.presence_length = this.getTimeLength(ele.presence_length * this.timeMode(ele.presence_length_select), ele.presence_length_shuffle);
					tempObj.presenceLengthTimer = null;
					tempObj.presence_delay = this.getTimeLength(ele.presence_delay * this.timeMode(ele.presence_delay_select), ele.presence_delay_shuffle);
					tempObj.presenceDelayTimer = null;
					tempObj.presence_val_on = this.getValType(ele.presence_val_on);
					tempObj.presence_val_off = this.getValType(ele.presence_val_off);
					tempObj.presence_trigger_light = ele.presence_trigger_light;
					tempObj.presence_light_lux = ele.presence_light_lux;
					tempObj.wasOn = false;

					presenceTimers[ele.id] = tempObj;

				} else if (!ele.enable) {
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



	clearAllPresenceTimer() {
		presenceRun = false;
		clearTimeout(presenceDelay_timer);
		clearInterval(presenceInterval);
		for (const item in presenceTimers) {
			// eslint-disable-next-line no-prototype-builtins
			if (presenceTimers.hasOwnProperty(item)) {
				clearTimeout(presenceTimers[item].presenceLengthTimer);
				clearTimeout(presenceTimers[item].presenceDelayTimer);
			}
		}
	}


	async checkPresence() {
		if (!activated || inside) {
			return;
		}
		sunrise = this.timeInRange(sunriseStr, '12:00');
		sunset = this.timeInRange(sunsetStr, '22:00');
		for (const item in presenceTimers) {
			// eslint-disable-next-line no-prototype-builtins
			if (presenceTimers.hasOwnProperty(item)) {
				switch (presenceTimers[item].option_presence) {
					case 'time':
						if (presenceTimers[item].presence_time_from == '' || presenceTimers[item].presence_time_to == '') {
							this.log.warn(`Please check the times when configuring attendance: ${presenceTimers[item].name_id}`);
							return;
						}
						if (this.timeInRange(presenceTimers[item].presence_time_from, presenceTimers[item].presence_time_to) && !presenceTimers[item].wasOn) {
							this.log.debug(`Delay for: ${presenceTimers[item].name_id} starts ${presenceTimers[item].presence_delay}ms, because time is in range.`);
							presenceTimers[item].wasOn = true;
							presenceTimers[item].presenceDelayTimer = setTimeout(() => {
								this.log.debug(`Delay for: ${presenceTimers[item].name_id} ends and switch ON ${presenceTimers[item].presence_length}ms.`);
								this.setForeignState(presenceTimers[item].name_id, this.bools(presenceTimers[item].presence_val_on), (err) => {
									if (err) this.log.warn(`Cannot set state: ${err}`);
								});
								presenceTimers[item].presenceLengthTimer = setTimeout(() => {
									this.log.debug(`Switch ON for: ${presenceTimers[item].name_id} ends and switch OFF.`);
									this.setForeignState(presenceTimers[item].name_id, this.bools(presenceTimers[item].presence_val_off), (err) => {
										if (err) this.log.warn(`Cannot set state: ${err}`);
									});
								}, presenceTimers[item].presence_length);
							}, presenceTimers[item].presence_delay);
						} else {
							this.log.debug(`${presenceTimers[item].name_id} was ON or is not in time range`);
						}
						break;
					case 'sunrise':
						if (sunrise && !presenceTimers[item].wasOn) {
							this.log.debug(`Delay for: ${presenceTimers[item].name_id} starts ${presenceTimers[item].presence_delay}ms, by sunrise`);
							presenceTimers[item].wasOn = true;
							presenceTimers[item].presenceDelayTimer = setTimeout(() => {
								this.log.debug(`Delay for: ${presenceTimers[item].name_id} ends and switch ON ${presenceTimers[item].presence_length}ms.`);
								this.setForeignState(presenceTimers[item].name_id, this.bools(presenceTimers[item].presence_val_on), (err) => {
									if (err) this.log.warn(`Cannot set state: ${err}`);
								});
								presenceTimers[item].presenceLengthTimer = setTimeout(() => {
									this.log.debug(`Switch ON for: ${presenceTimers[item].name_id} ends and switch OFF.`);
									this.setForeignState(presenceTimers[item].name_id, this.bools(presenceTimers[item].presence_val_off), (err) => {
										if (err) this.log.warn(`Cannot set state: ${err}`);
									});
								}, presenceTimers[item].presence_length);
							}, presenceTimers[item].presence_delay);
						} else {
							this.log.debug(`${presenceTimers[item].name_id} was ON or is no sunrise`);
						}
						break;
					case 'sunset':
						if (sunset && !presenceTimers[item].wasOn) {
							this.log.debug(`Delay for: ${presenceTimers[item].name_id} starts ${presenceTimers[item].presence_delay}ms, by sunset`);
							presenceTimers[item].wasOn = true;
							presenceTimers[item].presenceDelayTimer = setTimeout(() => {
								this.log.debug(`Delay for: ${presenceTimers[item].name_id} ends and switch ON ${presenceTimers[item].presence_length}ms.`);
								this.setForeignState(presenceTimers[item].name_id, this.bools(presenceTimers[item].presence_val_on), (err) => {
									if (err) this.log.warn(`Cannot set state: ${err}`);
								});
								presenceTimers[item].presenceLengthTimer = setTimeout(() => {
									this.log.debug(`Switch ON for: ${presenceTimers[item].name_id} ends and switch OFF.`);
									this.setForeignState(presenceTimers[item].name_id, this.bools(presenceTimers[item].presence_val_off), (err) => {
										if (err) this.log.warn(`Cannot set state: ${err}`);
									});
								}, presenceTimers[item].presence_length);
							}, presenceTimers[item].presence_delay);
						} else {
							this.log.debug(`${presenceTimers[item].name_id} was ON or is no sunset`);
						}
						break;
					case 'light':
						// eslint-disable-next-line no-case-declarations
						const lightVal = await this.getForeignStateAsync(presenceTimers[item].presence_trigger_light).catch((e) => {
							this.log.warn(`Check your light ID ${presenceTimers[item].name_id} in presence config! +++ ${e}`);
							return;
						});
						if (lightVal.val < presenceTimers[item].presence_light_lux && !presenceTimers[item].wasOn) {
							this.log.debug(`Delay for: ${presenceTimers[item].name_id} starts ${presenceTimers[item].presence_delay}ms, because light value is exceeded`);
							presenceTimers[item].wasOn = true;
							presenceTimers[item].presenceDelayTimer = setTimeout(() => {
								this.log.debug(`Delay for: ${presenceTimers[item].name_id} ends and switch ON ${presenceTimers[item].presence_length}ms.`);
								this.setForeignState(presenceTimers[item].name_id, this.bools(presenceTimers[item].presence_val_on), (err) => {
									if (err) this.log.warn(`Cannot set state: ${err}`);
								});
								presenceTimers[item].presenceLengthTimer = setTimeout(() => {
									this.log.debug(`Switch ON for: ${presenceTimers[item].name_id} ends and switch OFF.`);
									this.setForeignState(presenceTimers[item].name_id, this.bools(presenceTimers[item].presence_val_off), (err) => {
										if (err) this.log.warn(`Cannot set state: ${err}`);
									});
								}, presenceTimers[item].presence_length);
							}, presenceTimers[item].presence_delay);
						} else {
							this.log.debug(`${presenceTimers[item].name_id} was ON or light value is not exceeded`);
						}
						break;
					default:
						this.log.warn(`Please check presence configuration for: ${presenceTimers[item].name_id}, value: ${presenceTimers[item].option_presence}`);
				}
			}
		}
	}

	getValType(val) {
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
		if (isNaN(val)) {
			return val;
		} else {
			return Number(val);
		}
	}


	async getAstro() {
		try {
			const obj = await this.getForeignObjectAsync('system.config', 'state').catch((e) => this.log.warn(e));

			if (obj && obj.common && obj.common.longitude && obj.common.latitude) {
				const longitude = obj.common.longitude;
				const latitude = obj.common.latitude;
				this.log.debug(`longitude: ${longitude} | latitude: ${latitude}`);
				this.setSun(longitude, latitude);
			} else {
				this.log.error('system settings cannot be called up. Please check configuration!');
			}
		} catch (err) {
			this.log.warn('system settings cannot be called up. Please check configuration!');
		}
	}

	async setSun(longitude, latitude) {
		let times; // get today's sunlight times

		try {
			times = SunCalc.getTimes(new Date(), latitude, longitude);
			this.log.debug('calculate astrodata ...');

			// format sunset/sunrise time from the Date object
			sunsetStr = ('0' + times.sunset.getHours()).slice(-2) + ':' + ('0' + times.sunset.getMinutes()).slice(-2);
			sunriseStr = ('0' + times.sunrise.getHours()).slice(-2) + ':' + ('0' + times.sunrise.getMinutes()).slice(-2);
			//dayStr = times.sunrise.getDay();
			this.log.debug('Sunrise today: ' + sunriseStr);
			this.log.debug('Sunset today: ' + sunsetStr);
		} catch (e) {
			this.log.warn('cannot calculate astrodata ... please check your config for latitude und longitude!!');
		}
	}

	getTimeLength(durance, shuffle) {
		const low = 1;
		const high = shuffle;
		return durance * (Math.floor(Math.random() * (high - low + 1)) + low);
	}


	// ################### IS TIME IN RANGE ###############################
	// Format 12:10:00

	currentDate() {
		const d = new Date();
		return new Date(d.getFullYear(), d.getMonth(), d.getDate());
	}
	addTime(strTime) {
		const time = strTime.split(':');
		const d = this.currentDate();
		d.setHours(time[0]);
		d.setMinutes(time[1]);
		//d.setSeconds(time[2]);
		return d;
	}

	timeInRange(strLower, strUpper) {
		const now = new Date();
		strLower = strLower.toString();
		strUpper = strUpper.toString();
		const lower = this.addTime(strLower);
		const upper = this.addTime(strUpper);
		let inRange = false;
		if (upper > lower) {
			// opens and closes in same day
			inRange = (now >= lower && now <= upper) ? true : false;
		} else {
			// closes in the following day
			inRange = (now >= upper && now <= lower) ? false : true;
		}
		//this.log.debug(`Is time in range: ${inRange}`)
		return inRange;
	}

	//###################################################################


	//################# SCHEDULES ####################################################

	set_schedules() {
		schedule_reset = schedule.scheduleJob({ hour: '00', minute: '00' }, () => {
			this.setState('info.log_today', '', true);
			if (opt_presence && activated && presenceRun) {
				this.setAllPresenceTimer(() => {
					this.log.debug(`Restart presence timers for a new day!`);
					presenceInterval = setInterval(() => { this.checkPresence(); }, 60000);
				});
			}
		});
		if (this.config.night_from && this.config.night_to) {
			let from, to;
			try {
				from = this.config.night_from.split(':');
				to = this.config.night_to.split(':');
			} catch (e) {
				this.log.warn(`Cannot read night rest time: ${e}`);
				return;
			}
			schedule_from = schedule.scheduleJob({ hour: parseInt(from[0]), minute: parseInt(from[1]) }, () => {
				this.setState('status.sleep', true, true);
				this.sleep_begin(true);
			});
			schedule_to = schedule.scheduleJob({ hour: parseInt(to[0]), minute: parseInt(to[1]) }, () => {
				this.setState('status.sleep', false, true);
				if (!activated && !inside) this.countdown(false);
			});
			this.log.debug(`Night rest configured from ${parseInt(from[0])}:${parseInt(from[1])} to ${parseInt(to[0])}:${parseInt(to[1])}`);
		} else {
			this.log.debug('No night rest configured');
		}
	}
}
//##############################################################################


if (require.main !== module) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	module.exports = (options) => new Alarm(options);
} else {
	// otherwise start the instance directly
	new Alarm();
}