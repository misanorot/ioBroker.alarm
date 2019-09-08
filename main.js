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

let activated = false,
    night_rest = false;

let timer = null;

let log,
    alarm_message,
    night_message,
    warning_message;

let schedule_from,
    schedule_to;
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
    alarm_message = adapter.config.send_alarm;
    night_message = adapter.config.send_night;
    warning_message = adapter.config.send_warning;
    adapter.getState('status.activated', (err, state)=>{
        if(err){
            adapter.log.error(err);
            adapter.setState('info.connection', false);
            return;
        }else{
      	    if(state === null){
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
            if(state === null){
                night_rest = false;
                adapter.setState('status.sleep', false);
            }else night_rest = state.val;
        }
    });
    if(adapter.config.events)split_states(adapter.config.events);
    else adapter.log.info('no states configured!');
    send_instances = split_arr(adapter.config.sendTo);
    adapter.log.debug(`Messages to: ${JSON.stringify(send_instances)}`);
    get_ids();
    get_states();
    setTimeout(set_subs, 2000);
    set_schedules();
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
        is_alarm = val;
        ids_alarm = ids;
    });
    if(is_alarm){
        if(log)adapter.log.info(`${L.act_not} ${get_name(ids_alarm)}`);
        adapter.setState('status.activation_failed', true);
        return;
    }
    if(!adapter.config.opt_warning && is_warning){
        if(log)adapter.log.info(`${L.act_not} ${get_name(ids_warning)}`);
        adapter.setState('status.activation_failed', true);
        return;
    }
    if(log)adapter.log.info(`${L.act}`);
    adapter.setState('status.activated', true);
    adapter.setState('status.deactivated', false);
    adapter.setState('status.activation_failed', false);
    if(warning.includes(id)){
        adapter.setState('status.activated_with_warnings', true);
        if(log)adapter.log.info(`${L.act_warn} ${get_name(id)}`);
        if(warning_message) messages(`${L.act_warn} ${get_name(id)}`);
    }
}
//##############################################################################

//################# DISABLE ####################################################

function disable(){
    if(timer){
        clearInterval(timer);
        timer = null;
        adapter.setState('status.activation_countdown', null);
    }
    if(activated){
        if(log)adapter.log.info(`${L + 'deact'}`);
        adapter.setState('status.siren', false);
        adapter.setState('status.activated', false);
        adapter.setState('status.deactivated', true);
        adapter.setState('status.activated_with_warnings', false);
        adapter.setState('status.activation_failed', false);
        adapter.setState('status.siren', false);
        adapter.setState('status.burglar_alarm', false);
        adapter.setState('status.activation_failed', false);
    }else{
        adapter.setState('status.activation_failed', false);
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
            adapter.log.debug(`Inside state change: ${id} val: ${state.val}`);
        }
    }
    if(is_not_change) return;
    else if(id === adapter.namespace + '.status.activated'){
        activated = state.val;
        return;
    }
    else if(id === adapter.namespace + '.status.sleep'){
        night_rest = state.val;
        return;
    }
    else if(id === adapter.namespace + '.use.enable' && state.val){
        enable(id, state);
        return;
    }
    else if(id === adapter.namespace + '.use.disable' && state.val){
        countdown(false);
        disable();
        return;
    }
    else if(id === adapter.namespace + '.use.toggle'){
        if(state.val){
            enable(id, state);
            return;
        }else{
            countdown(false);
            disable();
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
            disable();
            return;
        }
    }
    if(alarm.includes(id) && activated){
        if(log)adapter.log.info(`${L.burgle} ${get_name(id)}`);
        if(alarm_message) messages(`${L.burgle} ${get_name(id)}`);
        adapter.setState('status.burglar_alarm', true);
        adapter.setState('status.siren', true);
        setTimeout(()=>{
            adapter.setState('status.siren', false);
        }, 1000*adapter.config.time_alarm);
        return;
    }
    if(warning.includes(id) && activated){
        if(log)adapter.log.info(`${L.warn} ${get_name(id)}`);
        if(warning_message) messages(`${L.warn} ${get_name(id)}`);
        return;
    }
    if(night.includes(id) && night_rest){
        if(log)adapter.log.info(`${L.night} ${get_name(id)}`);
        if(night_message) messages(`${L.night} ${get_name(id)}`);
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
    adapter.subscribeStates('use.*');
    adapter.subscribeStates('status.activated');
    adapter.subscribeStates('status.sleep');
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

//##############################################################################


//################# HELPERS ####################################################

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
    const temp = adapter.config.events.findIndex((obj)=>{
        const reg = new RegExp(id);
        return reg.test(obj.name_id);
    });
    return adapter.config.events[temp].negativ;
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
        }
    }
}

function get_name(ids, callback){
    const name =[];
    if(Array.isArray(ids)){
        ids.forEach((id)=>{
            const temp = adapter.config.events.findIndex((obj)=>{
                const reg = new RegExp(id);
                return reg.test(obj.name_id);
            });
            name.push(adapter.config.events[temp].name) ;
        });
        return name.join();
    }else{
        const temp = adapter.config.events.findIndex((obj)=>{
            const reg = new RegExp(ids);
            return reg.test(obj.name_id);
        });
        return adapter.config.events[temp].name;
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
        disable();
    }
}

//##############################################################################

//################# SCHEDULES ####################################################

function set_schedules(){
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
            if(log)adapter.log.info(`${L.sleep_b}`);
            adapter.setState('status.sleep', true);
            check(night, (val, ids)=>{
                if(val){
                    if(night_message) messages(`${L.nights_b_w} ${get_name(ids)}`);
                    if(log)adapter.log.info(`${L.nights_b_w} ${get_name(ids)}`);
                }
            });
        });
        schedule_to = schedule.scheduleJob({hour: parseInt(to[0]), minute: parseInt(to[1])}, ()=>{
            if(log)adapter.log.info(`${L.sleep_e}`);
            adapter.setState('status.sleep', false);
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
