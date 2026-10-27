/**
 * What the panel's states mean in the language of the MUI palette.
 *
 * There are no colours of its own anywhere in these widgets: a state maps to one of the four
 * severities MUI gives an `Alert`, a `Chip` and a `Button`, and everything else - surfaces,
 * dividers, selection, disabled text - comes from the theme's own tokens. That is what lets the
 * panel follow every ioBroker theme, light and dark, instead of bringing another one along.
 */

import { AlarmState } from './states';

/** The severities MUI understands, as `severity` of an `Alert` and as `color` elsewhere. */
export type Severity = 'success' | 'info' | 'warning' | 'error';

/**
 * How loud the current state should be.
 *
 * `success` is the armed system, not the disarmed one: the alarm system doing its job is the good
 * case. A disarmed system is neither good nor bad, so it stays `info`, and everything the user has
 * to do something about is `warning` or `error`.
 *
 * @param state value of `status.state_list`
 */
export function stateSeverity(state: AlarmState | null): Severity {
    switch (state) {
        case AlarmState.burglary:
        case AlarmState.silentAlarm:
            return 'error';
        case AlarmState.getsActivated:
        case AlarmState.activationFailed:
        case AlarmState.activationAborted:
            return 'warning';
        case AlarmState.sharp:
        case AlarmState.sharpInside:
        case AlarmState.nightRest:
            return 'success';
        default:
            return 'info';
    }
}

/*
 * There is deliberately no colour per mode here. The modern ioBroker themes of admin 8 paint
 * `.Mui-selected` of every toggle button with the theme's own selection colour, whatever `color`
 * the button was given - so a mode that insisted on its own colour would have to override the
 * theme, which is the opposite of following it. Which mode is armed is said by the highlight and
 * by the icon; how the system is doing is said by the alert above the buttons.
 */
