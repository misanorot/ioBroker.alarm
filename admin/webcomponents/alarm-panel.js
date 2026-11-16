import{createRoot as e,useEffect as t,useRef as n,useState as r,Fragment as i,jsx as a,jsxs as o}from"../../../lib/esm/react-19.js";var s=[`header`,`staticText`,`divider`];function c(e,t){return e==null?``:typeof e==`object`?e[t]||e.en||Object.values(e).find(e=>!!e)||``:String(e)}function l(e){let t={};for(let[n,r]of Object.entries(e.items||{}))r&&!s.includes(r.type)&&(t[n]=r.type);return t}function u(e){return typeof e==`string`?e:typeof e==`number`||typeof e==`boolean`?e.toString():JSON.stringify(e)}function d(e,t){if(t!=null)switch(e){case`number`:case`slider`:{if(typeof t==`number`)return Number.isFinite(t)?t:void 0;let e=u(t).trim().replace(`,`,`.`);if(!e)return;let n=Number(e);return Number.isFinite(n)?n:void 0}case`checkbox`:return t===!0||t===`true`||t===1||t===`1`;default:return u(t)}}function f(e,t){let n={};for(let[r,i]of Object.entries(e)){let e=d(i,t[r]);e!==void 0&&(n[r]=e)}return n}var p=`iob-dialog-close`;function m(e){return!!e.form}var h=`"Roboto", "Helvetica", "Arial", sans-serif`,g=Object.freeze({type:`light`,primary:`#3399CC`,primaryContrast:`#FFFFFF`,secondary:`#164477`,secondaryContrast:`#FFFFFF`,background:`#FFFFFF`,paper:`#FFFFFF`,text:`rgba(0, 0, 0, 0.87)`,textSecondary:`rgba(0, 0, 0, 0.6)`,divider:`rgba(0, 0, 0, 0.12)`,error:`#D32F2F`,warning:`#ED6C02`,info:`#0288D1`,success:`#2E7D32`,fontFamily:h,fontSize:14,borderRadius:4}),_=Object.freeze({type:`dark`,primary:`#4DABF5`,primaryContrast:`rgba(0, 0, 0, 0.87)`,secondary:`#436A93`,secondaryContrast:`#FFFFFF`,background:`#121212`,paper:`#121212`,text:`#FFFFFF`,textSecondary:`rgba(255, 255, 255, 0.7)`,divider:`rgba(255, 255, 255, 0.12)`,error:`#F44336`,warning:`#FFA726`,info:`#29B6F6`,success:`#66BB6A`,fontFamily:h,fontSize:14,borderRadius:4}),v=[`primary`,`primaryContrast`,`secondary`,`secondaryContrast`,`background`,`paper`,`text`,`textSecondary`,`divider`,`error`,`warning`,`info`,`success`,`fontFamily`],y=[`fontSize`,`borderRadius`];function b(e){return{...e===`dark`?_:g}}function x(e){if(!e||typeof e!=`object`)return b(typeof e==`string`?e:`light`);let t=e,n=b(typeof t.type==`string`?t.type:`light`);for(let e of v){let r=t[e];typeof r==`string`&&r.trim()&&(n[e]=r.trim())}for(let e of y){let r=t[e],i=typeof r==`string`?parseFloat(r):r;typeof i==`number`&&Number.isFinite(i)&&i>=0&&(n[e]=i)}return n}function ee(e,t){return e.type===t.type&&v.every(n=>e[n]===t[n])&&y.every(n=>e[n]===t[n])}function S(e){return`--iob-${e.replace(/[A-Z]/g,e=>`-${e.toLowerCase()}`)}`}function C(e){let t={};for(let n of v)t[S(n)]=e[n];for(let n of y)t[S(n)]=`${e[n]}px`;return t[`color-scheme`]=e.type,t}var w={ok:{en:`OK`,"zh-cn":`确定`},cancel:{en:`Cancel`,de:`Abbrechen`,ru:`Отмена`,pt:`Cancelar`,nl:`Annuleren`,fr:`Annuler`,it:`Annulla`,es:`Cancelar`,pl:`Anuluj`,uk:`Скасувати`,"zh-cn":`取消`},close:{en:`Close`,de:`Schließen`,ru:`Закрыть`,pt:`Fechar`,nl:`Sluiten`,fr:`Fermer`,it:`Chiudi`,es:`Cerrar`,pl:`Zamknij`,uk:`Закрити`,"zh-cn":`关闭`}},te=`
dialog {
    box-sizing: border-box;
    width: 480px;
    max-width: calc(100vw - 32px);
    max-height: calc(100vh - 32px);
    padding: 0;
    border: 0;
    border-radius: calc(var(--iob-border-radius) * 2);
    background: var(--iob-paper);
    color: var(--iob-text);
    font-family: var(--iob-font-family);
    font-size: var(--iob-font-size);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}
/* as the dialogs of MUI: a dark paper gets lighter the higher it lies */
dialog.dark { background-image: linear-gradient(rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.16)); }
dialog::backdrop { background: rgba(0, 0, 0, 0.5); }
dialog:focus { outline: none; }
form { display: flex; flex-direction: column; height: 100%; max-height: inherit; margin: 0; }
header { display: flex; align-items: center; gap: 8px; padding: 12px 8px 12px 16px; font-size: 1.15em; font-weight: 500; }
header span { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.body { flex: 1; min-height: 0; padding: 0 16px 16px; overflow: auto; display: flex; flex-direction: column; gap: 12px; }
footer { display: flex; justify-content: flex-end; gap: 8px; padding: 0 16px 16px; }
button { font: inherit; padding: 6px 16px; border-radius: var(--iob-border-radius); border: 1px solid var(--iob-primary); background: transparent; color: var(--iob-primary); cursor: pointer; }
button.primary { background: var(--iob-primary); color: var(--iob-primary-contrast); }
button.close { border: 0; padding: 2px 8px; font-size: 1.4em; line-height: 1; color: var(--iob-text-secondary); }
label { display: flex; flex-direction: column; gap: 4px; }
label.check { flex-direction: row; align-items: center; gap: 8px; }
input, select, textarea { font: inherit; accent-color: var(--iob-primary); }
.help { color: var(--iob-text-secondary); font-size: 0.85em; }
h3 { margin: 4px 0 0; font-size: 1em; }
p { margin: 0; }
hr { width: 100%; border: 0; border-top: 1px solid var(--iob-divider); margin: 0; }
[hidden] { display: none !important; }
`;function T(e){if(!e)return null;try{let t=Function(`data`,`return (${e});`);return e=>{try{return!!t(e)}catch{return!1}}}catch{return null}}function E(e){return typeof e==`string`?e:typeof e==`number`||typeof e==`boolean`?String(e):``}function ne(e){let{input:t,setting:n}=e;if(t)return t instanceof HTMLInputElement&&t.type===`checkbox`?t.checked:t instanceof HTMLSelectElement?n.options?.[t.selectedIndex]?.value:t.value}function re(e,t,n,r,i){let a={name:t,setting:n,box:e.createElement(`div`),hidden:T(n.hidden),disabled:T(n.disabled)},o=c(n.label,i);switch(n.type){case`header`:return a.box=e.createElement(`h3`),a.box.textContent=c(n.text,i)||o,a;case`staticText`:return a.box=e.createElement(`p`),a.box.textContent=c(n.text,i)||o,a;case`divider`:return a.box=e.createElement(`hr`),a}let s=e.createElement(`label`);a.box=s;let l=e.createElement(`span`);if(l.textContent=o||t,n.type===`checkbox`){let t=e.createElement(`input`);t.type=`checkbox`,t.checked=r===!0||r===`true`,s.className=`check`,s.append(t,l),a.input=t}else if(n.type===`select`){let t=e.createElement(`select`);for(let r of n.options||[]){let n=e.createElement(`option`);n.textContent=c(r.label,i),t.append(n)}let o=(n.options||[]).findIndex(e=>String(e.value)===E(r));t.selectedIndex=o===-1?0:o,s.append(l,t),a.input=t}else if(n.type===`text`&&(n.minRows||1)>1){let t=e.createElement(`textarea`);t.rows=n.minRows||2,t.value=E(r),s.append(l,t),a.input=t}else{let t=e.createElement(`input`),i=E(r);switch(n.type){case`number`:case`slider`:t.type=n.type===`slider`?`range`:`number`,n.min!==void 0&&(t.min=String(n.min)),n.max!==void 0&&(t.max=String(n.max)),t.step=n.step===void 0?`any`:String(n.step);break;case`password`:t.type=`password`;break;case`color`:t.type=!i||/^#[0-9a-f]{6}$/i.test(i)?`color`:`text`;break;default:t.type=`text`}if(t.value=i,t.type===`range`){let n=e.createElement(`output`);n.textContent=t.value,t.addEventListener(`input`,()=>n.textContent=t.value),l.append(`: `,n)}s.append(l,t),a.input=t}if(n.help){let t=e.createElement(`span`);t.className=`help`,t.textContent=c(n.help,i),s.append(t)}return a}function ie(e,t={}){let n=t.lang||`en`,r=document,i=e=>w[e][n]||w[e].en||e,a=r.createElement(`div`);a.setAttribute(`data-iob-dialog`,``);let o=a.attachShadow({mode:`open`}),s=r.createElement(`style`);s.textContent=te;let u=r.createElement(`dialog`),d=x(t.theme);u.className=d.type===`dark`?`dark`:``;for(let[e,t]of Object.entries(C(d)))u.style.setProperty(e,t);e.width&&(u.style.width=`${e.width}px`),e.height&&(u.style.height=`${e.height}px`);let h=r.createElement(`form`),g=r.createElement(`header`),_=r.createElement(`span`);_.textContent=c(e.title,n);let v=r.createElement(`button`);v.type=`button`,v.className=`close`,v.title=i(`close`),v.setAttribute(`aria-label`,i(`close`)),v.textContent=`×`,g.append(_,v);let y=r.createElement(`div`);return y.className=`body`,h.append(g,y),u.append(h),o.append(s,u),new Promise(t=>{let s=!1,d=e=>{s||(s=!0,u.open&&u.close(),a.remove(),t(e))};if(v.addEventListener(`click`,()=>d(null)),u.addEventListener(`close`,()=>d(null)),h.addEventListener(`submit`,e=>e.preventDefault()),m(e)){let t={},a=[];for(let[t,i]of Object.entries(e.form.items||{})){let o=e.data?.[t]??i.default,s=re(r,t,i,o,n);a.push(s),y.append(s.box)}let o=()=>{for(let e of a)e.input&&(t[e.name]=ne(e));return t},s=()=>{let e=o();for(let t of a)t.box.hidden=t.hidden?t.hidden(e):!1,t.input&&(t.input.disabled=t.disabled?t.disabled(e):!1)};h.addEventListener(`input`,s),h.addEventListener(`change`,s),s();let u=a.find(e=>e.input&&!e.box.hidden&&!e.input.disabled);u?.input&&(u.input.autofocus=!0);let p=r.createElement(`footer`),m=r.createElement(`button`);m.type=`button`,m.textContent=c(e.cancel,n)||i(`cancel`),m.addEventListener(`click`,()=>d(null));let g=r.createElement(`button`);g.type=`submit`,g.className=`primary`,g.textContent=c(e.ok,n)||i(`ok`),p.append(m,g),h.append(p),h.addEventListener(`submit`,()=>d(f(l(e.form),o())))}else y.append(e.element),u.addEventListener(p,e=>d(e.detail??null));r.body.append(a),u.showModal(),o.activeElement&&o.activeElement!==v||(u.tabIndex=-1,u.focus())})}function D(e){return[...new Set(e.filter(e=>typeof e==`string`&&!!e))]}var ae=[`socket`,`dialogs`,`theme`,`editMode`,`settings`,`value`],O=class extends HTMLElement{states={};objects={};#e=null;#t={};#n=x(`light`);#r=!1;#i=null;#a=void 0;#o=null;#s=!1;#c=(e,t)=>{this.#o?.states.includes(e)&&(this.states[e]=t||null,this.#_())};#l=(e,t)=>{this.#o?.objects.includes(e)&&(this.objects[e]=t||null,this.#d())};get socket(){return this.#e}set socket(e){this.#e=e||null,this.#d()}get settings(){return this.#t}set settings(e){this.#t=e||{},this.#d()}get theme(){return this.#n}set theme(e){let t=x(e);ee(t,this.#n)||(this.#n=t,this.#u(),this.#_())}get editMode(){return this.#r}set editMode(e){let t=!!e;t!==this.#r&&(this.#r=t,this.#_())}get dialogs(){return this.#i}set dialogs(e){this.#i=e||null}get value(){return this.#a}set value(e){e!==this.#a&&(this.#a=e,this.#_())}connectedCallback(){for(let e of ae)if(Object.prototype.hasOwnProperty.call(this,e)){let t=this[e];delete this[e],this[e]=t}this.#u(),this.#d()}disconnectedCallback(){this.#g()}getStateIds(e){return[]}getObjectIds(e){return[]}get systemLang(){return this.#e?.systemLang||`en`}text(e){return c(e,this.systemLang)}setState(e,t){return this.#e&&!this.#r?this.#e.setState(e,t):Promise.resolve()}changeValue(e){return this.#r||this.emit(`iob-change`,e)?!1:(this.value=e,!0)}emit(e,t){return this.dispatchEvent(new CustomEvent(e,{detail:t,bubbles:!0,composed:!0,cancelable:!0}))}async openDialog(e){if(this.#r)return null;let t=this.#i?await this.#i.open(e):await ie(e,{lang:this.systemLang,theme:this.#n});return m(e)?t&&typeof t==`object`?f(l(e.form),t):null:t??null}#u(){for(let[e,t]of Object.entries(C(this.#n)))this.style.setProperty(e,t)}#d(){if(!this.isConnected)return;let e=this.#e,t=e?D(this.getStateIds(this.#t)):[],n=e?D(this.getObjectIds(this.#t)):[];this.#o&&this.#o.socket!==e&&this.#g();let r=this.#o?.states||[],i=this.#o?.objects||[],a=r.filter(e=>!t.includes(e)),o=i.filter(e=>!n.includes(e)),s=t.filter(e=>!r.includes(e)),c=n.filter(e=>!i.includes(e));e&&a.length&&e.unsubscribeState(a,this.#c),e&&o.length&&this.#h(e,o);for(let e of a)delete this.states[e];for(let e of[...a,...o])!t.includes(e)&&!n.includes(e)&&delete this.objects[e];this.#o=e&&(t.length||n.length)?{socket:e,states:t,objects:n}:null,e&&s.length&&this.#p(e,s),e&&c.length&&this.#m(e,c),this.#_()}#f(e,t,n){return this.#o?.socket===e&&this.#o[t].includes(n)}#p(e,t){e.subscribeState(t,this.#c).catch(e=>console.warn(`<${this.localName}>: cannot subscribe ${t.join(`, `)}: ${e}`));for(let n of t)e.getState(n).then(t=>{this.#f(e,`states`,n)&&this.states[n]===void 0&&(this.states[n]=t||null,this.#_())}).catch(()=>{}),e.getObject(n).then(t=>{this.#f(e,`states`,n)&&!this.#f(e,`objects`,n)&&(this.objects[n]=t||null,this.#_())}).catch(()=>{})}#m(e,t){e.subscribeObject(t,this.#l).catch(e=>console.warn(`<${this.localName}>: cannot subscribe the objects ${t.join(`, `)}: ${e}`));for(let n of t)e.getObject(n).then(t=>{this.#f(e,`objects`,n)&&(this.objects[n]=t||null,this.#d())}).catch(()=>{})}#h(e,t){e.unsubscribeObject(t,this.#l).catch(()=>{})}#g(){if(this.#o){let{socket:e,states:t,objects:n}=this.#o;t.length&&e.unsubscribeState(t,this.#c),n.length&&this.#h(e,n),this.#o=null}this.states={},this.objects={}}#_(){this.#s||(this.#s=!0,queueMicrotask(()=>{this.#s=!1,this.isConnected&&this.render()}))}};function oe(e,t){let n=typeof e==`string`?e:e.tag;customElements.get(n)||customElements.define(n,t)}var k=/* @__PURE__ */ function(e){return e[e.deactivated=0]=`deactivated`,e[e.sharp=1]=`sharp`,e[e.sharpInside=2]=`sharpInside`,e[e.burglary=3]=`burglary`,e[e.nightRest=4]=`nightRest`,e[e.getsActivated=5]=`getsActivated`,e[e.activationFailed=6]=`activationFailed`,e[e.activationAborted=7]=`activationAborted`,e[e.silentAlarm=8]=`silentAlarm`,e}({}),se=/* @__PURE__ */ function(e){return e[e.off=0]=`off`,e[e.arm=1]=`arm`,e[e.inside=2]=`inside`,e[e.armWithDelay=3]=`armWithDelay`,e[e.night=4]=`night`,e}({}),ce=[`off`,`arm`,`inside`,`night`],le={off:0,arm:1,inside:2,night:4},A={stateList:`status.state_list`,activated:`status.activated`,sharpInsideActivated:`status.sharp_inside_activated`,sleep:`status.sleep`,burglarAlarm:`status.burglar_alarm`,silentAlarm:`status.silent_alarm`,siren:`status.siren`,sirenInside:`status.siren_inside`,activationFailed:`status.activation_failed`,activatedWithWarnings:`status.activated_with_warnings`,armable:`status.enableable`,countdown:`status.activation_countdown`,silentCountdown:`status.silent_countdown`,useList:`use.list`,panic:`use.panic`,quitChanges:`use.quit_changes`,disableWithPassword:`use.disable_password`,toggleWithPassword:`use.toggle_password`,toggleWithDelayAndPassword:`use.toggle_with_delay_and_password`,presence:`presence.on_off`,wrongPassword:`info.wrong_password`,alarmCircuits:`info.alarm_circuit_list`,insideCircuits:`info.sharp_inside_circuit_list`,notificationCircuits:`info.notification_circuit_list`,notificationChanges:`info.notification_circuit_changes`,log:`info.log_today`},j=[{switchId:`zone.one_on_off`,changedId:`zone.one`,configKey:`zone_one`},{switchId:`zone.two_on_off`,changedId:`zone.two`,configKey:`zone_two`},{switchId:`zone.three_on_off`,changedId:`zone.three`,configKey:`zone_three`}],M=[{changedId:`other_alarms.one_changes`,listId:`other_alarms.one_list`,configKey:`one`,nameKey:`one_name`},{changedId:`other_alarms.two_changes`,listId:`other_alarms.two_list`,configKey:`two`,nameKey:`two_name`}],N=[...Object.values(A),...j.map(e=>e.switchId),...j.map(e=>e.changedId),...M.map(e=>e.changedId),...M.map(e=>e.listId)],P=[A.stateList,A.countdown,A.silentCountdown,A.useList,A.burglarAlarm,A.silentAlarm,A.armable];function F(e){switch(e){case 0:return`alarm_state_deactivated`;case 1:return`alarm_state_sharp`;case 2:return`alarm_state_sharp_inside`;case 3:return`alarm_state_burglary`;case 4:return`alarm_state_night_rest`;case 5:return`alarm_state_gets_activated`;case 6:return`alarm_state_activation_failed`;case 7:return`alarm_state_activation_aborted`;case 8:return`alarm_state_silent_alarm`;default:return`alarm_state_unknown`}}function ue(e){switch(e){case 0:return`off`;case 1:return`arm`;case 2:return`inside`;case 4:return`night`;default:return null}}var I=`iob-alarm-panel`;function L(e){let t=e?.trim().match(/^(?:(?:system\.adapter\.)?alarm\.)?(\d+)$/);return t?`alarm.${t[1]}`:null}function R(e){return e===`status`||e===`panel`?e:`auto`}function z(e){let t={en:{alarm_title:`Alarm system`,alarm_circuits:`Circuits`,alarm_details:`Details`,alarm_mode_off:`Off`,alarm_mode_arm:`Armed`,alarm_mode_inside:`Inside`,alarm_mode_night:`Night`,alarm_with_delay:`With delay`,alarm_zone:`Zone %s`,alarm_on:`on`,alarm_off:`off`,alarm_seconds:`%s s`,alarm_state_deactivated:`Deactivated`,alarm_state_sharp:`Armed`,alarm_state_sharp_inside:`Armed inside`,alarm_state_burglary:`Burglary`,alarm_state_night_rest:`Night rest`,alarm_state_gets_activated:`Arming`,alarm_state_activation_failed:`Arming failed`,alarm_state_activation_aborted:`Arming aborted`,alarm_state_silent_alarm:`Silent alarm`,alarm_state_unknown:`Unknown`,alarm_ready:`Ready to arm`,alarm_not_armable:`Not ready to arm`,alarm_burglary:`Burglary`,alarm_silent_alarm:`Silent alarm`,alarm_siren:`Siren`,alarm_failed:`Arming failed`,alarm_with_warnings:`Armed with warnings`,alarm_notification_changes:`Changes in the notification circuit`,alarm_presence:`Presence simulation`,alarm_panic:`Panic`,alarm_acknowledge:`Acknowledge`,alarm_circuits_alarm:`Alarm circuit`,alarm_circuits_inside:`Inside circuit`,alarm_circuits_notification:`Notification circuit`,alarm_circuits_empty:`Everything closed`,alarm_other_alarm:`Other alarm %s`,alarm_password_title:`Disarm`,alarm_password:`Password`,alarm_password_wrong:`Wrong password`,alarm_cancel:`Cancel`,alarm_ok:`OK`,alarm_no_instance:`No alarm instance selected`},de:{alarm_title:`Alarmanlage`,alarm_circuits:`Meldekreise`,alarm_details:`Details`,alarm_mode_off:`Aus`,alarm_mode_arm:`Scharf`,alarm_mode_inside:`Innen`,alarm_mode_night:`Nacht`,alarm_with_delay:`Mit Verzögerung`,alarm_zone:`Zone %s`,alarm_on:`an`,alarm_off:`aus`,alarm_seconds:`%s s`,alarm_state_deactivated:`Deaktiviert`,alarm_state_sharp:`Scharf`,alarm_state_sharp_inside:`Innen scharf`,alarm_state_burglary:`Einbruch`,alarm_state_night_rest:`Nachtruhe`,alarm_state_gets_activated:`Wird aktiviert`,alarm_state_activation_failed:`Aktivierung fehlgeschlagen`,alarm_state_activation_aborted:`Aktivierung abgebrochen`,alarm_state_silent_alarm:`Stiller Alarm`,alarm_state_unknown:`Unbekannt`,alarm_ready:`Scharfschaltbereit`,alarm_not_armable:`Nicht scharfschaltbereit`,alarm_burglary:`Einbruch`,alarm_silent_alarm:`Stiller Alarm`,alarm_siren:`Sirene`,alarm_failed:`Aktivierung fehlgeschlagen`,alarm_with_warnings:`Scharf mit Warnungen`,alarm_notification_changes:`Änderungen im Hinweiskreis`,alarm_presence:`Anwesenheitssimulation`,alarm_panic:`Panik`,alarm_acknowledge:`Quittieren`,alarm_circuits_alarm:`Alarmkreis`,alarm_circuits_inside:`Innenkreis`,alarm_circuits_notification:`Hinweiskreis`,alarm_circuits_empty:`Alles geschlossen`,alarm_other_alarm:`Weiterer Alarm %s`,alarm_password_title:`Deaktivieren`,alarm_password:`Passwort`,alarm_password_wrong:`Falsches Passwort`,alarm_cancel:`Abbrechen`,alarm_ok:`OK`,alarm_no_instance:`Keine Alarm-Instanz ausgewählt`},ru:{alarm_title:`Сигнализация`,alarm_circuits:`Контуры`,alarm_details:`Подробности`,alarm_mode_off:`Выкл.`,alarm_mode_arm:`Охрана`,alarm_mode_inside:`Внутри`,alarm_mode_night:`Ночь`,alarm_with_delay:`С задержкой`,alarm_zone:`Зона %s`,alarm_on:`вкл.`,alarm_off:`выкл.`,alarm_seconds:`%s с`,alarm_state_deactivated:`Деактивировано`,alarm_state_sharp:`На охране`,alarm_state_sharp_inside:`Охрана периметра`,alarm_state_burglary:`Взлом`,alarm_state_night_rest:`Ночной режим`,alarm_state_gets_activated:`Активация`,alarm_state_activation_failed:`Сбой активации`,alarm_state_activation_aborted:`Активация прервана`,alarm_state_silent_alarm:`Тихая тревога`,alarm_state_unknown:`Неизвестно`,alarm_ready:`Готово к постановке`,alarm_not_armable:`Не готово к постановке`,alarm_burglary:`Взлом`,alarm_silent_alarm:`Тихая тревога`,alarm_siren:`Сирена`,alarm_failed:`Сбой активации`,alarm_with_warnings:`На охране с предупреждениями`,alarm_notification_changes:`Изменения в контуре оповещения`,alarm_presence:`Имитация присутствия`,alarm_panic:`Паника`,alarm_acknowledge:`Квитировать`,alarm_circuits_alarm:`Контур тревоги`,alarm_circuits_inside:`Внутренний контур`,alarm_circuits_notification:`Контур оповещения`,alarm_circuits_empty:`Всё закрыто`,alarm_other_alarm:`Другой сигнал %s`,alarm_password_title:`Снять с охраны`,alarm_password:`Пароль`,alarm_password_wrong:`Неверный пароль`,alarm_cancel:`Отмена`,alarm_ok:`OK`,alarm_no_instance:`Экземпляр alarm не выбран`},pt:{alarm_title:`Sistema de alarme`,alarm_circuits:`Circuitos`,alarm_details:`Detalhes`,alarm_mode_off:`Desl.`,alarm_mode_arm:`Armado`,alarm_mode_inside:`Interior`,alarm_mode_night:`Noite`,alarm_with_delay:`Com atraso`,alarm_zone:`Zona %s`,alarm_on:`ligado`,alarm_off:`desligado`,alarm_seconds:`%s s`,alarm_state_deactivated:`Desativado`,alarm_state_sharp:`Armado`,alarm_state_sharp_inside:`Armado no interior`,alarm_state_burglary:`Arrombamento`,alarm_state_night_rest:`Descanso noturno`,alarm_state_gets_activated:`A ativar`,alarm_state_activation_failed:`Falha na ativação`,alarm_state_activation_aborted:`Ativação cancelada`,alarm_state_silent_alarm:`Alarme silencioso`,alarm_state_unknown:`Desconhecido`,alarm_ready:`Pronto para armar`,alarm_not_armable:`Não está pronto para armar`,alarm_burglary:`Arrombamento`,alarm_silent_alarm:`Alarme silencioso`,alarm_siren:`Sirene`,alarm_failed:`Falha na ativação`,alarm_with_warnings:`Armado com avisos`,alarm_notification_changes:`Alterações no circuito de aviso`,alarm_presence:`Simulação de presença`,alarm_panic:`Pânico`,alarm_acknowledge:`Confirmar`,alarm_circuits_alarm:`Circuito de alarme`,alarm_circuits_inside:`Circuito interior`,alarm_circuits_notification:`Circuito de aviso`,alarm_circuits_empty:`Tudo fechado`,alarm_other_alarm:`Outro alarme %s`,alarm_password_title:`Desativar`,alarm_password:`Palavra-passe`,alarm_password_wrong:`Palavra-passe incorreta`,alarm_cancel:`Cancelar`,alarm_ok:`OK`,alarm_no_instance:`Nenhuma instância de alarme selecionada`},nl:{alarm_title:`Alarmsysteem`,alarm_circuits:`Meldkringen`,alarm_details:`Details`,alarm_mode_off:`Uit`,alarm_mode_arm:`Scherp`,alarm_mode_inside:`Binnen`,alarm_mode_night:`Nacht`,alarm_with_delay:`Met vertraging`,alarm_zone:`Zone %s`,alarm_on:`aan`,alarm_off:`uit`,alarm_seconds:`%s s`,alarm_state_deactivated:`Gedeactiveerd`,alarm_state_sharp:`Scherp`,alarm_state_sharp_inside:`Binnen scherp`,alarm_state_burglary:`Inbraak`,alarm_state_night_rest:`Nachtrust`,alarm_state_gets_activated:`Wordt geactiveerd`,alarm_state_activation_failed:`Activering mislukt`,alarm_state_activation_aborted:`Activering afgebroken`,alarm_state_silent_alarm:`Stil alarm`,alarm_state_unknown:`Onbekend`,alarm_ready:`Klaar om scherp te zetten`,alarm_not_armable:`Niet klaar om scherp te zetten`,alarm_burglary:`Inbraak`,alarm_silent_alarm:`Stil alarm`,alarm_siren:`Sirene`,alarm_failed:`Activering mislukt`,alarm_with_warnings:`Scherp met waarschuwingen`,alarm_notification_changes:`Wijzigingen in de meldkring`,alarm_presence:`Aanwezigheidssimulatie`,alarm_panic:`Paniek`,alarm_acknowledge:`Bevestigen`,alarm_circuits_alarm:`Alarmkring`,alarm_circuits_inside:`Binnenkring`,alarm_circuits_notification:`Meldkring`,alarm_circuits_empty:`Alles gesloten`,alarm_other_alarm:`Ander alarm %s`,alarm_password_title:`Deactiveren`,alarm_password:`Wachtwoord`,alarm_password_wrong:`Verkeerd wachtwoord`,alarm_cancel:`Annuleren`,alarm_ok:`OK`,alarm_no_instance:`Geen alarm-instantie gekozen`},fr:{alarm_title:`Système d'alarme`,alarm_circuits:`Circuits`,alarm_details:`Détails`,alarm_mode_off:`Arrêt`,alarm_mode_arm:`Armé`,alarm_mode_inside:`Intérieur`,alarm_mode_night:`Nuit`,alarm_with_delay:`Avec délai`,alarm_zone:`Zone %s`,alarm_on:`activée`,alarm_off:`désactivée`,alarm_seconds:`%s s`,alarm_state_deactivated:`Désactivé`,alarm_state_sharp:`Armé`,alarm_state_sharp_inside:`Armé intérieur`,alarm_state_burglary:`Effraction`,alarm_state_night_rest:`Repos nocturne`,alarm_state_gets_activated:`Activation`,alarm_state_activation_failed:`Échec de l'activation`,alarm_state_activation_aborted:`Activation interrompue`,alarm_state_silent_alarm:`Alarme silencieuse`,alarm_state_unknown:`Inconnu`,alarm_ready:`Prêt à armer`,alarm_not_armable:`Pas prêt à armer`,alarm_burglary:`Effraction`,alarm_silent_alarm:`Alarme silencieuse`,alarm_siren:`Sirène`,alarm_failed:`Échec de l'activation`,alarm_with_warnings:`Armé avec avertissements`,alarm_notification_changes:`Changements dans le circuit de notification`,alarm_presence:`Simulation de présence`,alarm_panic:`Panique`,alarm_acknowledge:`Acquitter`,alarm_circuits_alarm:`Circuit d'alarme`,alarm_circuits_inside:`Circuit intérieur`,alarm_circuits_notification:`Circuit de notification`,alarm_circuits_empty:`Tout est fermé`,alarm_other_alarm:`Autre alarme %s`,alarm_password_title:`Désactiver`,alarm_password:`Mot de passe`,alarm_password_wrong:`Mot de passe incorrect`,alarm_cancel:`Annuler`,alarm_ok:`OK`,alarm_no_instance:`Aucune instance d'alarme sélectionnée`},it:{alarm_title:`Sistema di allarme`,alarm_circuits:`Circuiti`,alarm_details:`Dettagli`,alarm_mode_off:`Off`,alarm_mode_arm:`Attivo`,alarm_mode_inside:`Interno`,alarm_mode_night:`Notte`,alarm_with_delay:`Con ritardo`,alarm_zone:`Zona %s`,alarm_on:`attiva`,alarm_off:`disattiva`,alarm_seconds:`%s s`,alarm_state_deactivated:`Disattivato`,alarm_state_sharp:`Attivato`,alarm_state_sharp_inside:`Attivo interno`,alarm_state_burglary:`Effrazione`,alarm_state_night_rest:`Riposo notturno`,alarm_state_gets_activated:`In attivazione`,alarm_state_activation_failed:`Attivazione fallita`,alarm_state_activation_aborted:`Attivazione interrotta`,alarm_state_silent_alarm:`Allarme silenzioso`,alarm_state_unknown:`Sconosciuto`,alarm_ready:`Pronto ad attivare`,alarm_not_armable:`Non pronto ad attivare`,alarm_burglary:`Effrazione`,alarm_silent_alarm:`Allarme silenzioso`,alarm_siren:`Sirena`,alarm_failed:`Attivazione fallita`,alarm_with_warnings:`Attivo con avvisi`,alarm_notification_changes:`Modifiche nel circuito di notifica`,alarm_presence:`Simulazione di presenza`,alarm_panic:`Panico`,alarm_acknowledge:`Conferma`,alarm_circuits_alarm:`Circuito di allarme`,alarm_circuits_inside:`Circuito interno`,alarm_circuits_notification:`Circuito di notifica`,alarm_circuits_empty:`Tutto chiuso`,alarm_other_alarm:`Altro allarme %s`,alarm_password_title:`Disattivare`,alarm_password:`Password`,alarm_password_wrong:`Password errata`,alarm_cancel:`Annulla`,alarm_ok:`OK`,alarm_no_instance:`Nessuna istanza di allarme selezionata`},es:{alarm_title:`Sistema de alarma`,alarm_circuits:`Circuitos`,alarm_details:`Detalles`,alarm_mode_off:`Apagado`,alarm_mode_arm:`Armado`,alarm_mode_inside:`Interior`,alarm_mode_night:`Noche`,alarm_with_delay:`Con retardo`,alarm_zone:`Zona %s`,alarm_on:`activada`,alarm_off:`desactivada`,alarm_seconds:`%s s`,alarm_state_deactivated:`Desactivado`,alarm_state_sharp:`Armado`,alarm_state_sharp_inside:`Armado interior`,alarm_state_burglary:`Robo`,alarm_state_night_rest:`Descanso nocturno`,alarm_state_gets_activated:`Activando`,alarm_state_activation_failed:`Fallo de activación`,alarm_state_activation_aborted:`Activación cancelada`,alarm_state_silent_alarm:`Alarma silenciosa`,alarm_state_unknown:`Desconocido`,alarm_ready:`Listo para armar`,alarm_not_armable:`No listo para armar`,alarm_burglary:`Robo`,alarm_silent_alarm:`Alarma silenciosa`,alarm_siren:`Sirena`,alarm_failed:`Fallo de activación`,alarm_with_warnings:`Armado con avisos`,alarm_notification_changes:`Cambios en el circuito de aviso`,alarm_presence:`Simulación de presencia`,alarm_panic:`Pánico`,alarm_acknowledge:`Confirmar`,alarm_circuits_alarm:`Circuito de alarma`,alarm_circuits_inside:`Circuito interior`,alarm_circuits_notification:`Circuito de aviso`,alarm_circuits_empty:`Todo cerrado`,alarm_other_alarm:`Otra alarma %s`,alarm_password_title:`Desactivar`,alarm_password:`Contraseña`,alarm_password_wrong:`Contraseña incorrecta`,alarm_cancel:`Cancelar`,alarm_ok:`OK`,alarm_no_instance:`Ninguna instancia de alarma seleccionada`},pl:{alarm_title:`System alarmowy`,alarm_circuits:`Obwody`,alarm_details:`Szczegóły`,alarm_mode_off:`Wył.`,alarm_mode_arm:`Uzbrojony`,alarm_mode_inside:`Wewnątrz`,alarm_mode_night:`Noc`,alarm_with_delay:`Z opóźnieniem`,alarm_zone:`Strefa %s`,alarm_on:`wł.`,alarm_off:`wył.`,alarm_seconds:`%s s`,alarm_state_deactivated:`Dezaktywowany`,alarm_state_sharp:`Uzbrojony`,alarm_state_sharp_inside:`Uzbrojony wewnątrz`,alarm_state_burglary:`Włamanie`,alarm_state_night_rest:`Tryb nocny`,alarm_state_gets_activated:`Uzbrajanie`,alarm_state_activation_failed:`Uzbrajanie nieudane`,alarm_state_activation_aborted:`Uzbrajanie przerwane`,alarm_state_silent_alarm:`Cichy alarm`,alarm_state_unknown:`Nieznany`,alarm_ready:`Gotowy do uzbrojenia`,alarm_not_armable:`Niegotowy do uzbrojenia`,alarm_burglary:`Włamanie`,alarm_silent_alarm:`Cichy alarm`,alarm_siren:`Syrena`,alarm_failed:`Uzbrajanie nieudane`,alarm_with_warnings:`Uzbrojony z ostrzeżeniami`,alarm_notification_changes:`Zmiany w obwodzie powiadomień`,alarm_presence:`Symulacja obecności`,alarm_panic:`Panika`,alarm_acknowledge:`Potwierdź`,alarm_circuits_alarm:`Obwód alarmowy`,alarm_circuits_inside:`Obwód wewnętrzny`,alarm_circuits_notification:`Obwód powiadomień`,alarm_circuits_empty:`Wszystko zamknięte`,alarm_other_alarm:`Inny alarm %s`,alarm_password_title:`Rozbroić`,alarm_password:`Hasło`,alarm_password_wrong:`Błędne hasło`,alarm_cancel:`Anuluj`,alarm_ok:`OK`,alarm_no_instance:`Nie wybrano instancji alarmu`},uk:{alarm_title:`Сигналізація`,alarm_circuits:`Контури`,alarm_details:`Деталі`,alarm_mode_off:`Вимк.`,alarm_mode_arm:`Охорона`,alarm_mode_inside:`Всередині`,alarm_mode_night:`Ніч`,alarm_with_delay:`Із затримкою`,alarm_zone:`Зона %s`,alarm_on:`увімк.`,alarm_off:`вимк.`,alarm_seconds:`%s с`,alarm_state_deactivated:`Деактивовано`,alarm_state_sharp:`На охороні`,alarm_state_sharp_inside:`Охорона периметра`,alarm_state_burglary:`Зламання`,alarm_state_night_rest:`Нічний режим`,alarm_state_gets_activated:`Активація`,alarm_state_activation_failed:`Помилка активації`,alarm_state_activation_aborted:`Активацію перервано`,alarm_state_silent_alarm:`Тиха тривога`,alarm_state_unknown:`Невідомо`,alarm_ready:`Готово до постановки`,alarm_not_armable:`Не готово до постановки`,alarm_burglary:`Зламання`,alarm_silent_alarm:`Тиха тривога`,alarm_siren:`Сирена`,alarm_failed:`Помилка активації`,alarm_with_warnings:`На охороні з попередженнями`,alarm_notification_changes:`Зміни в контурі сповіщення`,alarm_presence:`Імітація присутності`,alarm_panic:`Паніка`,alarm_acknowledge:`Квитувати`,alarm_circuits_alarm:`Контур тривоги`,alarm_circuits_inside:`Внутрішній контур`,alarm_circuits_notification:`Контур сповіщення`,alarm_circuits_empty:`Все закрито`,alarm_other_alarm:`Інша тривога %s`,alarm_password_title:`Зняти з охорони`,alarm_password:`Пароль`,alarm_password_wrong:`Невірний пароль`,alarm_cancel:`Скасувати`,alarm_ok:`OK`,alarm_no_instance:`Не вибрано екземпляр alarm`},"zh-cn":{alarm_title:`报警系统`,alarm_circuits:`回路`,alarm_details:`详细信息`,alarm_mode_off:`关闭`,alarm_mode_arm:`布防`,alarm_mode_inside:`室内`,alarm_mode_night:`夜间`,alarm_with_delay:`延时布防`,alarm_zone:`区域 %s`,alarm_on:`开`,alarm_off:`关`,alarm_seconds:`%s 秒`,alarm_state_deactivated:`已撤防`,alarm_state_sharp:`已布防`,alarm_state_sharp_inside:`室内布防`,alarm_state_burglary:`入侵`,alarm_state_night_rest:`夜间模式`,alarm_state_gets_activated:`正在布防`,alarm_state_activation_failed:`布防失败`,alarm_state_activation_aborted:`布防已取消`,alarm_state_silent_alarm:`静默报警`,alarm_state_unknown:`未知`,alarm_ready:`可布防`,alarm_not_armable:`不可布防`,alarm_burglary:`入侵`,alarm_silent_alarm:`静默报警`,alarm_siren:`警笛`,alarm_failed:`布防失败`,alarm_with_warnings:`布防（有警告）`,alarm_notification_changes:`提示回路有变化`,alarm_presence:`在家模拟`,alarm_panic:`紧急报警`,alarm_acknowledge:`确认`,alarm_circuits_alarm:`报警回路`,alarm_circuits_inside:`室内回路`,alarm_circuits_notification:`提示回路`,alarm_circuits_empty:`全部关闭`,alarm_other_alarm:`其他报警 %s`,alarm_password_title:`撤防`,alarm_password:`密码`,alarm_password_wrong:`密码错误`,alarm_cancel:`取消`,alarm_ok:`确定`,alarm_no_instance:`未选择报警实例`}}[e]||{},n={en:{alarm_title:`Alarm system`,alarm_circuits:`Circuits`,alarm_details:`Details`,alarm_mode_off:`Off`,alarm_mode_arm:`Armed`,alarm_mode_inside:`Inside`,alarm_mode_night:`Night`,alarm_with_delay:`With delay`,alarm_zone:`Zone %s`,alarm_on:`on`,alarm_off:`off`,alarm_seconds:`%s s`,alarm_state_deactivated:`Deactivated`,alarm_state_sharp:`Armed`,alarm_state_sharp_inside:`Armed inside`,alarm_state_burglary:`Burglary`,alarm_state_night_rest:`Night rest`,alarm_state_gets_activated:`Arming`,alarm_state_activation_failed:`Arming failed`,alarm_state_activation_aborted:`Arming aborted`,alarm_state_silent_alarm:`Silent alarm`,alarm_state_unknown:`Unknown`,alarm_ready:`Ready to arm`,alarm_not_armable:`Not ready to arm`,alarm_burglary:`Burglary`,alarm_silent_alarm:`Silent alarm`,alarm_siren:`Siren`,alarm_failed:`Arming failed`,alarm_with_warnings:`Armed with warnings`,alarm_notification_changes:`Changes in the notification circuit`,alarm_presence:`Presence simulation`,alarm_panic:`Panic`,alarm_acknowledge:`Acknowledge`,alarm_circuits_alarm:`Alarm circuit`,alarm_circuits_inside:`Inside circuit`,alarm_circuits_notification:`Notification circuit`,alarm_circuits_empty:`Everything closed`,alarm_other_alarm:`Other alarm %s`,alarm_password_title:`Disarm`,alarm_password:`Password`,alarm_password_wrong:`Wrong password`,alarm_cancel:`Cancel`,alarm_ok:`OK`,alarm_no_instance:`No alarm instance selected`},de:{alarm_title:`Alarmanlage`,alarm_circuits:`Meldekreise`,alarm_details:`Details`,alarm_mode_off:`Aus`,alarm_mode_arm:`Scharf`,alarm_mode_inside:`Innen`,alarm_mode_night:`Nacht`,alarm_with_delay:`Mit Verzögerung`,alarm_zone:`Zone %s`,alarm_on:`an`,alarm_off:`aus`,alarm_seconds:`%s s`,alarm_state_deactivated:`Deaktiviert`,alarm_state_sharp:`Scharf`,alarm_state_sharp_inside:`Innen scharf`,alarm_state_burglary:`Einbruch`,alarm_state_night_rest:`Nachtruhe`,alarm_state_gets_activated:`Wird aktiviert`,alarm_state_activation_failed:`Aktivierung fehlgeschlagen`,alarm_state_activation_aborted:`Aktivierung abgebrochen`,alarm_state_silent_alarm:`Stiller Alarm`,alarm_state_unknown:`Unbekannt`,alarm_ready:`Scharfschaltbereit`,alarm_not_armable:`Nicht scharfschaltbereit`,alarm_burglary:`Einbruch`,alarm_silent_alarm:`Stiller Alarm`,alarm_siren:`Sirene`,alarm_failed:`Aktivierung fehlgeschlagen`,alarm_with_warnings:`Scharf mit Warnungen`,alarm_notification_changes:`Änderungen im Hinweiskreis`,alarm_presence:`Anwesenheitssimulation`,alarm_panic:`Panik`,alarm_acknowledge:`Quittieren`,alarm_circuits_alarm:`Alarmkreis`,alarm_circuits_inside:`Innenkreis`,alarm_circuits_notification:`Hinweiskreis`,alarm_circuits_empty:`Alles geschlossen`,alarm_other_alarm:`Weiterer Alarm %s`,alarm_password_title:`Deaktivieren`,alarm_password:`Passwort`,alarm_password_wrong:`Falsches Passwort`,alarm_cancel:`Abbrechen`,alarm_ok:`OK`,alarm_no_instance:`Keine Alarm-Instanz ausgewählt`},ru:{alarm_title:`Сигнализация`,alarm_circuits:`Контуры`,alarm_details:`Подробности`,alarm_mode_off:`Выкл.`,alarm_mode_arm:`Охрана`,alarm_mode_inside:`Внутри`,alarm_mode_night:`Ночь`,alarm_with_delay:`С задержкой`,alarm_zone:`Зона %s`,alarm_on:`вкл.`,alarm_off:`выкл.`,alarm_seconds:`%s с`,alarm_state_deactivated:`Деактивировано`,alarm_state_sharp:`На охране`,alarm_state_sharp_inside:`Охрана периметра`,alarm_state_burglary:`Взлом`,alarm_state_night_rest:`Ночной режим`,alarm_state_gets_activated:`Активация`,alarm_state_activation_failed:`Сбой активации`,alarm_state_activation_aborted:`Активация прервана`,alarm_state_silent_alarm:`Тихая тревога`,alarm_state_unknown:`Неизвестно`,alarm_ready:`Готово к постановке`,alarm_not_armable:`Не готово к постановке`,alarm_burglary:`Взлом`,alarm_silent_alarm:`Тихая тревога`,alarm_siren:`Сирена`,alarm_failed:`Сбой активации`,alarm_with_warnings:`На охране с предупреждениями`,alarm_notification_changes:`Изменения в контуре оповещения`,alarm_presence:`Имитация присутствия`,alarm_panic:`Паника`,alarm_acknowledge:`Квитировать`,alarm_circuits_alarm:`Контур тревоги`,alarm_circuits_inside:`Внутренний контур`,alarm_circuits_notification:`Контур оповещения`,alarm_circuits_empty:`Всё закрыто`,alarm_other_alarm:`Другой сигнал %s`,alarm_password_title:`Снять с охраны`,alarm_password:`Пароль`,alarm_password_wrong:`Неверный пароль`,alarm_cancel:`Отмена`,alarm_ok:`OK`,alarm_no_instance:`Экземпляр alarm не выбран`},pt:{alarm_title:`Sistema de alarme`,alarm_circuits:`Circuitos`,alarm_details:`Detalhes`,alarm_mode_off:`Desl.`,alarm_mode_arm:`Armado`,alarm_mode_inside:`Interior`,alarm_mode_night:`Noite`,alarm_with_delay:`Com atraso`,alarm_zone:`Zona %s`,alarm_on:`ligado`,alarm_off:`desligado`,alarm_seconds:`%s s`,alarm_state_deactivated:`Desativado`,alarm_state_sharp:`Armado`,alarm_state_sharp_inside:`Armado no interior`,alarm_state_burglary:`Arrombamento`,alarm_state_night_rest:`Descanso noturno`,alarm_state_gets_activated:`A ativar`,alarm_state_activation_failed:`Falha na ativação`,alarm_state_activation_aborted:`Ativação cancelada`,alarm_state_silent_alarm:`Alarme silencioso`,alarm_state_unknown:`Desconhecido`,alarm_ready:`Pronto para armar`,alarm_not_armable:`Não está pronto para armar`,alarm_burglary:`Arrombamento`,alarm_silent_alarm:`Alarme silencioso`,alarm_siren:`Sirene`,alarm_failed:`Falha na ativação`,alarm_with_warnings:`Armado com avisos`,alarm_notification_changes:`Alterações no circuito de aviso`,alarm_presence:`Simulação de presença`,alarm_panic:`Pânico`,alarm_acknowledge:`Confirmar`,alarm_circuits_alarm:`Circuito de alarme`,alarm_circuits_inside:`Circuito interior`,alarm_circuits_notification:`Circuito de aviso`,alarm_circuits_empty:`Tudo fechado`,alarm_other_alarm:`Outro alarme %s`,alarm_password_title:`Desativar`,alarm_password:`Palavra-passe`,alarm_password_wrong:`Palavra-passe incorreta`,alarm_cancel:`Cancelar`,alarm_ok:`OK`,alarm_no_instance:`Nenhuma instância de alarme selecionada`},nl:{alarm_title:`Alarmsysteem`,alarm_circuits:`Meldkringen`,alarm_details:`Details`,alarm_mode_off:`Uit`,alarm_mode_arm:`Scherp`,alarm_mode_inside:`Binnen`,alarm_mode_night:`Nacht`,alarm_with_delay:`Met vertraging`,alarm_zone:`Zone %s`,alarm_on:`aan`,alarm_off:`uit`,alarm_seconds:`%s s`,alarm_state_deactivated:`Gedeactiveerd`,alarm_state_sharp:`Scherp`,alarm_state_sharp_inside:`Binnen scherp`,alarm_state_burglary:`Inbraak`,alarm_state_night_rest:`Nachtrust`,alarm_state_gets_activated:`Wordt geactiveerd`,alarm_state_activation_failed:`Activering mislukt`,alarm_state_activation_aborted:`Activering afgebroken`,alarm_state_silent_alarm:`Stil alarm`,alarm_state_unknown:`Onbekend`,alarm_ready:`Klaar om scherp te zetten`,alarm_not_armable:`Niet klaar om scherp te zetten`,alarm_burglary:`Inbraak`,alarm_silent_alarm:`Stil alarm`,alarm_siren:`Sirene`,alarm_failed:`Activering mislukt`,alarm_with_warnings:`Scherp met waarschuwingen`,alarm_notification_changes:`Wijzigingen in de meldkring`,alarm_presence:`Aanwezigheidssimulatie`,alarm_panic:`Paniek`,alarm_acknowledge:`Bevestigen`,alarm_circuits_alarm:`Alarmkring`,alarm_circuits_inside:`Binnenkring`,alarm_circuits_notification:`Meldkring`,alarm_circuits_empty:`Alles gesloten`,alarm_other_alarm:`Ander alarm %s`,alarm_password_title:`Deactiveren`,alarm_password:`Wachtwoord`,alarm_password_wrong:`Verkeerd wachtwoord`,alarm_cancel:`Annuleren`,alarm_ok:`OK`,alarm_no_instance:`Geen alarm-instantie gekozen`},fr:{alarm_title:`Système d'alarme`,alarm_circuits:`Circuits`,alarm_details:`Détails`,alarm_mode_off:`Arrêt`,alarm_mode_arm:`Armé`,alarm_mode_inside:`Intérieur`,alarm_mode_night:`Nuit`,alarm_with_delay:`Avec délai`,alarm_zone:`Zone %s`,alarm_on:`activée`,alarm_off:`désactivée`,alarm_seconds:`%s s`,alarm_state_deactivated:`Désactivé`,alarm_state_sharp:`Armé`,alarm_state_sharp_inside:`Armé intérieur`,alarm_state_burglary:`Effraction`,alarm_state_night_rest:`Repos nocturne`,alarm_state_gets_activated:`Activation`,alarm_state_activation_failed:`Échec de l'activation`,alarm_state_activation_aborted:`Activation interrompue`,alarm_state_silent_alarm:`Alarme silencieuse`,alarm_state_unknown:`Inconnu`,alarm_ready:`Prêt à armer`,alarm_not_armable:`Pas prêt à armer`,alarm_burglary:`Effraction`,alarm_silent_alarm:`Alarme silencieuse`,alarm_siren:`Sirène`,alarm_failed:`Échec de l'activation`,alarm_with_warnings:`Armé avec avertissements`,alarm_notification_changes:`Changements dans le circuit de notification`,alarm_presence:`Simulation de présence`,alarm_panic:`Panique`,alarm_acknowledge:`Acquitter`,alarm_circuits_alarm:`Circuit d'alarme`,alarm_circuits_inside:`Circuit intérieur`,alarm_circuits_notification:`Circuit de notification`,alarm_circuits_empty:`Tout est fermé`,alarm_other_alarm:`Autre alarme %s`,alarm_password_title:`Désactiver`,alarm_password:`Mot de passe`,alarm_password_wrong:`Mot de passe incorrect`,alarm_cancel:`Annuler`,alarm_ok:`OK`,alarm_no_instance:`Aucune instance d'alarme sélectionnée`},it:{alarm_title:`Sistema di allarme`,alarm_circuits:`Circuiti`,alarm_details:`Dettagli`,alarm_mode_off:`Off`,alarm_mode_arm:`Attivo`,alarm_mode_inside:`Interno`,alarm_mode_night:`Notte`,alarm_with_delay:`Con ritardo`,alarm_zone:`Zona %s`,alarm_on:`attiva`,alarm_off:`disattiva`,alarm_seconds:`%s s`,alarm_state_deactivated:`Disattivato`,alarm_state_sharp:`Attivato`,alarm_state_sharp_inside:`Attivo interno`,alarm_state_burglary:`Effrazione`,alarm_state_night_rest:`Riposo notturno`,alarm_state_gets_activated:`In attivazione`,alarm_state_activation_failed:`Attivazione fallita`,alarm_state_activation_aborted:`Attivazione interrotta`,alarm_state_silent_alarm:`Allarme silenzioso`,alarm_state_unknown:`Sconosciuto`,alarm_ready:`Pronto ad attivare`,alarm_not_armable:`Non pronto ad attivare`,alarm_burglary:`Effrazione`,alarm_silent_alarm:`Allarme silenzioso`,alarm_siren:`Sirena`,alarm_failed:`Attivazione fallita`,alarm_with_warnings:`Attivo con avvisi`,alarm_notification_changes:`Modifiche nel circuito di notifica`,alarm_presence:`Simulazione di presenza`,alarm_panic:`Panico`,alarm_acknowledge:`Conferma`,alarm_circuits_alarm:`Circuito di allarme`,alarm_circuits_inside:`Circuito interno`,alarm_circuits_notification:`Circuito di notifica`,alarm_circuits_empty:`Tutto chiuso`,alarm_other_alarm:`Altro allarme %s`,alarm_password_title:`Disattivare`,alarm_password:`Password`,alarm_password_wrong:`Password errata`,alarm_cancel:`Annulla`,alarm_ok:`OK`,alarm_no_instance:`Nessuna istanza di allarme selezionata`},es:{alarm_title:`Sistema de alarma`,alarm_circuits:`Circuitos`,alarm_details:`Detalles`,alarm_mode_off:`Apagado`,alarm_mode_arm:`Armado`,alarm_mode_inside:`Interior`,alarm_mode_night:`Noche`,alarm_with_delay:`Con retardo`,alarm_zone:`Zona %s`,alarm_on:`activada`,alarm_off:`desactivada`,alarm_seconds:`%s s`,alarm_state_deactivated:`Desactivado`,alarm_state_sharp:`Armado`,alarm_state_sharp_inside:`Armado interior`,alarm_state_burglary:`Robo`,alarm_state_night_rest:`Descanso nocturno`,alarm_state_gets_activated:`Activando`,alarm_state_activation_failed:`Fallo de activación`,alarm_state_activation_aborted:`Activación cancelada`,alarm_state_silent_alarm:`Alarma silenciosa`,alarm_state_unknown:`Desconocido`,alarm_ready:`Listo para armar`,alarm_not_armable:`No listo para armar`,alarm_burglary:`Robo`,alarm_silent_alarm:`Alarma silenciosa`,alarm_siren:`Sirena`,alarm_failed:`Fallo de activación`,alarm_with_warnings:`Armado con avisos`,alarm_notification_changes:`Cambios en el circuito de aviso`,alarm_presence:`Simulación de presencia`,alarm_panic:`Pánico`,alarm_acknowledge:`Confirmar`,alarm_circuits_alarm:`Circuito de alarma`,alarm_circuits_inside:`Circuito interior`,alarm_circuits_notification:`Circuito de aviso`,alarm_circuits_empty:`Todo cerrado`,alarm_other_alarm:`Otra alarma %s`,alarm_password_title:`Desactivar`,alarm_password:`Contraseña`,alarm_password_wrong:`Contraseña incorrecta`,alarm_cancel:`Cancelar`,alarm_ok:`OK`,alarm_no_instance:`Ninguna instancia de alarma seleccionada`},pl:{alarm_title:`System alarmowy`,alarm_circuits:`Obwody`,alarm_details:`Szczegóły`,alarm_mode_off:`Wył.`,alarm_mode_arm:`Uzbrojony`,alarm_mode_inside:`Wewnątrz`,alarm_mode_night:`Noc`,alarm_with_delay:`Z opóźnieniem`,alarm_zone:`Strefa %s`,alarm_on:`wł.`,alarm_off:`wył.`,alarm_seconds:`%s s`,alarm_state_deactivated:`Dezaktywowany`,alarm_state_sharp:`Uzbrojony`,alarm_state_sharp_inside:`Uzbrojony wewnątrz`,alarm_state_burglary:`Włamanie`,alarm_state_night_rest:`Tryb nocny`,alarm_state_gets_activated:`Uzbrajanie`,alarm_state_activation_failed:`Uzbrajanie nieudane`,alarm_state_activation_aborted:`Uzbrajanie przerwane`,alarm_state_silent_alarm:`Cichy alarm`,alarm_state_unknown:`Nieznany`,alarm_ready:`Gotowy do uzbrojenia`,alarm_not_armable:`Niegotowy do uzbrojenia`,alarm_burglary:`Włamanie`,alarm_silent_alarm:`Cichy alarm`,alarm_siren:`Syrena`,alarm_failed:`Uzbrajanie nieudane`,alarm_with_warnings:`Uzbrojony z ostrzeżeniami`,alarm_notification_changes:`Zmiany w obwodzie powiadomień`,alarm_presence:`Symulacja obecności`,alarm_panic:`Panika`,alarm_acknowledge:`Potwierdź`,alarm_circuits_alarm:`Obwód alarmowy`,alarm_circuits_inside:`Obwód wewnętrzny`,alarm_circuits_notification:`Obwód powiadomień`,alarm_circuits_empty:`Wszystko zamknięte`,alarm_other_alarm:`Inny alarm %s`,alarm_password_title:`Rozbroić`,alarm_password:`Hasło`,alarm_password_wrong:`Błędne hasło`,alarm_cancel:`Anuluj`,alarm_ok:`OK`,alarm_no_instance:`Nie wybrano instancji alarmu`},uk:{alarm_title:`Сигналізація`,alarm_circuits:`Контури`,alarm_details:`Деталі`,alarm_mode_off:`Вимк.`,alarm_mode_arm:`Охорона`,alarm_mode_inside:`Всередині`,alarm_mode_night:`Ніч`,alarm_with_delay:`Із затримкою`,alarm_zone:`Зона %s`,alarm_on:`увімк.`,alarm_off:`вимк.`,alarm_seconds:`%s с`,alarm_state_deactivated:`Деактивовано`,alarm_state_sharp:`На охороні`,alarm_state_sharp_inside:`Охорона периметра`,alarm_state_burglary:`Зламання`,alarm_state_night_rest:`Нічний режим`,alarm_state_gets_activated:`Активація`,alarm_state_activation_failed:`Помилка активації`,alarm_state_activation_aborted:`Активацію перервано`,alarm_state_silent_alarm:`Тиха тривога`,alarm_state_unknown:`Невідомо`,alarm_ready:`Готово до постановки`,alarm_not_armable:`Не готово до постановки`,alarm_burglary:`Зламання`,alarm_silent_alarm:`Тиха тривога`,alarm_siren:`Сирена`,alarm_failed:`Помилка активації`,alarm_with_warnings:`На охороні з попередженнями`,alarm_notification_changes:`Зміни в контурі сповіщення`,alarm_presence:`Імітація присутності`,alarm_panic:`Паніка`,alarm_acknowledge:`Квитувати`,alarm_circuits_alarm:`Контур тривоги`,alarm_circuits_inside:`Внутрішній контур`,alarm_circuits_notification:`Контур сповіщення`,alarm_circuits_empty:`Все закрито`,alarm_other_alarm:`Інша тривога %s`,alarm_password_title:`Зняти з охорони`,alarm_password:`Пароль`,alarm_password_wrong:`Невірний пароль`,alarm_cancel:`Скасувати`,alarm_ok:`OK`,alarm_no_instance:`Не вибрано екземпляр alarm`},"zh-cn":{alarm_title:`报警系统`,alarm_circuits:`回路`,alarm_details:`详细信息`,alarm_mode_off:`关闭`,alarm_mode_arm:`布防`,alarm_mode_inside:`室内`,alarm_mode_night:`夜间`,alarm_with_delay:`延时布防`,alarm_zone:`区域 %s`,alarm_on:`开`,alarm_off:`关`,alarm_seconds:`%s 秒`,alarm_state_deactivated:`已撤防`,alarm_state_sharp:`已布防`,alarm_state_sharp_inside:`室内布防`,alarm_state_burglary:`入侵`,alarm_state_night_rest:`夜间模式`,alarm_state_gets_activated:`正在布防`,alarm_state_activation_failed:`布防失败`,alarm_state_activation_aborted:`布防已取消`,alarm_state_silent_alarm:`静默报警`,alarm_state_unknown:`未知`,alarm_ready:`可布防`,alarm_not_armable:`不可布防`,alarm_burglary:`入侵`,alarm_silent_alarm:`静默报警`,alarm_siren:`警笛`,alarm_failed:`布防失败`,alarm_with_warnings:`布防（有警告）`,alarm_notification_changes:`提示回路有变化`,alarm_presence:`在家模拟`,alarm_panic:`紧急报警`,alarm_acknowledge:`确认`,alarm_circuits_alarm:`报警回路`,alarm_circuits_inside:`室内回路`,alarm_circuits_notification:`提示回路`,alarm_circuits_empty:`全部关闭`,alarm_other_alarm:`其他报警 %s`,alarm_password_title:`撤防`,alarm_password:`密码`,alarm_password_wrong:`密码错误`,alarm_cancel:`取消`,alarm_ok:`确定`,alarm_no_instance:`未选择报警实例`}}.en||{};return(e,...r)=>{let i=t[e]||n[e]||e;for(let e of r)i=i.replace(`%s`,String(e));return i}}function B(e){return typeof e==`number`?e:null}function V(e){return e===!0}function H(e){return typeof e==`string`?e:``}function U(e){return typeof e==`string`&&e?e.split(`,`).map(e=>e.trim()).filter(e=>!!e):[]}function de(e){let t=B(e[A.countdown]),n=B(e[A.stateList]);return{state:n,mode:ue(B(e[A.useList])),arming:n===k.getsActivated||!!t,countdown:t||null,silentCountdown:B(e[A.silentCountdown])||null,burglary:V(e[A.burglarAlarm]),silentAlarm:V(e[A.silentAlarm]),siren:V(e[A.siren])||V(e[A.sirenInside]),activationFailed:V(e[A.activationFailed]),armedWithWarnings:V(e[A.activatedWithWarnings]),armable:e[A.armable]!==!1,presence:V(e[A.presence]),zones:j.map((t,n)=>({number:n+1,on:e[t.switchId]!==!1,changed:V(e[t.changedId])})),circuits:{alarm:U(e[A.alarmCircuits]),inside:U(e[A.insideCircuits]),notification:U(e[A.notificationCircuits])},notificationChanges:V(e[A.notificationChanges]),others:M.map(t=>({triggered:V(e[t.changedId]),sensors:U(e[t.listId])})),log:H(e[A.log]),wrongPassword:V(e[A.wrongPassword])}}function W(e){return Array.isArray(e)&&e.some(e=>{let t=e;return!!t&&!!t.enabled&&!!t.name_id})}function G(e){let t=e||{};return{zones:j.map(e=>W(t[e.configKey])),others:M.map(e=>({name:H(t[e.nameKey]),configured:W(t[e.configKey])}))}}var fe={zones:j.map(()=>!0),others:M.map(()=>({name:``,configured:!0}))};function pe(e,t){return t?e.zones.filter(e=>t.zones[e.number-1]):[]}function K(e,t,n){return e.others.flatMap((e,r)=>t?.others[r]?.configured?[{...e,key:`other${r}`,name:t.others[r].name||n(r+1)}]:[])}function me(e,t,n){return[{key:`alarm`,label:n(`alarm`),names:e.circuits.alarm},{key:`inside`,label:n(`inside`),names:e.circuits.inside},{key:`notification`,label:n(`notification`),names:e.circuits.notification},...t.map(e=>({key:e.key,label:e.name,names:e.sensors}))]}function he(e){return e.split(`
`).map(e=>e.trim()).filter(e=>!!e).pop()}var q=`
:host {
    display: block;
    width: 100%;
    height: 100%;
}
* {
    box-sizing: border-box;
}
.mount {
    width: 100%;
    height: 100%;
    /* the size of the box does not depend on what is in it - no loop between measuring and laying out */
    container-type: size;
    container-name: alarm;
    /* text on a filled state color, as the default palettes of MUI have it */
    --on-error: #fff;
    --on-warning: #fff;
    --on-success: #fff;
    --on-info: #fff;
    --hover: color-mix(in srgb, currentColor 8%, transparent);
}
.mount.dark {
    --on-warning: rgba(0, 0, 0, 0.87);
    --on-success: rgba(0, 0, 0, 0.87);
    --on-info: rgba(0, 0, 0, 0.87);
}
.mount.dialog {
    height: auto;
    container-type: inline-size;
}
.sev-error {
    --sev: var(--iob-error);
    --on-sev: var(--on-error);
}
.sev-warning {
    --sev: var(--iob-warning);
    --on-sev: var(--on-warning);
}
.sev-success {
    --sev: var(--iob-success);
    --on-sev: var(--on-success);
}
.sev-info {
    --sev: var(--iob-info);
    --on-sev: var(--on-info);
}
svg {
    display: block;
    flex: none;
    fill: currentColor;
}
button {
    font: inherit;
    color: inherit;
    margin: 0;
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
}
button:focus-visible {
    outline: 2px solid var(--iob-primary);
    outline-offset: 1px;
}
button:disabled {
    cursor: default;
    opacity: 0.38;
}

/* the box */
.alarm {
    width: 100%;
    height: 100%;
}
.alarm.edit,
.hint.edit {
    /* in the editor of the host a click selects the element, it does not arm the house */
    pointer-events: none;
}
.content-auto > .tile {
    display: none;
}
@container alarm (max-width: 199px) or (max-height: 139px) {
    .content-auto > .panel {
        display: none;
    }
    .content-auto > .tile {
        display: flex;
    }
}

/* the panel */
.panel {
    --gap: 12px;
    display: flex;
    flex-direction: column;
    gap: var(--gap);
    width: 100%;
    height: 100%;
    min-height: 0;
    padding: 8px;
    overflow-x: hidden;
    overflow-y: auto;
}
.dialog .panel {
    height: auto;
    padding: 0;
    overflow: visible;
}
.head {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
}
.title {
    flex: 1 1 auto;
    min-width: 0;
    font-size: 1.25em;
    font-weight: 500;
    line-height: 1.6;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.icon-button {
    position: relative;
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: none;
    color: var(--iob-text-secondary);
}
.icon-button:hover {
    background: var(--hover);
}
.icon-button svg {
    width: 20px;
    height: 20px;
}
.chevron {
    transition: transform 0.2s;
}
.chevron.open {
    transform: rotate(180deg);
}
.dot {
    position: absolute;
    top: 5px;
    right: 5px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--iob-warning);
}

/* the status, and the triggered alarm groups */
.alert {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    padding: 0 16px;
    border: 1px solid var(--sev);
    border-radius: var(--iob-border-radius);
    color: color-mix(in srgb, var(--sev) 45%, var(--iob-text));
    font-size: 0.875em;
    line-height: 1.43;
}
.alert > svg {
    width: 22px;
    height: 22px;
    color: var(--sev);
}
.alert .message {
    flex: 1 1 auto;
    min-width: 0;
    padding: 8px 0;
    overflow-wrap: anywhere;
}
.alert .action {
    flex: none;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
}
.alert.filled {
    border-color: transparent;
    background: var(--sev);
    color: var(--on-sev);
}
.alert.filled > svg {
    color: inherit;
}
.alert-title {
    font-weight: 500;
    font-size: 1.14em;
}
.alert.counting {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
}
.progress {
    position: relative;
    height: 4px;
    margin-top: -1px;
    overflow: hidden;
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
    background: color-mix(in srgb, var(--sev) 30%, transparent);
}
.progress::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 40%;
    background: var(--sev);
    animation: alarm-progress 1.6s ease-in-out infinite;
}
@keyframes alarm-progress {
    from {
        transform: translateX(-100%);
    }
    to {
        transform: translateX(250%);
    }
}
@media (prefers-reduced-motion: reduce) {
    .progress::before {
        width: 100%;
        animation: none;
    }
}

/* the four modes */
.modes {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
}
.mode {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-width: 0;
    padding: 10px 4px;
    border: 1px solid var(--iob-divider);
    border-radius: var(--iob-border-radius);
    background: none;
    color: var(--iob-text-secondary);
    line-height: 1.2;
}
.mode:hover {
    background: var(--hover);
}
.mode.selected {
    border-color: color-mix(in srgb, var(--iob-primary) 50%, transparent);
    background: color-mix(in srgb, var(--iob-primary) 14%, transparent);
    color: var(--iob-primary);
}
.mode svg {
    width: 24px;
    height: 24px;
}
.mode span {
    max-width: 100%;
    font-size: 0.875em;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* buttons */
.button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-width: 64px;
    padding: 5px 15px;
    border: 1px solid color-mix(in srgb, currentColor 35%, transparent);
    border-radius: var(--iob-border-radius);
    background: none;
    font-size: 0.875em;
    font-weight: 500;
    line-height: 1.75;
}
.button:hover:not(:disabled) {
    background: var(--hover);
}
.button svg {
    width: 20px;
    height: 20px;
}
.button span {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.button.full {
    width: 100%;
}
.button.grow {
    flex: 1 1 auto;
}
.button.error {
    border-color: color-mix(in srgb, var(--iob-error) 50%, transparent);
    color: var(--iob-error);
}
.button.primary {
    border-color: color-mix(in srgb, var(--iob-primary) 50%, transparent);
    color: var(--iob-primary);
}
.button.contained {
    border-color: transparent;
    background: var(--sev);
    color: var(--on-sev);
}
.button.contained.primary {
    background: var(--iob-primary);
    color: var(--iob-primary-contrast);
}
.button.contained:hover:not(:disabled) {
    background: color-mix(in srgb, var(--sev, var(--iob-primary)) 85%, #000);
}
.button.contained.primary:hover:not(:disabled) {
    background: color-mix(in srgb, var(--iob-primary) 85%, #000);
}
.actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
}
.actions.wrap {
    flex-wrap: wrap;
}

/* zones and flags */
.chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}
.chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
    height: 32px;
    padding: 0 12px 0 7px;
    border: 1px solid color-mix(in srgb, var(--sev, var(--iob-text)) 60%, transparent);
    border-radius: 16px;
    background: none;
    color: var(--sev, currentColor);
    font-size: 0.8125em;
    white-space: nowrap;
}
button.chip:hover {
    background: var(--hover);
}
.chip svg {
    width: 18px;
    height: 18px;
}
.chip span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
}
.chip.off {
    border-color: var(--iob-divider);
    color: var(--iob-text-secondary);
}
.chip.filled {
    border-color: transparent;
    background: var(--sev);
    color: var(--on-sev);
}
button.chip.filled:hover {
    background: color-mix(in srgb, var(--sev) 85%, #000);
}
.chip.small {
    height: 24px;
    padding: 0 8px 0 5px;
    gap: 4px;
}
.chip.small svg {
    width: 16px;
    height: 16px;
}

/* the details */
.details {
    display: flex;
    flex-direction: column;
    gap: var(--gap);
}
.divider {
    border-top: 1px solid var(--iob-divider);
}
.switch {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    padding: 4px 0;
    border: 0;
    background: none;
    font-size: 0.875em;
    text-align: left;
}
.switch .label {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.track {
    position: relative;
    flex: none;
    width: 34px;
    height: 14px;
    margin: 0 3px;
    border-radius: 7px;
    background: color-mix(in srgb, var(--iob-text) 38%, transparent);
    transition: background 0.15s;
}
.thumb {
    position: absolute;
    top: -3px;
    left: -3px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #fafafa;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
    transition: transform 0.15s;
}
.dark .thumb {
    background: #bdbdbd;
}
.switch.on .track {
    background: color-mix(in srgb, var(--iob-primary) 50%, transparent);
}
.switch.on .thumb {
    transform: translateX(20px);
    background: var(--iob-primary);
}
.log {
    font-size: 0.75em;
    color: var(--iob-text-secondary);
    overflow-wrap: anywhere;
}

/* a dense panel, for a box that is not high */
@container alarm (max-height: 320px) {
    .panel {
        --gap: 6px;
        padding: 4px;
    }
    .title {
        font-size: 1em;
    }
    .icon-button {
        width: 26px;
        height: 26px;
    }
    .alert {
        padding: 0 10px;
        gap: 8px;
    }
    .alert .message {
        padding: 4px 0;
    }
    .alert > svg {
        width: 18px;
        height: 18px;
    }
    .mode {
        gap: 2px;
        padding: 4px;
    }
    .mode svg {
        width: 20px;
        height: 20px;
    }
    .mode span {
        font-size: 0.75em;
    }
    .button {
        padding: 2px 9px;
        font-size: 0.8125em;
    }
    .chip {
        height: 24px;
        padding: 0 8px 0 5px;
        gap: 4px;
    }
    .chip svg {
        width: 16px;
        height: 16px;
    }
}
/* what is not the point of the panel steps aside in a box that is too short for all of it */
@container alarm (max-height: 225px) {
    .zones {
        display: none;
    }
}
@container alarm (max-height: 190px) {
    .delay {
        display: none;
    }
}
/* four modes or two rows of two, never three and a stray one; the dense labels are smaller */
@container alarm (max-width: 270px) {
    .modes {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}
@container alarm (max-width: 270px) and (max-height: 320px) {
    .modes {
        grid-template-columns: repeat(4, minmax(0, 1fr));
    }
}
@container alarm (max-width: 200px) {
    .modes {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

/* the tile */
.tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: clamp(2px, 3cqmin, 8px);
    width: 100%;
    height: 100%;
    min-width: 0;
    padding: clamp(4px, 4cqmin, 12px);
    border: 0;
    border-radius: calc(var(--iob-border-radius) * 2);
    background: none;
    text-align: center;
}
.tile:hover {
    background: var(--hover);
}
.avatar {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    width: clamp(28px, 32cqmin, 72px);
    height: clamp(28px, 32cqmin, 72px);
    border-radius: calc(var(--iob-border-radius) * 2);
    background: color-mix(in srgb, var(--iob-text) 10%, transparent);
    color: var(--sev);
}
.avatar svg {
    width: 60%;
    height: 60%;
}
.texts {
    display: flex;
    flex-direction: column;
    min-width: 0;
    max-width: 100%;
}
.caption,
.state,
.countdown {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.caption,
.countdown {
    font-size: clamp(10px, 7cqmin, 14px);
    color: var(--iob-text-secondary);
}
.countdown {
    font-variant-numeric: tabular-nums;
}
.state {
    font-size: clamp(11px, 9cqmin, 20px);
    font-weight: 500;
    color: var(--sev);
}
@container alarm (min-aspect-ratio: 2 / 1) {
    .tile {
        flex-direction: row;
        gap: clamp(6px, 8cqmin, 16px);
        text-align: left;
    }
    .avatar {
        width: clamp(24px, 60cqmin, 56px);
        height: clamp(24px, 60cqmin, 56px);
    }
    .caption,
    .countdown {
        font-size: clamp(10px, 16cqmin, 14px);
    }
    .state {
        font-size: clamp(11px, 22cqmin, 18px);
    }
}

/* no instance chosen */
.hint {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    height: 100%;
    padding: 8px;
    text-align: center;
    color: var(--iob-text-secondary);
    font-size: clamp(11px, 5cqmin, 14px);
}
.hint svg {
    width: clamp(18px, 12cqmin, 36px);
    height: clamp(18px, 12cqmin, 36px);
    opacity: 0.6;
}

/* the circuits dialog */
.circuits h4 {
    margin: 8px 0 2px;
    font-size: 0.875em;
    font-weight: 500;
    color: var(--iob-text-secondary);
}
.circuits section:first-child h4 {
    margin-top: 0;
}
.circuits ul {
    margin: 0;
    padding: 0;
    list-style: none;
}
.circuits li {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 0;
    font-size: 0.875em;
    overflow-wrap: anywhere;
}
.circuits li svg {
    width: 22px;
    height: 22px;
}
.circuits svg.open {
    color: var(--iob-warning);
}
.circuits svg.closed {
    color: var(--iob-success);
}
.circuits li.empty {
    color: var(--iob-text-secondary);
}

/* the password dialog */
.password {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin: 0;
}
.field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.875em;
    color: var(--iob-text-secondary);
}
.field input {
    padding: 6px 0;
    border: 0;
    border-bottom: 1px solid color-mix(in srgb, var(--iob-text) 42%, transparent);
    border-radius: 0;
    background: transparent;
    color: var(--iob-text);
    font: inherit;
    font-size: 1.14em;
    outline: none;
}
.field input:focus {
    padding-bottom: 5px;
    border-bottom: 2px solid var(--iob-primary);
}
.field .help {
    font-size: 0.86em;
}
.field.error,
.field.error input {
    color: var(--iob-error);
    border-bottom-color: var(--iob-error);
}
.field.error input {
    color: var(--iob-text);
}
`;function J(e){switch(e){case k.burglary:case k.silentAlarm:return`error`;case k.getsActivated:case k.activationFailed:case k.activationAborted:return`warning`;case k.sharp:case k.sharpInside:case k.nightRest:return`success`;default:return`info`}}var ge={shieldOff:`m12 4.14 6 2.25v4.7c0 1.19-.23 2.36-.64 3.44l1.51 1.51c.72-1.53 1.13-3.22 1.13-4.95V5l-8-3-5.22 1.96 1.55 1.55zM2.81 2.81 1.39 4.22 4 6.83v4.26c0 5.05 3.41 9.76 8 10.91 1.72-.43 3.28-1.36 4.55-2.62l3.23 3.23 1.41-1.41zM12 19.92c-3.45-1.13-6-4.82-6-8.83V8.83l9.14 9.14c-.9.88-1.97 1.57-3.14 1.95`,shield:`M12 2 4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5zm6 9.09c0 4-2.55 7.7-6 8.83-3.45-1.13-6-4.82-6-8.83v-4.7l6-2.25 6 2.25z`,home:`m12 5.69 5 4.5V18h-2v-6H9v6H7v-7.81zM12 3 2 12h3v8h6v-6h2v6h6v-8h3z`,night:`M9.27 4.49c-1.63 7.54 3.75 12.41 7.66 13.8C15.54 19.38 13.81 20 12 20c-4.41 0-8-3.59-8-8 0-3.45 2.2-6.4 5.27-7.51m2.72-2.48C6.4 2.01 2 6.54 2 12c0 5.52 4.48 10 10 10 3.71 0 6.93-2.02 8.66-5.02-7.51-.25-12.09-8.43-8.32-14.97z`,clock:`M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2M12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8m.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z`,shieldBad:`M12 2 4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5zm6 9.09c0 4-2.55 7.7-6 8.83-3.45-1.13-6-4.82-6-8.83v-4.7l6-2.25 6 2.25zM9.91 8.5 8.5 9.91 10.59 12 8.5 14.09l1.41 1.41L12 13.42l2.09 2.08 1.41-1.41L13.42 12l2.08-2.09-1.41-1.41L12 10.59z`,shieldGood:`M12 2 4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5zm6 9.09c0 4-2.55 7.7-6 8.83-3.45-1.13-6-4.82-6-8.83V6.31l6-2.12 6 2.12zm-9.18-.5L7.4 12l3.54 3.54 5.66-5.66-1.41-1.41-4.24 4.24z`,layers:`m11.99 18.54-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27zm0-11.47L17.74 9 12 13.47 6.26 9z`,expand:`M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z`,check:`M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8m4.59-12.42L10 14.17l-2.59-2.58L6 13l4 4 8-8z`,off:`M14.59 8 12 10.59 9.41 8 8 9.41 10.59 12 8 14.59 9.41 16 12 13.41 14.59 16 16 14.59 13.41 12 16 9.41zM12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2m0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8`,problem:`M12 5.99 19.53 19H4.47zM12 2 1 21h22zm1 14h-2v2h2zm0-6h-2v4h2z`,panic:`M18 11v2h4v-2zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61M20.4 5.6c-.4-.53-.8-1.07-1.2-1.6-.99.74-2.24 1.68-3.2 2.4.4.53.8 1.07 1.2 1.6.96-.72 2.21-1.65 3.2-2.4M4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v4h2v-4h1l5 3V6L8 9zm5.03 1.71L11 9.53v4.94l-1.97-1.18-.48-.29H4v-2h4.55zM15.5 12c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.01 1.5-3.34`,doneAll:`m18 7-1.41-1.41-6.34 6.34 1.41 1.41zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12zM.41 13.41 6 19l1.41-1.41L1.83 12z`};function Y({name:e,className:t}){return/* @__PURE__ */ a(`svg`,{className:t,viewBox:`0 0 24 24`,"aria-hidden":`true`,focusable:`false`,children:/* @__PURE__ */ a(`path`,{d:ge[e]})})}var _e={off:`shieldOff`,arm:`shield`,inside:`home`,night:`night`};function X(e,t){return e===k.burglary||e===k.silentAlarm?`shieldBad`:t||e===k.getsActivated?`clock`:e===k.sharp||e===k.sharpInside||e===k.nightRest?`shieldGood`:`shield`}function Z(e,t,n){return me(e,K(e,t,e=>n(`alarm_other_alarm`,e)),e=>n(`alarm_circuits_${e}`))}function Q(e){let{model:t,config:n,t:s,onWrite:c}=e,[l,u]=r(!1),d=pe(t,n),f=K(t,n,e=>s(`alarm_other_alarm`,e)),p=Z(t,n,s).reduce((e,t)=>e+t.names.length,0);return/* @__PURE__ */ o(`div`,{className:`panel`,children:[/* @__PURE__ */ o(`div`,{className:`head`,children:[/* @__PURE__ */ a(`div`,{className:`title`,title:e.title,children:e.title}),e.showCircuits?/* @__PURE__ */ o(`button`,{type:`button`,className:`icon-button`,title:s(`alarm_circuits`),"aria-label":s(`alarm_circuits`),onClick:e.onCircuits,children:[/* @__PURE__ */ a(Y,{name:`layers`}),p?/* @__PURE__ */ a(`span`,{className:`dot`}):null]}):null,e.showDetails?/* @__PURE__ */ a(`button`,{type:`button`,className:`icon-button`,title:s(`alarm_details`),"aria-label":s(`alarm_details`),"aria-expanded":l,onClick:()=>u(e=>!e),children:/* @__PURE__ */ a(Y,{name:`expand`,className:`chevron${l?` open`:``}`})}):null]}),/* @__PURE__ */ a(ve,{model:t,t:s}),f.filter(e=>e.triggered).map(e=>/* @__PURE__ */ o(`div`,{className:`alert filled sev-error`,role:`alert`,children:[/* @__PURE__ */ a(Y,{name:`problem`}),/* @__PURE__ */ a(`div`,{className:`message`,children:e.sensors.length?/* @__PURE__ */ o(i,{children:[/* @__PURE__ */ a(`div`,{className:`alert-title`,children:e.name}),e.sensors.join(`, `)]}):e.name})]},e.key)),/* @__PURE__ */ a(`div`,{className:`modes`,children:ce.map(n=>/* @__PURE__ */ o(`button`,{type:`button`,className:`mode${t.mode===n?` selected`:``}`,"aria-pressed":t.mode===n,title:s(`alarm_mode_${n}`),onClick:()=>e.onMode(n),children:[/* @__PURE__ */ a(Y,{name:_e[n]}),/* @__PURE__ */ a(`span`,{children:s(`alarm_mode_${n}`)})]},n))}),e.showDelay?/* @__PURE__ */ o(`button`,{type:`button`,className:`button full delay${t.arming?` contained sev-warning`:``}`,onClick:()=>c(A.useList,se.armWithDelay),children:[/* @__PURE__ */ a(Y,{name:`clock`}),/* @__PURE__ */ a(`span`,{children:s(`alarm_with_delay`)})]}):null,e.showZones&&d.length?/* @__PURE__ */ a(`div`,{className:`chips zones`,children:d.map(e=>/* @__PURE__ */ a(ye,{zone:e,t:s,onClick:()=>c(j[e.number-1].switchId,!e.on)},e.number))}):null,e.showDetails&&l?/* @__PURE__ */ a(xe,{model:t,t:s,onWrite:c}):null]})}function ve({model:e,t}){let n=J(e.state),r=e.countdown??e.silentCountdown;return/* @__PURE__ */ o(`div`,{className:`status sev-${n}`,children:[/* @__PURE__ */ o(`div`,{className:`alert sev-${n}${n===`error`?` filled`:``}${r?` counting`:``}`,role:`status`,children:[/* @__PURE__ */ a(Y,{name:X(e.state,e.arming)}),/* @__PURE__ */ a(`div`,{className:`message`,children:t(F(e.state))}),r?/* @__PURE__ */ a(`div`,{className:`action`,children:t(`alarm_seconds`,r)}):null]}),r?/* @__PURE__ */ a(`div`,{className:`progress sev-${n===`error`?`error`:`warning`}`}):null]})}function ye({zone:e,t,onClick:n}){let r=`${t(`alarm_zone`,e.number)} · ${t(e.on?`alarm_on`:`alarm_off`)}`,i=e.on?e.changed?`filled sev-warning`:`sev-success`:`off`,s=e.on?e.changed?`problem`:`check`:`off`;return/* @__PURE__ */ o(`button`,{type:`button`,className:`chip ${i}`,title:r,"aria-pressed":e.on,onClick:n,children:[/* @__PURE__ */ a(Y,{name:s}),/* @__PURE__ */ a(`span`,{children:r})]})}var be={error:`problem`,warning:`problem`,info:`check`,success:`check`};function xe({model:e,t,onWrite:n}){let r=[e.armable?{key:`alarm_ready`,severity:`success`}:{key:`alarm_not_armable`,severity:`warning`}];e.burglary&&r.push({key:`alarm_burglary`,severity:`error`}),e.silentAlarm&&r.push({key:`alarm_silent_alarm`,severity:`error`}),e.siren&&r.push({key:`alarm_siren`,severity:`error`}),e.activationFailed&&r.push({key:`alarm_failed`,severity:`warning`}),e.armedWithWarnings&&r.push({key:`alarm_with_warnings`,severity:`warning`}),e.notificationChanges&&r.push({key:`alarm_notification_changes`,severity:`warning`});let i=he(e.log);return/* @__PURE__ */ o(`div`,{className:`details`,children:[/* @__PURE__ */ a(`div`,{className:`divider`}),/* @__PURE__ */ a(`div`,{className:`chips`,children:r.map(e=>/* @__PURE__ */ o(`span`,{className:`chip small flag sev-${e.severity}`,children:[/* @__PURE__ */ a(Y,{name:be[e.severity]}),/* @__PURE__ */ a(`span`,{children:t(e.key)})]},e.key))}),/* @__PURE__ */ o(`button`,{type:`button`,role:`switch`,"aria-checked":e.presence,className:`switch${e.presence?` on`:``}`,onClick:()=>n(A.presence,!e.presence),children:[/* @__PURE__ */ a(`span`,{className:`track`,children:/* @__PURE__ */ a(`span`,{className:`thumb`})}),/* @__PURE__ */ a(`span`,{className:`label`,children:t(`alarm_presence`)})]}),/* @__PURE__ */ o(`div`,{className:`actions wrap`,children:[/* @__PURE__ */ o(`button`,{type:`button`,className:`button error grow`,onClick:()=>n(A.panic,!0),children:[/* @__PURE__ */ a(Y,{name:`panic`}),/* @__PURE__ */ a(`span`,{children:t(`alarm_panic`)})]}),/* @__PURE__ */ o(`button`,{type:`button`,className:`button primary grow`,onClick:()=>n(A.quitChanges,!0),children:[/* @__PURE__ */ a(Y,{name:`doneAll`}),/* @__PURE__ */ a(`span`,{children:t(`alarm_acknowledge`)})]})]}),i?/* @__PURE__ */ a(`div`,{className:`log`,children:i}):null]})}function Se({model:e,caption:t,t:n,onOpen:r}){let i=J(e.state),s=e.countdown??e.silentCountdown,c=n(F(e.state));return/* @__PURE__ */ o(`button`,{type:`button`,className:`tile sev-${i}`,title:t?`${t}: ${c}`:c,onClick:r,children:[/* @__PURE__ */ a(`span`,{className:`avatar`,children:/* @__PURE__ */ a(Y,{name:X(e.state,e.arming)})}),/* @__PURE__ */ o(`span`,{className:`texts`,children:[t?/* @__PURE__ */ a(`span`,{className:`caption`,children:t}):null,/* @__PURE__ */ a(`span`,{className:`state`,children:c}),s?/* @__PURE__ */ a(`span`,{className:`countdown`,children:n(`alarm_seconds`,s)}):null]})]})}function Ce({content:e,editMode:t,panel:n,tile:r}){return/* @__PURE__ */ o(`div`,{className:`alarm content-${e}${t?` edit`:``}`,children:[e===`status`?null:/* @__PURE__ */ a(Q,{...n}),e===`panel`?null:/* @__PURE__ */ a(Se,{...r})]})}function $({text:e,editMode:t}){return/* @__PURE__ */ o(`div`,{className:`hint${t?` edit`:``}`,children:[/* @__PURE__ */ a(Y,{name:`shield`}),/* @__PURE__ */ a(`span`,{children:e})]})}function we({groups:e,t}){return/* @__PURE__ */ a(`div`,{className:`circuits`,children:e.map(e=>/* @__PURE__ */ o(`section`,{children:[/* @__PURE__ */ a(`h4`,{children:e.label}),/* @__PURE__ */ a(`ul`,{children:e.names.length?e.names.map(e=>/* @__PURE__ */ o(`li`,{children:[/* @__PURE__ */ a(Y,{name:`problem`,className:`open`}),/* @__PURE__ */ a(`span`,{children:e})]},e)):/* @__PURE__ */ o(`li`,{className:`empty`,children:[/* @__PURE__ */ a(Y,{name:`check`,className:`closed`}),/* @__PURE__ */ a(`span`,{children:t(`alarm_circuits_empty`)})]})})]},e.key))})}function Te({wrongPassword:e,t:i,onSubmit:s,onCancel:c}){let[l,u]=r(``),[d,f]=r(!1),p=n(null);t(()=>{let e=setTimeout(()=>p.current?.focus(),50);return()=>clearTimeout(e)},[]);let m=d&&e,h=()=>{l&&(f(!0),u(``),s(l))};return/* @__PURE__ */ o(`form`,{className:`password`,onSubmit:e=>{e.preventDefault(),h()},children:[/* @__PURE__ */ o(`label`,{className:`field${m?` error`:``}`,children:[/* @__PURE__ */ a(`span`,{children:i(`alarm_password`)}),/* @__PURE__ */ a(`input`,{ref:p,type:`password`,autoComplete:`current-password`,value:l,onChange:e=>u(e.currentTarget.value)}),/* @__PURE__ */ a(`span`,{className:`help`,children:m?i(`alarm_password_wrong`):`\xA0`})]}),/* @__PURE__ */ o(`div`,{className:`actions`,children:[/* @__PURE__ */ a(`button`,{type:`button`,className:`button`,onClick:c,children:i(`alarm_cancel`)}),/* @__PURE__ */ a(`button`,{type:`submit`,className:`button contained primary`,disabled:!l,children:i(`alarm_ok`)})]})]})}var Ee=444;oe(I,class extends O{#e;#t=null;#n=null;#r=null;#i=/* @__PURE__ */ new Set;#a=/* @__PURE__ */ new Set;#o=!1;#s=!1;#c=null;constructor(){super();let e=this.attachShadow({mode:`open`}),t=document.createElement(`style`);t.textContent=q,this.#e=document.createElement(`div`),this.#e.className=`mount`,e.append(t,this.#e)}disconnectedCallback(){super.disconnectedCallback(),this.#n=null,queueMicrotask(()=>{if(!this.isConnected){for(let e of[...this.#a])e();this.#t?.unmount(),this.#t=null}})}getStateIds(e){let t=L(e.instance);return t?(R(e.content)===`status`&&!this.#o?P:N).map(e=>`${t}.${e}`):[]}render(){this.#t||=e(this.#e),this.#e.className=this.#l();let t=this.settings,n=z(this.systemLang),r=L(t.instance);if(!r){this.#r=null,this.#t.render(/* @__PURE__ */ a($,{text:n(`alarm_no_instance`),editMode:this.editMode})),this.#m();return}this.#d(r);let i=de(this.#u(r)),o={instance:r,model:i,config:this.#n?.config??null,t:n};this.#r=o,this.#c&&i.mode===`off`&&this.#c(),this.#t.render(/* @__PURE__ */ a(Ce,{content:R(t.content),editMode:this.editMode,panel:this.#p(o),tile:{model:i,caption:t.panelTitle||``,t:n,onOpen:()=>void this.#_()}})),this.#m()}#l(){return`mount${this.theme.type===`dark`?` dark`:``}`}#u(e){let t={};for(let n of N){let r=this.states[`${e}.${n}`];r!==void 0&&(t[n]=r?r.val:null)}return t}#d(e){let t=this.socket;if(!t||this.#n?.socket===t&&this.#n.instance===e)return;let n={socket:t,instance:e,config:null};this.#n=n;let r=e=>{this.#n===n&&(n.config=e,this.isConnected&&this.render())};t.getObject(`system.adapter.${e}`).then(e=>r(G(e?.native))).catch(t=>{console.warn(`<${I}>: cannot read the configuration of ${e}: ${String(t)}`),r(fe)})}#f(e,t,n){this.setState(`${e}.${t}`,n).catch(n=>console.error(`<${I}>: cannot write ${e}.${t}: ${String(n)}`))}#p(e){let t=this.settings,{instance:n,model:r,t:i}=e;return{model:r,config:e.config,title:t.panelTitle||i(`alarm_title`),showZones:t.showZones!==!1,showDelay:t.showDelay!==!1,showCircuits:t.showCircuits!==!1,showDetails:t.showDetails!==!1,t:i,onMode:e=>{this.editMode||(e===`off`&&t.askPassword&&r.mode!==`off`?this.#y():this.#f(n,A.useList,le[e]))},onWrite:(e,t)=>this.#f(n,e,t),onCircuits:()=>void this.#v()}}#m(){for(let e of this.#i)e()}#h(){this.settings=this.settings}async#g(t,n,r){let i=document.createElement(`div`),a=i.attachShadow({mode:`open`}),o=document.createElement(`style`);o.textContent=q;let s=document.createElement(`div`);a.append(o,s);let c=e(s),l=()=>{i.dispatchEvent(new CustomEvent(p,{detail:null,bubbles:!0,composed:!0}))},u=()=>{for(let[e,t]of Object.entries(C(this.theme)))i.style.setProperty(e,t);s.className=`${this.#l()} dialog`,c.render(n(l))};this.#i.add(u),this.#a.add(l),r?.(l),u();try{await this.openDialog({title:t,element:i,width:Ee})}finally{this.#i.delete(u),this.#a.delete(l),c.unmount()}}async#_(){if(!(this.editMode||this.#o)){this.#o=!0,this.#h();try{await this.#g(void 0,()=>{let e=this.#r;return e?/* @__PURE__ */ a(Q,{...this.#p(e)}):/* @__PURE__ */ a($,{text:z(this.systemLang)(`alarm_no_instance`),editMode:!1})})}finally{this.#o=!1,this.#h()}}}async#v(){let e=this.#r;if(!(this.editMode||this.#s||!e)){this.#s=!0;try{await this.#g(e.t(`alarm_circuits`),()=>{let e=this.#r;return e?/* @__PURE__ */ a(we,{groups:Z(e.model,e.config,e.t),t:e.t}):null})}finally{this.#s=!1}}}async#y(){let e=this.#r;if(this.editMode||this.#c||!e)return;let t=e.instance;try{await this.#g(e.t(`alarm_password_title`),e=>{let n=this.#r;return n?/* @__PURE__ */ a(Te,{wrongPassword:n.model.wrongPassword,t:n.t,onSubmit:e=>this.#f(t,A.disableWithPassword,e),onCancel:e}):null},e=>{this.#c=()=>{this.#c=null,e()}})}finally{this.#c=null}}});