import React from 'react';

import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Checkbox,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Fab,
    Tooltip,
    Box,
} from '@mui/material';
import {
    Add,
    Edit,
    ContentCopy,
    KeyboardArrowUp,
    KeyboardArrowDown,
    Delete,
    Check,
    Close,
    MoreHoriz,
} from '@mui/icons-material';
import { I18n, DialogSelectID } from '@iobroker/adapter-react-v5';
import { ConfigGeneric, type ConfigGenericProps, type ConfigGenericState } from '@iobroker/json-config';
import type { PresenceOption, PresenceRow, TimeUnit } from './types';

const DEFAULT_PRESENCE_ROW: PresenceRow = {
    enabled: true,
    name: '',
    name_id: '',
    option_presence: 'time',
    presence_time_from: '',
    presence_time_to: '',
    presence_length: 0,
    presence_length_select: 'min',
    presence_length_shuffle: 1,
    presence_delay: 0,
    presence_delay_select: 'min',
    presence_delay_shuffle: 1,
    presence_val_on: 'true',
    presence_val_off: 'false',
    presence_trigger_light: '',
    presence_light_lux: 0,
};

interface SelectIdTarget {
    context: 'table' | 'dialog' | 'dialog_light';
    rowIndex?: number;
}

interface PresenceTableComponentState extends ConfigGenericState {
    editIndex: number | null;
    editRow: PresenceRow | null;
    originalEditRow: PresenceRow | null;
    deleteIndex: number | null;
    showSelectId: SelectIdTarget | null;
}

export default class PresenceTableComponent extends ConfigGeneric<ConfigGenericProps, PresenceTableComponentState> {
    constructor(props: ConfigGenericProps) {
        super(props);
        this.state = {
            ...this.state,
            editIndex: null,
            editRow: null,
            originalEditRow: null,
            deleteIndex: null,
            showSelectId: null,
        };
    }

    private getRows(): PresenceRow[] {
        const config = this.props.data as Record<string, unknown>;
        return (config.presence as PresenceRow[]) || [];
    }

    private saveRows(rows: PresenceRow[]): void {
        const data = JSON.parse(JSON.stringify(this.props.data));
        data.presence = rows;
        this.props.onChange(data);
    }

    private handleInlineEdit(index: number, field: keyof PresenceRow, value: string): void {
        const rows = [...this.getRows()];
        rows[index] = { ...rows[index], [field]: value };
        this.saveRows(rows);
    }

    private handleAddNew(): void {
        const row = { ...DEFAULT_PRESENCE_ROW };
        this.setState({
            editIndex: -1,
            editRow: { ...row },
            originalEditRow: { ...row },
        });
    }

    private handleInsertAfter(index: number): void {
        const rows = [...this.getRows()];
        rows.splice(index + 1, 0, { ...DEFAULT_PRESENCE_ROW });
        this.saveRows(rows);
    }

    private handleEdit(index: number): void {
        const rows = this.getRows();
        this.setState({
            editIndex: index,
            editRow: { ...rows[index] },
            originalEditRow: { ...rows[index] },
        });
    }

    private handleCopy(index: number): void {
        const rows = [...this.getRows()];
        rows.splice(index + 1, 0, { ...rows[index] });
        this.saveRows(rows);
    }

    private handleMoveUp(index: number): void {
        if (index <= 0) {
            return;
        }
        const rows = [...this.getRows()];
        [rows[index - 1], rows[index]] = [rows[index], rows[index - 1]];
        this.saveRows(rows);
    }

    private handleMoveDown(index: number): void {
        const rows = [...this.getRows()];
        if (index >= rows.length - 1) {
            return;
        }
        [rows[index], rows[index + 1]] = [rows[index + 1], rows[index]];
        this.saveRows(rows);
    }

    private handleDeleteRequest(index: number): void {
        this.setState({ deleteIndex: index });
    }

    private handleDeleteConfirm(): void {
        const { deleteIndex } = this.state;
        if (deleteIndex !== null) {
            const rows = [...this.getRows()];
            rows.splice(deleteIndex, 1);
            this.saveRows(rows);
        }
        this.setState({ deleteIndex: null });
    }

    private handleToggleEnabled(index: number): void {
        const rows = [...this.getRows()];
        rows[index] = { ...rows[index], enabled: !rows[index].enabled };
        this.saveRows(rows);
    }

    private handleDialogSave(): void {
        const { editIndex, editRow } = this.state;
        if (editRow === null) {
            return;
        }

        const rows = [...this.getRows()];
        if (editIndex === -1) {
            rows.push(editRow);
        } else if (editIndex !== null) {
            rows[editIndex] = editRow;
        }
        this.saveRows(rows);
        this.setState({ editIndex: null, editRow: null, originalEditRow: null });
    }

    private handleDialogClose(): void {
        this.setState({ editIndex: null, editRow: null, originalEditRow: null });
    }

    private isEditRowChanged(): boolean {
        const { editRow, originalEditRow } = this.state;
        if (!editRow || !originalEditRow) {
            return false;
        }
        return JSON.stringify(editRow) !== JSON.stringify(originalEditRow);
    }

    private setEditField<K extends keyof PresenceRow>(field: K, value: PresenceRow[K]): void {
        this.setState(prev => ({
            editRow: prev.editRow ? { ...prev.editRow, [field]: value } : null,
        }));
    }

    private handleSelectIdResult(selectedId: string | string[] | undefined, name: string | null): void {
        const { showSelectId } = this.state;
        if (!showSelectId) {
            return;
        }

        const id = Array.isArray(selectedId) ? selectedId[0] : selectedId || '';

        if (showSelectId.context === 'table' && showSelectId.rowIndex !== undefined) {
            const rows = [...this.getRows()];
            rows[showSelectId.rowIndex] = {
                ...rows[showSelectId.rowIndex],
                name_id: id,
                name: name || rows[showSelectId.rowIndex].name,
            };
            this.saveRows(rows);
        } else if (showSelectId.context === 'dialog') {
            this.setState(prev => ({
                editRow: prev.editRow
                    ? {
                          ...prev.editRow,
                          name_id: id,
                          name: name || prev.editRow.name,
                      }
                    : null,
            }));
        } else if (showSelectId.context === 'dialog_light') {
            this.setState(prev => ({
                editRow: prev.editRow
                    ? {
                          ...prev.editRow,
                          presence_trigger_light: id,
                      }
                    : null,
            }));
        }

        this.setState({ showSelectId: null });
    }

    private renderSelectIdDialog(): React.JSX.Element | null {
        const { showSelectId } = this.state;
        if (!showSelectId) {
            return null;
        }

        let selected = '';
        if (showSelectId.context === 'table' && showSelectId.rowIndex !== undefined) {
            selected = this.getRows()[showSelectId.rowIndex]?.name_id || '';
        } else if (showSelectId.context === 'dialog') {
            selected = this.state.editRow?.name_id || '';
        } else if (showSelectId.context === 'dialog_light') {
            selected = this.state.editRow?.presence_trigger_light || '';
        }

        return (
            <DialogSelectID
                imagePrefix={this.props.oContext.imagePrefix === undefined ? '../..' : this.props.oContext.imagePrefix}
                dialogName={`admin.${this.props.oContext.adapterName}`}
                themeType={this.props.oContext.themeType}
                theme={this.props.oContext.theme}
                types={['state']}
                socket={this.props.oContext.socket}
                selected={selected}
                onClose={() => this.setState({ showSelectId: null })}
                onOk={(selectedId, name) => this.handleSelectIdResult(selectedId, name)}
            />
        );
    }

    private renderEditDialog(): React.JSX.Element | null {
        const { editRow, editIndex } = this.state;
        if (!editRow) {
            return null;
        }

        const isNew = editIndex === -1;
        const title = isNew ? I18n.t('presence_add_device') : `${I18n.t('presence_edit_device')} ${editRow.name_id}`;

        return (
            <Dialog
                open
                maxWidth="md"
                fullWidth
                onClose={() => this.handleDialogClose()}
            >
                <DialogTitle>{title}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                        {/* Name & Object-ID */}
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
                            <TextField
                                label={I18n.t('presence_col_name')}
                                value={editRow.name}
                                onChange={e => this.setEditField('name', e.target.value)}
                                variant="standard"
                                fullWidth
                            />
                            <TextField
                                label="Object-ID"
                                value={editRow.name_id}
                                onChange={e => this.setEditField('name_id', e.target.value)}
                                variant="standard"
                                fullWidth
                            />
                            <Button
                                variant="outlined"
                                sx={{ minWidth: 0, px: 1 }}
                                onClick={() => this.setState({ showSelectId: { context: 'dialog' } })}
                            >
                                <MoreHoriz />
                            </Button>
                        </Box>

                        {/* Trigger mode */}
                        <FormControl
                            variant="standard"
                            sx={{ maxWidth: 250 }}
                        >
                            <InputLabel>{I18n.t('presence_trigger_mode')}</InputLabel>
                            <Select
                                variant="standard"
                                value={editRow.option_presence}
                                onChange={e => this.setEditField('option_presence', e.target.value as PresenceOption)}
                            >
                                <MenuItem value="time">time</MenuItem>
                                <MenuItem value="sunrise">sunrise</MenuItem>
                                <MenuItem value="sunset">sunset</MenuItem>
                                <MenuItem value="light">light</MenuItem>
                            </Select>
                        </FormControl>

                        {/* Time range from/to (only for 'time' mode) */}
                        {editRow.option_presence === 'time' && (
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <TextField
                                    label={I18n.t('presence_lbl_time_from')}
                                    type="time"
                                    value={editRow.presence_time_from || ''}
                                    onChange={e => this.setEditField('presence_time_from', e.target.value)}
                                    variant="standard"
                                    slotProps={{ inputLabel: { shrink: true } }}
                                    sx={{ maxWidth: 200 }}
                                />
                                <TextField
                                    label={I18n.t('presence_lbl_time_to')}
                                    type="time"
                                    value={editRow.presence_time_to || ''}
                                    onChange={e => this.setEditField('presence_time_to', e.target.value)}
                                    variant="standard"
                                    slotProps={{ inputLabel: { shrink: true } }}
                                    sx={{ maxWidth: 200 }}
                                />
                            </Box>
                        )}

                        {/* On Duration & Delay */}
                        <Box
                            sx={{
                                display: 'flex',
                                gap: 2,
                                alignItems: 'flex-end',
                                flexWrap: 'wrap',
                            }}
                        >
                            <TextField
                                label={I18n.t('presence_lbl_on_duration')}
                                type="number"
                                value={editRow.presence_length}
                                onChange={e => this.setEditField('presence_length', Number(e.target.value))}
                                variant="standard"
                                sx={{ width: 120 }}
                            />
                            <FormControl
                                variant="standard"
                                sx={{ width: 70 }}
                            >
                                <Select
                                    value={editRow.presence_length_select}
                                    onChange={e =>
                                        this.setEditField('presence_length_select', e.target.value as TimeUnit)
                                    }
                                >
                                    <MenuItem value="sec">sec</MenuItem>
                                    <MenuItem value="min">min</MenuItem>
                                </Select>
                            </FormControl>
                            <FormControl
                                variant="standard"
                                sx={{ width: 120 }}
                            >
                                <InputLabel>{I18n.t('presence_lbl_shuffle')}</InputLabel>
                                <Select
                                    value={editRow.presence_length_shuffle}
                                    onChange={e => this.setEditField('presence_length_shuffle', Number(e.target.value))}
                                >
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => (
                                        <MenuItem
                                            key={v}
                                            value={v}
                                        >
                                            {v}x
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <Box sx={{ width: 24 }} />

                            <TextField
                                label={I18n.t('presence_lbl_delay')}
                                type="number"
                                value={editRow.presence_delay}
                                onChange={e => this.setEditField('presence_delay', Number(e.target.value))}
                                variant="standard"
                                sx={{ width: 120 }}
                            />
                            <FormControl
                                variant="standard"
                                sx={{ width: 70 }}
                            >
                                <Select
                                    value={editRow.presence_delay_select}
                                    onChange={e =>
                                        this.setEditField('presence_delay_select', e.target.value as TimeUnit)
                                    }
                                >
                                    <MenuItem value="sec">sec</MenuItem>
                                    <MenuItem value="min">min</MenuItem>
                                </Select>
                            </FormControl>
                            <FormControl
                                variant="standard"
                                sx={{ width: 120 }}
                            >
                                <InputLabel>{I18n.t('presence_lbl_shuffle')}</InputLabel>
                                <Select
                                    value={editRow.presence_delay_shuffle}
                                    onChange={e => this.setEditField('presence_delay_shuffle', Number(e.target.value))}
                                >
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => (
                                        <MenuItem
                                            key={v}
                                            value={v}
                                        >
                                            {v}x
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>

                        {/* Values ON/OFF */}
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                label={I18n.t('presence_lbl_val_on')}
                                value={editRow.presence_val_on}
                                onChange={e => this.setEditField('presence_val_on', e.target.value)}
                                variant="standard"
                                sx={{ width: 150 }}
                            />
                            <TextField
                                label={I18n.t('presence_lbl_val_off')}
                                value={editRow.presence_val_off}
                                onChange={e => this.setEditField('presence_val_off', e.target.value)}
                                variant="standard"
                                sx={{ width: 150 }}
                            />
                        </Box>

                        {/* Light sensor fields (only for 'light' mode) */}
                        {editRow.option_presence === 'light' && (
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
                                <TextField
                                    label={I18n.t('presence_lbl_light_trigger')}
                                    value={editRow.presence_trigger_light}
                                    onChange={e => this.setEditField('presence_trigger_light', e.target.value)}
                                    variant="standard"
                                    fullWidth
                                />
                                <Button
                                    variant="outlined"
                                    sx={{ minWidth: 0, px: 1 }}
                                    onClick={() => this.setState({ showSelectId: { context: 'dialog_light' } })}
                                >
                                    <MoreHoriz />
                                </Button>
                                <TextField
                                    label={I18n.t('presence_lbl_light_lux')}
                                    type="number"
                                    value={editRow.presence_light_lux}
                                    onChange={e => this.setEditField('presence_light_lux', Number(e.target.value))}
                                    variant="standard"
                                    sx={{ width: 150 }}
                                />
                            </Box>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="contained"
                        disabled={!this.isEditRowChanged()}
                        onClick={() => this.handleDialogSave()}
                        startIcon={<Check />}
                    >
                        OK
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => this.handleDialogClose()}
                        startIcon={<Close />}
                        color="inherit"
                    >
                        {I18n.t('presence_cancel')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    private renderDeleteDialog(): React.JSX.Element | null {
        if (this.state.deleteIndex === null) {
            return null;
        }
        const row = this.getRows()[this.state.deleteIndex];
        return (
            <Dialog
                open
                onClose={() => this.setState({ deleteIndex: null })}
            >
                <DialogTitle>{I18n.t('presence_delete_title')}</DialogTitle>
                <DialogContent>
                    {I18n.t('presence_delete_confirm')} &quot;{row?.name || row?.name_id}&quot;?
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => this.handleDeleteConfirm()}
                        color="error"
                    >
                        {I18n.t('presence_lbl_delete')}
                    </Button>
                    <Button onClick={() => this.setState({ deleteIndex: null })}>{I18n.t('presence_cancel')}</Button>
                </DialogActions>
            </Dialog>
        );
    }

    renderItem(): React.JSX.Element {
        const rows = this.getRows();
        const isDark = this.props.oContext?.themeType === 'dark';

        return (
            <div style={{ width: '100%' }}>
                <Fab
                    size="small"
                    color="primary"
                    onClick={() => this.handleAddNew()}
                    sx={{ mb: 1 }}
                >
                    <Add />
                </Fab>

                <TableContainer component={Paper}>
                    <Table size="small">
                        <TableHead>
                            <TableRow
                                sx={{
                                    backgroundColor: 'primary.main',
                                    '& th': { color: '#fff', fontWeight: 'bold' },
                                }}
                            >
                                <TableCell sx={{ width: 50 }}>{I18n.t('presence_col_active')}</TableCell>
                                <TableCell>{I18n.t('presence_col_name')}</TableCell>
                                <TableCell>Object-ID</TableCell>
                                <TableCell
                                    sx={{ width: 250 }}
                                    align="right"
                                />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((row, index) => (
                                <TableRow
                                    key={index}
                                    sx={{
                                        '&:hover': {
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                                        },
                                    }}
                                >
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            checked={row.enabled}
                                            onChange={() => this.handleToggleEnabled(index)}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            value={row.name}
                                            onChange={e => this.handleInlineEdit(index, 'name', e.target.value)}
                                            variant="standard"
                                            size="small"
                                            fullWidth
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <TextField
                                                value={row.name_id}
                                                onChange={e => this.handleInlineEdit(index, 'name_id', e.target.value)}
                                                variant="standard"
                                                size="small"
                                                fullWidth
                                            />
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                sx={{ minWidth: 0, px: 0.5 }}
                                                onClick={() =>
                                                    this.setState({
                                                        showSelectId: { context: 'table', rowIndex: index },
                                                    })
                                                }
                                            >
                                                <MoreHoriz fontSize="small" />
                                            </Button>
                                        </Box>
                                    </TableCell>
                                    <TableCell
                                        align="right"
                                        sx={{ whiteSpace: 'nowrap' }}
                                    >
                                        <Tooltip title={I18n.t('presence_tt_insert')}>
                                            <IconButton
                                                size="small"
                                                onClick={() => this.handleInsertAfter(index)}
                                            >
                                                <Add fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title={I18n.t('presence_tt_edit')}>
                                            <IconButton
                                                size="small"
                                                onClick={() => this.handleEdit(index)}
                                            >
                                                <Edit fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title={I18n.t('presence_tt_copy')}>
                                            <IconButton
                                                size="small"
                                                onClick={() => this.handleCopy(index)}
                                            >
                                                <ContentCopy fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title={I18n.t('presence_tt_up')}>
                                            <span>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => this.handleMoveUp(index)}
                                                    disabled={index === 0}
                                                >
                                                    <KeyboardArrowUp fontSize="small" />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                        <Tooltip title={I18n.t('presence_tt_down')}>
                                            <span>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => this.handleMoveDown(index)}
                                                    disabled={index === rows.length - 1}
                                                >
                                                    <KeyboardArrowDown fontSize="small" />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                        <Tooltip title={I18n.t('presence_tt_delete')}>
                                            <IconButton
                                                size="small"
                                                onClick={() => this.handleDeleteRequest(index)}
                                                color="error"
                                            >
                                                <Delete fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {rows.length === 0 && (
                                <TableRow>
                                    <TableCell
                                        colSpan={4}
                                        align="center"
                                        sx={{ py: 4, opacity: 0.5 }}
                                    >
                                        {I18n.t('presence_no_entries')}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {this.renderEditDialog()}
                {this.renderDeleteDialog()}
                {this.renderSelectIdDialog()}
            </div>
        );
    }
}
