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

let activated = false,
    night_rest = false,
    burgle = false;

let timer = null,
    silent_timer = null,
    timer_warn_changes = null,
    timer_night_changes = null,
    siren_timer = null;

let log,
    with_warnigs,
    alarm_message,
    night_message,
    warning_message,
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
    shorts = adapter.config.shorts;
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
    let is_alarm,
        is_warning;

    let ids_alarm = [],
        ids_warning = [];

    check(alarm, (val, ids)=>{
        is_alarm = val;
        ids_alarm = ids;
    });
    check(warning, (val, ids)=>{
        is_warning = val;
        ids_warning = ids;
    });
    if(is_alarm){
        adapter.setState('info.log', `${L.act_not} ${get_name(ids_alarm)}`);
        if(log)adapter.log.info(`${L.act_not} ${get_name(ids_alarm)}`);
        adapter.setState('status.activation_failed', true);
        adapter.setState('status.state', 'activation failed');
        sayit(adapter.config.text_failed);
        return;
    }
    if(!adapter.config.opt_warning && is_warning){
        adapter.setState('info.log', `${L.act_not} ${get_name(ids_warning)}`);
        if(log)adapter.log.info(`${L.act_not} ${get_name(ids_warning)}`);
        adapter.setState('status.activation_failed', true);
        adapter.setState('status.state', 'activation failed');
        sayit(adapter.config.text_failed);
        return;
    }
    adapter.setState('info.log', `${L.act}`);
    if(log)adapter.log.info(`${L.act}`);
    sayit(adapter.config.text_activated);
    adapter.setState('status.activated', true);
    adapter.setState('status.deactivated', false);
    adapter.setState('status.activation_failed', false);
    adapter.setState('status.state', 'activated');
    if(warning.includes(id)){
        adapter.setState('status.activated_with_warnings', true);
        adapter.setState('status.state', 'activated with warnings');
        adapter.setState('info.log', `${L.act_warn} ${get_name(id)}`);
        if(log)adapter.log.info(`${L.act_warn} ${get_name(id)}`);
        if(warning_message) messages(`${L.act_warn} ${get_name(id)}`);
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
    if(activated){
        adapter.setState('info.log', `${L.deact}`);
        sayit(adapter.config.text_deactivated);
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
    }else{
        adapter.setState('status.activation_failed', false);
    }
}
//##############################################################################

//################# BURGALARY ####################################################

function burglary(id, state){
    adapter.setState('info.log', `${L.burgle} ${get_name(id)}`);
    if(log)adapter.log.info(`${L.burgle} ${get_name(id)}`);
    if(alarm_message) messages(`${L.burgle} ${get_name(id)}`);
    if(adapter.config.time_silent > 0){
        adapter.setState('status.silent_alarm', true);
        adapter.setState('status.state', 'silent alarm');
    }
    if(silent_timer)return;
    else if (!burgle){
        burgle = true;
        silent_timer = setTimeout(()=>{
            sayit(adapter.config.text_alarm);
            adapter.setState('status.burglar_alarm', true);
            adapter.setState('status.siren', true);
            adapter.setState('status.state', 'burgle');
            siren_timer = setTimeout(()=>{
                adapter.setState('status.siren', false);
            }, 1000*adapter.config.time_alarm);
        }, adapter.config.time_silent * 1000);
    }

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
    else if(id === adapter.namespace + '.use.enable' && state.val){
        enable(id, state);
        return;
    }
    else if(id === adapter.namespace + '.use.disable' && state.val){
        countdown(false);
        //disable();
        return;
    }
    else if(id === adapter.namespace + '.use.toggle'){
        if(state.val){
            enable(id, state);
            return;
        }else{
            countdown(false);
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
            sleep_begin();
            return;
        }else{
            sleep_end();
            return;
        }
    }
    else if(id === adapter.namespace + '.use.enable_with_delay' && state.val){
        countdown(true);
        return;
    }
    else if(id === adapter.namespace + '.use.toggle_with_delay'){
        if(state.val){
            countdown(true);
            return;
        }else{
            countdown(false);
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
        }else return;
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
        }else return;
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
        adapter.setState('info.log', `${L.night} ${get_name(id)}`);
        adapter.setState('info.night_circuit_changes', true);
        if(log) adapter.log.info(`${L.night} ${get_name(id)}`);
        if(night_message) messages(`${L.night} ${get_name(id)}`);
        timer_night_changes = setTimeout(()=>{
            adapter.setState('info.night_circuit_changes', false);
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

function sayit(message){
    const say = /sayit/;
    const alexa = /alexa2/;
    const tts_instance = adapter.config.sayit;
    adapter.log.debug(`speech output: ${tts_instance}`);
    if(adapter.config.sayit === 'disabled' || adapter.config.sayit === '' || adapter.config.sayit === null){
        adapter.log.debug(`Sayit disabled or empty`);
        return;
    }
    else if(message === '' || message === null){
        adapter.log.debug(`No message for sayit configured`);
        return;
    }
    else if(say.test(tts_instance)){
        adapter.log.debug(`Message for sayit instance ${tts_instance}: ${message}`);
        adapter.setForeignState(tts_instance + '.tts.text', message, (err)=>{
            if(err) adapter.log.warn(err);
        });
    }
    else if(alexa.test(tts_instance)){
        adapter.log.debug(`Message for alexa2 instance ${tts_instance}: ${message}`);
        adapter.setForeignState(tts_instance + '.speak', message, (err)=>{
            if(err) adapter.log.warn(err);
        });
    }
    else adapter.log.warn('please check your sayit configuration');
}
//##############################################################################


//################# HELPERS ####################################################

function sleep_begin() {
    adapter.setState('info.log', `${L.sleep_b}`);
    if(log) adapter.log.info(`${L.sleep_b}`);
    adapter.setState('status.sleep', true);
    check(night, (val, ids)=>{
        if(val){
            if(night_message) messages(`${L.nights_b_w} ${get_name(ids)}`);
            adapter.setState('info.log', `${L.nights_b_w} ${get_name(ids)}`);
            if(log) adapter.log.info(`${L.nights_b_w} ${get_name(ids)}`);
        }
    });
}

function sleep_end() {
    adapter.setState('info.log', `${L.sleep_e}`);
    if(log) adapter.log.info(`${L.sleep_e}`);
    adapter.setState('status.sleep', false);
}

function refreshLists(){
    let alarm_ids = false;
    let warning_ids = false;
    check(alarm, (val, ids)=>{
        adapter.log.debug(`Alarm circuit list: ${ids}`);
        if(ids.length > 0){
            alarm_ids = true;
            adapter.setState('info.alarm_circuit_list', get_name(ids));
        }else{
            adapter.setState('info.alarm_circuit_list', '');
        }
    });
    check(warning, (val, ids)=>{
        adapter.log.debug(`Warning circuit list: ${ids}`);
        if(ids.length > 0){
            warning_ids = true;
            adapter.setState('info.warning_circuit_list', get_name(ids));
        }else{
            adapter.setState('info.warning_circuit_list', '');
        }
    });
    check(night, (val, ids)=>{
        adapter.log.debug(`Sleep circuit list: ${ids}`);
        if(ids.length > 0){
            adapter.setState('info.sleep_circuit_list', get_name(ids));
        }else{
            adapter.setState('info.sleep_circuit_list', '');
        }
    });
    if(alarm_ids){
        adapter.setState('status.enableable', false);
        return;
    } else if (!with_warnigs && warning_ids) {
        adapter.setState('status.enableable', false);
    }else {
        adapter.setState('status.enableable', true);
    }
}

function checkPassword(pass, id) {
    if(log && adapter.config.password == !pass) adapter.log.info(`${L.pass}`);
    if(adapter.config.password === pass){
        adapter.log.debug(`Password accept`);
        adapter.setState('info.wrong_password', false, (err)=>{
            if(err)adapter.log.error(err);
            adapter.setState(id, '');
        });
        return true;
    }
    else{
        adapter.log.debug(`Password denied`);
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
            if(err || state.val == null)reject(err);
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
        shorts.forEach((ele) => {
            if(ele.enabled && ele.select_id == id && /true/.test(ele.trigger_val) === val){
                adapter.setForeignState(ele.name_id, bools(ele.value), (err)=>{
                    if(err) adapter.log.warn(`Cannot set state: ${err}`);
                });
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
