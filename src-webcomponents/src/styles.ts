/**
 * The styles of the shadow root, and of the dialogs the element opens (each of them has a shadow root of its own).
 *
 * The element fills the box of the host, has a transparent background and inherits `color` and `font`. Everything
 * else comes from the theme of the host, which the base class sets as CSS variables: `--iob-primary`, `--iob-text`,
 * `--iob-divider`, the four state colors and `--iob-border-radius`. A state takes one of the four severities, as the
 * MUI panel of the widgets does (`.sev-*` sets `--sev`); there is no color of its own anywhere.
 *
 * The box decides the rest through container queries on `.mount` (`container-type: size`, named `alarm`):
 * - below 320 px of height the panel is dense; below 225 px it leaves out the zones, below 190 px "with delay"
 * - below 270 px of width (200 px when dense) the four modes fall into two rows of two
 * - `content-auto` shows the tile instead of the panel below 200 x 140 px
 *
 * In a dialog the height is not given, so `.mount.dialog` is an `inline-size` container: the panel is drawn in full.
 */
export const STYLES = `
:host {
    display: block;
    width: 100%;
    height: 100%;
}
* {
    box-sizing: border-box;
}
.mount {
    width: 100%;
    height: 100%;
    /* the size of the box does not depend on what is in it - no loop between measuring and laying out */
    container-type: size;
    container-name: alarm;
    /* text on a filled state color, as the default palettes of MUI have it */
    --on-error: #fff;
    --on-warning: #fff;
    --on-success: #fff;
    --on-info: #fff;
    --hover: color-mix(in srgb, currentColor 8%, transparent);
}
.mount.dark {
    --on-warning: rgba(0, 0, 0, 0.87);
    --on-success: rgba(0, 0, 0, 0.87);
    --on-info: rgba(0, 0, 0, 0.87);
}
.mount.dialog {
    height: auto;
    container-type: inline-size;
}
.sev-error {
    --sev: var(--iob-error);
    --on-sev: var(--on-error);
}
.sev-warning {
    --sev: var(--iob-warning);
    --on-sev: var(--on-warning);
}
.sev-success {
    --sev: var(--iob-success);
    --on-sev: var(--on-success);
}
.sev-info {
    --sev: var(--iob-info);
    --on-sev: var(--on-info);
}
svg {
    display: block;
    flex: none;
    fill: currentColor;
}
button {
    font: inherit;
    color: inherit;
    margin: 0;
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
}
button:focus-visible {
    outline: 2px solid var(--iob-primary);
    outline-offset: 1px;
}
button:disabled {
    cursor: default;
    opacity: 0.38;
}

/* the box */
.alarm {
    width: 100%;
    height: 100%;
}
.alarm.edit,
.hint.edit {
    /* in the editor of the host a click selects the element, it does not arm the house */
    pointer-events: none;
}
.content-auto > .tile {
    display: none;
}
@container alarm (max-width: 199px) or (max-height: 139px) {
    .content-auto > .panel {
        display: none;
    }
    .content-auto > .tile {
        display: flex;
    }
}

/* the panel */
.panel {
    --gap: 12px;
    display: flex;
    flex-direction: column;
    gap: var(--gap);
    width: 100%;
    height: 100%;
    min-height: 0;
    padding: 8px;
    overflow-x: hidden;
    overflow-y: auto;
}
.dialog .panel {
    height: auto;
    padding: 0;
    overflow: visible;
}
.head {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
}
.title {
    flex: 1 1 auto;
    min-width: 0;
    font-size: 1.25em;
    font-weight: 500;
    line-height: 1.6;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.icon-button {
    position: relative;
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: none;
    color: var(--iob-text-secondary);
}
.icon-button:hover {
    background: var(--hover);
}
.icon-button svg {
    width: 20px;
    height: 20px;
}
.chevron {
    transition: transform 0.2s;
}
.chevron.open {
    transform: rotate(180deg);
}
.dot {
    position: absolute;
    top: 5px;
    right: 5px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--iob-warning);
}

/* the status, and the triggered alarm groups */
.alert {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    padding: 0 16px;
    border: 1px solid var(--sev);
    border-radius: var(--iob-border-radius);
    color: color-mix(in srgb, var(--sev) 45%, var(--iob-text));
    font-size: 0.875em;
    line-height: 1.43;
}
.alert > svg {
    width: 22px;
    height: 22px;
    color: var(--sev);
}
.alert .message {
    flex: 1 1 auto;
    min-width: 0;
    padding: 8px 0;
    overflow-wrap: anywhere;
}
.alert .action {
    flex: none;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
}
.alert.filled {
    border-color: transparent;
    background: var(--sev);
    color: var(--on-sev);
}
.alert.filled > svg {
    color: inherit;
}
.alert-title {
    font-weight: 500;
    font-size: 1.14em;
}
.alert.counting {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
}
.progress {
    position: relative;
    height: 4px;
    margin-top: -1px;
    overflow: hidden;
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
    background: color-mix(in srgb, var(--sev) 30%, transparent);
}
.progress::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 40%;
    background: var(--sev);
    animation: alarm-progress 1.6s ease-in-out infinite;
}
@keyframes alarm-progress {
    from {
        transform: translateX(-100%);
    }
    to {
        transform: translateX(250%);
    }
}
@media (prefers-reduced-motion: reduce) {
    .progress::before {
        width: 100%;
        animation: none;
    }
}

/* the four modes */
.modes {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
}
.mode {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-width: 0;
    padding: 10px 4px;
    border: 1px solid var(--iob-divider);
    border-radius: var(--iob-border-radius);
    background: none;
    color: var(--iob-text-secondary);
    line-height: 1.2;
}
.mode:hover {
    background: var(--hover);
}
.mode.selected {
    border-color: color-mix(in srgb, var(--iob-primary) 50%, transparent);
    background: color-mix(in srgb, var(--iob-primary) 14%, transparent);
    color: var(--iob-primary);
}
.mode svg {
    width: 24px;
    height: 24px;
}
.mode span {
    max-width: 100%;
    font-size: 0.875em;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* buttons */
.button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-width: 64px;
    padding: 5px 15px;
    border: 1px solid color-mix(in srgb, currentColor 35%, transparent);
    border-radius: var(--iob-border-radius);
    background: none;
    font-size: 0.875em;
    font-weight: 500;
    line-height: 1.75;
}
.button:hover:not(:disabled) {
    background: var(--hover);
}
.button svg {
    width: 20px;
    height: 20px;
}
.button span {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.button.full {
    width: 100%;
}
.button.grow {
    flex: 1 1 auto;
}
.button.error {
    border-color: color-mix(in srgb, var(--iob-error) 50%, transparent);
    color: var(--iob-error);
}
.button.primary {
    border-color: color-mix(in srgb, var(--iob-primary) 50%, transparent);
    color: var(--iob-primary);
}
.button.contained {
    border-color: transparent;
    background: var(--sev);
    color: var(--on-sev);
}
.button.contained.primary {
    background: var(--iob-primary);
    color: var(--iob-primary-contrast);
}
.button.contained:hover:not(:disabled) {
    background: color-mix(in srgb, var(--sev, var(--iob-primary)) 85%, #000);
}
.button.contained.primary:hover:not(:disabled) {
    background: color-mix(in srgb, var(--iob-primary) 85%, #000);
}
.actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
}
.actions.wrap {
    flex-wrap: wrap;
}

/* zones and flags */
.chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}
.chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
    height: 32px;
    padding: 0 12px 0 7px;
    border: 1px solid color-mix(in srgb, var(--sev, var(--iob-text)) 60%, transparent);
    border-radius: 16px;
    background: none;
    color: var(--sev, currentColor);
    font-size: 0.8125em;
    white-space: nowrap;
}
button.chip:hover {
    background: var(--hover);
}
.chip svg {
    width: 18px;
    height: 18px;
}
.chip span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
}
.chip.off {
    border-color: var(--iob-divider);
    color: var(--iob-text-secondary);
}
.chip.filled {
    border-color: transparent;
    background: var(--sev);
    color: var(--on-sev);
}
button.chip.filled:hover {
    background: color-mix(in srgb, var(--sev) 85%, #000);
}
.chip.small {
    height: 24px;
    padding: 0 8px 0 5px;
    gap: 4px;
}
.chip.small svg {
    width: 16px;
    height: 16px;
}

/* the details */
.details {
    display: flex;
    flex-direction: column;
    gap: var(--gap);
}
.divider {
    border-top: 1px solid var(--iob-divider);
}
.switch {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    padding: 4px 0;
    border: 0;
    background: none;
    font-size: 0.875em;
    text-align: left;
}
.switch .label {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.track {
    position: relative;
    flex: none;
    width: 34px;
    height: 14px;
    margin: 0 3px;
    border-radius: 7px;
    background: color-mix(in srgb, var(--iob-text) 38%, transparent);
    transition: background 0.15s;
}
.thumb {
    position: absolute;
    top: -3px;
    left: -3px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #fafafa;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
    transition: transform 0.15s;
}
.dark .thumb {
    background: #bdbdbd;
}
.switch.on .track {
    background: color-mix(in srgb, var(--iob-primary) 50%, transparent);
}
.switch.on .thumb {
    transform: translateX(20px);
    background: var(--iob-primary);
}
.log {
    font-size: 0.75em;
    color: var(--iob-text-secondary);
    overflow-wrap: anywhere;
}

/* a dense panel, for a box that is not high */
@container alarm (max-height: 320px) {
    .panel {
        --gap: 6px;
        padding: 4px;
    }
    .title {
        font-size: 1em;
    }
    .icon-button {
        width: 26px;
        height: 26px;
    }
    .alert {
        padding: 0 10px;
        gap: 8px;
    }
    .alert .message {
        padding: 4px 0;
    }
    .alert > svg {
        width: 18px;
        height: 18px;
    }
    .mode {
        gap: 2px;
        padding: 4px;
    }
    .mode svg {
        width: 20px;
        height: 20px;
    }
    .mode span {
        font-size: 0.75em;
    }
    .button {
        padding: 2px 9px;
        font-size: 0.8125em;
    }
    .chip {
        height: 24px;
        padding: 0 8px 0 5px;
        gap: 4px;
    }
    .chip svg {
        width: 16px;
        height: 16px;
    }
}
/* what is not the point of the panel steps aside in a box that is too short for all of it */
@container alarm (max-height: 225px) {
    .zones {
        display: none;
    }
}
@container alarm (max-height: 190px) {
    .delay {
        display: none;
    }
}
/* four modes or two rows of two, never three and a stray one; the dense labels are smaller */
@container alarm (max-width: 270px) {
    .modes {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}
@container alarm (max-width: 270px) and (max-height: 320px) {
    .modes {
        grid-template-columns: repeat(4, minmax(0, 1fr));
    }
}
@container alarm (max-width: 200px) {
    .modes {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

/* the tile */
.tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: clamp(2px, 3cqmin, 8px);
    width: 100%;
    height: 100%;
    min-width: 0;
    padding: clamp(4px, 4cqmin, 12px);
    border: 0;
    border-radius: calc(var(--iob-border-radius) * 2);
    background: none;
    text-align: center;
}
.tile:hover {
    background: var(--hover);
}
.avatar {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    width: clamp(28px, 32cqmin, 72px);
    height: clamp(28px, 32cqmin, 72px);
    border-radius: calc(var(--iob-border-radius) * 2);
    background: color-mix(in srgb, var(--iob-text) 10%, transparent);
    color: var(--sev);
}
.avatar svg {
    width: 60%;
    height: 60%;
}
.texts {
    display: flex;
    flex-direction: column;
    min-width: 0;
    max-width: 100%;
}
.caption,
.state,
.countdown {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.caption,
.countdown {
    font-size: clamp(10px, 7cqmin, 14px);
    color: var(--iob-text-secondary);
}
.countdown {
    font-variant-numeric: tabular-nums;
}
.state {
    font-size: clamp(11px, 9cqmin, 20px);
    font-weight: 500;
    color: var(--sev);
}
@container alarm (min-aspect-ratio: 2 / 1) {
    .tile {
        flex-direction: row;
        gap: clamp(6px, 8cqmin, 16px);
        text-align: left;
    }
    .avatar {
        width: clamp(24px, 60cqmin, 56px);
        height: clamp(24px, 60cqmin, 56px);
    }
    .caption,
    .countdown {
        font-size: clamp(10px, 16cqmin, 14px);
    }
    .state {
        font-size: clamp(11px, 22cqmin, 18px);
    }
}

/* no instance chosen */
.hint {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    height: 100%;
    padding: 8px;
    text-align: center;
    color: var(--iob-text-secondary);
    font-size: clamp(11px, 5cqmin, 14px);
}
.hint svg {
    width: clamp(18px, 12cqmin, 36px);
    height: clamp(18px, 12cqmin, 36px);
    opacity: 0.6;
}

/* the circuits dialog */
.circuits h4 {
    margin: 8px 0 2px;
    font-size: 0.875em;
    font-weight: 500;
    color: var(--iob-text-secondary);
}
.circuits section:first-child h4 {
    margin-top: 0;
}
.circuits ul {
    margin: 0;
    padding: 0;
    list-style: none;
}
.circuits li {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 0;
    font-size: 0.875em;
    overflow-wrap: anywhere;
}
.circuits li svg {
    width: 22px;
    height: 22px;
}
.circuits svg.open {
    color: var(--iob-warning);
}
.circuits svg.closed {
    color: var(--iob-success);
}
.circuits li.empty {
    color: var(--iob-text-secondary);
}

/* the password dialog */
.password {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin: 0;
}
.field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.875em;
    color: var(--iob-text-secondary);
}
.field input {
    padding: 6px 0;
    border: 0;
    border-bottom: 1px solid color-mix(in srgb, var(--iob-text) 42%, transparent);
    border-radius: 0;
    background: transparent;
    color: var(--iob-text);
    font: inherit;
    font-size: 1.14em;
    outline: none;
}
.field input:focus {
    padding-bottom: 5px;
    border-bottom: 2px solid var(--iob-primary);
}
.field .help {
    font-size: 0.86em;
}
.field.error,
.field.error input {
    color: var(--iob-error);
    border-bottom-color: var(--iob-error);
}
.field.error input {
    color: var(--iob-text);
}
`;
