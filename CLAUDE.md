# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ioBroker.alarm is an ioBroker adapter implementing a home alarm system with zones, presence detection, night mode, speech output, and scheduling features. It is written in TypeScript and targets Node.js >= 22.

## Commands

- **Build**: `npm run build` (backend, admin component, vis-2 widget set and devices tile)
- **Build backend only**: `npm run build:backend` (compiles TypeScript from `src/` to `build/` via `tsc -p tsconfig.build.json`)
- **Build vis-2 widget**: `npm run build:widgets` (`src-widgets/` → `widgets/alarm/`)
- **Build devices tile**: `npm run build:devices` (`src-devices/` → `admin/dm-widgets/`)
- **Watch**: `npm run watch` (incremental compilation)
- **Type check**: `npm run check` (runs `tsc --noEmit` against `tsconfig.json`); `npm run check:widgets` and `npm run check:devices` do the same for the two widget projects
- **Lint**: `npm run lint` (ESLint with `@iobroker/eslint-config`, flat config in `eslint.config.mjs`)
- **Test all**: `npm test` (runs unit + package tests)
- **Unit tests**: `npm run test:js` (Mocha, pattern: `*.test.js` and `test/**/test!(PackageFiles|Startup).js`)
- **Package tests**: `npm run test:package` (validates adapter package structure)
- **Integration tests**: `npm run test:integration`
- **Translate**: `npm run translate` (generates i18n files for admin UI)
- **Release**: `npm run release` (uses `@alcalzone/release-script`)

## Architecture

### Source Layout

- `src/main.ts` — Single-file adapter (~2,300 lines). Contains the `Alarm` class extending `utils.Adapter` with all alarm logic. Exported as a factory function for the ioBroker adapter framework.
- `src/types.d.ts` — TypeScript interfaces for adapter configuration tables (circuits, zones, shortcuts, presence, sayit).
- `src/types/suncalc2.d.ts` — Type declarations for the `suncalc2` dependency.
- `build/` — Compiled output (git-ignored). Entry point is `build/main.js`.

### Admin UI

- `admin/jsonConfig.json` — Settings page of the adapter (JSON config).
- `src-admin/` — React component for the custom settings tables, built to `admin/custom/`.
- `admin/i18n/` — Translation strings of the settings page.
- State definitions live in `io-package.json` (`instanceObjects`).

### Widgets

One panel, two hosts. The UI is written once and built twice:

- `src-shared/src/` — The alarm panel, the small status tile and the dialogs, plus the hooks that
  read and write one `alarm.<n>` instance. Has no `node_modules` of its own: both builds reach it
  through the `@alarm` alias and compile it with their own React and MUI.
- `src-shared/i18n/` — One dictionary for everything, keys prefixed with `alarm_` so the same files
  serve both hosts.
- `src-widgets/` — The `VisRxWidget` subclass around the panel. Built to `widgets/alarm/` and
  declared in `io-package.json` under `common.visWidgets`. vis-2 shares React and MUI through
  Module Federation, so the bundle imports them normally.
- `src-devices/` — The `WidgetGeneric` subclass for the ioBroker.devices app. Built to
  `admin/dm-widgets/` and declared under `common.deviceWidgets`. That app shares nothing through
  federation and hands its modules out on `window.__iobrokerShared__` instead, so
  `src-devices/hostShared.ts` redirects every import of React, MUI and gui-components to that
  global — a second React would break every hook of the panel.
- `widgets/` and `admin/dm-widgets/` are build output but **are committed**, because they ship in
  the npm package. The intermediate `src-*/build/` folders are git-ignored.

The panel is built from stock MUI components - `Alert`, `ToggleButton`, `Chip`, `Button`, `Switch`
- with a `severity` or a palette `color`, and carries no colour, radius or elevation of its own. It
therefore looks like the admin 8 it is embedded in, in every ioBroker theme. `src-shared/src/ui.ts`
is the whole of its visual vocabulary: a map from an alarm state to one of MUI's four severities.

Both widget projects resolve their packages with `resolve.dedupe`, because the shared panel lies
outside their roots and Node resolution would otherwise look for React next to it and further up.

### Key Dependencies

- `@iobroker/adapter-core` — ioBroker adapter framework
- `node-schedule` — Cron-like job scheduling
- `suncalc2` — Sunrise/sunset calculations for time-based features

### TypeScript Configuration

Two tsconfig files serve different purposes:
- `tsconfig.json` — Type checking only (`noEmit: true`, `allowJs: true`, `checkJs: true`). Used by `npm run check`.
- `tsconfig.build.json` — Compilation (`noEmit: false`, `allowJs: false`). Compiles `src/` to `build/` with declarations.

Strict mode is disabled. Target is ES2022 with Node16 module resolution.

### Testing

Uses Mocha with Chai/Sinon via `@iobroker/testing`. Test setup is in `test/mocha.setup.js`. Custom Mocha config in `test/mocharc.custom.json`.

### CI/CD

GitHub Actions workflow (`.github/workflows/test-and-release.yml`):
- Type check + lint on Node 22.x
- Adapter tests on matrix: Node {20, 22, 24} × {Ubuntu, Windows, macOS}
- Deploy to npm on version tags (`v*.*.*`)

## Conventions

- ESLint uses `@iobroker/eslint-config` — JSDoc is not required (`jsdoc/require-jsdoc` disabled).
- Prettier config extends `@iobroker/eslint-config/prettier.config.mjs`.
- The adapter supports 10+ languages (EN, DE, RU, PT, NL, FR, IT, ES, PL, UK, ZH-CN).
