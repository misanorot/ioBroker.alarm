/**
 * What is open right now, by group.
 *
 * The adapter keeps the names of the circuits that are currently triggered as a comma separated
 * list per group - the alarm group, the sharp-inside group, the notification group, and the two
 * other alarms. That is the answer to the question a panel raises the moment arming fails: which
 * door is it.
 *
 * Which groups there are is decided by the panel, which leaves out the ones the user configured no
 * sensor for - see `useAlarmConfig`.
 */

import type React from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    ListSubheader,
} from '@mui/material';
import { CheckCircleOutlined, ReportProblemOutlined } from '@mui/icons-material';
import { I18n } from '@iobroker/gui-components';

/** One section of the dialog: a group of sensors and the names of those that are triggered. */
export interface CircuitGroup {
    key: string;
    /** Already translated - the two other alarms are named by the user, not by a dictionary. */
    label: string;
    names: string[];
}

export interface CircuitsDialogProps {
    open: boolean;
    groups: CircuitGroup[];
    onClose: () => void;
}

export function CircuitsDialog({ open, groups, onClose }: CircuitsDialogProps): React.JSX.Element {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
        >
            <DialogTitle>{I18n.t('alarm_circuits')}</DialogTitle>
            <DialogContent dividers>
                <List
                    dense
                    disablePadding
                >
                    {groups.map(group => (
                        <li key={group.key}>
                            <ul style={{ padding: 0 }}>
                                <ListSubheader disableSticky>{group.label}</ListSubheader>
                                {group.names.length ? (
                                    group.names.map(name => (
                                        <ListItem key={name}>
                                            <ListItemIcon sx={{ minWidth: 36 }}>
                                                <ReportProblemOutlined color="warning" />
                                            </ListItemIcon>
                                            <ListItemText primary={name} />
                                        </ListItem>
                                    ))
                                ) : (
                                    <ListItem>
                                        <ListItemIcon sx={{ minWidth: 36 }}>
                                            <CheckCircleOutlined color="success" />
                                        </ListItemIcon>
                                        <ListItemText
                                            slotProps={{ primary: { color: 'text.secondary' } }}
                                            primary={I18n.t('alarm_circuits_empty')}
                                        />
                                    </ListItem>
                                )}
                            </ul>
                        </li>
                    ))}
                </List>
            </DialogContent>
            <DialogActions>
                <Button
                    variant="contained"
                    onClick={onClose}
                >
                    {I18n.t('alarm_close')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
