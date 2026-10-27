/**
 * The full panel in a dialog, for the hosts whose tile is too small to operate.
 *
 * The panel is mounted only while the dialog is open: it subscribes to some thirty states, and a
 * page full of closed dialogs would keep all of them subscribed for nothing.
 */

import type React from 'react';
import { Dialog, DialogContent, IconButton } from '@mui/material';
import { Close } from '@mui/icons-material';
import type { Connection } from '@iobroker/gui-components';

import { AlarmPanel } from './AlarmPanel';
import type { AlarmPanelSettings } from './AlarmPanel';

export interface AlarmDialogProps extends AlarmPanelSettings {
    open: boolean;
    socket: Connection | null;
    instance: string;
    onClose: () => void;
}

export function AlarmDialog({ open, socket, instance, onClose, ...settings }: AlarmDialogProps): React.JSX.Element {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
        >
            <IconButton
                size="small"
                onClick={onClose}
                sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1, color: 'text.secondary' }}
            >
                <Close fontSize="small" />
            </IconButton>
            <DialogContent>
                {open ? (
                    <AlarmPanel
                        socket={socket}
                        instance={instance}
                        {...settings}
                    />
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
