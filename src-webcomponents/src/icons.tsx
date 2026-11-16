/**
 * The icons of the panel: the same Material icons the vis-2 widget and the devices tile take from
 * `@mui/icons-material` (`src-shared/src/icons.ts`), as plain paths (Apache License 2.0), 24 x 24.
 */
import type { JSX } from 'react';

import { AlarmState, type AlarmMode } from '@alarm/states';

const PATHS = {
    // RemoveModeratorOutlined
    shieldOff:
        'm12 4.14 6 2.25v4.7c0 1.19-.23 2.36-.64 3.44l1.51 1.51c.72-1.53 1.13-3.22 1.13-4.95V5l-8-3-5.22 1.96 1.55 1.55zM2.81 2.81 1.39 4.22 4 6.83v4.26c0 5.05 3.41 9.76 8 10.91 1.72-.43 3.28-1.36 4.55-2.62l3.23 3.23 1.41-1.41zM12 19.92c-3.45-1.13-6-4.82-6-8.83V8.83l9.14 9.14c-.9.88-1.97 1.57-3.14 1.95',
    // ShieldOutlined
    shield: 'M12 2 4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5zm6 9.09c0 4-2.55 7.7-6 8.83-3.45-1.13-6-4.82-6-8.83v-4.7l6-2.25 6 2.25z',
    // HomeOutlined
    home: 'm12 5.69 5 4.5V18h-2v-6H9v6H7v-7.81zM12 3 2 12h3v8h6v-6h2v6h6v-8h3z',
    // BedtimeOutlined
    night: 'M9.27 4.49c-1.63 7.54 3.75 12.41 7.66 13.8C15.54 19.38 13.81 20 12 20c-4.41 0-8-3.59-8-8 0-3.45 2.2-6.4 5.27-7.51m2.72-2.48C6.4 2.01 2 6.54 2 12c0 5.52 4.48 10 10 10 3.71 0 6.93-2.02 8.66-5.02-7.51-.25-12.09-8.43-8.32-14.97z',
    // ScheduleOutlined
    clock: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2M12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8m.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z',
    // GppBadOutlined
    shieldBad:
        'M12 2 4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5zm6 9.09c0 4-2.55 7.7-6 8.83-3.45-1.13-6-4.82-6-8.83v-4.7l6-2.25 6 2.25zM9.91 8.5 8.5 9.91 10.59 12 8.5 14.09l1.41 1.41L12 13.42l2.09 2.08 1.41-1.41L13.42 12l2.08-2.09-1.41-1.41L12 10.59z',
    // GppGoodOutlined
    shieldGood:
        'M12 2 4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5zm6 9.09c0 4-2.55 7.7-6 8.83-3.45-1.13-6-4.82-6-8.83V6.31l6-2.12 6 2.12zm-9.18-.5L7.4 12l3.54 3.54 5.66-5.66-1.41-1.41-4.24 4.24z',
    // LayersOutlined
    layers: 'm11.99 18.54-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27zm0-11.47L17.74 9 12 13.47 6.26 9z',
    // ExpandMore
    expand: 'M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z',
    // CheckCircleOutlined
    check: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8m4.59-12.42L10 14.17l-2.59-2.58L6 13l4 4 8-8z',
    // HighlightOffOutlined
    off: 'M14.59 8 12 10.59 9.41 8 8 9.41 10.59 12 8 14.59 9.41 16 12 13.41 14.59 16 16 14.59 13.41 12 16 9.41zM12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2m0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8',
    // ReportProblemOutlined, WarningAmberOutlined
    problem: 'M12 5.99 19.53 19H4.47zM12 2 1 21h22zm1 14h-2v2h2zm0-6h-2v4h2z',
    // CampaignOutlined
    panic: 'M18 11v2h4v-2zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61M20.4 5.6c-.4-.53-.8-1.07-1.2-1.6-.99.74-2.24 1.68-3.2 2.4.4.53.8 1.07 1.2 1.6.96-.72 2.21-1.65 3.2-2.4M4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v4h2v-4h1l5 3V6L8 9zm5.03 1.71L11 9.53v4.94l-1.97-1.18-.48-.29H4v-2h4.55zM15.5 12c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.01 1.5-3.34',
    // DoneAllOutlined
    doneAll:
        'm18 7-1.41-1.41-6.34 6.34 1.41 1.41zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12zM.41 13.41 6 19l1.41-1.41L1.83 12z',
};

export type IconName = keyof typeof PATHS;

/** An icon in the color of the text, sized by the CSS around it */
export function Icon({ name, className }: { name: IconName; className?: string }): JSX.Element {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
        >
            <path d={PATHS[name]} />
        </svg>
    );
}

/** The four modes take the shields of the Material set; inside and night are the house and the bed */
export const MODE_ICON: Record<AlarmMode, IconName> = {
    off: 'shieldOff',
    arm: 'shield',
    inside: 'home',
    night: 'night',
};

/**
 * The icon of the status, which says at a glance what the system is doing
 *
 * @param state value of `status.state_list`
 * @param arming whether an arming countdown runs
 */
export function headerIcon(state: AlarmState | null, arming: boolean): IconName {
    if (state === AlarmState.burglary || state === AlarmState.silentAlarm) {
        return 'shieldBad';
    }
    if (arming || state === AlarmState.getsActivated) {
        return 'clock';
    }
    if (state === AlarmState.sharp || state === AlarmState.sharpInside || state === AlarmState.nightRest) {
        return 'shieldGood';
    }
    return 'shield';
}
