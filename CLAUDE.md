# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ioBroker.alarm is an ioBroker adapter implementing a home alarm system with zones, presence detection, night mode, speech output, and scheduling features. It is written in TypeScript and targets Node.js >= 20.

## Commands

- **Build**: `npm run build` (compiles TypeScript from `src/` to `build/` via `tsc -p tsconfig.build.json`)
- **Watch**: `npm run watch` (incremental compilation)
- **Type check**: `npm run check` (runs `tsc --noEmit` against `tsconfig.json`)
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

- `admin/index_m.html` — jQuery-based settings page for the adapter.
- `admin/words.js` — Translation strings.
- Configuration schema and state definitions live in `io-package.json`.

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
