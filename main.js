// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');

// Load your modules here, e.g.:
// const fs = require("fs");
const schedule = require('node-schedule');

/**
 * The adapter instance
 * @type {ioBroker.Adapter}
 */
let adapter,
    A;


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
    states = {};

let send_instances = [],
    send_available = false;

let log_list = '';

let alarm_repeat,
    changes_repeat;

let is_alarm = false,
    is_inside = false,
    is_notification = false,
    is_panic = false,
    is_one = false,
    is_two = false,
    ids_alarm = [], //Kreis extern schaf
    ids_inside = [], //Kreis intern scharf
    ids_notification = [], //Benachrichtigungskreis
    ids_shorts_input = [],
    ids_one = [],
    ids_two = [],
    names_alarm,
    names_inside,
    names_notification,
    names_one,
    names_two;

const change_ids = {};

let activated = false,
    night_rest = false,
    inside = false,
    burgle = false;

let timer = null,
    speech_timeout = null,
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
/**
 * Starts the adapter instance
 * @param {Partial<ioBroker.AdapterOptions>} [options]
 */
function startAdapter(options) {
    // Create the adapter and define its methods
    return adapter = utils.adapter(Object.assign({}, options, {
        name: 'alarm',

        // The ready callback is called when databases are connected and adapter received configuration.
        // start here!
        ready: main, // Main method defined below for readability

        // is called when adapter shuts down - callback has to be called under any circumstances!
        unload: (callback) => {
            try {
                adapter.log.info('cleaned everything up...');
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
                callback();
            } catch (e) {
                callback();
            }
        },

        // is called if a subscribed object changes
        objectChange: (id, obj) => {
            if (obj) {
                // The object was changed
                adapter.log.debug(`object ${id} changed: ${JSON.stringify(obj)}`);
            } else {
                // The object was deleted
                adapter.log.debug(`object ${id} deleted`);
            }
        },

        // is called if a subscribed state changes
        stateChange: (id, state) => {
            if (state) {
                // The state was changed
                adapter.log.debug(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
                change(id, state);
            } else {
                // The state was deleted
                adapter.log.debug(`state ${id} deleted`);
            }
        },

        // Some message was sent to adapter instance over message box. Used by email, pushover, text2speech, ...
        // requires "common.message" property to be set to true in io-package.json
        // message: (obj) => {
        // 	if (typeof obj === "object" && obj.message) {
        // 		if (obj.command === "send") {
        // 			// e.g. send email or pushover or whatever
        // 			adapter.log.info("send command");

        // 			// Send response in callback if required
        // 			if (obj.callback) adapter.sendTo(obj.from, obj.command, "Message received", obj.callback);
        // 		}
        // 	}
        // },
    }));
}

function main() {
    A = adapter.config;
    log = A.opt_log;
    shorts = A.shorts;
    shorts_in = A.shorts_in;
    alarm_repeat = parseInt(A.alarm_repeat);
    changes_repeat = parseInt(A.changes_repeat);
    adapter.getState('status.activated', (err, state)=>{
        if(err){
            adapter.log.error(err);
            adapter.setState('info.connection', false, true);
            return;
        }else{
      	    if(state == null){
                activated = false;
                adapter.setState('status.activated', false, true);
            }else activated = state.val;
		    }
    });
    adapter.getState('status.sleep', (err, state)=>{
        if(err){
            adapter.log.error(err);
            adapter.setState('info.connection', false, true);
            return;
        }else{
            if(state == null){
                night_rest = false;
                adapter.setState('status.sleep', false, true);
            }else night_rest = state.val;
        }
    });
    adapter.getState('status.sharp_inside_activated', (err, state)=>{
        if(err){
            adapter.log.error(err);
            adapter.setState('info.connection', false, true);
            return;
        }else{
            if(state == null){
                inside = false;
                adapter.setState('status.sharp_inside_activated', false, true);
            }else inside = state.val;
        }
    });
    if(A.circuits)split_states(A.circuits);
    else adapter.log.info('no states configured!');
    send_instances = split_arr(A.sendTo);
    adapter.log.debug(`Messages to: ${JSON.stringify(send_instances)}`);
    ids_shorts_input = get_short_ids(shorts_in);
    get_ids();
    get_states();
    get_other_states();
    setTimeout(set_subs, 2000);
    set_schedules();
    setTimeout(refreshLists, 2000);
    check_doubles();
}
//################# ENABLE ####################################################

function enable(id, state){
    if (activated || burgle) return;
    let say = A.text_failed;
    if(timer) {
        clearInterval(timer);
        timer = null;
        adapter.setState('status.activation_countdown', null, true);
        adapter.setState('status.gets_activated', false, true);
    }
    if(!A.opt_warning && is_alarm){
        adapter.setState('info.log', `${A.log_act_not} ${names_alarm}`, true);
        if(log)adapter.log.info(`${A.log_act_not} ${names_alarm}`);
        if(A.send_activation) messages(`${A.log_act_not} ${names_alarm}`);
        adapter.setState('status.activation_failed', true, true);
        adapter.setState('status.state_list', 6, true);
        adapter.setState('status.state', 'activation failed', true);
        adapter.setState('use.list', 0, true);
        if(A.opt_say_names){
            say = say + ' ' + names_alarm;
        }
        sayit(say, 3);
        return;
    }
    inside_ends();
    sleep_end();
    adapter.setState('status.sharp_inside_activated', false, true);
    adapter.setState('status.activated', true, true);
    adapter.setState('status.deactivated', false, true);
    adapter.setState('status.activation_failed', false, true);
    adapter.setState('status.state', 'sharp', true);
    adapter.setState('status.state_list', 1, true);
    adapter.setState('homekit.CurrentState', 1, true);
    adapter.setState('homekit.TargetState', 1, true);
    adapter.setState('use.list', 1, true);
    if(is_alarm){
        adapter.setState('status.activated_with_warnings', true, true);
        adapter.setState('status.state', 'activated with warnings', true);
        adapter.setState('info.log', `${A.log_act_warn} ${names_alarm}`, true);
        if(log)adapter.log.info(`${A.log_act_warn} ${names_alarm}`);
        if(A.send_activated_with_warnings) messages(`${A.log_act_warn} ${names_alarm}`);
    } else{
        adapter.setState('info.log', `${A.log_act}`, true);
        if(log)adapter.log.info(`${A.log_act}`);
        sayit(A.text_activated, 1);
        if(A.send_activation) messages(`${A.log_act}`);
    }
}
//##############################################################################

//################# DISABLE ####################################################

function disable(){
    burgle = false;
    clearTimeout(silent_timer);
    clearTimeout(siren_timer);
    clearInterval(silent_interval);
    clearInterval(silent_contdown);
    clearInterval(alarm_interval);
    clearInterval(text_alarm_interval);
    clearInterval(text_changes_interval);
    silent_timer = null;
    siren_timer = null;
    silent_interval = null,
    silent_contdown = null,
    alarm_interval = null;
    text_alarm_interval = null;
    text_changes_interval = null;
    if(activated || is_panic){
        is_panic = false;
        adapter.setState('info.log', `${A.log_deact}`, true);
        sayit(A.text_deactivated, 2);
        if(log)adapter.log.info(`${A.log_deact}`);
        adapter.setState('status.activated_with_warnings', false, true);
        adapter.setState('status.activation_failed', false, true);
        adapter.setState('status.activated', false, true);
        if(A.send_activation) messages(`${A.log_deact}`);
        disableStates();
    }else if (inside) {
        inside_ends(true);
    }else if (night_rest) {
        sleep_end(true);
    }else {
        return;
    }
}
//##############################################################################

//################# BURGALARY ####################################################

function burglary(id, state, silent, indoor){
    if(burgle) return;
    if(silent_timer && silent) return;
    let count = 0;
    const name = get_name(id);
    adapter.setState('info.log', `${A.log_burgle} ${name}`, true);
    if(log)adapter.log.info(`${A.log_burgle} ${name}`);
    if(silent){
        adapter.setState('status.silent_alarm', true, true);
        adapter.setState('status.state', 'silent alarm', true);
        if (A.send_alarm_silent_inside && indoor) messages(`${A.log_burgle} ${name}`);
        if(A.send_alarm_silent && !indoor) messages(`${A.log_burgle} ${name}`);
        if(A.silent_flash > 0) {
            silent_interval = setInterval(()=>{
                if(silent_i) {
                    adapter.setState('status.silent_flash', true, true);
                    silent_i = false;
                } else {
                    adapter.setState('status.silent_flash', false, true);
                    silent_i = true;
                }
            }, A.silent_flash * 1000);
        }
        let silent_contdown_time = timeMode(A.time_silent_select) * A.time_silent / 1000;
        silent_contdown = setInterval(()=>{
            if(silent_contdown_time > 0) {
                silent_contdown_time = silent_contdown_time - 1;
                adapter.setState('status.silent_countdown', silent_contdown_time, true);
            } else {
                adapter.setState('status.silent_countdown', null, true);
                clearInterval(silent_contdown);
            }
        }, 1000);
        silent_timer = setTimeout(()=>{
            burgle = true;
            if(A.send_alarm) messages(`${A.log_burgle} ${name}`);
            clearTimeout(silent_timer);
            clearInterval(silent_interval);
            sayit(A.text_alarm, 6);
            text_alarm_interval = setInterval(()=> {
                if(count < alarm_repeat) {
                    sayit(A.text_alarm, 6);
                    count++;
                } else {
                    clearInterval(text_alarm_interval);
                }
            }, A.text_alarm_pause * 1000);
            adapter.setState('status.burglar_alarm', true, true);
            adapter.setState('status.silent_alarm', false, true);
            adapter.setState('status.silent_flash', false, true);
            adapter.setState('status.siren_inside', true, true);
            siren_inside_timer = setTimeout(()=>{
                adapter.setState('status.siren_inside', false, true);
            }, timeMode(A.time_warning_select) * A.time_warning);
            if (A.opt_siren && indoor) {
                alarmSiren();
                alarmFlash();
            }
            if (!indoor) {
                adapter.setState('status.siren', true, true);
                alarmSiren();
                alarmFlash();
            }
            adapter.setState('status.state', 'burgle', true);
            adapter.setState('status.state_list', 3, true);
            adapter.setState('homekit.CurrentState', 4, true);
        }, timeMode(A.time_silent_select) * A.time_silent);
    }
    else if (!silent) {
        burgle = true;
        clearTimeout(silent_timer);
        clearInterval(silent_interval);
        clearInterval(silent_contdown);
        if(A.send_alarm_inside && indoor) messages(`${A.log_burgle} ${name}`);
        if(A.send_alarm && !indoor) messages(`${A.log_burgle} ${name}`);
        sayit(A.text_alarm, 6);
        text_alarm_interval = setInterval(()=> {
            if(count < alarm_repeat) {
                sayit(A.text_alarm, 6);
                count++;
            } else {
                clearInterval(text_alarm_interval);
            }
        }, A.text_alarm_pause * 1000);
        adapter.setState('status.burglar_alarm', true, true);
        adapter.setState('status.silent_alarm', false, true);
        adapter.setState('status.silent_flash', false, true);
        adapter.setState('status.siren_inside', true, true);
        siren_inside_timer = setTimeout(()=>{
            adapter.setState('status.siren_inside', false, true);
        }, timeMode(A.time_warning_select) * A.time_warning);
        if (A.opt_siren && indoor) {
            alarmSiren();
            alarmFlash();
        }
        if (!indoor) {
            adapter.setState('status.siren', true, true);
            alarmSiren();
            alarmFlash();
        }
        adapter.setState('status.state', 'burgle', true);
        adapter.setState('status.state_list', 3, true);
        adapter.setState('homekit.CurrentState', 4, true);
        siren_timer = setTimeout(()=>{
            adapter.setState('status.siren', false, true);
            clearTimeout(siren_timer);
        }, timeMode(A.time_alarm_select) * A.time_alarm);
    }
}
//##############################################################################

//################# PANIC ####################################################

function panic(){
    let count = 0;
    is_panic = true;
    adapter.setState('info.log', `${A.log_panic}`, true);
    if(log)adapter.log.info(`${A.log_panic}`);
    if(A.send_alarm) messages(`${A.log_panic}`);
    sayit(A.text_alarm, 6);
    text_alarm_interval = setInterval(()=> {
        if(count < alarm_repeat) {
            sayit(A.text_alarm, 6);
            count++;
        } else {
            clearInterval(text_alarm_interval);
        }
    }, A.text_alarm_pause * 1000);
    adapter.setState('status.burglar_alarm', true, true);
    if(A.alarm_flash > 0) {
        alarm_interval = setInterval(()=>{
            if(alarm_i) {
                adapter.setState('status.alarm_flash', true, true);
                alarm_i = false;
            } else {
                adapter.setState('status.alarm_flash', false, true);
                alarm_i = true;
            }
        }, A.alarm_flash * 1000);
    }
    adapter.setState('status.siren', true, true);
    adapter.setState('status.state', 'burgle', true);
    adapter.setState('status.state_list', 3, true);
    adapter.setState('homekit.CurrentState', 4, true);
    siren_timer = setTimeout(()=>{
        adapter.setState('status.siren', false, true);
    }, timeMode(A.time_alarm_select) * A.time_alarm);
}

//##############################################################################

//################# CHANGES ####################################################

function change(id, state){
    let is_not_change = false;
    for(const i in states){
        if(i === id){
            if(states[id] === state.val){
                is_not_change = true;
                break;
            }
            states[id] = state.val;
            refreshLists();
            adapter.log.debug(`Inside states, state change: ${id} val: ${state.val}`);
        }
    }
    for(const i in one_states){
        if(i === id){
            if(one_states[id] === state.val){
                is_not_change = true;
                break;
            }
            one_states[id] = state.val;
            refreshLists();
            adapter.log.debug(`Inside one, state change: ${id} val: ${state.val}`);
        }
    }
    for(const i in two_states){
        if(i === id){
            if(two_states[id] === state.val){
                is_not_change = true;
                break;
            }
            two_states[id] = state.val;
            refreshLists();
            adapter.log.debug(`Inside two, state change: ${id} val: ${state.val}`);
        }
    }
    if(is_not_change) return;
    else if(id === adapter.namespace + '.use.list'){
        switch (state.val) {
            case 0:
                countdown(false);
                break;
            case 1:
                if(!activated) enable(id, state);
                break;
            case 2:
                inside_begins();
                break;
            case 3:
                countdown(true);
                break;
            case 4:
                sleep_begin();
                break;
            default:
                adapter.log.warn('Use wrong value in use.list');
                break;

        }
        return;
    }
    else if(id === adapter.namespace + '.homekit.TargetState'){
        switch (state.val) {
            case 0:
                inside_begins();
                break;
            case 1:
                if(!activated) enable(id, state);
                break;
            case 2:
                sleep_begin();
                break;
            case 3:
                countdown(false);
                break;
            default:
                adapter.log.warn('Use wrong value in homekit.TargetState');
                break;

        }
        return;
    }
    else if(id === adapter.namespace + '.status.activated'){
        activated = state.val;
        shortcuts('status.activated', state.val);
        return;
    }
    else if(id === adapter.namespace + '.status.sleep'){
        //  night_rest = state.val;
        shortcuts('status.sleep', state.val);
        return;
    }
    else if(id === adapter.namespace + '.status.gets_activated'){
        shortcuts('status.gets_activated', state.val);
        return;
    }
    else if(id === adapter.namespace + '.status.state_list'){
        shortcuts('status.state_list', state.val);
        return;
    }
    else if(id === adapter.namespace + '.status.sharp_inside_activated'){
        shortcuts('status.sharp_inside_activated', state.val);
        return;
    }
    else if(id === adapter.namespace + '.status.silent_alarm'){
        shortcuts('status.silent_alarm', state.val);
        return;
    }
    else if(id === adapter.namespace + '.status.alarm_flash'){
        shortcuts('status.alarm_flash', state.val);
        return;
    }
    else if(id === adapter.namespace + '.status.enableable'){
        shortcuts('status.enableable', state.val);
        return;
    }
    else if(id === adapter.namespace + '.status.silent_flash'){
        shortcuts('status.silent_flash', state.val);
        return;
    }
    else if(id === adapter.namespace + '.use.quit_changes'){
        clearTimeout(siren_inside_timer);
        clearTimeout(timer_notification_changes);
        adapter.setState('status.activation_failed', false, true);
        adapter.setState('status.siren_inside', false, true);
        adapter.setState('info.notification_circuit_changes', false, true);
        adapter.setState('other_alarms.one_changes', false, true);
        adapter.setState('other_alarms.two_changes', false, true);
        return;
    }
    else if(id === adapter.namespace + '.status.deactivated'){
        shortcuts('status.deactivated', state.val);
        return;
    }
    else if(id === adapter.namespace + '.status.burglar_alarm'){
        shortcuts('status.burglar_alarm', state.val);
        return;
    }
    else if(id === adapter.namespace + '.status.siren'){
        shortcuts('status.siren', state.val);
        return;
    }
    else if(id === adapter.namespace + '.status.alarm_flash'){
        shortcuts('status.alarm_flash', state.val);
        return;
    }
    else if(id === adapter.namespace + '.status.silent_flash'){
        shortcuts('status.silent_flash', state.val);
        return;
    }
    else if(id === adapter.namespace + '.status.activation_failed'){
        shortcuts('status.activation_failed', state.val);
        return;
    }
    else if(id === adapter.namespace + '.status.activated_with_warnings'){
        shortcuts('status.activated_with_warnings', state.val);
        return;
    }
    else if(id === adapter.namespace + '.status.activation_countdown'){
        shortcuts('status.activation_countdown', state.val);
        return;
    }
    else if(id === adapter.namespace + '.status.state'){
        shortcuts('status.state', state.val);
        return;
    }
    else if(id === adapter.namespace + '.status.siren_inside'){
        shortcuts('status.siren_inside', state.val);
        return;
    }
    else if(id === adapter.namespace + '.info.notification_circuit_changes'){
        shortcuts('info.notification_circuit_changes', state.val);
        return;
    }
    else if(id === adapter.namespace + '.other_alarms.one_changes'){
        shortcuts('other_alarms.one_changes', state.val);
        return;
    }
    else if(id === adapter.namespace + '.other_alarms.two_changes'){
        shortcuts('other_alarms.two_changes', state.val);
        return;
    }
    else if(id === adapter.namespace + '.use.enable' && state.val){
        enable(id, state);
        return;
    }
    else if(id === adapter.namespace + '.use.disable' && state.val){
        countdown(false);
        return;
    }
    else if(id === adapter.namespace + '.use.panic' && state.val){
        panic();
        return;
    }
    else if(id === adapter.namespace + '.use.activate_nightrest' && state.val){
        sleep_begin();
        return;
    }
    else if(id === adapter.namespace + '.use.activate_sharp_inside' && state.val){
        inside_begins();
        return;
    }
    else if(id === adapter.namespace + '.use.enable_with_delay' && state.val){
        countdown(true);
        return;
    }
    else if(id === adapter.namespace + '.use.toggle_password'){
        if(state.val == '') return;
        if(checkPassword(state.val, 'use.toggle_password') && !activated){
            enable(id, state);
            return;
        }else if(checkPassword(state.val, 'use.toggle_password') && activated){
            countdown(false);
            //disable();
            return;
        }else{
            adapter.setState('info.wrong_password', true, true, (err)=>{
                if(err)adapter.log.error(err);
                adapter.setState(id, '', true);
            });
            if(log) adapter.log.info(`${A.log_pass}`);
            adapter.log.debug(`Password denied ${state.val}`);
            //adapter.setState('info.log', `${A.log_pass}`, true);
            if(A.send_failed) messages(`${A.log_pass}`);
            return;
        }
    }
    else if(id === adapter.namespace + '.use.toggle_with_delay_and_password'){
        if(state.val == '') return;
        if(checkPassword(state.val, 'use.toggle_with_delay_and_password') && !activated){
            countdown(true);
            return;
        }else if(checkPassword(state.val, 'use.toggle_with_delay_and_password') && activated){
            countdown(false);
            //disable();
            return;
        }else{
            adapter.setState('info.wrong_password', true, true, (err)=>{
                if(err)adapter.log.error(err);
                adapter.setState(id, '', true);
            });
            if(log) adapter.log.info(`${A.log_pass}`);
            adapter.log.debug(`Password denied ${state.val}`);
            //adapter.setState('info.log', `${A.log_pass}`, true);
            if(A.send_failed) messages(`${A.log_pass}`);
            return;
        }
    }
    else if(id === adapter.namespace + '.info.log'){
        logging(state.val);
        return;
    }
    else if(ids_shorts_input.includes(id)){
        shortcuts_inside(id, state.val);
        return;
    }
    if(leave_ids.includes(id) && !activated && !isTrue(id, state) && timer && A.opt_leave){
        leaving(id, state);
        return;
    }
    if(alarm_ids.includes(id) && activated && isTrue(id, state)){
        burglary(id, state, isSilent(id));
        return;
    }
    if(inside_ids.includes(id) && inside && isTrue(id, state)){
        burglary(id, state, isSilent(id, true), true);
    }

    if(notification_ids.includes(id) && isTrue(id, state)){
        if(!activated && !inside && !night_rest) return;
        const name = get_name(id);
        adapter.setState('info.log', `${A.log_warn} ${name}`, true);
        adapter.setState('info.notification_circuit_changes', true, true);
        if(night_rest){
            let say = A.text_changes_night;
            if(log) adapter.log.info(`${A.log_night} ${name}`);
            if(A.send_notification_changes) messages(`${A.log_night} ${name}`);
            if(A.opt_say_names){
                say = say + ' ' + name;
            }
            sayit(say, 9);
        } else if (inside) {
            let say = A.text_changes;
            if(log) adapter.log.info(`${A.log_warn} ${name}`);
            if(A.send_notification_changes) messages(`${A.log_warn} ${name}`);
            if(A.opt_say_names){
                say = say + ' ' + name;
            }
            sayit(say, 5);
        } else if (activated) {
            if(log) adapter.log.info(`${A.log_warn} ${name}`);
            if(A.send_notification_changes) messages(`${A.log_warn} ${name}`);
        }
        timer_notification_changes = setTimeout(()=>{
            adapter.setState('info.notification_circuit_changes', false, true);
        }, timeMode(A.time_warning_select) * A.time_warning);
    }
    if(one_ids.includes(id) && isTrue(id, state, 'one')) {
        const name = get_name(id, 'one');
        let say = A.text_one;
        if(log) adapter.log.info(`${A.log_one} ${name}`);
        if(A.send_one_changes) messages(`${A.log_one} ${name}`);
        if(A.opt_say_names){
            say = say + ' ' + name;
        }
        sayit(say, 12);
        adapter.setState('other_alarms.one_changes', true, true);
    }
    if(two_ids.includes(id) && isTrue(id, state, 'two')) {
        const name = get_name(id, 'two');
        let say = A.text_changes_two;
        if(log) adapter.log.info(`${A.log_two} ${name}`);
        if(A.send_two_changes) messages(`${A.log_two} ${name}`);
        if(A.opt_say_names){
            say = say + ' ' + name;
        }
        sayit(say, 13);
        adapter.setState('other_alarms.two_changes', true, true);
    }
}
//##############################################################################

//################# SUBSCRIBTIONS ##############################################

function set_subs(){
    clean_ids.forEach((ele)=>{
        if(ele){
            adapter.log.debug(`SUBSCRIBTION for: ${ele}`);
            adapter.subscribeForeignStates(ele);
        }else{
            adapter.log.debug(`NO SUBSCRIBTION for monitoring circuits`);
        }
    });
    ids_shorts_input.forEach((ele)=>{
        if(ele){
            adapter.log.debug(`SUBSCRIBTION for input shortcuts: ${ele}`);
            adapter.subscribeForeignStates(ele);
        }else{
            adapter.log.debug(`NO SUBSCRIBTION for input shortcuts`);
        }
    });
    one_ids.forEach((ele)=>{
        if(ele){
            adapter.log.debug(`SUBSCRIBTION for other alarm one: ${ele}`);
            adapter.subscribeForeignStates(ele);
        }else{
            adapter.log.debug(`NO SUBSCRIBTION for other alarm one`);
        }
    });
    two_ids.forEach((ele)=>{
        if(ele){
            adapter.log.debug(`SUBSCRIBTION for other alarm two: ${ele}`);
            adapter.subscribeForeignStates(ele);
        }else{
            adapter.log.debug(`NO SUBSCRIBTION for other alarm two`);
        }
    });
    adapter.subscribeStates('info.log');
    adapter.subscribeStates('status.siren_inside');
    adapter.subscribeStates('info.notification_circuit_changes');
    adapter.subscribeStates('other_alarms.one_changes');
    adapter.subscribeStates('other_alarms.two_changes');
    adapter.subscribeStates('use.*');
    adapter.subscribeStates('status.*');
    adapter.subscribeStates('homekit.TargetState');
}
//##############################################################################

//################# MESSAGES ###################################################

function messages(content){
    if(send_instances.length){
        const reg = new RegExp('telegram');
        send_instances.forEach((ele)=>{
            if (reg.test(ele) && A.opt_telegram) {
                adapter.log.debug(`Send message to ${ele} with special parameter, message: text: ${content}, user: ${A.user}, chatID: ${A.chatID}`);
                adapter.sendTo(ele, 'send', {'text':content, 'user': A.user, 'chatId': A.chatID});
            } else {
                adapter.log.debug(`Send message to ${ele}, message: ${content}`);
                adapter.sendTo(ele, content);
            }
        });
    }
}

function speechOutput(id, message, time) {
    let delay;
    time = parseInt(time);
    if (Number.isInteger(time)) {
        delay = time;
    } else {
        delay = 0;
    }
    adapter.log.debug(`speech output instance: ${id}: ${message}, delay ${delay}s`);
    speech_timeout = setTimeout(() => {adapter.setForeignState(id, message, (err)=>{
        if(err) adapter.log.warn(err);
    });
    }, delay * 1000);
}


function sayit(message, opt_val){
    const tts_instance = A.sayit;
    if(night_rest && A.opt_night_silent) return;
    if(tts_instance){
        tts_instance.forEach((ele)=>{
            if(ele.enabled){
                switch (opt_val) {
                    case 1:
                        if(ele.opt_say_one){
                            speechOutput(ele.name_id, message, ele.speech_delay);
                        }
                        break;
                    case 2:
                        if(ele.opt_say_two){
                            speechOutput(ele.name_id, message, ele.speech_delay);
                        }
                        break;
                    case 3:
                        if(ele.opt_say_three){
                            speechOutput(ele.name_id, message, ele.speech_delay);
                        }
                        break;
                    case 4:
                        if(ele.opt_say_four){
                            speechOutput(ele.name_id, message, ele.speech_delay);
                        }
                        break;
                    case 5:
                        if(ele.opt_say_five){
                            speechOutput(ele.name_id, message, ele.speech_delay);
                        }
                        break;
                    case 6:
                        if(ele.opt_say_six){
                            speechOutput(ele.name_id, message, ele.speech_delay);
                        }
                        break;
                    case 7:
                        if(ele.opt_say_seven){
                            speechOutput(ele.name_id, message, ele.speech_delay);
                        }
                        break;
                    case 8:
                        if(ele.opt_say_eigth){
                            speechOutput(ele.name_id, message, ele.speech_delay);
                        }
                        break;
                    case 9:
                        if(ele.opt_say_nine){
                            speechOutput(ele.name_id, message, ele.speech_delay);
                        }
                        break;
                    case 10:
                        if(ele.opt_say_nine_plus){
                            speechOutput(ele.name_id, message, ele.speech_delay);
                        }
                        break;
                    case 0:
                        if(ele.opt_say_zero){
                            speechOutput(ele.name_id, message, ele.speech_delay);
                        }
                        break;
                    case 11:
                        if(ele.opt_say_count){
                            speechOutput(ele.name_id, message, ele.speech_delay);
                        }
                        break;
                    case 12:
                        if(ele.opt_say_fire){
                            speechOutput(ele.name_id, message, ele.speech_delay);
                        }
                        break;
                    case 13:
                        if(ele.opt_say_water){
                            speechOutput(ele.name_id, message, ele.speech_delay);
                        }
                        break;
                    default:
                        adapter.log.debug(`no speech output!`);
                }
            }
        });
    }

}
//##############################################################################

//################# HELPERS ####################################################

function alarmSiren() {
    adapter.setState('status.siren', true, true);
    siren_timer = setTimeout(()=>{
        adapter.setState('status.siren', false, true);
        clearTimeout(siren_timer);
    }, timeMode(A.time_alarm_select) * A.time_alarm);
}

function alarmFlash() {
    if(A.alarm_flash > 0) {
        alarm_interval = setInterval(()=>{
            if(alarm_i) {
                adapter.setState('status.alarm_flash', true, true);
                alarm_i = false;
            } else {
                adapter.setState('status.alarm_flash', false, true);
                alarm_i = true;
            }
        }, A.alarm_flash * 1000);
    }
}

function disableStates() {
    adapter.setState('status.deactivated', true, true);
    adapter.setState('status.state', 'deactivated', true);
    adapter.setState('status.state_list',0, true);
    adapter.setState('homekit.CurrentState', 3, true);
    adapter.setState('homekit.TargetState', 3, true);
    adapter.setState('use.list',0, true);
    adapter.setState('status.siren_inside', false, true);
    adapter.setState('status.siren', false, true);
    adapter.setState('info.notification_circuit_changes', false, true);
    adapter.setState('status.silent_flash', false, true);
    adapter.setState('status.alarm_flash', false, true);
    adapter.setState('status.burglar_alarm', false, true);
    adapter.setState('status.silent_alarm', false, true);
}


function check_doubles() {
    clean_ids.forEach((ele, i) => {
        one_ids.forEach((item, i) => {
            if(item === ele) adapter.log.warn(`You use double states in main and other alarms, PLEASE FIX IT: ${item}`);
        });
        two_ids.forEach((item, i) => {
            if(item === ele) adapter.log.warn(`You use double states in main and other alarms, PLEASE FIX IT: ${item}`);
        });
    });

}

function isSilent(id, indoor) {
    if (indoor) {
        const temp = A.circuits.findIndex((obj)=>{
            const reg = new RegExp(id);
            return reg.test(obj.name_id);
        });
        return A.circuits[temp].delay_inside;
    } else {
        const temp = A.circuits.findIndex((obj)=>{
            const reg = new RegExp(id);
            return reg.test(obj.name_id);
        });
        return A.circuits[temp].delay;
    }

}

function timeMode(value) {
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


function inside_begins(){
    if(!inside && !burgle){
        activated = false;
        inside = true;
        sleep_end();
        if(is_inside){
            let say = A.text_warning;
            if(A.send_activation_warnings_inside) messages(`${A.log_warn_b_w} ${names_inside}`);
            adapter.setState('info.log', `${A.log_warn_b_w} ${names_inside}`, true);
            if(log) adapter.log.info(`${A.log_warn_b_w} ${names_inside}`);
            if(A.opt_say_names){
                say = say + ' ' + names_inside;
            }
            sayit(say, 4);
        } else {
            adapter.setState('info.log', `${A.log_warn_act}`, true);
            if(log)adapter.log.info(`${A.log_warn_act}`);
            if(A.send_activation_inside) messages(`${A.log_warn_act}`);
            sayit(A.text_warn_begin, 10);
        }
        adapter.setState('status.sharp_inside_activated', true, true);
        adapter.setState('status.state', 'sharp inside', true);
        adapter.setState('status.state_list', 2, true);
        adapter.setState('homekit.CurrentState', 0, true);
        adapter.setState('homekit.TargetState', 0, true);
        adapter.setState('use.list', 2, true);
        adapter.setState('status.activated', false, true);
        adapter.setState('status.deactivated', false, true);
    }
}

function inside_ends(off){
    if(inside){
        inside = false;
        if(off){
            clearTimeout(siren_inside_timer);
            clearTimeout(timer_notification_changes);
            adapter.setState('info.log', `${A.log_warn_deact}`, true);
            if(log)adapter.log.info(`${A.log_warn_deact}`);
            if(A.send_activation_inside) messages(`${A.log_warn_deact}`);
            sayit(A.text_warn_end, 0);
            adapter.setState('status.sharp_inside_activated', false, true);
            disableStates();
        }

    }
}

function sleep_begin(auto) {
    if(night_rest) return;
    if(auto && inside || auto && activated){
        adapter.log.warn(`Cannot set alarm system to night rest, it is sharp or sharp inside`);
        return;
    }
    activated = false;
    night_rest = true;
    inside_ends();
    if(log) adapter.log.info(`${A.log_sleep_b}`);
    adapter.setState('info.log', `${A.log_sleep_b}`, true);
    if(!is_notification) sayit(A.text_nightrest_beginn, 7);
    adapter.setState('status.state', 'night rest', true);
    adapter.setState('status.state_list', 4, true);
    adapter.setState('homekit.CurrentState', 2, true);
    adapter.setState('homekit.TargetState', 2, true);
    adapter.setState('use.list', 4, true);
    if(is_notification){
        let say = A.text_warning;
        if(A.send_activation_warnings_night) messages(`${A.log_nights_b_w} ${names_notification}`);
        adapter.setState('info.log', `${A.log_nights_b_w} ${names_notification}`, true);
        if(log) adapter.log.info(`${A.log_nights_b_w} ${names_notification}`);
        if(A.opt_say_names){
            say = say + ' ' + names_notification;
        }
        sayit(say, 4);
    }
}

function sleep_end(off) {
    if (night_rest) {
        night_rest = false;
        if(off){
            adapter.setState('info.log', `${A.log_sleep_e}`, true);
            sayit(A.text_nightrest_end, 8);
            if(log) adapter.log.info(`${A.log_sleep_e}`);
            adapter.setState('status.state', 'deactivated', true);
            if(!inside){
                adapter.setState('status.state_list', 0, true);
                adapter.setState('homekit.CurrentState', 3, true);
                adapter.setState('homekit.TargetState', 3, true);
                adapter.setState('use.list', 0, true);
            }
        }
    }
}

function refreshLists(){
    check(alarm_ids, (val, ids)=>{
        adapter.log.debug(`Alarm circuit list: ${ids}`);
        if(ids.length > 0){
            ids_alarm = ids;
            is_alarm = true;
            names_alarm = get_name(ids);
            adapter.setState('info.alarm_circuit_list', names_alarm, true);
            adapter.setState('info.alarm_circuit_list_html', get_name_html(ids), true);
        }else{
            ids_alarm = [];
            is_alarm = false;
            names_alarm = '';
            adapter.setState('info.alarm_circuit_list', '', true);
            adapter.setState('info.alarm_circuit_list_html', '', true);
        }
    });
    check(inside_ids, (val, ids)=>{
        adapter.log.debug(`Inside circuit list: ${ids}`);
        if(ids.length > 0){
            ids_inside = ids;
            is_inside = true;
            names_inside = get_name(ids);
            adapter.setState('info.sharp_inside_circuit_list', names_inside, true);
            adapter.setState('info.sharp_inside_circuit_list_html', get_name_html(ids), true);
        }else{
            ids_inside = [];
            is_inside = false;
            names_inside = '';
            adapter.setState('info.sharp_inside_circuit_list', '', true);
            adapter.setState('info.sharp_inside_circuit_list_html', '', true);
        }
    });
    check(notification_ids, (val, ids)=>{
        adapter.log.debug(`Notification circuit list: ${ids}`);
        if(ids.length > 0){
            ids_notification = ids;
            is_notification = true;
            names_notification = get_name(ids);
            adapter.setState('info.notification_circuit_list', names_notification, true);
            adapter.setState('info.notification_circuit_list_html', get_name_html(ids), true);
        }else{
            ids_notification = [];
            is_notification = false;
            names_notification = '';
            adapter.setState('info.notification_circuit_list', '', true);
            adapter.setState('info.notification_circuit_list_html', '', true);
        }
    });
    check_one(one_ids, (val, ids)=>{
        adapter.log.debug(`One list: ${ids}`);
        if(ids.length > 0){
            ids_one = ids;
            is_one = true;
            names_one = get_name(ids, 'one');
            adapter.setState('other_alarms.one_list', names_one, true);
            adapter.setState('other_alarms.one_list_html', get_name_html(ids, 'one'), true);
        }else{
            ids_one = [];
            is_one = false;
            names_one = '';
            adapter.setState('other_alarms.one_list', '', true);
            adapter.setState('other_alarms.one_list_html', '', true);
        }
    });
    check_two(two_ids, (val, ids)=>{
        adapter.log.debug(`Two list: ${ids}`);
        if(ids.length > 0){
            ids_two = ids;
            is_two = true;
            names_two = get_name(ids, 'two');
            adapter.setState('other_alarms.two_list', names_two, true);
            adapter.setState('other_alarms.two_list_html', get_name_html(ids, 'two'), true);
        }else{
            ids_two = [];
            is_two = false;
            names_two = '';
            adapter.setState('other_alarms.two_list', '', true);
            adapter.setState('other_alarms.two_list_html', '', true);
        }
    });
    if(is_alarm){
        adapter.setState('status.enableable', false, true);
        return;
    } else if (!A.opt_warning && is_alarm) {
        adapter.setState('status.enableable', false, true);
    }else {
        adapter.setState('status.enableable', true, true);
    }
}

function checkPassword(pass, id) {
    if(A.password === pass){
        adapter.log.debug(`Password accept`);
        adapter.setState('info.wrong_password', false, true, (err)=>{
            if(err)adapter.log.error(err);
            adapter.setState(id, '', true);
        });
        return true;
    }
    else{
        return false;
    }
}

function isTrue(id, state, other){
    let test = false;
    if(!search(id, other) && state.val) test = true;
    else if(search(id, other) && !state.val) test = true;
    return test;
}

function split_arr(str){
    const temp_arr = str.split(/[,;\s]+/);
    const clean_arr = [];
    temp_arr.forEach((ele)=>{
        if(ele)clean_arr.push(ele.trim());
    });
    return clean_arr;
}

function split_states(arr){
    arr.forEach((ele)=>{
        if(ele.enabled){
            if(ele.alarm)alarm_ids.push(ele.name_id);
            if(ele.warning)inside_ids.push(ele.name_id);
            if(ele.night)notification_ids.push(ele.name_id);
            if(ele.leave)leave_ids.push(ele.name_id);
        }else{
            adapter.log.debug(`State not used but configured: ${ele.name_id}`);
        }
    });
}

function get_ids(){
    let ids = [];
    ids = ids.concat(alarm_ids, inside_ids, notification_ids, leave_ids);
    clean_ids = Array.from(new Set(ids));
}

//test negativ
function search(id, other){
    let table = A.circuits;
    if(other) {
        if(other === 'one') table = A.one;
        if(other === 'two') table = A.two;
    }
    const temp = table.findIndex((obj)=>{
        const reg = new RegExp(id);
        return reg.test(obj.name_id);
    });
    return table[temp].negativ;
}

function check(arr, callback){
    const temp_arr = [];
    if(arr.length > 0){
        arr.forEach((ele)=>{
            if(states[ele] && !search(ele)){
                temp_arr.push(ele);
            }else if(states[ele] == false && search(ele)){
                temp_arr.push(ele);
            }
        });
        if(temp_arr.length>0){
            callback(true, temp_arr);
        }else{
            callback(false, temp_arr);
        }
    }
}


function check_one(arr, callback){
    const temp_arr = [];
    if(arr.length > 0){
        arr.forEach((ele)=>{
            if(one_states[ele] && !search(ele, 'one')){
                temp_arr.push(ele);
            }else if(one_states[ele] == false && search(ele, 'one')){
                temp_arr.push(ele);
            }
        });
        if(temp_arr.length>0){
            callback(true, temp_arr);
        }else{
            callback(false, temp_arr);
        }
    }
}

function check_two(arr, callback){
    const temp_arr = [];
    if(arr.length > 0){
        arr.forEach((ele)=>{
            if(two_states[ele] && !search(ele, 'two')){
                temp_arr.push(ele);
            }else if(two_states[ele] == false && search(ele, 'two')){
                temp_arr.push(ele);
            }
        });
        if(temp_arr.length>0){
            callback(true, temp_arr);
        }else{
            callback(false, temp_arr);
        }
    }
}

function get_name(ids, other){
    const name =[];
    let table = A.circuits;
    if(other) {
        if(other === 'one') table = A.one;
        if(other === 'two') table = A.two;
    }
    if(Array.isArray(ids)){
        ids.forEach((id)=>{
            const temp = table.findIndex((obj)=>{
                const reg = new RegExp(id);
                return reg.test(obj.name_id);
            });
            name.push(table[temp].name);
        });
        return name.join();
    }else{
        const temp = table.findIndex((obj)=>{
            const reg = new RegExp(ids);
            return reg.test(obj.name_id);
        });
        return table[temp].name;
    }
}

function get_name_html(ids, other, callback){
    const name =[];
    let table = A.circuits;
    if(other) {
        if(other === 'one') table = A.one;
        if(other === 'two') table = A.two;
    }
    if(Array.isArray(ids)){
        ids.forEach((id)=>{
            const temp = table.findIndex((obj)=>{
                const reg = new RegExp(id);
                return reg.test(obj.name_id);
            });
            name.push(table[temp].name);
        });
        return name.join('<br>');
    }else{
        const temp = table.findIndex((obj)=>{
            const reg = new RegExp(ids);
            return reg.test(obj.name_id);
        });
        return table[temp].name;
    }
}

function get_state_async(id){
    return new Promise((resolve, reject)=>{
        adapter.getForeignState(id,(err, state)=>{
            if(err) reject(err);
            else if(state == null || state.val == null) {
                adapter.log.error(`state is null: ${id}`);
                resolve(null);
            }
            else resolve(state.val);
        });
    });
}

async function get_states_delay(id){
    const value = await get_state_async(id);
    return value;
}

async function get_states(){
    for (const id of clean_ids){
        const state = await get_states_delay(id);
        states[id] = state;
    }
    adapter.log.debug(JSON.stringify(states));
}

async function get_other_states(){
    if(A.one) {
        A.one.forEach((ele) => {
            if(ele.enabled) one_ids.push(ele.name_id);
        });
        for (const id of one_ids){
            const state = await get_states_delay(id);
            one_states[id] = state;
        }
    }
    if(A.two) {
        A.two.forEach((ele) => {
            if(ele.enabled) two_ids.push(ele.name_id);
        });
        for (const id of two_ids){
            const state = await get_states_delay(id);
            two_states[id] = state;
        }
    }
    adapter.log.debug(`other alarm are one: ${JSON.stringify(one_states)} two: ${JSON.stringify(two_states)}`);
}

function leaving(id, state) {
    clearInterval(timer);
    timer = null;
    adapter.setState('status.activation_countdown', null, true);
    adapter.setState('status.gets_activated', false, true);
    enable();
}

function countdown(count){
    let counter = A.time_activate * timeMode(A.time_activate_select) / 1000;
    let say = A.time_activate + ' ' + A.text_countdown;
    if(count && !timer && !activated){
        if(is_alarm){
            if(A.send_activation_warnings) messages(`${A.log_act_notice} ${names_alarm}`);
            say = say + ' ' + A.text_warning;
            if(A.opt_say_names){
                say = say + ' ' + names_alarm;
            }
            sayit(say, 4);
        }
        sayit(say, 11);
        adapter.setState('status.gets_activated', true, true);
        adapter.setState('status.state', 'gets activated', true);
        adapter.setState('status.state_list', 5, true);
        timer = setInterval(()=>{
            if(counter > 0){
                counter--;
                adapter.setState('status.activation_countdown', counter, true);
            }else{
                clearInterval(timer);
                timer = null;
                adapter.setState('status.activation_countdown', counter, true);
                adapter.setState('status.gets_activated', false, true);
                enable();
            }
        }, 1000);
    }else if(count && timer) {
        return;
    }else if (count && activated) {
        return;
    }else {
        if(timer){
            clearInterval(timer);
            timer = null;
            adapter.setState('status.activation_countdown', null, true);
            adapter.setState('status.gets_activated', false, true);
            adapter.setState('status.state_list', 7, true);
        }
        disable();
    }
}

function bools(val){
    switch (val) {
        case 'true':
            return true;
        case 'false':
            return false;
        default:
            return val;
    }
}

function shortcuts_inside(id, val) {
    const change = is_changed(id, val);
    shorts_in.forEach((ele) => {
        if(ele.name_id == id) {
            if(ele.value === val || bools(ele.value) == val) {
                if(ele.trigger_val == 'any' || change) {
                    adapter.log.debug(`Input shorcut changed: ${ele.name_id}`);
                    adapter.setState(ele.select_id, true, true, (err)=>{
                        if(err) adapter.log.warn(`Cannot set state: ${err}`);
                    });
                }
            }
        }
    });
}

function get_short_ids(ids) {
    const temp_ids = [];
    ids.forEach((ele) => {
        if(ele.enabled) {
            temp_ids.push(ele.name_id);
        }
    });
    return temp_ids;
}

function shortcuts(id, val){
    const change = is_changed(id, val);
    let setVal = val;
    if(id === 'status.state_list') {
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
                adapter.log.warn(`Wrong list state at shortcuts: ${val}`);
        }
    }
    if(shorts && change){
        shorts.forEach((ele, i) => {
            if(ele.enabled && ele.select_id == id && bools(ele.trigger_val) === setVal){
                setTimeout(()=>{
                    adapter.setForeignState(ele.name_id, bools(ele.value), (err)=>{
                        if(err) adapter.log.warn(`Cannot set state: ${err}`);
                    });
                }, i*250);
            }
        });
    }
}


function is_changed(id, val) {
    if(change_ids[id] === val ) {
        adapter.log.debug(`No changes inside shortcuts!`);
        return false;
    } else {
        change_ids[id] = val;
        return true;
    }
}



function timeStamp(){
    const date = new Date();
    return ('0' + date.getHours()).slice(-2) + ':' + ('0' + date.getMinutes()).slice(-2);
}

function logging(content){
    adapter.getState('info.log_today', (err, state)=>{
        if(err){
            adapter.log.error(err);
            return;
        }else{
            if(state == null){
                log_list ='';
            }else{
                log_list = state.val;
                log_list = log_list.split('<br>');
                log_list.unshift(timeStamp() + ': ' + content);
                //if (log_list.length > 25) log_list.splice(0,1);
                adapter.setState('info.log_today', log_list.join('<br>'), true);
            }
        }
    });
}

//##############################################################################

//################# SCHEDULES ####################################################

function set_schedules(){
    schedule_reset = schedule.scheduleJob({hour: 00, minute: 00}, ()=>{
        adapter.setState('info.log_today', '', true);
    });
    if(A.night_from && A.night_to){
        let from, to;
        try{
            from = A.night_from.split(':');
            to = A.night_to.split(':');
        }catch(e){
            adapter.log.warn(`Cannot read night rest time: ${e}`);
            return;
        }
        schedule_from = schedule.scheduleJob({hour: parseInt(from[0]), minute: parseInt(from[1])}, ()=>{
            adapter.setState('status.sleep', true, true);
            sleep_begin(true);
        });
        schedule_to = schedule.scheduleJob({hour: parseInt(to[0]), minute: parseInt(to[1])}, ()=>{
            adapter.setState('status.sleep', false, true);
            if(!activated && !inside) countdown(false);
        });
        adapter.log.debug(`Night rest configured from ${parseInt(from[0])}:${parseInt(from[1])} to ${parseInt(to[0])}:${parseInt(to[1])}`);
    }else{
        adapter.log.debug('No night rest configured');
    }
}
//##############################################################################

if (module && module.parent) {
    // Export startAdapter in compact mode
    module.exports = startAdapter;
} else {
    // otherwise start the instance directly
    startAdapter();
}
