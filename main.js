'use strict';

/*
 * Created with @iobroker/create-adapter v1.16.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');

// Load your modules here, e.g.:
// const fs = require("fs");
let adapter;
let clean_ids = [];
let alarm = [],
    warning = [],
    night = [],
    send_instances = [],
    states = {};

let activated = false,
    send_available = false,
    night_rest = false;

let timer = null;

let log,
    alarm_message,
    night_message,
    warning_message;


class Alarm extends utils.Adapter {

    /**
     * @param {Partial<ioBroker.AdapterOptions>} [options={}]
     */
    constructor(options) {
        super({
            ...options,
            name: 'alarm',
        });
        this.on('ready', this.onReady.bind(this));
        this.on('objectChange', this.onObjectChange.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        // this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        // Initialize your adapter here
        adapter = this;
         main();
        /*
        For every state in the system there has to be also an object of type state
        Here a simple template for a boolean variable named "testVariable"
        Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
        */

    }

    /**
     * Is called when  shuts down - callback has to be called under any circumstances!
     * @param {() => void} callback
     */
    onUnload(callback) {
        try {
            this.log.info('cleaned everything up...');
            schedule_from.cancel();
            schedule_to.cancel();
            callback();
        } catch (e) {
            callback();
        }
    }

    /**
     * Is called if a subscribed object changes
     * @param {string} id
     * @param {ioBroker.Object | null | undefined} obj
     */
    onObjectChange(id, obj) {
        if (obj) {
            // The object was changed
            this.log.debug(`object ${id} changed: ${JSON.stringify(obj)}`);
        } else {
            // The object was deleted
            this.log.debug(`object ${id} deleted`);
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
            this.log.debug(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
        } else {
            // The state was deleted
            this.log.debug(`state ${id} deleted`);
        }
    }

    // /**
    //  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
    //  * Using this method requires "common.message" property to be set to true in io-package.json
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

}

function main() {
  log = this.config.opt_log;
  alarm_message = this.config.send_alarm;
  night_message = this.config.send_night;
  warning_message = this.config.send_warning;
  this.getState('status.activated', (err, state)=>{
    if(err){
      this.log.error(err);
      this.setState('info.connection', false);
      return;
    }else activated = state.val;
  });
  this.getState('status.sleep', (err, state)=>{
    if(err){
      this.log.error(err);
      this.setState('info.connection', false);
      return;
    }else night_rest = state.val;
  });
  alarm = split_arr(this.config.alarm);
  warning = split_arr(this.config.warning);
  night = split_arr(this.config.night);
  send_instances = split_arr(this.config.sendTo);
  get_ids();
  get_states();
  setTimeout(set_subs, 2000);
  set_schedules();
  //this.setState('status.activated', false);


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
  })
  check(warning, (val, ids)=>{
      is_alarm = val;
      ids_alarm = ids;
  });
  if(is_alarm){
    if(log)this.log.info(`Cannot activate the alarm system, please check: ${JSON.stringify(ids_alarm)}`);
    this.setState('status.activation_failed', true);
    return;
  }
  if(!this.config.opt_warning && is_warning){
    if(log)this.log.info(`Cannot activate the alarm system, please check: ${JSON.stringify(ids_warning)}`);
    this.setState('status.activation_failed', true);
    return;
  }
  if(log)this.log.info('Alarm system is activated')
  this.setState('status.activated', true);
  this.setState('status.deactivated', false);
  this.setState('status.activation_failed', false);
  if(warning.includes(id)){
    this.setState('status.activated_with_warnings', true);
    if(log)this.log.info(`Alarm system activated with warnings: ${id}`);
    if(warning_message) messages(`Alarm system activated with warnings: ${id}`);
  }
}
//##############################################################################

//################# DISABLE ####################################################

function disable(){
  if(timer){
    clearInterval(timer)
    timer = null;
    this.setState('status.activation_countdown', null);
  }
  if(activated){
    if(log)this.log.info('Alarm system is deactivated')
    this.setState('status.siren', false);
    this.setState('status.activated', false);
    this.setState('status.deactivated', true);
    this.setState('status.activated_with_warnings', false);
    this.setState('status.activation_failed', false);
    this.setState('status.siren', false);
    this.setState('status.burglar_alarm', false);
    this.setState('status.activation_failed', false);
  }else{
    this.setState('status.activation_failed', false);
  }
}
//##############################################################################

//################# CHANGES ####################################################

function change(id, state){
  for(let i in states){
    if(i === id){
    states[id] = state.val;
    this.log.debug(`Inside state change: ${id} val: ${state.val}`);
    }
  }
  if(id === this.namespace + '.status.activated'){
    activated = state.val;
    return;
  }
  else if(id === this.namespace + '.status.sleep'){
    night_rest = state.val;
    return;
  }
  else if(id === this.namespace + '.use.enable' && state.val){
    enable(id, state);
    return;
  }
  else if(id === this.namespace + '.use.disable' && state.val){
    countdown(false);
    disable();
    return;
  }
  else if(id === this.namespace + '.use.toggle'){
    if(state.val){
      enable(id, state);
      return;
    }else{
      countdown(false);
      disable();
      return;
    }
  }
  else if(id === this.namespace + '.use.enable_with_delay' && state.val){
    countdown(true);
    return;
  }
  else if(id === this.namespace + '.use.toggle_with_delay'){
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
    if(log)this.log.info(`Alarm system signalled burgle in: ${id}`);
    if(alarm_message) messages(`Alarm system signalled burgle in: ${id}`);
    this.setState('status.burglar_alarm', true);
    this.setState('status.siren', true);
    setTimeout(()=>{
      this.setState('status.siren', false);
    }, 1000*this.config.time_alarm);
    return;
  }
  if(warning.includes(id) && activated){
    if(log)this.log.info(`Alarm system signalled warning--> motion in: ${id}`);
    if(warning_message) messages(`Alarm system signalled warning--> motion in: ${id}`);
    return;
  }
  if(night.includes(id) && night_rest){
    if(log)this.log.info(`Alarm system signalled changes while night rest is active: ${id}`);
    if(night_message) messages(`Alarm system signalled changes while night rest is active: ${id}`);
    return;
  }
}
//##############################################################################

//################# SUBSCRIBTIONS ##############################################

function set_subs(){
  clean_ids.forEach((ele)=>{
    if(ele){
      this.log.debug(`SUBSCRIBTION for: ${ele}`)
      this.subscribeForeignStates(ele);
    }else{
      this.log.debug(`NO SUBSCRIBTION`)
    }
  });
  this.subscribeStates('use.*');
  this.subscribeStates('status.activated');
}
//##############################################################################

//################# MESSAGES ###################################################

function messages(content){
  if(send_instances.length){
      send_instances.forEach((ele)=>{
        this.log.debug(`Send message to ${ele}, message: ${content}`);
        sendTo(ele, content);
      });
  }
}

//##############################################################################


//################# HELPERS ####################################################

function split_arr(str){
  const temp_arr = str.split(/[,;\s]+/);
  let clean_arr = [];
  temp_arr.forEach((ele)=>{
    if(ele)clean_arr.push(ele.trim())
  })
  return clean_arr;
}

function get_ids(){
  let ids = [];
  ids = ids.concat(alarm, warning, night);
  clean_ids = Array.from(new Set(ids));
}

function check(arr, callback){
  let temp_arr = [];
  if(arr.length > 0){
    arr.forEach((ele)=>{
      if(states[ele]){
        temp_arr.push(ele);
      }
    });
    if(temp_arr.length>0){
      callback(true, temp_arr);
    }
  }
}

function get_state_async(id){
  return new Promise((resolve, reject)=>{
    this.getForeignState(id,(err, state)=>{
      if(err)reject(err)
      else resolve(state.val)
    })
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
  this.log.debug(JSON.stringify(states));
}

function countdown(action){
  let counter = this.config.time_activate;
  if(action && !timer){
    timer = setInterval(()=>{
      if(counter > 0){
        counter--;
        this.setState('status.gets_activated', true);
        this.setState('status.activation_countdown', counter);
      }else{
        clearInterval(timer)
        timer = null;
        this.setState('status.activation_countdown', counter);
        this.setState('status.gets_activated', false);
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
  if(this.config.night_from && this.config.night_to){
    let from, to;
    try{
      from = this.config.night_from.split(':');
      to = this.config.night_to.split(':');
    }catch(e){
      this.log.warn(`Cannot read night rest time: ${e}`);
      return;
    }
    const schedule_from = schedule.scheduleJob({hour: parseInt(from[0]), minute: parseInt(from[1])}, ()=>{
      if(log)this.log.info('Sleep begins');
      this.setState('status.sleep', true);
      check(night, (val, ids)=>{
        if(val){
          if(night_message) messages(`Night rest begins with warnings: ${JSON.stringify(ids)}`);
          if(log)this.log.info(`Night rest begins with warnings: ${JSON.stringify(ids)}`)
        }
      })
    });
    const schedule_to = schedule.scheduleJob({hour: parseInt(to[0]), minute: parseInt(to[1])}, ()=>{
      if(log)this.log.info('Sleep ends');
      this.setState('status.sleep', false);
    });
  }else{
    this.log.debug('No night rest configured')
  }
}
//##############################################################################

// @ts-ignore parent is a valid property on module
if (module.parent) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<ioBroker.thisOptions>} [options={}]
     */
    module.exports = (options) => new Alarm(options);
} else {
    // otherwise start the instance directly
    new Alarm();
}
