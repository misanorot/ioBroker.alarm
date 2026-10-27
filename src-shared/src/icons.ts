/**
 * The panel's icons, all of them from `@mui/icons-material`.
 *
 * Imported by the bare package name, never by a deep path: a deep path would miss the redirect
 * that hands the devices app's own MUI to this bundle, and would pull a second copy of MUI into
 * the vis-2 one.
 *
 * The four modes take the shields of the Material set rather than four unrelated pictures:
 * "remove moderator" is a shield being taken down, "shield" one that stands. Inside and night are
 * where the house is lived in while it is watched, so they are the house and the bed.
 */

import type { SvgIconProps } from '@mui/material';
import type React from 'react';
import {
    BedtimeOutlined,
    GppBadOutlined,
    GppGoodOutlined,
    HomeOutlined,
    RemoveModeratorOutlined,
    ScheduleOutlined,
    ShieldOutlined,
} from '@mui/icons-material';

import { AlarmState } from './states';
import type { AlarmMode } from './states';

export const MODE_ICON: Record<AlarmMode, React.ComponentType<SvgIconProps>> = {
    off: RemoveModeratorOutlined,
    arm: ShieldOutlined,
    inside: HomeOutlined,
    night: BedtimeOutlined,
};

export const DELAY_ICON = ScheduleOutlined;

/**
 * The icon of the status alert, which says at a glance what the system is doing.
 *
 * @param state value of `status.state_list`
 * @param arming whether an arming countdown runs
 */
export function headerIcon(state: AlarmState | null, arming: boolean): React.ComponentType<SvgIconProps> {
    if (state === AlarmState.burglary || state === AlarmState.silentAlarm) {
        return GppBadOutlined;
    }
    if (arming || state === AlarmState.getsActivated) {
        return ScheduleOutlined;
    }
    if (state === AlarmState.sharp || state === AlarmState.sharpInside || state === AlarmState.nightRest) {
        return GppGoodOutlined;
    }
    return ShieldOutlined;
}
