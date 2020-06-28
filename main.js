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
let adapter;

let clean_ids = [];
const alarm_states = [],
    inside_states = [],
    notification_states = [];
let send_instances = [],
    states = {},
    send_available = false;

let log_list = '';

let is_alarm = false,
    is_inside = false,
    is_notification = false,
    is_panic = false,
    ids_alarm = [], //Kreis extern schaf
    ids_inside = [], //Kreis intern scharf
    ids_notification = [], //Benachrichtigungskreis
    names_alarm,
    names_inside,
    names_notification;


let activated = false,
    night_rest = false,
    inside = false,
    burgle = false;

let timer = null,
    silent_timer = null,
    timer_inside_changes = null,
    timer_notification_changes = null,
    siren_timer = null;

let log,
    speak_names,
    with_warnigs,
    alarm_message,
    night_message,
    notification_message,
    act_message,
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
                clearTimeout(siren_timer);
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
    log = adapter.config.opt_log;
    with_warnigs = adapter.config.opt_warning;
    alarm_message = adapter.config.send_alarm;
    night_message = adapter.config.send_night;
    notification_message = adapter.config.send_notification;
    act_message = adapter.config.send_activation;
    shorts = adapter.config.shorts;
    speak_names = adapter.config.opt_say_names;
    adapter.getState('status.activated', (err, state)=>{
        if(err){
            adapter.log.error(err);
            adapter.setState('info.connection', false);
            return;
        }else{
      	    if(state == null){
                activated = false;
                adapter.setState('status.activated', false);
            }else activated = state.val;
		    }
    });
    adapter.getState('status.sleep', (err, state)=>{
        if(err){
            adapter.log.error(err);
            adapter.setState('info.connection', false);
            return;
        }else{
            if(state == null){
                night_rest = false;
                adapter.setState('status.sleep', false);
            }else night_rest = state.val;
        }
    });
    adapter.getState('status.sharp_inside_activated', (err, state)=>{
        if(err){
            adapter.log.error(err);
            adapter.setState('info.connection', false);
            return;
        }else{
            if(state == null){
                inside = false;
                adapter.setState('status.sharp_inside_activated', false);
            }else inside = state.val;
        }
    });
    if(adapter.config.circuits)split_states(adapter.config.circuits);
    else adapter.log.info('no states configured!');
    send_instances = split_arr(adapter.config.sendTo);
    adapter.log.debug(`Messages to: ${JSON.stringify(send_instances)}`);
    get_ids();
    get_states();
    setTimeout(set_subs, 2000);
    set_schedules();
    setTimeout(refreshLists, 2000);
}
//################# ENABLE ####################################################

function enable(id, state){
    let say = adapter.config.text_failed;
    if(!adapter.config.opt_warning && is_alarm){
        adapter.setState('info.log', `${adapter.config.log_act_not} ${names_alarm}`);
        if(log)adapter.log.info(`${adapter.config.log_act_not} ${names_alarm}`);
        if(act_message) messages(`${adapter.config.log_act_not} ${names_alarm}`);
        adapter.setState('status.activation_failed', true);
        adapter.setState('status.state', 'activation failed');
        adapter.setState('use.list', 0);
        if(speak_names){
            say = say + ' ' + names_alarm;
        }
        sayit(say, 3);
        return;
    }
    if(notification_message && is_alarm){
        messages(`${adapter.config.log_act_warn_circuit} ${names_alarm}`);
    }
    inside_ends();
    sleep_end();
    adapter.setState('status.activated', true);
    adapter.setState('status.deactivated', false);
    adapter.setState('status.activation_failed', false);
    adapter.setState('status.state', 'sharp');
    adapter.setState('status.state_list', 1);
    adapter.setState('homekit.CurrentState', 1);
    adapter.setState('homekit.TargetState', 1);
    adapter.setState('use.list', 1);
    if(is_alarm){
        adapter.setState('status.activated_with_warnings', true);
        adapter.setState('status.state', 'activated with warnings');
        adapter.setState('info.log', `${adapter.config.log_act_warn} ${names_alarm}`);
        if(log)adapter.log.info(`${adapter.config.log_act_warn} ${names_alarm}`);
        if(notification_message) messages(`${adapter.config.log_act_warn} ${names_alarm}`);
    } else{
        adapter.setState('info.log', `${adapter.config.log_act}`);
        if(log)adapter.log.info(`${adapter.config.log_act}`);
        sayit(adapter.config.text_activated, 1);
        if(act_message) messages(`${adapter.config.log_act}`);
    }
}
//##############################################################################

//################# DISABLE ####################################################

function disable(){
    burgle = false;
    clearTimeout(silent_timer);
    clearTimeout(siren_timer);
    silent_timer = null;
    siren_timer = null;
    if(activated || is_panic){
        is_panic = false;
        adapter.setState('info.log', `${adapter.config.log_deact}`);
        sayit(adapter.config.text_deactivated, 2);
        if(log)adapter.log.info(`${adapter.config.log_deact}`);
        adapter.setState('status.siren', false);
        adapter.setState('status.activated', false);
        adapter.setState('status.deactivated', true);
        adapter.setState('status.activated_with_warnings', false);
        adapter.setState('status.activation_failed', false);
        adapter.setState('status.siren', false);
        adapter.setState('status.burglar_alarm', false);
        adapter.setState('status.silent_alarm', false);
        adapter.setState('status.state', 'deactivated');
        adapter.setState('status.state_list',0);
        adapter.setState('homekit.CurrentState', 3);
        adapter.setState('homekit.TargetState', 3);
        adapter.setState('use.list',0);
        if(act_message) messages(`${adapter.config.log_deact}`);
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

function burglary(id, state){
    if(burgle) return;
    const name = get_name(id);
    adapter.setState('info.log', `${adapter.config.log_burgle} ${name}`);
    if(log)adapter.log.info(`${adapter.config.log_burgle} ${name}`);
    if(alarm_message) messages(`${adapter.config.log_burgle} ${name}`);
    if(adapter.config.time_silent > 0){
        adapter.setState('status.silent_alarm', true);
        adapter.setState('status.state', 'silent alarm');
    }
    if(silent_timer) return;
    else if (!burgle){
        burgle = true;
        silent_timer = setTimeout(()=>{
            sayit(adapter.config.text_alarm, 6);
            adapter.setState('status.burglar_alarm', true);
            adapter.setState('status.silent_alarm', false);
            adapter.setState('status.siren', true);
            adapter.setState('status.state', 'burgle');
            adapter.setState('status.state_list', 3);
            adapter.setState('homekit.CurrentState', 4);
            siren_timer = setTimeout(()=>{
                adapter.setState('status.siren', false);
            }, 1000*adapter.config.time_alarm);
        }, adapter.config.time_silent * 1000);
    }

}
//##############################################################################

//################# PANIC ####################################################

function panic(){
    is_panic = true;
    adapter.setState('info.log', `${adapter.config.log_panic}`);
    if(log)adapter.log.info(`${adapter.config.log_panic}`);
    if(alarm_message) messages(`${adapter.config.log_panic}`);
    sayit(adapter.config.text_alarm, 6);
    adapter.setState('status.burglar_alarm', true);
    adapter.setState('status.siren', true);
    adapter.setState('status.state', 'burgle');
    adapter.setState('status.state_list', 4);
    adapter.setState('homekit.CurrentState', 4);
    siren_timer = setTimeout(()=>{
        adapter.setState('status.siren', false);
    }, 1000*adapter.config.time_alarm);
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
            adapter.log.debug(`Inside state change: ${id} val: ${state.val}`);
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
    else if(id === adapter.namespace + '.status.sharp_inside_activated'){
        shortcuts('status.sharp_inside_activated', state.val);
        return;
    }
    else if(id === adapter.namespace + '.use.quit_changes'){
        clearTimeout(timer_inside_changes);
        clearTimeout(timer_notification_changes);
        adapter.setState('status.activation_failed', false);
        adapter.setState('info.sharp_inside_siren', false);
        adapter.setState('info.notification_circuit_changes', false);
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
    else if(id === adapter.namespace + '.info.sharp_inside_siren'){
        shortcuts('info.sharp_inside_siren', state.val);
        return;
    }
    else if(id === adapter.namespace + '.info.notification_circuit_changes'){
        shortcuts('info.notification_circuit_changes', state.val);
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
        }else if(checkPassword(state.val) && activated){
            countdown(false);
            //disable();
            return;
        }else{
            if(log) adapter.log.info(`${adapter.config.log_pass}`);
            adapter.log.debug(`Password denied ${state.val}`);
            return;
        }
    }
    else if(id === adapter.namespace + '.use.toggle_with_delay_and_password'){
        if(state.val == '') return;
        if(checkPassword(state.val, 'use.toggle_with_delay_and_password') && !activated){
            countdown(true);
            return;
        }else if(checkPassword(state.val) && activated){
            countdown(false);
            //disable();
            return;
        }else{
            if(log) adapter.log.info(`${adapter.config.log_pass}`);
            adapter.log.debug(`Password denied ${state.val}`);
            return;
        }
    }
    else if(id === adapter.namespace + '.info.log'){
        logging(state.val);
        return;
    }
    if(alarm_states.includes(id) && activated && isTrue(id, state)){
        burglary(id, state);
        return;
    }
    if(inside_states.includes(id) && inside && isTrue(id, state)){
        const name = get_name(id);
        let say = adapter.config.text_changes;
        adapter.setState('info.log', `${adapter.config.log_warn} ${name}`);
        adapter.setState('info.sharp_inside_siren', true);
        if(log) adapter.log.info(`${adapter.config.log_warn} ${name}`);
        if(notification_message) messages(`${adapter.config.log_warn} ${name}`);
        if(speak_names){
            say = say + ' ' + name;
        }
        sayit(say, 5);

        timer_inside_changes = setTimeout(()=>{
            adapter.setState('info.sharp_inside_siren', false);
        }, adapter.config.time_warning * 1000);
        return;
    }
    if(notification_states.includes(id) && isTrue(id, state)){
        if(!activated && !inside && !night_rest) return;
        const name = get_name(id);
        adapter.setState('info.log', `${adapter.config.log_night} ${name}`);
        adapter.setState('info.notification_circuit_changes', true);
        if(night_rest){
            let say = adapter.config.text_changes_night;
            if(log) adapter.log.info(`${adapter.config.log_night} ${name}`);
            if(night_message) messages(`${adapter.config.log_night} ${name}`);
            if(speak_names){
                say = say + ' ' + name;
            }
            sayit(say, 9);
        } else if (inside) {
            let say = adapter.config.text_changes;
            if(log) adapter.log.info(`${adapter.config.log_warn} ${name}`);
            if(notification_message) messages(`${adapter.config.log_warn} ${name}`);
            if(speak_names){
                say = say + ' ' + name;
            }
            sayit(say, 5);
        } else if (activated) {
            if(log) adapter.log.info(`${adapter.config.log_warn} ${name}`);
            if(notification_message) messages(`${adapter.config.log_warn} ${name}`);
        }
        timer_notification_changes = setTimeout(()=>{
            adapter.setState('info.notification_circuit_changes', false);
        }, adapter.config.time_warning * 1000);
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
            adapter.log.debug(`NO SUBSCRIBTION`);
        }
    });
    adapter.subscribeStates('info.log');
    adapter.subscribeStates('info.sharp_inside_siren');
    adapter.subscribeStates('info.notification_circuit_changes');
    adapter.subscribeStates('use.*');
    adapter.subscribeStates('status.*');
    adapter.subscribeStates('homekit.TargetState');
}
//##############################################################################

//################# MESSAGES ###################################################

function messages(content){
    if(send_instances.length){
        send_instances.forEach((ele)=>{
            adapter.log.debug(`Send message to ${ele}, message: ${content}`);
            adapter.sendTo(ele, content);
        });
    }
}

function sayit(message, opt_val){
    const tts_instance = adapter.config.sayit;
    if(tts_instance){
        tts_instance.forEach((ele)=>{
            if(ele.enabled){
                switch (opt_val) {
                    case 1:
                        if(ele.opt_say_one){
                            adapter.log.debug(`speech output instance: ${ele.name_id}: ${message}`);
                            adapter.setForeignState(ele.name_id, message, (err)=>{
                                if(err) adapter.log.warn(err);
                            });
                        }
                        break;
                    case 2:
                        if(ele.opt_say_two){
                            adapter.log.debug(`speech output instance: ${ele.name_id}: ${message}`);
                            adapter.setForeignState(ele.name_id, message, (err)=>{
                                if(err) adapter.log.warn(err);
                            });
                        }
                        break;
                    case 3:
                        if(ele.opt_say_three){
                            adapter.log.debug(`speech output instance: ${ele.name_id}: ${message}`);
                            adapter.setForeignState(ele.name_id, message, (err)=>{
                                if(err) adapter.log.warn(err);
                            });
                        }
                        break;
                    case 4:
                        if(ele.opt_say_four){
                            adapter.log.debug(`speech output instance: ${ele.name_id}: ${message}`);
                            adapter.setForeignState(ele.name_id, message, (err)=>{
                                if(err) adapter.log.warn(err);
                            });
                        }
                        break;
                    case 5:
                        if(ele.opt_say_five){
                            adapter.log.debug(`speech output instance: ${ele.name_id}: ${message}`);
                            adapter.setForeignState(ele.name_id, message, (err)=>{
                                if(err) adapter.log.warn(err);
                            });
                        }
                        break;
                    case 6:
                        if(ele.opt_say_six){
                            adapter.log.debug(`speech output instance: ${ele.name_id}: ${message}`);
                            adapter.setForeignState(ele.name_id, message, (err)=>{
                                if(err) adapter.log.warn(err);
                            });
                        }
                        break;
                    case 7:
                        if(ele.opt_say_seven){
                            adapter.log.debug(`speech output instance: ${ele.name_id}: ${message}`);
                            adapter.setForeignState(ele.name_id, message, (err)=>{
                                if(err) adapter.log.warn(err);
                            });
                        }
                        break;
                    case 8:
                        if(ele.opt_say_eigth){
                            adapter.log.debug(`speech output instance: ${ele.name_id}: ${message}`);
                            adapter.setForeignState(ele.name_id, message, (err)=>{
                                if(err) adapter.log.warn(err);
                            });
                        }
                        break;
                    case 9:
                        if(ele.opt_say_nine){
                            adapter.log.debug(`speech output instance: ${ele.name_id}: ${message}`);
                            adapter.setForeignState(ele.name_id, message, (err)=>{
                                if(err) adapter.log.warn(err);
                            });
                        }
                        break;
                    case 10:
                        if(ele.opt_say_nine_plus){
                            adapter.log.debug(`speech output instance: ${ele.name_id}: ${message}`);
                            adapter.setForeignState(ele.name_id, message, (err)=>{
                                if(err) adapter.log.warn(err);
                            });
                        }
                        break;
                    case 0:
                        if(ele.opt_say_zero){
                            adapter.log.debug(`speech output instance: ${ele.name_id}: ${message}`);
                            adapter.setForeignState(ele.name_id, message, (err)=>{
                                if(err) adapter.log.warn(err);
                            });
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

function inside_begins(){
    if(!inside && !burgle){
        activated = false;
        inside = true;
        sleep_end();
        if(is_inside){
            let say = adapter.config.text_warning;
            if(notification_message) messages(`${adapter.config.log_warn_b_w} ${names_inside}`);
            adapter.setState('info.log', `${adapter.config.log_warn_b_w} ${names_inside}`);
            if(log) adapter.log.info(`${adapter.config.log_warn_b_w} ${names_inside}`);
            if(speak_names){
                say = say + ' ' + names_inside;
            }
            sayit(say, 4);
        }
        adapter.setState('info.log', `${adapter.config.log_warn_act}`);
        if(log)adapter.log.info(`${adapter.config.log_warn_act}`);
        sayit(adapter.config.text_warn_begin, 10);
        adapter.setState('status.sharp_inside_activated', true);
        adapter.setState('status.state', 'sharp inside');
        adapter.setState('status.state_list', 2);
        adapter.setState('homekit.CurrentState', 0);
        adapter.setState('homekit.TargetState', 0);
        adapter.setState('use.list', 2);
        adapter.setState('status.activated', false);
        adapter.setState('status.deactivated', true);
    }

}

function inside_ends(off){
    if(inside){
        inside = false;
        if(off){
            adapter.setState('info.log', `${adapter.config.log_warn_deact}`);
            if(log)adapter.log.info(`${adapter.config.log_warn_deact}`);
            sayit(adapter.config.text_warn_end, 0);
            adapter.setState('status.sharp_inside_activated', false);
            adapter.setState('status.state', 'deactivated');
            adapter.setState('status.state_list',0);
            adapter.setState('homekit.CurrentState', 3);
            adapter.setState('homekit.TargetState', 3);
            adapter.setState('use.list',0);
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
    if(log) adapter.log.info(`${adapter.config.log_sleep_b}`);
    adapter.setState('info.log', `${adapter.config.log_sleep_b}`);
    sayit(adapter.config.text_nightrest_beginn, 7);
    adapter.setState('status.state', 'night rest');
    adapter.setState('status.state_list', 4);
    adapter.setState('homekit.CurrentState', 2);
    adapter.setState('homekit.TargetState', 2);
    adapter.setState('use.list', 4);
    if(is_notification){
        let say = adapter.config.text_warning;
        if(night_message) messages(`${adapter.config.log_nights_b_w} ${names_notification}`);
        adapter.setState('info.log', `${adapter.config.log_nights_b_w} ${names_notification}`);
        if(log) adapter.log.info(`${adapter.config.log_nights_b_w} ${names_notification}`);
        if(speak_names){
            say = say + ' ' + names_notification;
        }
        sayit(say, 4);
    }
}

function sleep_end(off) {
    if (night_rest) {
        night_rest = false;
        if(off){
            adapter.setState('info.log', `${adapter.config.log_sleep_e}`);
            sayit(adapter.config.text_nightrest_end, 8);
            if(log) adapter.log.info(`${adapter.config.log_sleep_e}`);
            adapter.setState('status.state', 'deactivated');
            if(!inside){
                adapter.setState('status.state_list', 0);
                adapter.setState('homekit.CurrentState', 3);
                adapter.setState('homekit.TargetState', 3);
                adapter.setState('use.list', 0);
            }
        }
    }
}

function refreshLists(){
    check(alarm_states, (val, ids)=>{
        adapter.log.debug(`Alarm circuit list: ${ids}`);
        if(ids.length > 0){
            ids_alarm = ids;
            is_alarm = true;
            names_alarm = get_name(ids);
            adapter.setState('info.alarm_circuit_list', names_alarm);
        }else{
            ids_alarm = [];
            is_alarm = false;
            names_alarm = '';
            adapter.setState('info.alarm_circuit_list', '');
        }
    });
    check(inside_states, (val, ids)=>{
        adapter.log.debug(`Inside circuit list: ${ids}`);
        if(ids.length > 0){
            ids_inside = ids;
            is_inside = true;
            names_inside = get_name(ids);
            adapter.setState('info.sharp_inside_circuit_list', names_inside);
        }else{
            ids_inside = [];
            is_inside = false;
            names_inside = '';
            adapter.setState('info.sharp_inside_circuit_list', '');
        }
    });
    check(notification_states, (val, ids)=>{
        adapter.log.debug(`Notification circuit list: ${ids}`);
        if(ids.length > 0){
            ids_notification = ids;
            is_notification = true;
            names_notification = get_name(ids);
            adapter.setState('info.notification_circuit_list', names_notification);
        }else{
            ids_notification = [];
            is_notification = false;
            names_notification = '';
            adapter.setState('info.notification_circuit_list', '');
        }
    });
    if(is_alarm){
        adapter.setState('status.enableable', false);
        return;
    } else if (!with_warnigs && is_alarm) {
        adapter.setState('status.enableable', false);
    }else {
        adapter.setState('status.enableable', true);
    }
}

function checkPassword(pass, id) {
    if(adapter.config.password === pass){
        adapter.log.debug(`Password accept`);
        adapter.setState('info.wrong_password', false, (err)=>{
            if(err)adapter.log.error(err);
            adapter.setState(id, '');
        });
        return true;
    }
    else{
        adapter.setState('info.wrong_password', true, (err)=>{
            if(err)adapter.log.error(err);
            adapter.setState(id, '');
        });
        return false;
    }
}

function isTrue(id, state){
    let test = false;
    if(!search(id) && state.val) test = true;
    else if(search(id) && !state.val) test = true;
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
            if(ele.alarm)alarm_states.push(ele.name_id);
            if(ele.warning)inside_states.push(ele.name_id);
            if(ele.night)notification_states.push(ele.name_id);
        }else{
            adapter.log.debug(`State not used but configured: ${ele.name_id}`);
        }
    });
}

function get_ids(){
    let ids = [];
    ids = ids.concat(alarm_states, inside_states, notification_states);
    clean_ids = Array.from(new Set(ids));
}

function search(id){
    const temp = adapter.config.circuits.findIndex((obj)=>{
        const reg = new RegExp(id);
        return reg.test(obj.name_id);
    });
    return adapter.config.circuits[temp].negativ;
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

function get_name(ids, callback){
    const name =[];
    if(Array.isArray(ids)){
        ids.forEach((id)=>{
            const temp = adapter.config.circuits.findIndex((obj)=>{
                const reg = new RegExp(id);
                return reg.test(obj.name_id);
            });
            name.push(adapter.config.circuits[temp].name) ;
        });
        return name.join();
    }else{
        const temp = adapter.config.circuits.findIndex((obj)=>{
            const reg = new RegExp(ids);
            return reg.test(obj.name_id);
        });
        return adapter.config.circuits[temp].name;
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

function countdown(action){
    let counter = adapter.config.time_activate;
    if(action && !timer){
        if(is_alarm){
            let say = adapter.config.text_warning;
            if(speak_names){
                say = say + ' ' + names_alarm;
            }
            sayit(say, 4);
        }
        timer = setInterval(()=>{
            if(counter > 0){
                counter--;
                adapter.setState('status.gets_activated', true);
                adapter.setState('status.activation_countdown', counter);
            }else{
                clearInterval(timer);
                timer = null;
                adapter.setState('status.activation_countdown', counter);
                adapter.setState('status.gets_activated', false);
                enable();
            }
        }, 1000);
    }else{
        if(timer){
            clearInterval(timer);
            timer = null;
            adapter.setState('status.activation_countdown', null);
            adapter.setState('status.gets_activated', false);
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

function getStateAsync(id) {
    return new Promise((resolve, reject)=>{
        adapter.getForeignState(id, (err, state)=>{
            if(err){
                adapter.log.warn(`Error at shortcuts getState: ${id}`);
                reject(err);
            } else if(state == null || state.val == null) {
                adapter.log.error(`state is null: ${id}`);
                resolve(null);
            }
            else resolve(state.val);
        });
    });
}



async function asyncForEach(id, val, callback) {
    for (let index = 0; index < shorts.length; index++) {
        if(shorts[index].enabled && shorts[index].select_id == id && /true/.test(shorts[index].trigger_val) === val)
            await callback(shorts[index].name_id, shorts[index].value, index, shorts);
    }
}

async function shortcuts (id, val){
    let result;
    await asyncForEach(id, val, async (found_id, value, index, ids) => {
        result = await getStateAsync(found_id);
        adapter.log.debug(`Shorcut ID: ${found_id} old state: ${result} new state: ${value}`);
        if(value !== result) {
            adapter.setForeignState(ids[index].name_id, bools(value), (err)=>{
                if(err) adapter.log.warn(`Cannot set state: ${err}`);
            });
        }
    });
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
                adapter.setState('info.log_today', log_list.join('<br>'));
            }
        }
    });
}

//##############################################################################

//################# SCHEDULES ####################################################

function set_schedules(){
    schedule_reset = schedule.scheduleJob({hour: 00, minute: 00}, ()=>{
        adapter.setState('info.log_today', '');
    });
    if(adapter.config.night_from && adapter.config.night_to){
        let from, to;
        try{
            from = adapter.config.night_from.split(':');
            to = adapter.config.night_to.split(':');
        }catch(e){
            adapter.log.warn(`Cannot read night rest time: ${e}`);
            return;
        }
        schedule_from = schedule.scheduleJob({hour: parseInt(from[0]), minute: parseInt(from[1])}, ()=>{
            adapter.setState('status.sleep', true);
            sleep_begin(true);
        });
        schedule_to = schedule.scheduleJob({hour: parseInt(to[0]), minute: parseInt(to[1])}, ()=>{
            adapter.setState('status.sleep', false);
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
