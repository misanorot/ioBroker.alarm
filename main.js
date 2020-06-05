// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');

// Load your modules here, e.g.:
// const fs = require("fs");
const schedule = require('node-schedule');
const T = require('./lib/Logs.js');

/**
 * The adapter instance
 * @type {ioBroker.Adapter}
 */
let adapter;
const L = T.Translate['de'];
let clean_ids = [];
const alarm = [],
    warning = [],
    night = [];
let send_instances = [],
    states = {},
    send_available = false;

let log_list = '';

let is_alarm = false,
    is_warning = false,
    is_night = false,
    is_panic = false,
    ids_alarm = [],
    ids_warning = [],
    ids_night = [],
    names_alarm,
    names_warning,
    names_night;


let activated = false,
    night_rest = false,
    warn = false,
    burgle = false;

let timer = null,
    silent_timer = null,
    timer_warn_changes = null,
    timer_night_changes = null,
    siren_timer = null;

let log,
    speak_names,
    with_warnigs,
    alarm_message,
    night_message,
    warning_message,
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
    warning_message = adapter.config.send_warning;
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
    adapter.getState('status.warn_circuit_activated', (err, state)=>{
        if(err){
            adapter.log.error(err);
            adapter.setState('info.connection', false);
            return;
        }else{
            if(state == null){
                warn = false;
                adapter.setState('status.warn_circuit_activated', false);
            }else warn = state.val;
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
        adapter.setState('info.log', `${L.act_not} ${names_alarm}`);
        if(log)adapter.log.info(`${L.act_not} ${names_alarm}`);
        if(act_message) messages(`${L.act_not} ${names_alarm}`);
        adapter.setState('status.activation_failed', true);
        adapter.setState('status.state', 'activation failed');
        if(speak_names && say.length > 0){
            say = say + ' ' + names_alarm;
        }
        sayit(say, 3);
        return;
    }
    if(warning_message && is_warning){
        messages(`${L.act_warn_circuit} ${names_warning}`);
    }
    warn_ends();
    adapter.setState('status.activated', true);
    adapter.setState('status.deactivated', false);
    adapter.setState('status.activation_failed', false);
    adapter.setState('status.state', 'activated');
    adapter.setState('status.state_list', 1);
    adapter.setState('use.list', 1);
    adapter.setState('use.toggle', true);
    adapter.setState('use.toggle_with_delay', true);
    if(is_alarm){
        adapter.setState('status.activated_with_warnings', true);
        adapter.setState('status.state', 'activated with warnings');
        adapter.setState('info.log', `${L.act_warn} ${names_alarm}`);
        if(log)adapter.log.info(`${L.act_warn} ${names_alarm}`);
        if(warning_message) messages(`${L.act_warn} ${names_alarm}`);
    } else{
        adapter.setState('info.log', `${L.act}`);
        if(log)adapter.log.info(`${L.act}`);
        sayit(adapter.config.text_activated, 1);
        if(act_message) messages(`${L.act}`);
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
        adapter.setState('info.log', `${L.deact}`);
        sayit(adapter.config.text_deactivated, 2);
        if(log)adapter.log.info(`${L.deact}`);
        adapter.setState('status.siren', false);
        adapter.setState('status.activated', false);
        adapter.setState('status.deactivated', true);
        adapter.setState('status.activated_with_warnings', false);
        adapter.setState('status.activation_failed', false);
        adapter.setState('status.siren', false);
        adapter.setState('status.burglar_alarm', false);
        adapter.setState('status.activation_failed', false);
        adapter.setState('status.silent_alarm', false);
        adapter.setState('status.state', 'deactivated');
        adapter.setState('status.state_list',0);
        adapter.setState('use.list',0);
        adapter.setState('use.toggle', false);
        adapter.setState('use.toggle_with_delay', false);
        if(act_message) messages(`${L.deact}`);
    }else{
        adapter.setState('status.activation_failed', false);
    }
}
//##############################################################################

//################# BURGALARY ####################################################

function burglary(id, state){
    if(burgle) return;
    adapter.setState('info.log', `${L.burgle} ${get_name(id)}`);
    if(log)adapter.log.info(`${L.burgle} ${get_name(id)}`);
    if(alarm_message) messages(`${L.burgle} ${get_name(id)}`);
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
            adapter.setState('status.siren', true);
            adapter.setState('status.state', 'burgle');
            adapter.setState('status.state_list', 3);
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
    adapter.setState('info.log', `${L.panic}`);
    if(log)adapter.log.info(`${L.panic}`);
    if(alarm_message) messages(`${L.panic}`);
    sayit(adapter.config.text_alarm, 6);
    adapter.setState('status.burglar_alarm', true);
    adapter.setState('status.siren', true);
    adapter.setState('status.state', 'burgle');
    adapter.setState('status.state_list', 3);
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
                if(warn){
                    adapter.setState('status.state', 'deactivated');
                    adapter.setState('status.state_list', 0);
                    countdown(false);
                    warn_ends();
                    //if(night_rest) sleep_end();
                } else {
                    countdown(false);
                }
                break;
            case 1:
                if(!activated) enable(id, state);
                break;
            case 2:
                warn_begins();
                break;
            case 3:
                countdown(true);
                break;
            default:
                adapter.log.warn('Use wrong value in use.list');
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
        night_rest = state.val;
        shortcuts('status.sleep', state.val);
        return;
    }
    else if(id === adapter.namespace + '.status.gets_activated'){
        shortcuts('status.gets_activated', state.val);
        return;
    }
    else if(id === adapter.namespace + '.status.warn_circuit_activated'){
        shortcuts('status.warn_circuit_activated', state.val);
        return;
    }
    else if(id === adapter.namespace + '.use.quit_changes'){
        clearTimeout(timer_warn_changes);
        clearTimeout(timer_night_changes);
        adapter.setState('info.warning_circuit_changes', false);
        adapter.setState('info.night_circuit_changes', false);
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
    else if(id === adapter.namespace + '.info.warning_circuit_changes'){
        shortcuts('info.warning_circuit_changes', state.val);
        return;
    }
    else if(id === adapter.namespace + '.info.night_circuit_changes'){
        shortcuts('info.night_circuit_changes', state.val);
        return;
    }
    else if(id === adapter.namespace + '.use.enable' && state.val){
        enable(id, state);
        return;
    }
    else if(id === adapter.namespace + '.use.disable' && state.val){
        countdown(false);
        //disable();
        return;
    }
    else if(id === adapter.namespace + '.use.panic' && state.val){
        panic();
        return;
    }
    else if(id === adapter.namespace + '.use.toggle'){
        if(state.val){
            if(!activated) {
                enable(id, state);
            }
            return;
        }else{
            if(activated) {
                countdown(false);
            }
            //disable();
            return;
        }
    }
    else if(id === adapter.namespace + '.use.activate_nightrest' && state.val){
        sleep_begin();
        return;
    }
    else if(id === adapter.namespace + '.use.deactivate_nightrest' && state.val){
        sleep_end();
        return;
    }
    else if(id === adapter.namespace + '.use.toggle_nightrest'){
        if(state.val){
            if(!night_rest) {
                sleep_begin();
            }
            return;
        }else{
            if(night_rest) {
                sleep_end();
            }
            return;
        }
    }
    else if(id === adapter.namespace + '.use.activate_warn_circuit' && state.val){
        warn_begins();
        return;
    }
    else if(id === adapter.namespace + '.use.deactivate_warn_circuit' && state.val){
        warn_ends();
        return;
    }
    else if(id === adapter.namespace + '.use.toggle_warn_circuit'){
        if(state.val){
            if(!warn) {
                warn_begins();
            }
            return;
        }else{
            if(warn) {
                warn_ends();
            }
            return;
        }
    }
    else if(id === adapter.namespace + '.use.enable_with_delay' && state.val){
        countdown(true);
        return;
    }
    else if(id === adapter.namespace + '.use.toggle_with_delay'){
        if(state.val){
            if(!activated) {
                countdown(true);
            }
            return;
        }else{
            if(activated) {
                countdown(false);
            }
            //disable();
            return;
        }
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
            if(log) adapter.log.info(`${L.pass}`);
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
            if(log) adapter.log.info(`${L.pass}`);
            adapter.log.debug(`Password denied ${state.val}`);
            return;
        }
    }
    else if(id === adapter.namespace + '.info.log'){
        logging(state.val);
        return;
    }
    if(alarm.includes(id) && activated && isTrue(id, state)){
        burglary(id, state);
        return;
    }
    if(warning.includes(id) && activated && isTrue(id, state)){
        adapter.setState('info.log', `${L.warn} ${get_name(id)}`);
        adapter.setState('info.warning_circuit_changes', true);
        if(log) adapter.log.info(`${L.warn} ${get_name(id)}`);
        if(warning_message) messages(`${L.warn} ${get_name(id)}`);
        timer_warn_changes = setTimeout(()=>{
            adapter.setState('info.warning_circuit_changes', false);
        }, adapter.config.time_warning * 1000);
        return;
    }
    if(night.includes(id) && night_rest && isTrue(id, state)){
        const name = get_name(id);
        let say = adapter.config.text_changes;
        adapter.setState('info.log', `${L.night} ${name}`);
        adapter.setState('info.night_circuit_changes', true);
        if(log) adapter.log.info(`${L.night} ${name}`);
        if(night_message) messages(`${L.night} ${name}`);
        if(speak_names){
            say = say + ' ' + name;
        }
        sayit(say, 9);
        timer_night_changes = setTimeout(()=>{
            adapter.setState('info.night_circuit_changes', false);
        }, adapter.config.time_warning * 1000);
        return;
    }
    if(warning.includes(id) && warn && isTrue(id, state)){
        const name = get_name(id);
        let say = adapter.config.text_changes;
        adapter.setState('info.log', `${L.warn} ${get_name(id)}`);
        adapter.setState('info.warning_circuit_changes', true);
        if(log) adapter.log.info(`${L.warn} ${get_name(id)}`);
        if(warning_message) messages(`${L.warn} ${get_name(id)}`);
        if(speak_names){
            say = say + ' ' + name;
        }
        sayit(say, 5);

        timer_warn_changes = setTimeout(()=>{
            adapter.setState('info.warning_circuit_changes', false);
        }, adapter.config.time_warning * 1000);
        return;
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
    adapter.subscribeStates('info.warning_circuit_changes');
    adapter.subscribeStates('info.night_circuit_changes');
    adapter.subscribeStates('use.*');
    adapter.subscribeStates('status.*');
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
                    default:
                        adapter.log.debug(`no speech output!`);
                }
            }
        });
    }

}
//##############################################################################

//################# HELPERS ####################################################

function warn_begins(){
    if(!warn && !burgle){
        warn = true;
        activated = false;
        countdown(false);
        if(is_warning){
            let say = adapter.config.text_warning;
            if(warning_message) messages(`${L.warn_b_w} ${names_warning}`);
            adapter.setState('info.log', `${L.warn_b_w} ${names_warning}`);
            if(log) adapter.log.info(`${L.warn_b_w} ${names_warning}`);
            if(speak_names){
                say = say + ' ' + names_warning;
            }
            sayit(say, 4);
        }
        adapter.setState('info.log', `${L.warn_act}`);
        if(log)adapter.log.info(`${L.warn_act}`);
        adapter.setState('status.warn_circuit_activated', true);
        adapter.setState('status.state', 'sharp inside');
        adapter.setState('status.state_list', 2);
        adapter.setState('use.list', 2);
        adapter.setState('status.activated', false);
        adapter.setState('status.deactivated', true);
        adapter.setState('use.toggle_warn_circuit', true);
    }

}

function warn_ends(){
    if(warn){
        warn = false;
        adapter.setState('info.log', `${L.warn_deact}`);
        if(log)adapter.log.info(`${L.warn_deact}`);
        adapter.setState('status.warn_circuit_activated', false);
        if(activated) adapter.setState('use.list', 1);
        if(!activated) adapter.setState('use.list', 0);
        adapter.setState('use.toggle_warn_circuit', false);
    }
}

function sleep_begin() {
    adapter.setState('info.log', `${L.sleep_b}`);
    sayit(adapter.config.text_nightrest_beginn, 7);
    warn_ends();
    if(!activated) adapter.setState('status.state', 'nightrest');
    if(log) adapter.log.info(`${L.sleep_b}`);
    adapter.setState('status.sleep', true);
    adapter.setState('use.toggle_nightrest', true);
    if(is_night){
        let say = adapter.config.text_warning;
        if(night_message) messages(`${L.nights_b_w} ${names_night}`);
        adapter.setState('info.log', `${L.nights_b_w} ${names_night}`);
        if(log) adapter.log.info(`${L.nights_b_w} ${names_night}`);
        if(speak_names){
            say = say + ' ' + names_night;
        }
        sayit(say, 4);
    }

}

function sleep_end() {
    adapter.setState('info.log', `${L.sleep_e}`);
    sayit(adapter.config.text_nightrest_end, 8);
    if(log) adapter.log.info(`${L.sleep_e}`);
    adapter.setState('status.sleep', false);
    adapter.setState('use.toggle_nightrest', false);
    if(!activated) adapter.setState('status.state', 'deactivated');
}

function refreshLists(){
    check(alarm, (val, ids)=>{
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
    check(warning, (val, ids)=>{
        adapter.log.debug(`Warning circuit list: ${ids}`);
        if(ids.length > 0){
            ids_warning = ids;
            is_warning = true;
            names_warning = get_name(ids);
            adapter.setState('info.warning_circuit_list', names_warning);
        }else{
            ids_warning = [];
            is_warning = false;
            names_warning = '';
            adapter.setState('info.warning_circuit_list', '');
        }
    });
    check(night, (val, ids)=>{
        adapter.log.debug(`Sleep circuit list: ${ids}`);
        if(ids.length > 0){
            ids_night = ids;
            is_night = true;
            names_night = get_name(ids);
            adapter.setState('info.sleep_circuit_list', names_night);
        }else{
            ids_night = [];
            is_night = false;
            names_night = '';
            adapter.setState('info.sleep_circuit_list', '');
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
            if(ele.alarm)alarm.push(ele.name_id);
            if(ele.warning)warning.push(ele.name_id);
            if(ele.night)night.push(ele.name_id);
        }else{
            adapter.log.debug(`State not used but configured: ${ele.name_id}`);
        }
    });
}

function get_ids(){
    let ids = [];
    ids = ids.concat(alarm, warning, night);
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
        let say = adapter.config.text_warning;
        if(speak_names){
            say = say + ' ' + names_alarm;
        }
        sayit(say, 4);
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

function shortcuts(id, val){
    if(shorts){
        shorts.forEach((ele, i) => {
            if(ele.enabled && ele.select_id == id && /true/.test(ele.trigger_val) === val){
                setTimeout(()=>{
                    adapter.setForeignState(ele.name_id, bools(ele.value), (err)=>{
                        if(err) adapter.log.warn(`Cannot set state: ${err}`);
                    });
                }, i*250);

            }
        });
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
            sleep_begin();
        });
        schedule_to = schedule.scheduleJob({hour: parseInt(to[0]), minute: parseInt(to[1])}, ()=>{
            sleep_end();
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
