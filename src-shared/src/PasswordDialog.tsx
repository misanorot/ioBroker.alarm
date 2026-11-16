/**
 * Asks for the alarm system's password before disarming.
 *
 * The password is not checked here - it is written to `use.disable_password`, and the adapter
 * compares it with the one in its own configuration and disarms or raises `info.wrong_password`.
 * Nothing on this side ever holds the password, which is why the panel offers this instead of a
 * PIN of its own.
 */

import type React from 'react';
import { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import { I18n } from '@iobroker/gui-components';

export interface PasswordDialogProps {
    open: boolean;
    /** Value of `info.wrong_password`; shown as an error once something has been submitted. */
    wrongPassword: boolean;
    onClose: () => void;
    onSubmit: (password: string) => void;
}

export function PasswordDialog({ open, wrongPassword, onClose, onSubmit }: PasswordDialogProps): React.JSX.Element {
    const [password, setPassword] = useState('');
    const [submitted, setSubmitted] = useState(false);

    // `info.wrong_password` stays true until a correct password clears it, so an attempt made
    // days ago must not colour a dialog that has just been opened.
    useEffect(() => {
        if (open) {
            setPassword('');
            setSubmitted(false);
        }
    }, [open]);

    const submit = (): void => {
        if (!password) {
            return;
        }
        setSubmitted(true);
        setPassword('');
        onSubmit(password);
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
        >
            <DialogTitle>{I18n.t('alarm_password_title')}</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    fullWidth
                    variant="standard"
                    type="password"
                    margin="dense"
                    label={I18n.t('alarm_password')}
                    value={password}
                    error={submitted && wrongPassword}
                    helperText={submitted && wrongPassword ? I18n.t('alarm_password_wrong') : ' '}
                    onChange={event => setPassword(event.target.value)}
                    onKeyUp={event => event.key === 'Enter' && submit()}
                />
            </DialogContent>
            <DialogActions>
                <Button
                    color="inherit"
                    variant="contained"
                    onClick={onClose}
                >
                    {I18n.t('alarm_cancel')}
                </Button>
                <Button
                    variant="contained"
                    color="primary"
                    disabled={!password}
                    onClick={submit}
                >
                    {I18n.t('alarm_ok')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
