/**
 * The alarm panel as a vis-2 widget.
 *
 * The widget is bound to an instance of ioBroker.alarm, not to single object ids: the adapter
 * always creates the same states below `alarm.<n>`, so there is nothing to wire up by hand. What
 * the settings offer instead is which parts of the panel are shown.
 *
 * ## Split in two
 *
 * The class is what vis-2 requires - a `VisRxWidget` subclass that declares the settings and draws
 * the card. What is inside the card is {@link AlarmPanel}, a function component shared with the
 * tile of the devices app, because it is built on hooks and a class cannot call them.
 */

import type React from 'react';
import { Box, Typography } from '@mui/material';
import { I18n } from '@iobroker/gui-components';
import type { RxRenderWidgetProps, RxWidgetInfo, VisRxWidgetState } from '@iobroker/types-vis-2';
import type VisRxWidget from '@iobroker/types-vis-2/visRxWidget';

import { AlarmPanel } from '@alarm/AlarmPanel';

interface AlarmRxData {
    /** The alarm instance, `alarm.0`. */
    instance: string;
    /**
     * Heading of the panel.
     *
     * Deliberately not called `widgetTitle`: vis-2 draws a field of that name into the card header
     * itself, and the panel carries its own header - with the two buttons that belong to it - so
     * that it looks the same here, on a tile of the devices app and in a dialog.
     */
    panelTitle: string;
    showZones: boolean;
    showDelay: boolean;
    showCircuits: boolean;
    showDetails: boolean;
    askPassword: boolean;
    noCard: boolean;
}

/** Words of this widget set. vis-2 puts this in front of every label below. */
const PREFIX = 'alarm_';

export default class AlarmPanelWidget extends (window.visRxWidget as typeof VisRxWidget)<
    AlarmRxData,
    VisRxWidgetState
> {
    public static getI18nPrefix(): string {
        return PREFIX;
    }

    public static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplAlarmPanel',
            visSet: 'alarm',
            visSetLabel: 'set_label',
            visSetColor: '#4dabf5',
            visName: 'Alarm panel',
            visWidgetLabel: 'AlarmPanel',
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        {
                            name: 'instance',
                            label: 'instance',
                            type: 'instance',
                            adapter: 'alarm',
                        },
                        {
                            name: 'panelTitle',
                            label: 'widget_title',
                            tooltip: 'widget_title_help',
                            type: 'text',
                        },
                        {
                            name: 'showZones',
                            label: 'show_zones',
                            tooltip: 'show_zones_help',
                            type: 'checkbox',
                            default: true,
                        },
                        {
                            name: 'showDelay',
                            label: 'show_delay',
                            type: 'checkbox',
                            default: true,
                        },
                        {
                            name: 'showCircuits',
                            label: 'show_circuits',
                            type: 'checkbox',
                            default: true,
                        },
                        {
                            name: 'showDetails',
                            label: 'show_details',
                            type: 'checkbox',
                            default: true,
                        },
                        {
                            name: 'askPassword',
                            label: 'ask_password',
                            tooltip: 'ask_password_help',
                            type: 'checkbox',
                        },
                        {
                            name: 'noCard',
                            label: 'no_card',
                            type: 'checkbox',
                        },
                    ],
                },
            ],
            visDefaultStyle: {
                // Wide enough for the four modes to stay on one line inside the card's padding;
                // a narrower widget puts them into two rows of two by itself.
                width: 360,
                height: 420,
                position: 'relative',
            },
            visPrev: 'widgets/alarm/img/prev_alarm.svg',
        };
    }

    public getWidgetInfo(): RxWidgetInfo {
        return AlarmPanelWidget.getWidgetInfo();
    }

    public renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element | React.JSX.Element[] | null {
        super.renderWidgetBody(props);

        const { instance, panelTitle, showZones, showDelay, showCircuits, showDetails, askPassword, noCard } =
            this.state.rxData;

        const content = (
            <Box
                sx={{
                    width: '100%',
                    height: '100%',
                    // Inside the card this is a flex item of the card's content box; on its own the
                    // flex properties are simply ignored.
                    flex: '1 1 auto',
                    minHeight: 0,
                    position: 'relative',
                    // In the editor the widget is dragged and resized, not used: a click must select
                    // it, not arm the house.
                    pointerEvents: this.props.editMode ? 'none' : undefined,
                }}
            >
                {instance ? (
                    <AlarmPanel
                        socket={this.props.context.socket}
                        instance={instance}
                        readOnly={this.props.editMode}
                        title={panelTitle}
                        showZones={showZones !== false}
                        showDelay={showDelay !== false}
                        showCircuits={showCircuits !== false}
                        showDetails={showDetails !== false}
                        askPassword={askPassword}
                    />
                ) : (
                    <Box sx={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%' }}>
                        <Typography
                            variant="caption"
                            sx={{ color: 'text.secondary' }}
                        >
                            {I18n.t(`${PREFIX}no_instance`)}
                        </Typography>
                    </Box>
                )}
            </Box>
        );

        if (noCard || props.widget.usedInWidget) {
            return content;
        }

        return this.wrapContent(content, null, {
            boxSizing: 'border-box',
            height: '100%',
            // The panel brings its own spacing; the card's default padding would only take room
            // from the buttons.
            padding: 12,
            paddingBottom: 12,
        });
    }
}
