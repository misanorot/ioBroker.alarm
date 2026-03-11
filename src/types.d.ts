// shorts table: data-options=" ;true;false;deactivated;sharp;sharp_inside;burglary;night_rest;gets_activated;activation_failed;activation_aborted;silent_alarm"
type TriggerValue =
    | ''
    | 'true'
    | 'false'
    | 'deactivated'
    | 'sharp'
    | 'sharp_inside'
    | 'burglary'
    | 'night_rest'
    | 'gets_activated'
    | 'activation_failed'
    | 'activation_aborted'
    | 'silent_alarm';

// shorts table: data-options for select_id
type ShortsSelectId =
    | 'status.state_list'
    | 'status.activated'
    | 'status.gets_activated'
    | 'status.deactivated'
    | 'status.burglar_alarm'
    | 'status.silent_alarm'
    | 'status.siren'
    | 'status.activation_failed'
    | 'status.sleep'
    | 'status.activated_with_warnings'
    | 'status.enableable'
    | 'status.sharp_inside_activated'
    | 'status.siren_inside'
    | 'info.notification_circuit_changes'
    | 'status.alarm_flash'
    | 'status.silent_flash'
    | 'other_alarms.one_changes'
    | 'other_alarms.two_changes';

// shorts_in table: data-options for select_id
type ShortsInSelectId =
    | 'use.activate_nightrest'
    | 'use.activate_sharp_inside'
    | 'use.disable'
    | 'use.enable'
    | 'use.enable_with_delay'
    | 'use.panic'
    | 'use.quit_changes';

// Common select types derived from <select> elements in index_m.html
type TimeUnit = 'sec' | 'min';
type PresenceOption = 'time' | 'sunrise' | 'sunset' | 'light';

export interface CircuitRow {
    enabled: boolean;
    name: string;
    name_id: string;
    negativ: boolean;
    alarm: boolean;
    delay: boolean;
    leave: boolean;
    warning: boolean;
    delay_inside: boolean;
    night: boolean;
}

export interface ShortsInRow {
    enabled: boolean;
    name: string;
    name_id: string;
    trigger_val: 'any' | 'ne';
    value: string;
    select_id: ShortsInSelectId;
}

export interface ShortsRow {
    enabled: boolean;
    select_id: ShortsSelectId;
    trigger_val: TriggerValue;
    name: string;
    name_id: string;
    value: string;
}

export interface OtherAlarmRow {
    enabled: boolean;
    name: string;
    name_id: string;
    negativ: boolean;
}

export interface ZoneRow {
    enabled: boolean;
    name: string;
    name_id: string;
    negativ: boolean;
}

export interface PresenceRow {
    enabled: boolean;
    name: string;
    name_id: string;
    option_presence: PresenceOption;
    presence_time_from: string;
    presence_time_to: string;
    presence_length: number;
    presence_length_select: TimeUnit;
    presence_length_shuffle: number;
    presence_delay: number;
    presence_delay_select: TimeUnit;
    presence_delay_shuffle: number;
    presence_val_on: string;
    presence_val_off: string;
    presence_trigger_light: string;
    presence_light_lux: number;
}

export interface SayitRow {
    enabled: boolean;
    name: string;
    name_id: string;
    speech_delay: number;
    opt_say_one: boolean;
    opt_say_two: boolean;
    opt_say_aborted: boolean;
    opt_say_three: boolean;
    opt_say_four: boolean;
    opt_say_five: boolean;
    opt_say_six: boolean;
    opt_say_seven: boolean;
    opt_say_eigth: boolean;
    opt_say_nine: boolean;
    opt_say_nine_plus: boolean;
    opt_say_zero: boolean;
    opt_say_count: boolean;
    opt_say_fire: boolean;
    opt_say_water: boolean;
}

export interface AlarmAdapterConfig {
    new_version: boolean;
    circuits: CircuitRow[];
    shorts_in: ShortsInRow[];
    shorts: ShortsRow[];
    one: OtherAlarmRow[];
    two: OtherAlarmRow[];
    zone_one: ZoneRow[];
    zone_two: ZoneRow[];
    zone_three: ZoneRow[];
    presence: PresenceRow[];
    presence_activate_delay: number;
    presence_activate_delay_select: TimeUnit;
    time_activate: number;
    time_alarm: number;
    time_silent: number;
    time_warning: number;
    time_activate_select: TimeUnit;
    time_alarm_select: TimeUnit;
    time_silent_select: TimeUnit;
    time_warning_select: TimeUnit;
    alarm_flash: number;
    silent_flash: number;
    opt_say_night: boolean;
    opt_night_silent: boolean;
    opt_say_warn: boolean;
    opt_say_names: boolean;
    opt_say_changes: boolean;
    opt_say_warn_changes: boolean;
    opt_night: boolean;
    opt_log: boolean;
    opt_siren: boolean;
    opt_leave: boolean;
    opt_warning: boolean;
    night_from: string;
    night_to: string;
    send_alarm: boolean;
    send_alarm_inside: boolean;
    send_notification_changes: boolean;
    send_one_changes: boolean;
    send_two_changes: boolean;
    send_activation: boolean;
    send_activation_inside: boolean;
    send_activation_warnings: boolean;
    send_activation_warnings_inside: boolean;
    send_activation_warnings_night: boolean;
    send_activated_with_warnings: boolean;
    send_alarm_silent: boolean;
    send_alarm_silent_inside: boolean;
    send_failed: boolean;
    send_zone_one: boolean;
    send_zone_two: boolean;
    send_zone_three: boolean;
    sayit: SayitRow[];
    text_activated: string;
    text_deactivated: string;
    text_failed: string;
    text_warning: string;
    text_changes: string;
    text_changes_night: string;
    text_alarm: string;
    text_alarm_pause: number;
    text_nightrest_beginn: string;
    text_nightrest_end: string;
    text_warn_begin: string;
    text_warn_end: string;
    text_countdown: string;
    text_one: string;
    text_two: string;
    text_aborted: string;
    password: string;
    sendTo: string;
    alarm: string;
    alarm_repeat: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '15' | '20';
    changes_repeat: string;
    warning: string;
    night: string;
    log_pass: string;
    log_act_not: string;
    log_act: string;
    log_warn_act: string;
    log_act_warn: string;
    log_act_notice: string;
    log_deact: string;
    log_warn_deact: string;
    log_burgle: string;
    log_panic: string;
    log_warn: string;
    log_night: string;
    log_sleep_b: string;
    log_sleep_e: string;
    log_warn_b_w: string;
    log_nights_b_w: string;
    log_one: string;
    log_two: string;
    log_aborted: string;
    one_name: string;
    two_name: string;
    log_zone_one: string;
    log_zone_two: string;
    log_zone_three: string;
    opt_telegram: boolean;
    chatID: string;
    user: string;
}
