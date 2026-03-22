"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils = __importStar(require("@iobroker/adapter-core"));
const schedule = __importStar(require("node-schedule"));
const suncalc2_1 = __importDefault(require("suncalc2"));
const STATUS_STATE = {
    deactivated: 'deactivated',
    sharp: 'sharp',
    activated_with_warnings: 'activated with warnings',
    silent_alarm: 'silent alarm',
    burgle: 'burgle',
    sharp_inside: 'sharp inside',
    night_rest: 'night rest',
    gets_activated: 'gets activated',
    activation_failed: 'activation failed',
};
const STATE_LIST = {
    deactivated: 0,
    sharp: 1,
    sharp_inside: 2,
    burglary: 3,
    night_rest: 4,
    gets_activated: 5,
    activation_failed: 6,
    activation_aborted: 7,
    silent_alarm: 8,
};
const STATE_LIST_NAMES = {};
for (const [key, value] of Object.entries(STATE_LIST)) {
    STATE_LIST_NAMES[value] = key;
}
const USE_LIST = {
    deactivated: 0,
    sharp: 1,
    sharp_inside: 2,
    activate_with_delay: 3,
    night_rest: 4,
};
const HOMEKIT_STATE = {
    stay_arm: 0,
    away_arm: 1,
    night_arm: 2,
    disarmed: 3,
    alarm_triggered: 4,
};
const SAY_PHRASE = {
    sharp_inside_deactivated: 0,
    activated: 1,
    deactivated: 2,
    activation_failed: 3,
    warnings: 4,
    changes: 5,
    alarm: 6,
    night_rest_begins: 7,
    night_rest_ends: 8,
    changes_night: 9,
    sharp_inside_activated: 10,
    countdown: 11,
    fire: 12,
    water: 13,
    aborted: 14,
};
const SAY_PHRASE_OPTIONS = {
    [SAY_PHRASE.sharp_inside_deactivated]: 'opt_say_zero',
    [SAY_PHRASE.activated]: 'opt_say_one',
    [SAY_PHRASE.deactivated]: 'opt_say_two',
    [SAY_PHRASE.activation_failed]: 'opt_say_three',
    [SAY_PHRASE.warnings]: 'opt_say_four',
    [SAY_PHRASE.changes]: 'opt_say_five',
    [SAY_PHRASE.alarm]: 'opt_say_six',
    [SAY_PHRASE.night_rest_begins]: 'opt_say_seven',
    [SAY_PHRASE.night_rest_ends]: 'opt_say_eigth',
    [SAY_PHRASE.changes_night]: 'opt_say_nine',
    [SAY_PHRASE.sharp_inside_activated]: 'opt_say_nine_plus',
    [SAY_PHRASE.countdown]: 'opt_say_count',
    [SAY_PHRASE.fire]: 'opt_say_fire',
    [SAY_PHRASE.water]: 'opt_say_water',
    [SAY_PHRASE.aborted]: 'opt_say_aborted',
};
/**
 * Matches a pattern against a state ID.
 * If the pattern contains `*`, it is converted to a RegExp (with `.` escaped and `*` → `.*`).
 * Otherwise, performs a direct string comparison.
 */
function matchId(pattern, stateId) {
    if (pattern.includes('*')) {
        const escaped = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*');
        return new RegExp(`^${escaped}$`).test(stateId);
    }
    return pattern === stateId;
}
/**
 * Home alarm system adapter for ioBroker.
 *
 * Implements a full-featured alarm system with zones, presence simulation,
 * night rest mode, speech output, shortcut actions, and scheduled arming/disarming.
 */
class Alarm extends utils.Adapter {
    /** Toggle flag for blinking the silent alarm flash indicator on/off at intervals */
    silentI = false;
    /** Toggle flag for blinking the alarm siren indicator on/off at intervals */
    alarmI = false;
    /** All unique state IDs to subscribe to (union of alarm, inside, notification, and leave IDs) */
    cleanIds = [];
    /** State IDs of circuits in "sharp" (fully armed) alarm mode */
    alarmIds = [];
    /** State IDs of circuits in "sharp inside" (perimeter) alarm mode */
    insideIds = [];
    /** State IDs of circuits in notification mode (including night rest) */
    notificationIds = [];
    /** State IDs of circuits that detect leaving during the activation countdown */
    leaveIds = [];
    /** State IDs for other alarm type 1 (e.g., fire) circuits */
    oneIds = [];
    /** State IDs for other alarm type 2 (e.g., water) circuits */
    twoIds = [];
    /** Cached state values for other alarm type 1 circuits */
    oneStates = {};
    /** Cached state values for other alarm type 2 circuits */
    twoStates = {};
    /** State IDs for zone 1 circuits */
    zoneOneIds = [];
    /** State IDs for zone 2 circuits */
    zoneTwoIds = [];
    /** State IDs for zone 3 circuits */
    zoneThreeIds = [];
    /** Cached state values for zone 1 circuits */
    zoneOneStates = {};
    /** Cached state values for zone 2 circuits */
    zoneTwoStates = {};
    /** Cached state values for zone 3 circuits */
    zoneThreeStates = {};
    /** Cached state values for main alarm circuits */
    states = {};
    /** Notification adapter instance names to send alarm messages to (e.g., telegram, email) */
    sendInstances = [];
    /** Buffer of all alarm log entries separated by `<br>` for the `info.log_today` state */
    logEntries = '';
    /** Number of times the alarm speech/siren repeats before stopping */
    alarmRepeat;
    /** Whether any circuit is configured in "sharp" alarm mode */
    isAlarm = false;
    /** Whether any circuit is configured in "sharp inside" mode */
    isInside = false;
    /** Whether any circuit is configured in notification mode */
    isNotification = false;
    /** Whether the panic button has been pressed */
    isPanic = false;
    /** State IDs of configured input shortcuts for external alarm control */
    idsShortsInput = [];
    /** Comma-separated names of currently triggered sharp alarm circuits */
    namesAlarm;
    /** Comma-separated names of currently triggered sharp-inside circuits */
    namesInside;
    /** Comma-separated names of currently triggered notification circuits */
    namesNotification;
    /** Comma-separated names of currently triggered other alarm type 1 circuits */
    namesOne;
    /** Comma-separated names of currently triggered other alarm type 2 circuits */
    namesTwo;
    /** Comma-separated names of currently triggered zone 1 circuits */
    namesZoneOne;
    /** Comma-separated names of currently triggered zone 2 circuits */
    namesZoneTwo;
    /** Comma-separated names of currently triggered zone 3 circuits */
    namesZoneThree;
    /** Map of state IDs to their previous values for detecting actual value changes */
    changeIds = {};
    /** Whether presence simulation is enabled */
    optPresence = false;
    /** Whether zone 1 monitoring is enabled */
    optOne = true;
    /** Whether zone 2 monitoring is enabled */
    optTwo = true;
    /** Whether zone 3 monitoring is enabled */
    optThree = true;
    /** Whether the alarm system is currently fully armed (sharp) */
    activated = false;
    /** Whether night rest mode is currently active */
    nightRest = false;
    /** Whether "sharp inside" (perimeter) mode is currently active */
    inside = false;
    /** Whether a burglary alarm is currently in progress */
    burgle = false;
    /** Tracks recent triggers from delayed-mode circuits: circuit ID → timestamp (ms) */
    delayedTriggers = new Map();
    /** Activation countdown interval (ticks every second during arming delay) */
    timer = null;
    /** Delay timer for speech output to the sayit adapter */
    speechTimeout = null;
    /** Timeout for the silent alarm duration before auto-reset */
    silentTimer = null;
    /** Timeout for the inside siren duration before auto-reset */
    sirenInsideTimer = null;
    /** Timeout to auto-clear the notification_circuit_changes state */
    timerNotificationChanges = null;
    /** Timeout for the main siren duration before auto-reset */
    sirenTimer = null;
    /** Interval for blinking the silent alarm flash indicator */
    silentInterval = null;
    /** Interval for counting down the silent alarm delay */
    silentCountdown = null;
    /** Interval for blinking the alarm siren/flash indicator */
    alarmInterval = null;
    /** Interval for repeating alarm speech announcements */
    textAlarmInterval = null;
    /** Interval for repeating notification-change speech announcements */
    textChangesInterval = null;
    /** Whether to write alarm events to the ioBroker log */
    optLog;
    /** Configured input shortcut rows for external alarm control triggers */
    shortsIn;
    /** Configured output shortcut rows for mapping alarm states to external actuators */
    shorts;
    /** Scheduled job for night rest start time */
    scheduleFrom;
    /** Scheduled job for night rest end time */
    scheduleTo;
    /** Scheduled job that resets the daily log at midnight */
    scheduleReset;
    /** Delay timer before starting presence simulation after activation */
    presenceDelayTimer = null;
    /** Whether the current time is past sunrise (used for presence light control) */
    sunrise = false;
    /** Whether the current time is past sunset (used for presence light control) */
    sunset = false;
    /** Interval that checks presence simulation state every 60 seconds */
    presenceInterval;
    /** Map of device IDs to their presence simulation timer state */
    presenceTimers = {};
    /** Whether presence simulation is currently running */
    presenceRun = false;
    /** Today's calculated sunset time in HH:MM format from suncalc2 */
    sunsetStr;
    /** Today's calculated sunrise time in HH:MM format from suncalc2 */
    sunriseStr;
    /** Active repeat-write intervals keyed by shortcut index, for continuous value writing */
    shortcutRepeatIntervals = new Map();
    /**
     * Creates a new Alarm adapter instance.
     * Registers event handlers for ready, stateChange, and unload lifecycle events.
     *
     * @param options - Partial adapter options forwarded to the base class
     */
    constructor(options = {}) {
        super({
            ...options,
            name: 'alarm',
        });
        this.on('ready', () => this.main());
        this.on('stateChange', (id, state) => this.onStateChange(id, state));
        this.on('unload', cb => this.onUnload(cb));
    }
    /**
     * Cleanup handler called when the adapter is being stopped.
     * Cancels all scheduled jobs, clears all timers/intervals, and stops presence simulation.
     *
     * @param callback - Callback to signal that cleanup is complete
     */
    onUnload(callback) {
        try {
            this.log.info('cleaned everything up...');
            this.scheduleFrom?.cancel();
            this.scheduleTo?.cancel();
            this.scheduleReset?.cancel();
            this.clearAllTimers();
            if (this.speechTimeout) {
                clearTimeout(this.speechTimeout);
                this.speechTimeout = null;
            }
            this.clearAllPresenceTimer();
            callback();
        }
        catch (e) {
            this.log.debug(String(e));
            callback();
        }
    }
    /**
     * Clears all alarm-related timers and intervals.
     * Used by both {@link onUnload} and {@link disableSystem} to avoid duplication.
     */
    clearAllTimers() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
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
        this.clearShortcutRepeatIntervals();
    }
    /**
     * Clears all active repeat-write intervals for output shortcuts.
     */
    clearShortcutRepeatIntervals() {
        for (const [key, interval] of this.shortcutRepeatIntervals) {
            clearInterval(interval);
            this.shortcutRepeatIntervals.delete(key);
        }
    }
    /**
     * Handles a wrong password attempt by setting the wrong_password flag,
     * clearing the input state, logging the failure, and sending a notification.
     *
     * @param id - The state ID of the password input that was used
     */
    async handleWrongPassword(id) {
        try {
            await this.setStateAsync('info.wrong_password', true, true);
        }
        catch (err) {
            this.log.error(err);
        }
        await this.setStateAsync(id, '', true);
        if (this.optLog) {
            this.log.info(`${this.config.log_pass}`);
        }
        if (this.config.send_failed) {
            this.messages(`${this.config.log_pass}`);
        }
    }
    /**
     * Handles ioBroker state change events.
     * Delegates to {@link change} for processing or logs deletion of states.
     *
     * @param id - Full state ID that changed
     * @param state - New state object, or null/undefined if the state was deleted
     */
    async onStateChange(id, state) {
        if (state) {
            await this.change(id, state);
        }
        else {
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
    async main() {
        this.optLog = this.config.opt_log;
        this.shorts = this.config.shorts;
        this.shortsIn = this.config.shorts_in;
        this.alarmRepeat = parseInt(this.config.alarm_repeat);
        const stateA = await this.getStateAsync('status.activated').catch(e => this.log.warn(e));
        if (!stateA) {
            this.activated = false;
            await this.setStateAsync('status.activated', false, true);
        }
        else {
            this.activated = !!stateA.val;
        }
        const stateP = await this.getStateAsync('presence.on_off').catch(e => this.log.warn(e));
        if (!stateP) {
            this.optPresence = false;
            await this.setStateAsync('presence.on_off', false, true);
        }
        else {
            this.optPresence = stateP.val;
        }
        const stateOne = await this.getStateAsync('zone.one_on_off').catch(e => this.log.warn(e));
        if (!stateOne) {
            this.optOne = false;
            await this.setStateAsync('zone.one_on_off', false, true);
        }
        else {
            this.optOne = stateOne.val;
        }
        const stateTwo = await this.getStateAsync('zone.two_on_off').catch(e => this.log.warn(e));
        if (!stateTwo) {
            this.optTwo = false;
            await this.setStateAsync('zone.two_on_off', false, true);
        }
        else {
            this.optTwo = stateTwo.val;
        }
        const stateThree = await this.getStateAsync('zone.three_on_off').catch(e => this.log.warn(e));
        if (!stateThree) {
            this.optThree = false;
            await this.setStateAsync('zone.three_on_off', false, true);
        }
        else {
            this.optThree = stateThree.val;
        }
        const stateS = await this.getStateAsync('status.sleep').catch(e => this.log.warn(e));
        if (!stateS) {
            this.nightRest = false;
            await this.setStateAsync('status.sleep', false, true);
        }
        else {
            this.nightRest = stateS.val;
        }
        const stateI = await this.getStateAsync('status.sharp_inside_activated').catch(e => this.log.warn(e));
        if (!stateI) {
            this.inside = false;
            await this.setStateAsync('status.sharp_inside_activated', false, true);
        }
        else {
            this.inside = stateI.val;
        }
        if (this.config.circuits) {
            this.splitStates(this.config.circuits);
        }
        else {
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
    /**
     * Arms the alarm system in "sharp" (fully armed) mode.
     *
     * If open alarm circuits exist and `opt_warning` is disabled, reports activation failure.
     * Otherwise, deactivates inside/sleep modes, sets all armed states and HomeKit values,
     * and announces the activation.
     *
     * @param _id - Optional state ID that triggered the activation
     * @param _state - Optional state object of the trigger
     */
    async enableSystem(_id, _state) {
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
            await this.setStateAsync('status.state_list', STATE_LIST.activation_failed, true);
            await this.setStateAsync('status.state', STATUS_STATE.activation_failed, true);
            await this.setStateAsync('use.list', USE_LIST.deactivated, true);
            if (this.config.opt_say_names) {
                say = `${say} ${this.namesAlarm}`;
            }
            this.sayIt(say, SAY_PHRASE.activation_failed);
            return;
        }
        await this.insideEnds();
        await this.sleepEnd();
        await this.setStateAsync('status.sharp_inside_activated', false, true);
        await this.setStateAsync('status.activated', true, true);
        await this.setStateAsync('status.deactivated', false, true);
        await this.setStateAsync('status.activation_failed', false, true);
        await this.setStateAsync('status.state', STATUS_STATE.sharp, true);
        await this.setStateAsync('status.state_list', STATE_LIST.sharp, true);
        await this.setStateAsync('homekit.CurrentState', HOMEKIT_STATE.away_arm, true);
        await this.setStateAsync('homekit.TargetState', HOMEKIT_STATE.away_arm, true);
        await this.setStateAsync('use.list', USE_LIST.sharp, true);
        if (this.isAlarm) {
            await this.setStateAsync('status.activated_with_warnings', true, true);
            await this.setStateAsync('status.state', STATUS_STATE.activated_with_warnings, true);
            await this.setStateAsync('info.log', `${this.config.log_act_warn} ${this.namesAlarm}`, true);
            if (this.optLog) {
                this.log.info(`${this.config.log_act_warn} ${this.namesAlarm}`);
            }
            if (this.config.send_activated_with_warnings) {
                this.messages(`${this.config.log_act_warn} ${this.namesAlarm}`);
            }
        }
        else {
            await this.setStateAsync('info.log', `${this.config.log_act}`, true);
            if (this.optLog) {
                this.log.info(`${this.config.log_act}`);
            }
            this.sayIt(this.config.text_activated, SAY_PHRASE.activated);
            if (this.config.send_activation) {
                this.messages(`${this.config.log_act}`);
            }
        }
    }
    /**
     * Disarms the alarm system from any active mode.
     *
     * Clears all timers and presence simulation. Depending on the current mode,
     * deactivates sharp armed, ends inside mode, or ends night rest.
     */
    async disableSystem() {
        this.burgle = false;
        this.delayedTriggers.clear();
        this.clearAllTimers();
        this.clearAllPresenceTimer();
        if (this.activated || this.isPanic) {
            this.isPanic = false;
            await this.setStateAsync('info.log', `${this.config.log_deact}`, true);
            this.sayIt(this.config.text_deactivated, SAY_PHRASE.deactivated);
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
        }
        else if (this.inside) {
            await this.insideEnds(true);
        }
        else if (this.nightRest) {
            await this.sleepEnd(true);
        }
        else {
            return;
        }
    }
    /**
     * Handles a burglary event triggered by a circuit in armed or inside mode.
     *
     * In silent mode, starts a delayed escalation with flash blinking and countdown.
     * In non-silent mode, immediately escalates to full alarm with sirens and speech.
     * If a burglary is already in progress, only logs the additional trigger.
     *
     * @param id - State ID of the circuit that triggered the burglary
     * @param _state - State object of the triggering circuit
     * @param silent - Whether to use silent alarm mode (delayed escalation)
     * @param indoor - Whether the trigger is from an inside (perimeter) circuit
     */
    async burglary(id, _state, silent, indoor) {
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
            await this.setStateAsync('status.state', STATUS_STATE.silent_alarm, true);
            await this.setStateAsync('status.state_list', STATE_LIST.silent_alarm, true);
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
                    }
                    else {
                        await this.setStateAsync('status.silent_flash', false, true);
                        this.silentI = true;
                    }
                }, this.config.silent_flash * 1000);
            }
            let silentCountdownTime = (Alarm.timeMode(this.config.time_silent_select) * this.config.time_silent) / 1000;
            this.silentCountdown = setInterval(async () => {
                if (silentCountdownTime > 0) {
                    silentCountdownTime--;
                    await this.setStateAsync('status.silent_countdown', silentCountdownTime, true);
                }
                else {
                    await this.setStateAsync('status.silent_countdown', null, true);
                    if (this.silentCountdown) {
                        clearInterval(this.silentCountdown);
                        this.silentCountdown = null;
                    }
                }
            }, 1000);
            this.silentTimer = setTimeout(async () => {
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
                await this.escalateBurglary(say, indoor);
            }, Alarm.timeMode(this.config.time_silent_select) * this.config.time_silent);
        }
        else if (!silent) {
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
            await this.escalateBurglary(say, indoor);
            this.sirenTimer = setTimeout(async () => {
                await this.setStateAsync('status.siren', false, true);
                if (this.sirenTimer) {
                    clearTimeout(this.sirenTimer);
                    this.sirenTimer = null;
                }
            }, Alarm.timeMode(this.config.time_alarm_select) * this.config.time_alarm);
        }
    }
    /**
     * Shared burglary escalation: activates speech, sirens, flash, and alarm states.
     * Called by both silent (after delay) and non-silent burglary paths.
     */
    async escalateBurglary(say, indoor) {
        let count = 0;
        this.sayIt(say, SAY_PHRASE.alarm);
        this.textAlarmInterval = setInterval(() => {
            if (count < this.alarmRepeat) {
                this.sayIt(say, SAY_PHRASE.alarm);
                count++;
            }
            else {
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
        this.sirenInsideTimer = setTimeout(async () => {
            this.sirenInsideTimer = null;
            await this.setStateAsync('status.siren_inside', false, true);
        }, Alarm.timeMode(this.config.time_warning_select) * this.config.time_warning);
        if (this.config.opt_siren && indoor) {
            await this.alarmSiren();
            this.alarmFlash();
        }
        if (!indoor) {
            await this.setStateAsync('status.siren', true, true);
            await this.alarmSiren();
            this.alarmFlash();
        }
        await this.setStateAsync('status.state', STATUS_STATE.burgle, true);
        await this.setStateAsync('status.state_list', STATE_LIST.burglary, true);
        await this.setStateAsync('homekit.CurrentState', HOMEKIT_STATE.alarm_triggered, true);
    }
    /**
     * Triggers a panic alarm (immediate burglary) via the panic button.
     *
     * Activates sirens, speech output, flash, and sets all burglar alarm states.
     * Sends alarm notifications and repeats speech announcements.
     */
    async panic() {
        let count = 0;
        this.isPanic = true;
        await this.setStateAsync('info.log', `${this.config.log_panic}`, true);
        if (this.optLog) {
            this.log.info(`${this.config.log_panic}`);
        }
        if (this.config.send_alarm) {
            this.messages(`${this.config.log_panic}`);
        }
        this.sayIt(this.config.text_alarm, SAY_PHRASE.alarm);
        this.textAlarmInterval = setInterval(() => {
            if (count < this.alarmRepeat) {
                this.sayIt(this.config.text_alarm, SAY_PHRASE.alarm);
                count++;
            }
            else {
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
                }
                else {
                    await this.setStateAsync('status.alarm_flash', false, true);
                    this.alarmI = true;
                }
            }, this.config.alarm_flash * 1000);
        }
        await this.setStateAsync('status.siren', true, true);
        await this.setStateAsync('status.state', STATUS_STATE.burgle, true);
        await this.setStateAsync('status.state_list', STATE_LIST.burglary, true);
        await this.setStateAsync('homekit.CurrentState', HOMEKIT_STATE.alarm_triggered, true);
        this.sirenTimer = setTimeout(async () => {
            this.sirenTimer = null;
            await this.setStateAsync('status.siren', false, true);
        }, Alarm.timeMode(this.config.time_alarm_select) * this.config.time_alarm);
    }
    /**
     * Central state change dispatcher for all monitored and internal states.
     *
     * Updates cached state values, refreshes circuit lists, then routes the change
     * to the appropriate handler: "use.list" commands, HomeKit targets, shortcut forwarding,
     * password inputs, alarm/inside/notification triggers, zone changes, and more.
     *
     * @param id - Full state ID that changed
     * @param state - New state object with the current value
     */
    async change(id, state) {
        let isChanged = false;
        let processed = false;
        if (id in this.states) {
            if (this.states[id] !== state.val) {
                isChanged = true;
                this.states[id] = state.val;
                this.log.debug(`Inside states, state change: ${id} val: ${state.val}`);
            }
            else {
                processed = true;
            }
        }
        if (id in this.oneStates) {
            if (this.oneStates[id] !== state.val) {
                isChanged = true;
                this.oneStates[id] = state.val;
                this.log.debug(`Inside one, state change: ${id} val: ${state.val}`);
            }
            else {
                processed = true;
            }
        }
        if (id in this.twoStates) {
            if (this.twoStates[id] !== state.val) {
                isChanged = true;
                this.twoStates[id] = state.val;
                this.log.debug(`Inside two, state change: ${id} val: ${state.val}`);
            }
            else {
                processed = true;
            }
        }
        if (id in this.zoneOneStates) {
            if (this.zoneOneStates[id] !== state.val) {
                isChanged = true;
                this.zoneOneStates[id] = state.val;
                this.log.debug(`Inside zone_one, state change: ${id} val: ${state.val}`);
            }
            else {
                processed = true;
            }
        }
        if (id in this.zoneTwoStates) {
            if (this.zoneTwoStates[id] !== state.val) {
                isChanged = true;
                this.zoneTwoStates[id] = state.val;
                this.log.debug(`Inside zone_two, state change: ${id} val: ${state.val}`);
            }
            else {
                processed = true;
            }
        }
        if (id in this.zoneThreeStates) {
            if (this.zoneThreeStates[id] !== state.val) {
                isChanged = true;
                this.zoneThreeStates[id] = state.val;
                this.log.debug(`Inside zone_three, state change: ${id} val: ${state.val}`);
            }
            else {
                processed = true;
            }
        }
        if (isChanged) {
            await this.refreshLists();
        }
        if (processed) {
            return;
        }
        if (id === `${this.namespace}.use.list`) {
            switch (state.val) {
                case USE_LIST.deactivated:
                    await this.countdown(false);
                    break;
                case USE_LIST.sharp:
                    if (!this.activated) {
                        await this.enableSystem(id, state);
                    }
                    break;
                case USE_LIST.sharp_inside:
                    await this.insideBegins();
                    break;
                case USE_LIST.activate_with_delay:
                    await this.countdown(true);
                    break;
                case USE_LIST.night_rest:
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
                case HOMEKIT_STATE.stay_arm:
                    await this.insideBegins();
                    break;
                case HOMEKIT_STATE.away_arm:
                    if (!this.activated) {
                        await this.enableSystem(id, state);
                    }
                    break;
                case HOMEKIT_STATE.night_arm:
                    await this.sleepBegin();
                    break;
                case HOMEKIT_STATE.disarmed:
                    await this.countdown(false);
                    break;
                default:
                    this.log.warn('Use wrong value in homekit.TargetState');
                    break;
            }
            return;
        }
        if (id === `${this.namespace}.status.activated`) {
            this.activated = !!state.val;
            this.shortcuts('status.activated', state.val);
            if (this.optPresence) {
                this.presenceDelayTimer = setTimeout(() => {
                    this.presenceDelayTimer = null;
                    void this.setAllPresenceTimer(() => {
                        this.presenceInterval = setInterval(async () => {
                            await this.checkPresence();
                        }, 60000);
                    });
                }, Alarm.timeMode(this.config.presence_activate_delay_select) * this.config.presence_activate_delay);
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
        const SHORTCUT_FORWARD_STATES = new Set([
            'status.sleep',
            'status.gets_activated',
            'status.state_list',
            'status.sharp_inside_activated',
            'status.silent_alarm',
            'status.alarm_flash',
            'status.enableable',
            'status.silent_flash',
            'status.deactivated',
            'status.burglar_alarm',
            'status.siren',
            'status.activation_failed',
            'status.activated_with_warnings',
            'status.activation_countdown',
            'status.state',
            'status.siren_inside',
            'info.notification_circuit_changes',
            'other_alarms.one_changes',
            'other_alarms.two_changes',
        ]);
        const localId = id.startsWith(`${this.namespace}.`) ? id.slice(this.namespace.length + 1) : '';
        if (SHORTCUT_FORWARD_STATES.has(localId)) {
            this.shortcuts(localId, state.val);
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
            if (!state.val) {
                return;
            }
            if ((await this.checkMyPassword(state.val, 'use.disable_password')) && (this.activated || this.inside)) {
                await this.countdown(false);
                return;
            }
            await this.handleWrongPassword(id);
            return;
        }
        if (id === `${this.namespace}.use.toggle_password`) {
            if (state.val == '') {
                return;
            }
            if (await this.checkMyPassword(state.val, 'use.toggle_password')) {
                if (this.activated) {
                    await this.countdown(false);
                }
                else {
                    await this.enableSystem(id, state);
                }
                return;
            }
            await this.handleWrongPassword(id);
            return;
        }
        if (id === `${this.namespace}.use.toggle_with_delay_and_password`) {
            if (state.val == '') {
                return;
            }
            if (await this.checkMyPassword(state.val, 'use.toggle_with_delay_and_password')) {
                await this.countdown(!this.activated);
                return;
            }
            await this.handleWrongPassword(id);
            return;
        }
        if (id === `${this.namespace}.info.log`) {
            await this.logging(state.val);
            return;
        }
        if (this.idsShortsInput.includes(id)) {
            await this.shortcutsInside(id, state.val);
            return;
        }
        if (this.leaveIds.includes(id) &&
            !this.activated &&
            !this.isTrue(id, state, 'main') &&
            this.timer &&
            this.config.opt_leave) {
            await this.leaving(id, state);
            return;
        }
        if (this.alarmIds.includes(id) && this.activated && this.isTrue(id, state, 'main')) {
            if (!this.zone(id)) {
                return;
            }
            if (this.isDelayedTrigger(id)) {
                await this.handleDelayedTrigger(id, state, this.isSilent(id));
            }
            else {
                await this.burglary(id, state, this.isSilent(id));
            }
            return;
        }
        if (this.insideIds.includes(id) && this.inside && this.isTrue(id, state, 'main')) {
            if (!this.zone(id)) {
                return;
            }
            if (this.isDelayedTrigger(id)) {
                await this.handleDelayedTrigger(id, state, this.isSilent(id, true), true);
            }
            else {
                await this.burglary(id, state, this.isSilent(id, true), true);
            }
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
                this.sayIt(say, SAY_PHRASE.changes_night);
            }
            else {
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
                this.sayIt(say, SAY_PHRASE.changes);
            }
            this.timerNotificationChanges = setTimeout(async () => {
                this.timerNotificationChanges = null;
                await this.setStateAsync('info.notification_circuit_changes', false, true);
            }, Alarm.timeMode(this.config.time_warning_select) * this.config.time_warning);
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
            this.sayIt(say, SAY_PHRASE.fire);
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
            this.sayIt(say, SAY_PHRASE.water);
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
    /**
     * Subscribes to all monitored foreign states and internal adapter states.
     *
     * Registers subscriptions for main circuits, input shortcuts, other alarm types,
     * zones, and all internal `use.*`, `status.*`, `presence.*`, `zone.*`, and HomeKit states.
     */
    setSubs() {
        const subscribes = [];
        this.cleanIds.forEach(ele => {
            if (ele) {
                this.log.debug(`SUBSCRIPTION for: ${ele}`);
                if (!subscribes.includes(ele)) {
                    subscribes.push(ele);
                }
            }
            else {
                this.log.debug(`NO SUBSCRIPTION for monitoring circuits`);
            }
        });
        this.idsShortsInput.forEach(ele => {
            if (ele) {
                this.log.debug(`SUBSCRIPTION for input shortcuts: ${ele}`);
                if (!subscribes.includes(ele)) {
                    subscribes.push(ele);
                }
            }
            else {
                this.log.debug(`NO SUBSCRIPTION for input shortcuts`);
            }
        });
        this.oneIds.forEach(ele => {
            if (ele) {
                this.log.debug(`SUBSCRIPTION for other alarm one: ${ele}`);
                if (!subscribes.includes(ele)) {
                    subscribes.push(ele);
                }
            }
            else {
                this.log.debug(`NO SUBSCRIPTION for other alarm one`);
            }
        });
        this.twoIds.forEach(ele => {
            if (ele) {
                this.log.debug(`SUBSCRIPTION for other alarm two: ${ele}`);
                if (!subscribes.includes(ele)) {
                    subscribes.push(ele);
                }
            }
            else {
                this.log.debug(`NO SUBSCRIPTION for other alarm two`);
            }
        });
        this.zoneOneIds.forEach(ele => {
            if (ele) {
                this.log.debug(`SUBSCRIPTION for zone_one: ${ele}`);
                if (!subscribes.includes(ele)) {
                    subscribes.push(ele);
                }
            }
            else {
                this.log.debug(`NO SUBSCRIPTION for zone_one`);
            }
        });
        this.zoneTwoIds.forEach(ele => {
            if (ele) {
                this.log.debug(`SUBSCRIPTION for zone_two: ${ele}`);
                if (!subscribes.includes(ele)) {
                    subscribes.push(ele);
                }
            }
            else {
                this.log.debug(`NO SUBSCRIPTION for zone_two`);
            }
        });
        this.zoneThreeIds.forEach(ele => {
            if (ele) {
                this.log.debug(`SUBSCRIPTION for zone_three: ${ele}`);
                if (!subscribes.includes(ele)) {
                    subscribes.push(ele);
                }
            }
            else {
                this.log.debug(`NO SUBSCRIPTION for zone_three`);
            }
        });
        this.subscribeForeignStates(subscribes);
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
    /**
     * Sends a notification message to all configured messaging instances.
     *
     * For Telegram instances with special parameters enabled, sends with user/chatID.
     * For other instances (email, Pushover, etc.), sends the plain message.
     *
     * @param content - The notification message text to send
     */
    messages(content) {
        if (this.sendInstances.length) {
            const reg = new RegExp('telegram');
            this.sendInstances.forEach(ele => {
                if (reg.test(ele) && this.config.opt_telegram) {
                    this.log.debug(`Send message to ${ele} with special parameter, message: text: ${content}, user: ${this.config.user}, chatID: ${this.config.chatID}`);
                    this.sendTo(ele, 'send', { text: content, user: this.config.user, chatId: this.config.chatID });
                }
                else {
                    this.log.debug(`Send message to ${ele}, message: ${content}`);
                    this.sendTo(ele, content);
                }
            });
        }
    }
    /**
     * Sends a text-to-speech message to a sayit adapter instance after an optional delay.
     *
     * @param id - The sayit state ID to write the speech text to
     * @param message - The text message to speak
     * @param time - Delay in seconds before sending the speech command
     */
    speechOutput(id, message, time) {
        let delay;
        time = parseInt(time);
        if (Number.isInteger(time)) {
            delay = time;
        }
        else {
            delay = 0;
        }
        this.log.debug(`speech output instance: ${id}: ${message}, delay ${delay}s`);
        this.speechTimeout = setTimeout(() => {
            this.speechTimeout = null;
            this.setForeignState(id, message, err => {
                if (err) {
                    this.log.warn(err);
                }
            });
        }, delay * 1000);
    }
    /**
     * Dispatches a speech message to all enabled sayit instances for a given phrase type.
     *
     * Skips speech output entirely during night rest when `opt_night_silent` is enabled.
     * Only sends to instances that have the corresponding phrase option enabled.
     *
     * @param message - The text to speak
     * @param optVal - The phrase type index from {@link SAY_PHRASE} that determines which option flag to check
     */
    sayIt(message, optVal) {
        const ttsInstance = this.config.sayit;
        if (this.nightRest && this.config.opt_night_silent) {
            return;
        }
        ttsInstance?.forEach(ele => {
            if (ele.enabled) {
                const optKey = SAY_PHRASE_OPTIONS[optVal];
                if (optKey) {
                    if (ele[optKey]) {
                        this.speechOutput(ele.name_id, message, ele.speech_delay);
                    }
                }
                else {
                    this.log.debug(`no speech output!`);
                }
            }
        });
    }
    /**
     * Checks whether the zone associated with a state ID is currently enabled.
     *
     * Returns `false` if the ID belongs to a disabled zone, `true` otherwise
     * (including for IDs that don't belong to any zone).
     *
     * @param id - The state ID to check zone membership for
     * @returns `true` if the zone is enabled or the ID is not zone-specific
     */
    zone(id) {
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
    /**
     * Activates the siren state and sets a timeout to automatically deactivate it
     * after the configured alarm duration.
     */
    async alarmSiren() {
        await this.setStateAsync('status.siren', true, true);
        this.sirenTimer = setTimeout(async () => {
            await this.setStateAsync('status.siren', false, true);
            if (this.sirenTimer) {
                clearTimeout(this.sirenTimer);
                this.sirenTimer = null;
            }
        }, Alarm.timeMode(this.config.time_alarm_select) * this.config.time_alarm);
    }
    /**
     * Starts the alarm flash indicator blinking at the configured frequency.
     * Toggles the `status.alarm_flash` state on/off at each interval tick.
     */
    alarmFlash() {
        if (this.config.alarm_flash > 0) {
            this.alarmInterval = setInterval(async () => {
                if (this.alarmI) {
                    await this.setStateAsync('status.alarm_flash', true, true);
                    this.alarmI = false;
                }
                else {
                    await this.setStateAsync('status.alarm_flash', false, true);
                    this.alarmI = true;
                }
            }, this.config.alarm_flash * 1000);
        }
    }
    /**
     * Resets all alarm status states to their deactivated/default values.
     * Sets deactivated flag, clears sirens, flash, burglar alarm, and silent alarm states,
     * and updates HomeKit and "use.list" to disarmed.
     */
    async disableStates() {
        await this.setStateAsync('status.deactivated', true, true);
        await this.setStateAsync('status.state', STATUS_STATE.deactivated, true);
        await this.setStateAsync('status.state_list', STATE_LIST.deactivated, true);
        await this.setStateAsync('homekit.CurrentState', HOMEKIT_STATE.disarmed, true);
        await this.setStateAsync('homekit.TargetState', HOMEKIT_STATE.disarmed, true);
        await this.setStateAsync('use.list', USE_LIST.deactivated, true);
        await this.setStateAsync('status.siren_inside', false, true);
        await this.setStateAsync('status.siren', false, true);
        await this.setStateAsync('info.notification_circuit_changes', false, true);
        await this.setStateAsync('status.silent_flash', false, true);
        await this.setStateAsync('status.alarm_flash', false, true);
        await this.setStateAsync('status.burglar_alarm', false, true);
        await this.setStateAsync('status.silent_alarm', false, true);
    }
    /**
     * Warns about state IDs that are used in both the main circuits and other alarm/zone tables.
     * Duplicate usage can cause unpredictable behavior.
     */
    checkDoubles() {
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
    /**
     * Returns the config array for the given table name.
     *
     * @param table - Table identifier to look up
     * @returns The corresponding config array, or `undefined` if the table name is unknown
     */
    getTable(table) {
        const tables = {
            main: this.config.circuits,
            one: this.config.one,
            two: this.config.two,
            zone_one: this.config.zone_one,
            zone_two: this.config.zone_two,
            zone_three: this.config.zone_three,
        };
        return tables[table];
    }
    /**
     * Returns the cached state map for the given table name.
     *
     * @param table - Table identifier to look up
     * @returns The corresponding state cache, or `undefined` if the table name is unknown
     */
    getTableStates(table) {
        const states = {
            main: this.states,
            one: this.oneStates,
            two: this.twoStates,
            zone_one: this.zoneOneStates,
            zone_two: this.zoneTwoStates,
            zone_three: this.zoneThreeStates,
        };
        return states[table];
    }
    /**
     * Checks whether a circuit is configured for silent (delayed) alarm.
     *
     * @param id - The state ID of the circuit to check
     * @param indoor - If `true`, checks the inside-delay flag; otherwise checks the main delay flag
     * @returns `true` if the circuit uses silent alarm mode
     */
    isSilent(id, indoor) {
        const circuit = this.config.circuits.find(obj => matchId(id, obj.name_id));
        if (!circuit) {
            return false;
        }
        return indoor ? circuit.delay_inside : circuit.delay;
    }
    /**
     * Checks if a circuit uses delayed trigger mode.
     *
     * @param id - The state ID of the circuit
     * @returns `true` if the circuit is configured as 'delayed'
     */
    isDelayedTrigger(id) {
        const circuit = this.config.circuits.find(obj => matchId(id, obj.name_id));
        return circuit?.trigger_mode === 'delayed';
    }
    /**
     * Handles a delayed trigger event. Records the trigger and checks
     * if the configured threshold of unique delayed sensors within the
     * time window has been met.
     *
     * @param id - The state ID of the triggered circuit
     * @param state - The state object
     * @param silent - Whether to use silent alarm mode
     * @param indoor - Whether this is a sharp-inside trigger
     * @returns `true` if the threshold was met and burglary was triggered
     */
    async handleDelayedTrigger(id, state, silent, indoor) {
        const now = Date.now();
        const windowMs = (this.config.delayed_trigger_time || 2) * 60_000;
        const threshold = this.config.delayed_trigger_count || 3;
        // Record this trigger
        this.delayedTriggers.set(id, now);
        // Remove expired entries
        for (const [triggerId, timestamp] of this.delayedTriggers) {
            if (now - timestamp > windowMs) {
                this.delayedTriggers.delete(triggerId);
            }
        }
        const count = this.delayedTriggers.size;
        const name = this.getName(id);
        this.log.info(`Delayed trigger from "${name}" (${id}): ${count}/${threshold} within ${this.config.delayed_trigger_time || 2} min`);
        if (count >= threshold) {
            this.delayedTriggers.clear();
            await this.burglary(id, state, silent, indoor);
            return true;
        }
        return false;
    }
    /**
     * Converts a time unit string to its millisecond multiplier.
     *
     * @param value - Time unit: `'sec'` for seconds, `'min'` for minutes
     * @returns Milliseconds per unit (1000 for seconds, 60000 for minutes)
     */
    static timeMode(value) {
        switch (value) {
            case 'sec':
                return 1000;
            case 'min':
                return 60000;
            default:
                return 1000;
        }
    }
    /**
     * Activates "sharp inside" (perimeter) alarm mode.
     *
     * Ends sleep mode, sets inside-armed states and HomeKit values.
     * If inside circuits are open, announces warnings; otherwise announces clean activation.
     */
    async insideBegins() {
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
                this.sayIt(say, SAY_PHRASE.warnings);
            }
            else {
                await this.setStateAsync('info.log', `${this.config.log_warn_act}`, true);
                if (this.optLog) {
                    this.log.info(`${this.config.log_warn_act}`);
                }
                if (this.config.send_activation_inside) {
                    this.messages(`${this.config.log_warn_act}`);
                }
                this.sayIt(this.config.text_warn_begin, SAY_PHRASE.sharp_inside_activated);
            }
            await this.setStateAsync('status.sharp_inside_activated', true, true);
            await this.setStateAsync('status.state', STATUS_STATE.sharp_inside, true);
            await this.setStateAsync('status.state_list', STATE_LIST.sharp_inside, true);
            await this.setStateAsync('homekit.CurrentState', HOMEKIT_STATE.stay_arm, true);
            await this.setStateAsync('homekit.TargetState', HOMEKIT_STATE.stay_arm, true);
            await this.setStateAsync('use.list', USE_LIST.sharp_inside, true);
            await this.setStateAsync('status.activated', false, true);
            await this.setStateAsync('status.deactivated', false, true);
        }
    }
    /**
     * Deactivates "sharp inside" (perimeter) alarm mode.
     *
     * When `off` is `true`, performs full deactivation: clears timers, logs deactivation,
     * sends notifications, announces via speech, and resets all states to disarmed.
     * When `off` is falsy, only clears the inside flag (used when transitioning to another mode).
     *
     * @param off - If `true`, fully deactivate with logging and state reset
     */
    async insideEnds(off) {
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
                this.sayIt(this.config.text_warn_end, SAY_PHRASE.sharp_inside_deactivated);
                await this.setStateAsync('status.sharp_inside_activated', false, true);
                await this.disableStates();
            }
        }
    }
    /**
     * Activates night rest mode.
     *
     * Prevents activation if a burglary is in progress. When triggered automatically
     * by schedule (`auto=true`), also prevents activation if the system is already
     * armed or in inside mode. Sets night rest states, HomeKit values, and announces
     * warnings if notification circuits are open.
     *
     * @param auto - If `true`, the activation was triggered by the scheduled night rest timer
     */
    async sleepBegin(auto) {
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
            this.sayIt(this.config.text_nightrest_beginn, SAY_PHRASE.night_rest_begins);
        }
        await this.setStateAsync('status.state', STATUS_STATE.night_rest, true);
        await this.setStateAsync('status.state_list', STATE_LIST.night_rest, true);
        await this.setStateAsync('homekit.CurrentState', HOMEKIT_STATE.night_arm, true);
        await this.setStateAsync('homekit.TargetState', HOMEKIT_STATE.night_arm, true);
        await this.setStateAsync('use.list', USE_LIST.night_rest, true);
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
            this.sayIt(say, SAY_PHRASE.warnings);
        }
    }
    /**
     * Deactivates night rest mode.
     *
     * When `off` is `true`, performs full deactivation: logs the end of night rest,
     * announces via speech, and resets states to disarmed (unless inside mode is active).
     * When `off` is falsy, only clears the nightRest flag (used when transitioning to another mode).
     *
     * @param off - If `true`, fully deactivate with logging and state reset
     */
    async sleepEnd(off) {
        if (this.nightRest) {
            this.nightRest = false;
            if (off) {
                await this.setStateAsync('info.log', `${this.config.log_sleep_e}`, true);
                this.sayIt(this.config.text_nightrest_end, SAY_PHRASE.night_rest_ends);
                if (this.optLog) {
                    this.log.info(`${this.config.log_sleep_e}`);
                }
                await this.setStateAsync('status.state', STATUS_STATE.deactivated, true);
                if (!this.inside) {
                    await this.setStateAsync('status.state_list', STATE_LIST.deactivated, true);
                    await this.setStateAsync('homekit.CurrentState', HOMEKIT_STATE.disarmed, true);
                    await this.setStateAsync('homekit.TargetState', HOMEKIT_STATE.disarmed, true);
                    await this.setStateAsync('use.list', USE_LIST.deactivated, true);
                }
            }
        }
    }
    /**
     * Re-evaluates all circuit lists to determine which circuits are currently triggered.
     *
     * Updates `isAlarm`, `isInside`, `isNotification` flags and their corresponding
     * name strings. Publishes plain-text and HTML circuit lists to adapter states.
     * Also updates zone states, other alarm lists, and the `enableable` flag.
     */
    async refreshLists() {
        this.check(this.alarmIds, 'main', async (_val, ids) => {
            this.log.debug(`Alarm circuit list: ${ids.join(', ')}`);
            if (ids.length > 0) {
                this.isAlarm = true;
                this.namesAlarm = this.getName(ids, 'main');
                await this.setStateAsync('info.alarm_circuit_list', this.namesAlarm, true);
                await this.setStateAsync('info.alarm_circuit_list_html', this.getNameHtml(ids), true);
            }
            else {
                this.isAlarm = false;
                this.namesAlarm = '';
                await this.setStateAsync('info.alarm_circuit_list', '', true);
                await this.setStateAsync('info.alarm_circuit_list_html', '', true);
            }
        });
        this.check(this.insideIds, 'main', async (_val, ids) => {
            this.log.debug(`Inside circuit list: ${ids.join(', ')}`);
            if (ids.length > 0) {
                this.isInside = true;
                this.namesInside = this.getName(ids, 'main');
                await this.setStateAsync('info.sharp_inside_circuit_list', this.namesInside, true);
                await this.setStateAsync('info.sharp_inside_circuit_list_html', this.getNameHtml(ids), true);
            }
            else {
                this.isInside = false;
                this.namesInside = '';
                await this.setStateAsync('info.sharp_inside_circuit_list', '', true);
                await this.setStateAsync('info.sharp_inside_circuit_list_html', '', true);
            }
        });
        this.check(this.notificationIds, 'main', async (_val, ids) => {
            this.log.debug(`Notification circuit list: ${ids.join(', ')}`);
            if (ids.length > 0) {
                this.isNotification = true;
                this.namesNotification = this.getName(ids, 'main');
                await this.setStateAsync('info.notification_circuit_list', this.namesNotification, true);
                await this.setStateAsync('info.notification_circuit_list_html', this.getNameHtml(ids), true);
            }
            else {
                this.isNotification = false;
                this.namesNotification = '';
                await this.setStateAsync('info.notification_circuit_list', '', true);
                await this.setStateAsync('info.notification_circuit_list_html', '', true);
            }
        });
        this.check(this.oneIds, 'one', async (_val, ids) => {
            this.log.debug(`One list: ${ids.join(', ')}`);
            if (ids.length > 0) {
                this.namesOne = this.getName(ids, 'one');
                await this.setStateAsync('other_alarms.one_list', this.namesOne, true);
                await this.setStateAsync('other_alarms.one_list_html', this.getNameHtml(ids, 'one'), true);
            }
            else {
                this.namesOne = '';
                await this.setStateAsync('other_alarms.one_list', '', true);
                await this.setStateAsync('other_alarms.one_list_html', '', true);
            }
        });
        this.check(this.twoIds, 'two', async (_val, ids) => {
            this.log.debug(`Two list: ${ids.join(', ')}`);
            if (ids.length > 0) {
                this.namesTwo = this.getName(ids, 'two');
                await this.setStateAsync('other_alarms.two_list', this.namesTwo, true);
                await this.setStateAsync('other_alarms.two_list_html', this.getNameHtml(ids, 'two'), true);
            }
            else {
                this.namesTwo = '';
                await this.setStateAsync('other_alarms.two_list', '', true);
                await this.setStateAsync('other_alarms.two_list_html', '', true);
            }
        });
        this.check(this.zoneOneIds, 'zone_one', async (_val, ids) => {
            this.log.debug(`Zone_one list: ${ids.join(', ')}`);
            if (ids.length > 0) {
                this.namesZoneOne = this.getName(ids, 'zone_one');
                this.log.debug(`Names in zone one: ${this.namesZoneOne}`);
                await this.setStateAsync('zone.one', true, true);
            }
            else {
                this.namesZoneOne = '';
                this.log.debug(`Names in zone one: ${this.namesZoneOne}`);
                await this.setStateAsync('zone.one', false, true);
            }
        });
        this.check(this.zoneTwoIds, 'zone_two', async (_val, ids) => {
            this.log.debug(`Zone_two list: ${ids.join(', ')}`);
            if (ids.length > 0) {
                this.namesZoneTwo = this.getName(ids, 'zone_two');
                this.log.debug(`Names in zone two: ${this.namesZoneTwo}`);
                await this.setStateAsync('zone.two', true, true);
            }
            else {
                this.namesZoneTwo = '';
                this.log.debug(`Names in zone two: ${this.namesZoneTwo}`);
                await this.setStateAsync('zone.two', false, true);
            }
        });
        this.check(this.zoneThreeIds, 'zone_three', async (_val, ids) => {
            this.log.debug(`Zone_three list: ${ids.join(', ')}`);
            if (ids.length > 0) {
                this.namesZoneThree = this.getName(ids, 'zone_three');
                this.log.debug(`Names in zone three: ${this.namesZoneThree}`);
                await this.setStateAsync('zone.three', true, true);
            }
            else {
                this.namesZoneThree = '';
                this.log.debug(`Names in zone three: ${this.namesZoneThree}`);
                await this.setStateAsync('zone.three', false, true);
            }
        });
        await this.setStateAsync('status.enableable', !this.isAlarm || this.config.opt_warning, true);
    }
    /**
     * Validates a password attempt against the configured alarm password.
     *
     * On success, clears the wrong_password flag and resets the input state.
     *
     * @param pass - The password value to check
     * @param id - The state ID of the password input (cleared on success)
     * @returns `true` if the password matches, `false` otherwise
     */
    async checkMyPassword(pass, id) {
        if (pass === this.config.password) {
            this.log.debug(`Password accept`);
            try {
                await this.setStateAsync('info.wrong_password', false, true);
            }
            catch (err) {
                this.log.error(err);
            }
            await this.setStateAsync(id, '', true);
            return true;
        }
        return false;
    }
    /**
     * Determines whether a state change represents a "triggered" condition,
     * accounting for the circuit's inverted (`negativ`) logic flag.
     *
     * Returns `true` when the state value and inversion flag indicate an active trigger:
     * - Normal circuit (`negativ=false`): triggered when `state.val` is truthy
     * - Inverted circuit (`negativ=true`): triggered when `state.val` is falsy
     *
     * @param id - The state ID to evaluate
     * @param state - The current state object
     * @param table - The config table to look up the inversion flag
     * @returns `true` if the state represents a triggered condition
     */
    isTrue(id, state, table) {
        let test = false;
        if (!this.search(id, table) && state.val) {
            test = true;
        }
        else if (this.search(id, table) && !state.val) {
            test = true;
        }
        return test;
    }
    /**
     * Splits a delimited string into a clean array of trimmed, non-empty tokens.
     * Accepts commas, semicolons, and whitespace as delimiters.
     *
     * @param str - The delimited string to split
     * @returns Array of trimmed non-empty tokens
     */
    splitArr(str) {
        const tempArr = str.split(/[,;\s]+/);
        const cleanArr = [];
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
    splitStates(arr) {
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
            }
            else {
                this.log.debug(`State not used but configured: ${ele.name_id}`);
            }
        });
    }
    /**
     * Builds a de-duplicated list of all monitored circuit state IDs.
     * Combines alarm, inside, notification, and leave IDs into `cleanIds`.
     */
    getIds() {
        let ids = [];
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
    search(id, table) {
        const tableObj = this.getTable(table);
        if (!tableObj) {
            this.log.warn(`Issue in function search, unknown table: ${table}`);
            return false;
        }
        const obj = tableObj.find(obj => matchId(id, obj.name_id));
        return obj?.negativ ?? false;
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
    check(arr, table, callback) {
        const tempStates = this.getTableStates(table);
        if (!tempStates) {
            this.log.warn(`Issue in function check, unknown table: ${table}`);
            return;
        }
        const tempArr = [];
        if (arr.length > 0) {
            arr.forEach(ele => {
                if (tempStates[ele] && !this.search(ele, table)) {
                    tempArr.push(ele);
                }
                else if (tempStates[ele] == false && this.search(ele, table)) {
                    tempArr.push(ele);
                }
            });
            if (tempArr.length > 0) {
                void callback(true, tempArr);
            }
            else {
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
    getName(ids, table = 'main') {
        const tableObj = this.getTable(table);
        if (Array.isArray(ids)) {
            const names = [];
            ids.forEach(id => {
                const obj = tableObj.find(obj => matchId(id, obj.name_id));
                if (obj) {
                    names.push(obj.name);
                }
            });
            return names.join();
        }
        const obj = tableObj.find(obj => matchId(ids, obj.name_id));
        return obj?.name ?? '';
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
    getNameHtml(ids, table = 'main') {
        const tableObj = this.getTable(table);
        if (Array.isArray(ids)) {
            const names = [];
            ids.forEach(id => {
                const obj = tableObj.find(obj => matchId(id, obj.name_id));
                if (obj) {
                    names.push(obj.name);
                }
            });
            return names.join('<br>');
        }
        const obj = tableObj.find(obj => matchId(ids, obj.name_id));
        return obj?.name ?? '';
    }
    /**
     * Fetches the value of a foreign state by its ID.
     *
     * Logs an error if the state does not exist or its value is null/undefined.
     *
     * @param id - Full state ID to read
     * @returns The state value, or `null` if the state is unavailable
     */
    async getStateValueAsync(id) {
        const state = await this.getForeignStateAsync(id);
        if (!state || state.val === null || state.val === undefined) {
            this.log.error(`state is null: ${id}`);
            return null;
        }
        return state.val;
    }
    /**
     * Fetches and caches the current values of all main circuit states.
     * Populates the `states` map with `{stateId: value}` entries for all `cleanIds`.
     */
    async fetchStates() {
        for (const id of this.cleanIds) {
            this.states[id] = await this.getStateValueAsync(id);
        }
        this.log.debug(JSON.stringify(this.states));
    }
    /**
     * Fetches and caches the current values of "other alarm" states (one and two).
     * Collects enabled IDs from config tables and populates `oneStates` and `twoStates`.
     */
    async getOtherStates() {
        if (this.config.one) {
            this.config.one.forEach(ele => {
                if (ele.enabled) {
                    this.oneIds.push(ele.name_id);
                }
            });
            for (const id of this.oneIds) {
                this.oneStates[id] = await this.getStateValueAsync(id);
            }
        }
        if (this.config.two) {
            this.config.two.forEach(ele => {
                if (ele.enabled) {
                    this.twoIds.push(ele.name_id);
                }
            });
            for (const id of this.twoIds) {
                this.twoStates[id] = await this.getStateValueAsync(id);
            }
        }
        this.log.debug(`other alarm are one: ${JSON.stringify(this.oneStates)} two: ${JSON.stringify(this.twoStates)}`);
    }
    /**
     * Fetches and caches the current values of zone states (one, two, and three).
     * Collects enabled IDs from zone config tables and populates zone state maps.
     */
    async getZoneStates() {
        if (this.config.zone_one) {
            this.config.zone_one.forEach(ele => {
                if (ele.enabled) {
                    this.zoneOneIds.push(ele.name_id);
                }
            });
            for (const id of this.zoneOneIds) {
                this.zoneOneStates[id] = await this.getStateValueAsync(id);
            }
        }
        if (this.config.zone_two) {
            this.config.zone_two.forEach(ele => {
                if (ele.enabled) {
                    this.zoneTwoIds.push(ele.name_id);
                }
            });
            for (const id of this.zoneTwoIds) {
                this.zoneTwoStates[id] = await this.getStateValueAsync(id);
            }
        }
        if (this.config.zone_three) {
            this.config.zone_three.forEach(ele => {
                if (ele.enabled) {
                    this.zoneThreeIds.push(ele.name_id);
                }
            });
            for (const id of this.zoneThreeIds) {
                this.zoneThreeStates[id] = await this.getStateValueAsync(id);
            }
        }
        this.log.debug(`zone one: ${JSON.stringify(this.zoneOneStates)} zone two: ${JSON.stringify(this.zoneTwoStates)} zone three: ${JSON.stringify(this.zoneThreeStates)}`);
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
    async leaving(_id, _state) {
        this.log.info(`Leaving state triggered`);
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
    async countdown(count) {
        const timeFactor = Alarm.timeMode(this.config.time_activate_select);
        let counter = (this.config.time_activate * timeFactor) / 1000;
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
                this.sayIt(warnSay, SAY_PHRASE.warnings);
            }
            if (this.isAlarm) {
                setTimeout(() => this.sayIt(say, SAY_PHRASE.countdown), 5000);
            }
            else {
                this.sayIt(say, SAY_PHRASE.countdown);
            }
            await this.setStateAsync('status.gets_activated', true, true);
            await this.setStateAsync('status.state', STATUS_STATE.gets_activated, true);
            await this.setStateAsync('status.state_list', STATE_LIST.gets_activated, true);
            this.timer = setInterval(async () => {
                if (counter > 0) {
                    counter--;
                    await this.setStateAsync('status.activation_countdown', counter, true);
                }
                else {
                    if (this.timer) {
                        clearInterval(this.timer);
                        this.timer = null;
                    }
                    await this.setStateAsync('status.activation_countdown', counter, true);
                    await this.setStateAsync('status.gets_activated', false, true);
                    await this.enableSystem();
                }
            }, 1000);
        }
        else if (count && this.timer) {
            return;
        }
        else if (count && this.activated) {
            return;
        }
        else {
            if (this.timer) {
                clearInterval(this.timer);
                this.timer = null;
                await this.setStateAsync('status.activation_countdown', null, true);
                await this.setStateAsync('status.gets_activated', false, true);
                await this.setStateAsync('status.state_list', STATE_LIST.activation_aborted, true);
                this.sayIt(this.config.text_aborted, SAY_PHRASE.aborted);
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
    bools(val) {
        switch (val) {
            case 'true':
                return true;
            case 'false':
                return false;
            default:
                if (isNaN(Number(val))) {
                    return val;
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
    async shortcutsInside(id, val) {
        const changed = this.isChanged(id, val);
        for (const ele of this.shortsIn) {
            if (ele.name_id == id) {
                if (ele.value === val || this.bools(ele.value) == val) {
                    if (ele.trigger_val === 'any' || changed) {
                        this.log.debug(`Input shortcut changed: ${ele.name_id}`);
                        try {
                            await this.setStateAsync(ele.select_id, true, true);
                        }
                        catch (err) {
                            this.log.warn(`Cannot set state: ${err}`);
                        }
                    }
                }
            }
        }
    }
    /**
     * Extracts the state IDs from enabled input shortcut rows.
     *
     * @param ids - Array of input shortcut configuration rows
     * @returns Array of state IDs for all enabled input shortcuts
     */
    getShortIds(ids) {
        const idsArr = ids || [];
        const tempIds = [];
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
    shortcuts(id, val) {
        const change = this.isChanged(id, val);
        let setVal = val;
        if (id === 'status.state_list') {
            const name = STATE_LIST_NAMES[val];
            if (name) {
                setVal = name;
            }
            else {
                setVal = val;
                this.log.warn(`Wrong list state at shortcuts: ${val}`);
            }
        }
        this.shorts?.forEach((ele, i) => {
            if (!ele.enabled || ele.select_id !== id) {
                return;
            }
            const isMatch = this.bools(ele.trigger_val) === setVal && (change || ele.retrigger);
            if (!isMatch && this.shortcutRepeatIntervals.has(i)) {
                clearInterval(this.shortcutRepeatIntervals.get(i));
                this.shortcutRepeatIntervals.delete(i);
                this.log.debug(`Repeat write cancelled for shortcut ${i}: ${ele.name_id}`);
            }
            if (isMatch) {
                // Cancel running repeat interval before restarting
                if (this.shortcutRepeatIntervals.has(i)) {
                    clearInterval(this.shortcutRepeatIntervals.get(i));
                    this.shortcutRepeatIntervals.delete(i);
                }
                const writeValue = this.bools(ele.value);
                setTimeout(() => {
                    this.setForeignState(ele.name_id, writeValue, err => {
                        if (err) {
                            this.log.warn(`Cannot set state: ${err}`);
                        }
                    });
                }, i * 250);
                if (ele.repeat_write > 0) {
                    let remaining = ele.repeat_write - 1;
                    const interval = setInterval(() => {
                        if (remaining <= 0) {
                            clearInterval(this.shortcutRepeatIntervals.get(i));
                            this.shortcutRepeatIntervals.delete(i);
                            this.log.debug(`Repeat write finished for shortcut ${i}: ${ele.name_id}`);
                            return;
                        }
                        remaining--;
                        this.setForeignState(ele.name_id, writeValue, err => {
                            if (err) {
                                this.log.warn(`Cannot set state: ${err}`);
                            }
                        });
                    }, 1000);
                    this.shortcutRepeatIntervals.set(i, interval);
                    this.log.debug(`Started repeat write for shortcut ${i}: ${ele.name_id}, ${ele.repeat_write}s`);
                }
            }
        });
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
    isChanged(id, val) {
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
    timeStamp() {
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
    async logging(content) {
        const state = await this.getStateAsync('info.log_today').catch(e => this.log.warn(e));
        if (!state) {
            this.logEntries = '';
            await this.setStateAsync('info.log_today', this.logEntries, true);
        }
        else {
            this.logEntries = state.val;
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
    async setAllPresenceTimer(callback) {
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
                        presenceLength: this.getTimeLength(ele.presence_length * Alarm.timeMode(ele.presence_length_select), ele.presence_length_shuffle),
                        presenceLengthTimer: null,
                        presenceDelay: this.getTimeLength(ele.presence_delay * Alarm.timeMode(ele.presence_delay_select), ele.presence_delay_shuffle),
                        presenceDelayTimer: null,
                        presenceValueON: this.getValType(ele.presence_val_on),
                        presenceValueOff: this.getValType(ele.presence_val_off),
                        presenceTriggerLight: ele.presence_trigger_light,
                        presenceLightLux: ele.presence_light_lux,
                        wasOn: false,
                    };
                }
                else if (!ele.enabled) {
                    this.log.debug(`Presence state not used but configured: ${ele.name_id}`);
                }
                else if (ele.name_id !== '') {
                    this.log.debug(`Presence ID is empty: ${ele.name_id}`);
                }
                else {
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
    clearAllPresenceTimer() {
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
    async checkPresence() {
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
                    if (!pt.presenceTimeFrom || !pt.presenceTimeTo) {
                        this.log.warn(`Please check the times when configuring attendance: ${pt.name} -- ${pt.nameID} `);
                        return;
                    }
                    if (this.timeInRange(pt.presenceTimeFrom, pt.presenceTimeTo) && !pt.wasOn) {
                        this.log.debug(`Delay for: ${pt.name} -- ${pt.nameID}  starts ${pt.presenceDelay}ms, because time is in range.`);
                        pt.wasOn = true;
                        pt.presenceDelayTimer = setTimeout(() => {
                            pt.presenceDelayTimer = null;
                            this.log.debug(`Delay for: ${pt.name} -- ${pt.nameID}  ends and switch ON ${pt.presenceLength}ms.`);
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
                    }
                    else {
                        this.log.debug(`${pt.name} -- ${pt.nameID}  was ON or is not in time range`);
                    }
                    break;
                case 'sunrise':
                    if (this.sunrise && !pt.wasOn) {
                        this.log.debug(`Delay for: ${pt.name} -- ${pt.nameID}  starts ${pt.presenceDelay}ms, by sunrise`);
                        pt.wasOn = true;
                        pt.presenceDelayTimer = setTimeout(() => {
                            pt.presenceDelayTimer = null;
                            this.log.debug(`Delay for: ${pt.name} -- ${pt.nameID}  ends and switch ON ${pt.presenceLength}ms.`);
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
                    }
                    else {
                        this.log.debug(`${pt.name} -- ${pt.nameID}  was ON or is no sunrise`);
                    }
                    break;
                case 'sunset':
                    if (this.sunset && !pt.wasOn) {
                        this.log.debug(`Delay for: ${pt.name} -- ${pt.nameID}  starts ${pt.presenceDelay}ms, by sunset`);
                        pt.wasOn = true;
                        pt.presenceDelayTimer = setTimeout(() => {
                            pt.presenceDelayTimer = null;
                            this.log.debug(`Delay for: ${pt.name} -- ${pt.nameID}  ends and switch ON ${pt.presenceLength}ms.`);
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
                    }
                    else {
                        this.log.debug(`${pt.name} -- ${pt.nameID}  was ON or is no sunset`);
                    }
                    break;
                case 'light': {
                    const lightVal = await this.getForeignStateAsync(pt.presenceTriggerLight).catch(e => {
                        this.log.warn(`Check your light ID ${pt.name} -- ${pt.nameID}  in presence config! +++ ${e}`);
                        return undefined;
                    });
                    if (lightVal && lightVal.val < pt.presenceLightLux && !pt.wasOn) {
                        this.log.debug(`Delay for: ${pt.name} -- ${pt.nameID}  starts ${pt.presenceDelay}ms, because light value is not under the limit.`);
                        pt.wasOn = true;
                        pt.presenceDelayTimer = setTimeout(() => {
                            pt.presenceDelayTimer = null;
                            this.log.debug(`Delay for: ${pt.name} -- ${pt.nameID}  ends and switch ON ${pt.presenceLength}ms.`);
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
                    }
                    else {
                        this.log.debug(`${pt.name} -- ${pt.nameID}  was ON or light value is not under the limit.`);
                    }
                    break;
                }
                default:
                    this.log.warn(`Please check presence configuration for: ${pt.name} -- ${pt.nameID} , value: ${pt.optionPresence}`);
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
        if (isNaN(Number(val))) {
            return val;
        }
        return Number(val);
    }
    /**
     * Fetches the system's geographic coordinates from ioBroker configuration
     * and calculates sunrise/sunset times via {@link setSun}.
     */
    async getAstro() {
        const obj = await this.getForeignObjectAsync('system.config');
        if (obj?.common?.longitude && obj.common.latitude) {
            const longitude = obj.common.longitude;
            const latitude = obj.common.latitude;
            this.log.debug(`longitude: ${longitude} | latitude: ${latitude}`);
            this.setSun(longitude, latitude);
        }
        else {
            this.log.error('System location settings cannot be called up. Please check configuration!');
        }
    }
    /**
     * Calculates and stores today's sunrise and sunset times using SunCalc.
     *
     * @param longitude - Geographic longitude of the system location
     * @param latitude - Geographic latitude of the system location
     */
    setSun(longitude, latitude) {
        try {
            const times = suncalc2_1.default.getTimes(new Date(), latitude, longitude);
            this.log.debug('calculate astrodata ...');
            this.sunsetStr = `${`0${times.sunset.getHours()}`.slice(-2)}:${`0${times.sunset.getMinutes()}`.slice(-2)}`;
            this.sunriseStr = `${`0${times.sunrise.getHours()}`.slice(-2)}:${`0${times.sunrise.getMinutes()}`.slice(-2)}`;
            this.log.debug(`Sunrise today: ${this.sunriseStr}`);
            this.log.debug(`Sunset today: ${this.sunsetStr}`);
        }
        catch (e) {
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
    getTimeLength(durance, high) {
        const low = 1;
        return durance * (Math.floor(Math.random() * (high - low + 1)) + low);
    }
    /**
     * Returns today's date at midnight (00:00:00) with no time component.
     *
     * @returns A Date object set to the start of today
     */
    currentDate() {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
    /**
     * Parses an `HH:MM` time string and returns a Date object for today at that time.
     *
     * @param strTime - Time string in `HH:MM` format
     * @returns Date object set to today at the specified time
     */
    addTime(strTime) {
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
    timeInRange(strLower, strUpper) {
        const now = new Date();
        strLower = strLower.toString();
        strUpper = strUpper.toString();
        const lower = this.addTime(strLower);
        const upper = this.addTime(strUpper);
        let inRange;
        if (upper > lower) {
            inRange = now >= lower && now <= upper;
        }
        else {
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
    setSchedules() {
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
            let from, to;
            try {
                from = this.config.night_from.split(':');
                to = this.config.night_to.split(':');
            }
            catch (e) {
                this.log.warn(`Cannot read night rest time: ${e}`);
                return;
            }
            this.scheduleFrom = schedule.scheduleJob({ hour: parseInt(from[0]), minute: parseInt(from[1]) }, async () => {
                await this.setStateAsync('status.sleep', true, true);
                await this.sleepBegin(true);
            });
            this.scheduleTo = schedule.scheduleJob({ hour: parseInt(to[0]), minute: parseInt(to[1]) }, async () => {
                await this.setStateAsync('status.sleep', false, true);
                if (!this.activated && !this.inside) {
                    await this.countdown(false);
                }
            });
            this.log.debug(`Night rest configured from ${parseInt(from[0])}:${parseInt(from[1])} to ${parseInt(to[0])}:${parseInt(to[1])}`);
        }
        else {
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
    module.exports = (options) => new Alarm(options);
}
else {
    (() => new Alarm())();
}
//# sourceMappingURL=main.js.map