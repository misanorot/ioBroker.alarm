/**
 * The section the chevron in the panel's header unfolds.
 *
 * What it adds to the four modes: the flags the adapter raises next to the plain state - a siren,
 * a silent alarm, an arming that failed - the presence simulation, the two commands that have no
 * mode of their own, and the last line of today's log.
 *
 * A flag is only drawn while it is raised. A quiet system therefore shows one chip - whether it is
 * ready to be armed - and nothing else, and every further chip means something.
 */

import type React from 'react';
import { Button, Chip, Divider, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import {
    CampaignOutlined,
    CheckCircleOutlined,
    DoneAllOutlined,
    ReportProblemOutlined,
    WarningAmberOutlined,
} from '@mui/icons-material';
import { I18n } from '@iobroker/gui-components';

import { ID } from './states';
import type { AlarmModel } from './useAlarm';
import type { Severity } from './ui';

export interface DetailsProps {
    model: AlarmModel;
    disabled: boolean;
    /** Tighter spacing, for a host that gives the panel a box of a fixed size. */
    dense?: boolean;
    onWrite: (id: string, value: ioBroker.StateValue) => void;
}

interface Flag {
    key: string;
    severity: Severity;
}

export function Details({ model, disabled, dense, onWrite }: DetailsProps): React.JSX.Element {
    const lastLog = model.log
        .split('\n')
        .map(line => line.trim())
        .filter(line => !!line)
        .pop();

    const flags: Flag[] = [
        model.armable ? { key: 'alarm_ready', severity: 'success' } : { key: 'alarm_not_armable', severity: 'warning' },
    ];
    if (model.burglary) {
        flags.push({ key: 'alarm_burglary', severity: 'error' });
    }
    if (model.silentAlarm) {
        flags.push({ key: 'alarm_silent_alarm', severity: 'error' });
    }
    if (model.siren) {
        flags.push({ key: 'alarm_siren', severity: 'error' });
    }
    if (model.activationFailed) {
        flags.push({ key: 'alarm_failed', severity: 'warning' });
    }
    if (model.armedWithWarnings) {
        flags.push({ key: 'alarm_with_warnings', severity: 'warning' });
    }
    if (model.notificationChanges) {
        flags.push({ key: 'alarm_notification_changes', severity: 'warning' });
    }

    return (
        <Stack spacing={dense ? 1 : 1.5}>
            <Divider />

            <Stack
                direction="row"
                useFlexGap
                spacing={1}
                sx={{ flexWrap: 'wrap' }}
            >
                {flags.map(flag => (
                    <Chip
                        key={flag.key}
                        size="small"
                        variant="outlined"
                        color={flag.severity}
                        icon={flagIcon(flag.severity)}
                        label={I18n.t(flag.key)}
                    />
                ))}
            </Stack>

            <FormControlLabel
                control={
                    <Switch
                        size="small"
                        disabled={disabled}
                        checked={model.presence}
                        onChange={(_event, checked) => onWrite(ID.presence, checked)}
                    />
                }
                label={I18n.t('alarm_presence')}
                slotProps={{ typography: { variant: 'body2', noWrap: true } }}
                sx={{ mr: 0, minWidth: 0 }}
            />

            <Stack
                direction="row"
                useFlexGap
                spacing={1}
                sx={{ flexWrap: 'wrap' }}
            >
                <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    disabled={disabled}
                    startIcon={<CampaignOutlined />}
                    onClick={() => onWrite(ID.panic, true)}
                    sx={{ flex: '1 1 auto' }}
                >
                    {I18n.t('alarm_panic')}
                </Button>
                <Button
                    size="small"
                    variant="outlined"
                    disabled={disabled}
                    startIcon={<DoneAllOutlined />}
                    onClick={() => onWrite(ID.quitChanges, true)}
                    sx={{ flex: '1 1 auto' }}
                >
                    {I18n.t('alarm_acknowledge')}
                </Button>
            </Stack>

            {lastLog ? (
                <Typography
                    variant="caption"
                    color="text.secondary"
                >
                    {lastLog}
                </Typography>
            ) : null}
        </Stack>
    );
}

/**
 * The icon of a flag chip. The colour already says how bad it is; the icon says it again for
 * anyone who cannot tell green from amber.
 *
 * @param severity how loud the flag is
 */
function flagIcon(severity: Severity): React.JSX.Element {
    if (severity === 'error') {
        return <ReportProblemOutlined />;
    }
    if (severity === 'warning') {
        return <WarningAmberOutlined />;
    }
    return <CheckCircleOutlined />;
}
