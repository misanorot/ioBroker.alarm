/**
 * The alarm panel: one instance of ioBroker.alarm, to look at and to operate.
 *
 * Top to bottom: the name, an alert that says what the system is doing, the four modes as a set of
 * toggle buttons, arming with a delay, and the three zones as chips. Two buttons next to the name
 * open what does not fit into that: the circuits that are open right now, and a detail section
 * with the alarm indicators, the presence simulation and the panic button.
 *
 * ## Built from MUI, themed by the host
 *
 * Every part of this is a stock MUI component with a `severity` or a palette `color` - `Alert`,
 * `ToggleButton`, `Chip`, `Button` - and every surface comes from the theme. Nothing here carries
 * a colour, a radius or an elevation of its own, so the panel looks like the admin it is embedded
 * in, in all five ioBroker themes.
 *
 * ## It follows its box, not the screen
 *
 * The modes and the zones are laid out against the width the host gives the panel, through a CSS
 * container query - so the same component fills a 2x2 tile of the devices app, a vis-2 widget of
 * any size and a dialog. Below roughly 310 px the four modes fall into two rows of two.
 *
 * ## Writing
 *
 * A mode is written to `use.list`, which is the adapter's command state; the panel does not set
 * the status states itself. Where a password is asked for, disarming goes through
 * `use.disable_password` instead, so the adapter is the one that checks it - see
 * {@link PasswordDialog}.
 */

import type React from 'react';
import { useEffect, useState } from 'react';
import {
    Alert,
    AlertTitle,
    Badge,
    Box,
    Button,
    Chip,
    Collapse,
    IconButton,
    LinearProgress,
    Stack,
    ToggleButton,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    CheckCircleOutlined,
    ExpandMore,
    HighlightOffOutlined,
    LayersOutlined,
    ReportProblemOutlined,
} from '@mui/icons-material';
import { I18n } from '@iobroker/gui-components';
import type { Connection } from '@iobroker/gui-components';

import { AlarmCommand, ID, MODES, MODE_COMMAND, PANEL_IDS, ZONES, stateKey } from './states';
import type { AlarmMode } from './states';
import { useAlarmConfig, useAlarmModel, useStates, useWriter } from './useAlarm';
import type { AlarmModel, ZoneModel } from './useAlarm';
import { stateSeverity } from './ui';
import { DELAY_ICON, MODE_ICON, headerIcon } from './icons';
import { CircuitsDialog } from './CircuitsDialog';
import type { CircuitGroup } from './CircuitsDialog';
import { PasswordDialog } from './PasswordDialog';
import { Details } from './Details';

/**
 * What leaves the panel when the box it was given is too short for all of it.
 *
 * A tile of the devices app keeps the proportions of the app's grid, so on a narrow grid a 2x1
 * tile can be 150 px high - less than the modes, the delay button and the zones need together.
 * Rather than let those scroll out of sight behind a scrollbar, the two parts that are not the
 * point of the panel step aside, and what is left fits.
 *
 * The queries name their container, so they only ever apply inside a tile: `AlarmPanelComponent`
 * declares `alarmTile`, and nothing else does. In vis-2 and in the dialog, where the panel gets
 * the room it asks for, they never match.
 */
const HIDE_WHEN_SHORT = {
    delay: { '@container alarmTile (max-height: 190px)': { display: 'none' } },
    zones: { '@container alarmTile (max-height: 225px)': { display: 'none' } },
} as const;

/** What the hosts let the user choose about the panel. */
export interface AlarmPanelSettings {
    /** Heading of the panel; empty falls back to the translated "Alarm system". */
    title?: string;
    showZones?: boolean;
    showDelay?: boolean;
    /** The button that lists the open circuits. */
    showCircuits?: boolean;
    /** The button that unfolds the indicators, the presence simulation and the panic button. */
    showDetails?: boolean;
    /** Disarm only after the alarm system's password has been entered. */
    askPassword?: boolean;
}

export interface AlarmPanelProps extends AlarmPanelSettings {
    socket: Connection | null;
    /** The alarm instance, `alarm.0`. */
    instance: string;
    /** In the vis-2 editor the panel is drawn but must not switch anything. */
    readOnly?: boolean;
    /**
     * Tighter type and padding throughout.
     *
     * For a host that hands the panel a box of a fixed size rather than one that grows with it -
     * a tile of the devices app keeps the proportions of its grid, so the panel has to fit into
     * what it is given instead of scrolling inside it.
     */
    dense?: boolean;
}

export function AlarmPanel({
    socket,
    instance,
    readOnly,
    title,
    showZones = true,
    showDelay = true,
    showCircuits = true,
    showDetails = true,
    askPassword,
    dense,
}: AlarmPanelProps): React.JSX.Element {
    const values = useStates(socket, instance, PANEL_IDS);
    const model = useAlarmModel(values);
    const write = useWriter(socket, instance, readOnly);
    // A group the user never put a sensor into has states all the same. A chip for such a zone
    // would only offer to switch something that watches nothing, and an alarm group that can never
    // trigger has nothing to say either.
    const config = useAlarmConfig(socket, instance);
    const zones = config ? model.zones.filter(zone => config.zones[zone.number - 1]) : [];
    const others = model.others
        .map((other, index) => ({
            ...other,
            key: `other${index}`,
            name: config?.others[index]?.name || I18n.t('alarm_other_alarm', String(index + 1)),
            configured: !!config?.others[index]?.configured,
        }))
        .filter(other => other.configured);

    const [circuitsOpen, setCircuitsOpen] = useState(false);
    const [passwordOpen, setPasswordOpen] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);

    // The adapter answers a correct password by disarming, not by telling the panel so.
    useEffect(() => {
        if (model.mode === 'off') {
            setPasswordOpen(false);
        }
    }, [model.mode]);

    const circuitGroups: CircuitGroup[] = [
        { key: 'alarm', label: I18n.t('alarm_circuits_alarm'), names: model.circuits.alarm },
        { key: 'inside', label: I18n.t('alarm_circuits_inside'), names: model.circuits.inside },
        { key: 'notification', label: I18n.t('alarm_circuits_notification'), names: model.circuits.notification },
        ...others.map(other => ({ key: other.key, label: other.name, names: other.sensors })),
    ];
    const openCircuits = circuitGroups.reduce((count, group) => count + group.names.length, 0);

    const onMode = (mode: AlarmMode): void => {
        if (mode === 'off' && askPassword && model.mode !== 'off') {
            setPasswordOpen(true);
            return;
        }
        write(ID.useList, MODE_COMMAND[mode]);
    };

    return (
        <Stack
            spacing={dense ? 0.75 : 1.5}
            sx={{
                width: '100%',
                height: '100%',
                minHeight: 0,
                overflowY: 'auto',
                overflowX: 'hidden',
                // What the two grids below measure themselves against. Without it they would
                // follow the page, and a narrow widget on a wide screen would keep four columns.
                containerType: 'inline-size',
            }}
        >
            <Stack
                direction="row"
                spacing={0.5}
                sx={{ alignItems: 'center' }}
            >
                <Typography
                    variant={dense ? 'subtitle1' : 'h6'}
                    noWrap
                    sx={{ flex: '1 1 auto', minWidth: 0 }}
                    title={title || I18n.t('alarm_title')}
                >
                    {title || I18n.t('alarm_title')}
                </Typography>
                {showCircuits ? (
                    <Tooltip title={I18n.t('alarm_circuits')}>
                        <IconButton
                            size="small"
                            onClick={() => setCircuitsOpen(true)}
                        >
                            <Badge
                                color="warning"
                                variant="dot"
                                invisible={!openCircuits}
                            >
                                <LayersOutlined fontSize="small" />
                            </Badge>
                        </IconButton>
                    </Tooltip>
                ) : null}
                {showDetails ? (
                    <Tooltip title={I18n.t('alarm_details')}>
                        <IconButton
                            size="small"
                            onClick={() => setDetailsOpen(open => !open)}
                        >
                            <ExpandMore
                                fontSize="small"
                                sx={{
                                    transform: detailsOpen ? 'rotate(180deg)' : 'none',
                                    transition: theme => theme.transitions.create('transform'),
                                }}
                            />
                        </IconButton>
                    </Tooltip>
                ) : null}
            </Stack>

            <StatusAlert
                model={model}
                dense={dense}
            />

            {others
                .filter(other => other.triggered)
                .map(other => (
                    <Alert
                        key={other.key}
                        severity="error"
                        variant="filled"
                        sx={{ py: 0.25 }}
                    >
                        {other.sensors.length ? <AlertTitle sx={{ mb: 0 }}>{other.name}</AlertTitle> : other.name}
                        {other.sensors.length ? other.sensors.join(', ') : null}
                    </Alert>
                ))}

            <Box
                sx={{
                    display: 'grid',
                    // Four or two, never three and a stray one on a line of its own. The dense
                    // buttons carry a smaller label, so they stay on one line much further down -
                    // and a second row is what makes a short tile overflow.
                    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                    [`@container (max-width: ${dense ? 200 : 270}px)`]: {
                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    },
                    gap: 1,
                }}
            >
                {MODES.map(mode => (
                    <ModeButton
                        key={mode}
                        mode={mode}
                        selected={model.mode === mode}
                        disabled={!!readOnly}
                        dense={dense}
                        onClick={() => onMode(mode)}
                    />
                ))}
            </Box>

            {showDelay ? (
                <Button
                    fullWidth
                    sx={HIDE_WHEN_SHORT.delay}
                    size={dense ? 'small' : 'medium'}
                    disabled={!!readOnly}
                    color={model.arming ? 'warning' : 'inherit'}
                    variant={model.arming ? 'contained' : 'outlined'}
                    startIcon={<DELAY_ICON />}
                    onClick={() => write(ID.useList, AlarmCommand.armWithDelay)}
                >
                    {I18n.t('alarm_with_delay')}
                </Button>
            ) : null}

            {showZones && zones.length ? (
                <Stack
                    direction="row"
                    useFlexGap
                    spacing={1}
                    sx={{ flexWrap: 'wrap', ...HIDE_WHEN_SHORT.zones }}
                >
                    {zones.map(zone => (
                        <ZoneChip
                            key={zone.number}
                            zone={zone}
                            disabled={!!readOnly}
                            dense={dense}
                            onClick={() => write(ZONES[zone.number - 1].switchId, !zone.on)}
                        />
                    ))}
                </Stack>
            ) : null}

            {showDetails ? (
                <Collapse in={detailsOpen}>
                    <Details
                        model={model}
                        disabled={!!readOnly}
                        dense={dense}
                        onWrite={write}
                    />
                </Collapse>
            ) : null}

            <CircuitsDialog
                open={circuitsOpen}
                groups={circuitGroups}
                onClose={() => setCircuitsOpen(false)}
            />
            <PasswordDialog
                open={passwordOpen}
                wrongPassword={values[ID.wrongPassword] === true}
                onClose={() => setPasswordOpen(false)}
                onSubmit={password => write(ID.disableWithPassword, password)}
            />
        </Stack>
    );
}

// What the system is doing, and how long it still takes. A burglary is the one thing the panel
// fills in rather than outlines, so it is the first thing seen in a view full of widgets.
function StatusAlert({ model, dense }: { model: AlarmModel; dense?: boolean }): React.JSX.Element {
    const severity = stateSeverity(model.state);
    const Icon = headerIcon(model.state, model.arming);
    const countdown = model.countdown ?? model.silentCountdown;

    return (
        <Box>
            <Alert
                severity={severity}
                variant={severity === 'error' ? 'filled' : 'outlined'}
                icon={<Icon fontSize="inherit" />}
                action={
                    countdown ? (
                        <Typography
                            variant="body2"
                            sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
                        >
                            {I18n.t('alarm_seconds', String(countdown))}
                        </Typography>
                    ) : undefined
                }
                sx={{
                    py: dense ? 0 : 0.25,
                    alignItems: 'center',
                    '& .MuiAlert-message': dense ? { py: 0.5 } : undefined,
                    '& .MuiAlert-icon': dense ? { py: 0.5 } : undefined,
                    '& .MuiAlert-action': { py: 0, alignItems: 'center' },
                }}
            >
                {I18n.t(stateKey(model.state))}
            </Alert>
            {countdown ? (
                <LinearProgress
                    color={severity === 'error' ? 'error' : 'warning'}
                    sx={{ mt: '-1px', borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }}
                />
            ) : null}
        </Box>
    );
}

// One of the four modes. A stand-alone toggle button rather than a ToggleButtonGroup, because the
// group is a single row and these have to fall into two rows of two in a narrow widget.
function ModeButton({
    mode,
    selected,
    disabled,
    dense,
    onClick,
}: {
    mode: AlarmMode;
    selected: boolean;
    disabled: boolean;
    dense?: boolean;
    onClick: () => void;
}): React.JSX.Element {
    const Icon = MODE_ICON[mode];

    return (
        <ToggleButton
            value={mode}
            selected={selected}
            disabled={disabled}
            size={dense ? 'small' : 'medium'}
            onChange={onClick}
            sx={{
                flexDirection: 'column',
                gap: dense ? 0.25 : 0.5,
                py: dense ? 0.5 : 1.25,
                px: 0.5,
                // The label is the only thing that can push the row past its line; keeping it on
                // one line is what lets four of them fit a tile that does not grow.
                lineHeight: 1.2,
            }}
        >
            <Icon fontSize={dense ? 'small' : 'medium'} />
            <Typography
                variant={dense ? 'caption' : 'body2'}
                noWrap
                component="span"
                sx={{ lineHeight: 1.2 }}
            >
                {I18n.t(`alarm_mode_${mode}`)}
            </Typography>
        </ToggleButton>
    );
}

// A zone. Filled while it takes part in the alarm, and amber as soon as something in it has moved.
function ZoneChip({
    zone,
    disabled,
    dense,
    onClick,
}: {
    zone: ZoneModel;
    disabled: boolean;
    dense?: boolean;
    onClick: () => void;
}): React.JSX.Element {
    const label = `${I18n.t('alarm_zone', String(zone.number))} · ${I18n.t(zone.on ? 'alarm_on' : 'alarm_off')}`;

    return (
        <Tooltip title={label}>
            <Chip
                clickable
                size={dense ? 'small' : 'medium'}
                disabled={disabled}
                onClick={onClick}
                label={label}
                // Filled only where something has moved: three quiet zones should not be three
                // loud chips, and the one that reports a change has to stand out against them.
                variant={zone.changed ? 'filled' : 'outlined'}
                color={!zone.on ? 'default' : zone.changed ? 'warning' : 'success'}
                icon={
                    !zone.on ? (
                        <HighlightOffOutlined />
                    ) : zone.changed ? (
                        <ReportProblemOutlined />
                    ) : (
                        <CheckCircleOutlined />
                    )
                }
            />
        </Tooltip>
    );
}
