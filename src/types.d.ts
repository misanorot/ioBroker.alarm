/**
 * Trigger value for output shortcuts.
 * Determines which alarm state transition triggers the shortcut.
 */
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

/**
 * Internal adapter state IDs available as shortcut sources.
 * These are the alarm status data points that can trigger output shortcuts.
 */
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
    | 'status.enableable' // should be "activatable". But let it be
    | 'status.sharp_inside_activated'
    | 'status.siren_inside'
    | 'info.notification_circuit_changes'
    | 'status.alarm_flash'
    | 'status.silent_flash'
    | 'other_alarms.one_changes'
    | 'other_alarms.two_changes';

/**
 * Internal adapter state IDs available as input shortcut targets.
 * These are the alarm control data points that can be set by input shortcuts.
 */
type ShortsInSelectId =
    | 'use.activate_nightrest'
    | 'use.activate_sharp_inside'
    | 'use.disable'
    | 'use.enable'
    | 'use.enable_with_delay'
    | 'use.panic'
    | 'use.quit_changes';

/** Time unit selector for duration fields. */
type TimeUnit = 'sec' | 'min';

/** Presence activation mode: time-based window, sunrise/sunset-based, or light-sensor-based. */
type PresenceOption = 'time' | 'sunrise' | 'sunset' | 'light';

/**
 * A row in the alarm circuits table.
 * Each circuit represents a monitored sensor/state that participates in the alarm system.
 */
export interface CircuitRow {
    /** Whether this circuit is active. */
    enabled: boolean;
    /** Display name of the circuit (resolved from the ioBroker object). */
    name: string;
    /** ioBroker object ID of the monitored state. */
    name_id: string;
    /** Whether to negate the trigger value (triggers on `false` instead of `true`). */
    negativ: boolean;
    /** Whether this circuit belongs to the alarm (full protection / "Alarmkreis") group. */
    alarm: boolean;
    /** Whether this circuit triggers with a delay (silent alarm before full alarm). */
    delay: boolean;
    /** Whether activating this circuit during countdown ends it and arms the system (leave mode). */
    leave: boolean;
    /** Whether this circuit belongs to the sharp-inside (perimeter / "Scharf innen") group. */
    warning: boolean;
    /** Whether this circuit triggers with a delay in sharp-inside mode. */
    delay_inside: boolean;
    /** Whether this circuit belongs to the notification (night rest) group. */
    night: boolean;
}

/**
 * A row in the input shortcuts table.
 * Input shortcuts allow external states to control alarm functions (arm, disarm, panic, etc.).
 */
export interface ShortsInRow {
    /** Whether this input shortcut is active. */
    enabled: boolean;
    /** Display name of the shortcut (resolved from the ioBroker object). */
    name: string;
    /** ioBroker object ID of the external input state. */
    name_id: string;
    /** Trigger mode: 'any' triggers on any change, 'ne' triggers only when value differs. */
    trigger_val: 'any' | 'ne';
    /** The value to write to the target state when triggered. */
    value: string;
    /** The internal alarm control state to set when triggered. */
    select_id: ShortsInSelectId;
}

/**
 * A row in the output shortcuts table.
 * Output shortcuts allow alarm state changes to set external states (e.g., sirens, lights, notifications).
 */
export interface ShortsRow {
    /** Whether this output shortcut is active. */
    enabled: boolean;
    /** The internal alarm status state that acts as the trigger source. */
    select_id: ShortsSelectId;
    /** The alarm state transition value that triggers this shortcut. */
    trigger_val: TriggerValue;
    /** Display name of the shortcut (resolved from the ioBroker object). */
    name: string;
    /** ioBroker object ID of the external output state. */
    name_id: string;
    /** The value to write to the target state when triggered. */
    value: string;
}

/**
 * A row in the other alarms table (type one = fire, type two = water).
 * Additional alarm circuits for fire, water, or other custom alarm types.
 */
export interface OtherAlarmRow {
    /** Whether this other alarm circuit is active. */
    enabled: boolean;
    /** Display name of the circuit (resolved from the ioBroker object). */
    name: string;
    /** ioBroker object ID of the monitored state. */
    name_id: string;
    /** Whether to negate the trigger value. */
    negativ: boolean;
}

/**
 * A row in a zone table.
 * Zones provide additional monitoring groups that report state changes independently.
 */
export interface ZoneRow {
    /** Whether this zone circuit is active. */
    enabled: boolean;
    /** Display name of the circuit (resolved from the ioBroker object). */
    name: string;
    /** ioBroker object ID of the monitored state. */
    name_id: string;
    /** Whether to negate the trigger value. */
    negativ: boolean;
}

/**
 * A row in the presence simulation table.
 * Each row defines a device to toggle on/off to simulate someone being home.
 */
export interface PresenceRow {
    /** Whether this presence entry is active. */
    enabled: boolean;
    /** Display name of the device (resolved from the ioBroker object). */
    name: string;
    /** ioBroker object ID of the device state to control. */
    name_id: string;
    /** Activation mode: time-based window, sunrise-based, sunset-based, or light-sensor-based. */
    option_presence: PresenceOption;
    /** Start time for the activation window (HH:MM format). Used when option is 'time'. */
    presence_time_from: string;
    /** End time for the activation window (HH:MM format). Used when option is 'time'. */
    presence_time_to: string;
    /** Duration the device stays on (duty cycle length). */
    presence_length: number;
    /** Time unit for the duty cycle length (seconds or minutes). */
    presence_length_select: TimeUnit;
    /** Random factor applied to the duty cycle length for more realistic simulation. */
    presence_length_shuffle: number;
    /** Delay before the device turns on after the activation window starts. */
    presence_delay: number;
    /** Time unit for the delay (seconds or minutes). */
    presence_delay_select: TimeUnit;
    /** Random factor applied to the delay for more realistic simulation. */
    presence_delay_shuffle: number;
    /** Value to write when turning the device ON (e.g., 'true', '1'). */
    presence_val_on: string;
    /** Value to write when turning the device OFF (e.g., 'false', '0'). */
    presence_val_off: string;
    /** ioBroker object ID of a light/lux sensor used in 'light' mode. */
    presence_trigger_light: string;
    /** Lux threshold: device activates only when light level is below this value. */
    presence_light_lux: number;
}

/**
 * A row in the speech output (sayIt) table.
 * Each row configures a TTS instance and which alarm events should produce speech output.
 * The numbered options (1-9+, 0, time, one, two) correspond to specific alarm phrases.
 */
export interface SayItRow {
    /** Whether this TTS instance is active. */
    enabled: boolean;
    /** Display name of the TTS instance (resolved from the ioBroker object). */
    name: string;
    /** ioBroker object ID of the TTS state (e.g., sayit.0.tts.text). */
    name_id: string;
    /** Delay in seconds before sending the speech text to the TTS instance. */
    speech_delay: number;
    /** Option 1: Announce phrase after activation ("text_activated"). */
    opt_say_one: boolean;
    /** Option 2: Announce phrase after deactivation ("text_deactivated"). */
    opt_say_two: boolean;
    /** Option x: Announce phrase when activation is aborted ("text_aborted"). */
    opt_say_aborted: boolean;
    /** Option 3: Announce phrase when activated with warnings. */
    opt_say_three: boolean;
    /** Option 4: Announce phrase at warnings (sharp inside / night rest begin). */
    opt_say_four: boolean;
    /** Option 5: Announce phrase at notification circuit changes. */
    opt_say_five: boolean;
    /** Option 6: Announce phrase at burglary alarm ("text_alarm"). */
    opt_say_six: boolean;
    /** Option 7: Announce phrase when night rest begins ("text_nightrest_beginn"). */
    opt_say_seven: boolean;
    /** Option 8: Announce phrase when night rest ends ("text_nightrest_end"). */
    opt_say_eigth: boolean;
    /** Option 9: Announce phrase at notification changes during armed states. */
    opt_say_nine: boolean;
    /** Option 9+: Announce phrase at sharp inside begin / warn begin ("text_warn_begin"). */
    opt_say_nine_plus: boolean;
    /** Option 0: Announce phrase at sharp inside end / warn end ("text_warn_end"). */
    opt_say_zero: boolean;
    /** Option time: Announce activation countdown ("text_countdown"). */
    opt_say_count: boolean;
    /** Option one: Announce phrase for other alarm type one / fire ("text_one"). */
    opt_say_fire: boolean;
    /** Option two: Announce phrase for other alarm type two / water ("text_two"). */
    opt_say_water: boolean;
}

/**
 * Complete adapter configuration as stored in ioBroker.
 * Configured via the admin UI (admin/index_m.html).
 */
export interface AlarmAdapterConfig {
    /** Internal version flag for migration from v2.x to v3.x. */
    new_version: boolean;

    // ── Tables ──────────────────────────────────────────────────────────────

    /** Alarm circuit definitions (sensors/states to monitor). */
    circuits: CircuitRow[];
    /** Input shortcuts: external states that control alarm functions. */
    shorts_in: ShortsInRow[];
    /** Output shortcuts: alarm state changes that set external states. */
    shorts: ShortsRow[];
    /** Other alarm type one (e.g., fire) circuit definitions. */
    one: OtherAlarmRow[];
    /** Other alarm type two (e.g., water) circuit definitions. */
    two: OtherAlarmRow[];
    /** Zone one monitoring circuits. */
    zone_one: ZoneRow[];
    /** Zone two monitoring circuits. */
    zone_two: ZoneRow[];
    /** Zone three monitoring circuits. */
    zone_three: ZoneRow[];
    /** Presence simulation device definitions. */
    presence: PresenceRow[];
    /** TTS (speech output) instance configurations. */
    sayit: SayItRow[];

    // ── Timers ──────────────────────────────────────────────────────────────

    /** Delay before the alarm activates after arming (activation countdown). */
    time_activate: number;
    /** Duration the siren sounds during a burglary alarm. */
    time_alarm: number;
    /** Delay before the silent alarm escalates to a full alarm. */
    time_silent: number;
    /** Duration the siren sounds during a sharp-inside alarm. */
    time_warning: number;
    /** Time unit for the activation countdown. */
    time_activate_select: TimeUnit;
    /** Time unit for the burglary siren duration. */
    time_alarm_select: TimeUnit;
    /** Time unit for the silent alarm delay. */
    time_silent_select: TimeUnit;
    /** Time unit for the sharp-inside siren duration. */
    time_warning_select: TimeUnit;
    /** Flash light frequency in seconds during a burglary alarm (0 = disabled). */
    alarm_flash: number;
    /** Flash light frequency in seconds during a silent alarm (0 = disabled). */
    silent_flash: number;

    // ── Presence ────────────────────────────────────────────────────────────

    /** Delay before presence simulation starts after alarm activation. */
    presence_activate_delay: number;
    /** Time unit for the presence activation delay. */
    presence_activate_delay_select: TimeUnit;

    // ── Speech options ──────────────────────────────────────────────────────

    /** Announce warnings during night rest via speech. */
    opt_say_night: boolean;
    /** Suppress speech output during night rest. */
    opt_night_silent: boolean;
    /** Announce warnings at sharp inside begin via speech. */
    opt_say_warn: boolean;
    /** Announce sensor/device names in speech output instead of generic phrases. */
    opt_say_names: boolean;
    /** Announce state changes during sharp and sharp-inside via speech. */
    opt_say_changes: boolean;
    /** Announce warning changes during night rest via speech. */
    opt_say_warn_changes: boolean;

    // ── General options ─────────────────────────────────────────────────────

    /** Enable night rest mode scheduling. */
    opt_night: boolean;
    /** Enable detailed log output. */
    opt_log: boolean;
    /** Activate the external siren during sharp-inside burglary. */
    opt_siren: boolean;
    /** Enable leave mode: circuit trigger during countdown finishes it and arms the system. */
    opt_leave: boolean;
    /** Enable sharp-inside mode (perimeter monitoring while home). */
    opt_warning: boolean;

    // ── Night rest schedule ─────────────────────────────────────────────────

    /** Time when night rest begins (HH:MM format). */
    night_from: string;
    /** Time when night rest ends (HH:MM format). */
    night_to: string;

    // ── Notification toggles ────────────────────────────────────────────────

    /** Send notification on burglary alarm. */
    send_alarm: boolean;
    /** Send notification on burglary alarm in sharp-inside mode. */
    send_alarm_inside: boolean;
    /** Send notification on circuit changes during armed/sharp-inside/night rest. */
    send_notification_changes: boolean;
    /** Send notification on other alarm type one (fire) changes. */
    send_one_changes: boolean;
    /** Send notification on other alarm type two (water) changes. */
    send_two_changes: boolean;
    /** Send notification on alarm activation/deactivation. */
    send_activation: boolean;
    /** Send notification on sharp-inside activation/deactivation. */
    send_activation_inside: boolean;
    /** Send notification when warnings exist upon activation. */
    send_activation_warnings: boolean;
    /** Send notification when warnings exist upon sharp-inside activation. */
    send_activation_warnings_inside: boolean;
    /** Send notification when warnings exist at beginning of night rest. */
    send_activation_warnings_night: boolean;
    /** Send notification when system is activated with warnings. */
    send_activated_with_warnings: boolean;
    /** Send notification on silent alarm. */
    send_alarm_silent: boolean;
    /** Send notification on silent alarm in sharp-inside mode. */
    send_alarm_silent_inside: boolean;
    /** Send notification on wrong password entry. */
    send_failed: boolean;
    /** Send notification on zone one changes. */
    send_zone_one: boolean;
    /** Send notification on zone two changes. */
    send_zone_two: boolean;
    /** Send notification on zone three changes. */
    send_zone_three: boolean;

    // ── Speech phrases ──────────────────────────────────────────────────────

    /** Phrase spoken after activation (option 1). */
    text_activated: string;
    /** Phrase spoken after deactivation (option 2). */
    text_deactivated: string;
    /** Phrase spoken when activation fails (option 3). */
    text_failed: string;
    /** Phrase spoken at warnings during sharp inside / night rest begin (option 4). */
    text_warning: string;
    /** Phrase spoken at circuit changes during sharp / sharp inside (option 5). */
    text_changes: string;
    /** Phrase spoken at circuit changes during night rest (option 9). */
    text_changes_night: string;
    /** Phrase spoken during a burglary alarm (option 6). */
    text_alarm: string;
    /** Pause in seconds between repeated burglary alarm phrases. */
    text_alarm_pause: number;
    /** Phrase spoken when night rest begins (option 7). */
    text_nightrest_beginn: string;
    /** Phrase spoken when night rest ends (option 8). */
    text_nightrest_end: string;
    /** Phrase spoken when sharp inside begins (option 9+). */
    text_warn_begin: string;
    /** Phrase spoken when sharp inside ends (option 0). */
    text_warn_end: string;
    /** Phrase spoken during the activation countdown (option time/11). */
    text_countdown: string;
    /** Phrase spoken for other alarm type one / fire (option one/12). */
    text_one: string;
    /** Phrase spoken for other alarm type two / water (option two/13). */
    text_two: string;
    /** Phrase spoken when activation is aborted (option x/14). */
    text_aborted: string;

    // ── Password ────────────────────────────────────────────────────────────

    /** Password required for arming/disarming via password-protected controls. */
    password: string;

    // ── Notification delivery ───────────────────────────────────────────────

    /** Space-separated list of notification adapter instance IDs (e.g., 'telegram.0 pushover.0'). */
    sendTo: string;
    /** Notification text for alarm (burglary). */
    alarm: string;
    /** Number of times the burglary alarm phrase is repeated via speech. */
    alarm_repeat: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '15' | '20';
    /** Repeat count for change notification messages. */
    changes_repeat: string;
    /** Notification text for sharp-inside warnings. */
    warning: string;
    /** Notification text for night rest changes. */
    night: string;

    // ── Log messages ────────────────────────────────────────────────────────

    /** Log text: wrong password entered. */
    log_pass: string;
    /** Log text: cannot activate (circuits open). */
    log_act_not: string;
    /** Log text: alarm activated. */
    log_act: string;
    /** Log text: sharp inside activated. */
    log_warn_act: string;
    /** Log text: activated with warnings. */
    log_act_warn: string;
    /** Log text: notice at activation with delay. */
    log_act_notice: string;
    /** Log text: alarm deactivated. */
    log_deact: string;
    /** Log text: sharp inside deactivated. */
    log_warn_deact: string;
    /** Log text: burglary detected. */
    log_burgle: string;
    /** Log text: panic button activated. */
    log_panic: string;
    /** Log text: circuit changes detected. */
    log_warn: string;
    /** Log text: changes during night rest. */
    log_night: string;
    /** Log text: night rest begins. */
    log_sleep_b: string;
    /** Log text: night rest ends. */
    log_sleep_e: string;
    /** Log text: sharp inside begins with warnings. */
    log_warn_b_w: string;
    /** Log text: night rest begins with warnings. */
    log_nights_b_w: string;
    /** Log text: other alarm type one (fire) triggered. */
    log_one: string;
    /** Log text: other alarm type two (water) triggered. */
    log_two: string;
    /** Log text: activation aborted. */
    log_aborted: string;
    /** Log text: zone one changes detected. */
    log_zone_one: string;
    /** Log text: zone two changes detected. */
    log_zone_two: string;
    /** Log text: zone three changes detected. */
    log_zone_three: string;

    // ── Other alarm names ───────────────────────────────────────────────────

    /** Display name for other alarm type one (e.g., "Fire"). */
    one_name: string;
    /** Display name for other alarm type two (e.g., "Water"). */
    two_name: string;

    // ── Telegram integration ────────────────────────────────────────────────

    /** Enable special Telegram parameters (chatID/user filtering). */
    opt_telegram: boolean;
    /** Telegram chat ID for targeted message delivery. */
    chatID: string;
    /** Telegram username for targeted message delivery. */
    user: string;
}
