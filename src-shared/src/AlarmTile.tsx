/**
 * The alarm system in as little room as a tile of the devices app gives it.
 *
 * Shield, state, and - while one runs - the countdown. Nothing here is operable: a tile this size
 * has no room for four modes that could be told apart at a glance, and a mis-tap would arm or
 * disarm a house. The click belongs to the host, which opens the full panel in a dialog.
 */

import type React from 'react';
import { Avatar, Box, Stack, Typography } from '@mui/material';
import { I18n } from '@iobroker/gui-components';
import type { Connection } from '@iobroker/gui-components';

import { TILE_IDS, stateKey } from './states';
import { useAlarmModel, useStates } from './useAlarm';
import { stateSeverity } from './ui';
import { headerIcon } from './icons';

export interface AlarmTileProps {
    socket: Connection | null;
    instance: string;
    /** Drawn above the state where there is room for it. */
    caption?: string;
    /** `row` for the wide, half-height tile; `column` everywhere else. */
    layout?: 'row' | 'column';
}

export function AlarmTile({ socket, instance, caption, layout = 'column' }: AlarmTileProps): React.JSX.Element {
    const values = useStates(socket, instance, TILE_IDS);
    const model = useAlarmModel(values);

    const severity = stateSeverity(model.state);
    const Icon = headerIcon(model.state, model.arming);
    const countdown = model.countdown ?? model.silentCountdown;
    const row = layout === 'row';
    // A long state - "Aktivierung fehlgeschlagen" - does not fit a 1x1 tile and is cut off, so the
    // whole of it has to be reachable by hovering.
    const state = I18n.t(stateKey(model.state));

    return (
        <Stack
            direction={row ? 'row' : 'column'}
            spacing={row ? 1.25 : 0.5}
            sx={{
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
                p: 1,
                minWidth: 0,
                textAlign: row ? 'left' : 'center',
            }}
        >
            <Avatar
                variant="rounded"
                sx={{
                    flex: '0 0 auto',
                    width: row ? 34 : 42,
                    height: row ? 34 : 42,
                    backgroundColor: 'action.selected',
                    color: `${severity}.main`,
                }}
            >
                <Icon />
            </Avatar>
            <Box sx={{ minWidth: 0, maxWidth: '100%' }}>
                {caption ? (
                    <Typography
                        variant="caption"
                        noWrap
                        component="div"
                        color="text.secondary"
                        title={caption}
                    >
                        {caption}
                    </Typography>
                ) : null}
                <Typography
                    variant="body2"
                    noWrap
                    component="div"
                    sx={{ color: `${severity}.main`, fontWeight: 500 }}
                    title={state}
                >
                    {state}
                </Typography>
                {countdown ? (
                    <Typography
                        variant="caption"
                        noWrap
                        component="div"
                        color="text.secondary"
                        sx={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                        {I18n.t('alarm_seconds', String(countdown))}
                    </Typography>
                ) : null}
            </Box>
        </Stack>
    );
}
