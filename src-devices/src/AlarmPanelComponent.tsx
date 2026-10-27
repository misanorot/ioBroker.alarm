/**
 * The alarm panel as a tile of the devices app.
 *
 * On a 1x1 or a 2x½ tile there is room for the state and nothing more, so the tile shows the
 * shield and what the system is doing, and a click opens the whole panel in a dialog. A 2x1 or a
 * 2x2 tile carries the panel itself, with the four modes operable in place.
 *
 * The tile is lit while the system is armed - which is the one thing a wall of tiles should say
 * without being read.
 *
 * ## Split in two
 *
 * The class is what the devices app requires: a `WidgetGeneric` subclass that draws the frame in
 * the app's own style and answers for its size. What is inside the frame is {@link AlarmPanel} or
 * {@link AlarmTile}, shared with the vis-2 widget, because both are built on hooks and a class
 * cannot call them.
 */

import type React from 'react';
import { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import type { Theme } from '@mui/material';
import WidgetGeneric, {
    getTileStyles,
    type CustomWidgetPlugin,
    type WidgetGenericProps,
    type WidgetGenericState,
} from '@iobroker/dm-widgets';
import type { ConfigItemPanel, ConfigItemTabs } from '@iobroker/dm-utils';
import type { Connection } from '@iobroker/gui-components';

import { AlarmPanel } from '@alarm/AlarmPanel';
import { AlarmTile } from '@alarm/AlarmTile';
import { AlarmDialog } from '@alarm/AlarmDialog';
import { TILE_IDS } from '@alarm/states';
import { useAlarmModel, useStates } from '@alarm/useAlarm';

/** The tile sizes the devices app offers, and what the panel makes of each. */
type TileSize = '1x1' | '2x0.5' | '2x1' | '2x2';
type TileContent = 'auto' | 'status' | 'panel';

interface AlarmTileSettings extends CustomWidgetPlugin {
    /** The alarm instance, `alarm.0`. */
    instance?: string;
    /** Heading of the panel; empty falls back to the translated "Alarm system". */
    panelTitle?: string;
    content?: TileContent;
    showZones?: boolean;
    showDelay?: boolean;
    showCircuits?: boolean;
    showDetails?: boolean;
    askPassword?: boolean;
}

interface AlarmComponentState extends WidgetGenericState {
    /** Mirrors whether the system is armed, so the frame can draw the tile as active. */
    armed: boolean;
}

/** Width to height of each tile size, so the frame keeps the grid's proportions. */
const ASPECT: Record<TileSize, string> = {
    '1x1': '1',
    '2x0.5': '4',
    '2x1': '2',
    '2x2': '1',
};

/** The 2x2 frame style. Present on the app's real base class, absent from the compile-time stub. */
type HugeStyle = (theme: Theme) => React.CSSProperties;

/**
 * Only the two larger tiles have room for the panel; `auto` follows that.
 *
 * @param content what the tile's settings ask for
 * @param size the size the devices app is rendering
 */
function resolveContent(content: TileContent | undefined, size: TileSize): 'status' | 'panel' {
    if (content === 'status' || content === 'panel') {
        return content;
    }
    return size === '2x1' || size === '2x2' ? 'panel' : 'status';
}

export class AlarmPanelComponent extends WidgetGeneric<AlarmComponentState, AlarmTileSettings> {
    public constructor(props: WidgetGenericProps<AlarmTileSettings>) {
        super(props);
        this.state = { ...this.state, armed: false };
    }

    public static override getConfigSchema(): { name: string; schema: ConfigItemPanel | ConfigItemTabs } {
        return {
            name: 'AlarmPanel',
            schema: {
                type: 'panel',
                items: {
                    // Replaces the app's own size field, which offers no 2x2: the panel needs that
                    // tile to show the modes and the zones side by side.
                    size: {
                        type: 'select',
                        label: 'alarm_size',
                        options: [
                            { value: '1x1', label: '1×1' },
                            { value: '2x1', label: '2×1' },
                            { value: '2x0.5', label: '2×½' },
                            { value: '2x2', label: '2×2' },
                        ],
                        default: '2x2',
                        format: 'radio',
                        horizontal: true,
                        noTranslation: true,
                    },
                    instance: {
                        type: 'instance',
                        label: 'alarm_instance',
                        adapter: 'alarm',
                        sm: 12,
                    },
                    panelTitle: {
                        type: 'text',
                        label: 'alarm_widget_title',
                        help: 'alarm_widget_title_help',
                        sm: 12,
                    },
                    content: {
                        type: 'select',
                        label: 'alarm_content',
                        options: [
                            { value: 'auto', label: 'alarm_content_auto' },
                            { value: 'status', label: 'alarm_content_status' },
                            { value: 'panel', label: 'alarm_content_panel' },
                        ],
                        default: 'auto',
                        sm: 12,
                    },
                    showZones: {
                        type: 'checkbox',
                        label: 'alarm_show_zones',
                        help: 'alarm_show_zones_help',
                        default: true,
                        sm: 12,
                    },
                    showDelay: {
                        type: 'checkbox',
                        label: 'alarm_show_delay',
                        default: true,
                        sm: 12,
                    },
                    showCircuits: {
                        type: 'checkbox',
                        label: 'alarm_show_circuits',
                        default: true,
                        sm: 12,
                    },
                    showDetails: {
                        type: 'checkbox',
                        label: 'alarm_show_details',
                        default: true,
                        sm: 12,
                    },
                    askPassword: {
                        type: 'checkbox',
                        label: 'alarm_ask_password',
                        help: 'alarm_ask_password_help',
                        sm: 12,
                    },
                },
            },
        };
    }

    /** A tile is lit while the system is armed, not merely while the adapter runs. */
    protected override isTileActive(): boolean {
        return this.state.armed;
    }

    private readonly onArmedChange = (armed: boolean): void => {
        if (armed !== this.state.armed) {
            this.setState({ armed });
        }
    };

    private frameStyle(size: TileSize, theme: Theme): React.CSSProperties {
        if (size === '2x2') {
            const huge = (WidgetGeneric as unknown as { getStyleHuge?: HugeStyle }).getStyleHuge;
            return huge ? huge(theme) : WidgetGeneric.getStyleWideTall(theme);
        }
        if (size === '2x1') {
            return WidgetGeneric.getStyleWideTall(theme);
        }
        if (size === '2x0.5') {
            return WidgetGeneric.getStyleWide(theme);
        }
        return WidgetGeneric.getStyleCompact(theme);
    }

    private renderTile(size: TileSize): React.JSX.Element {
        const accent = this.getAccentColor();
        const indicators = this.renderIndicators(this.renderSettingsButton());

        return (
            <Box
                id={String(this.props.widget.id)}
                className={this.getWidgetClass()}
                sx={theme => this.frameStyle(size, theme)}
            >
                <Box
                    sx={theme => ({
                        position: 'relative',
                        width: '100%',
                        aspectRatio: ASPECT[size],
                        overflow: 'hidden',
                        ...(getTileStyles(theme, this.state.armed, accent) as object),
                        padding: size === '1x1' ? 0 : 1,
                    })}
                >
                    {/* Indicators and the settings button must not open the dialog underneath. */}
                    <div
                        onClick={event => event.stopPropagation()}
                        style={{ display: 'contents' }}
                    >
                        {indicators}
                    </div>
                    <TileBody
                        socket={this.props.stateContext.getSocket()}
                        settings={this.props.settings}
                        size={size}
                        onArmedChange={this.onArmedChange}
                    />
                </Box>
            </Box>
        );
    }

    public override renderCompact(): React.JSX.Element {
        return this.renderTile('1x1');
    }

    public override renderWide(): React.JSX.Element {
        return this.renderTile('2x0.5');
    }

    public override renderWideTall(): React.JSX.Element {
        return this.renderTile('2x1');
    }

    /**
     * The 2x2 tile.
     *
     * Not declared on the compile-time stub of the base class, so no `override` - but the devices
     * app calls it on its real base class for this size, which is why the method has to exist.
     */
    public renderHuge(): React.JSX.Element {
        return this.renderTile('2x2');
    }
}

interface TileBodyProps {
    socket: Connection | null;
    settings: AlarmTileSettings;
    size: TileSize;
    onArmedChange: (armed: boolean) => void;
}

function TileBody({ socket, settings, size, onArmedChange }: TileBodyProps): React.JSX.Element {
    const instance = settings.instance || '';
    const content = resolveContent(settings.content, size);
    const [open, setOpen] = useState(false);

    // The status content draws no mode buttons, so the frame has to learn from somewhere whether
    // the system is armed. The panel subscribes to the same states, and a second subscription to
    // seven of them costs nothing - the socket keeps one per id.
    const values = useStates(socket, instance, TILE_IDS);
    const model = useAlarmModel(values);
    const armed = !!model.mode && model.mode !== 'off';

    useEffect(() => onArmedChange(armed), [armed, onArmedChange]);

    const panelSettings = {
        title: settings.panelTitle,
        showZones: settings.showZones !== false,
        showDelay: settings.showDelay !== false,
        showCircuits: settings.showCircuits !== false,
        showDetails: settings.showDetails !== false,
        askPassword: settings.askPassword,
    };

    if (content === 'panel') {
        return (
            <Box
                sx={{
                    width: '100%',
                    height: '100%',
                    overflow: 'hidden',
                    // The panel measures itself against this box and drops its optional parts
                    // when the tile is too short for them - see `HIDE_WHEN_SHORT` there. The size
                    // is definite (the tile carries an aspect ratio), which is what a size
                    // container needs.
                    containerType: 'size',
                    containerName: 'alarmTile',
                }}
            >
                {/* `dense`: a tile keeps the proportions of the app's grid, so the panel has to
                    fit into what it is given rather than scroll inside it. */}
                <AlarmPanel
                    dense
                    socket={socket}
                    instance={instance}
                    {...panelSettings}
                />
            </Box>
        );
    }

    return (
        <>
            <Box
                onClick={() => setOpen(true)}
                sx={{ width: '100%', height: '100%', cursor: 'pointer' }}
            >
                <AlarmTile
                    socket={socket}
                    instance={instance}
                    caption={settings.panelTitle}
                    layout={size === '2x0.5' ? 'row' : 'column'}
                />
            </Box>
            <AlarmDialog
                open={open}
                socket={socket}
                instance={instance}
                onClose={() => setOpen(false)}
                {...panelSettings}
            />
        </>
    );
}

export default AlarmPanelComponent;
