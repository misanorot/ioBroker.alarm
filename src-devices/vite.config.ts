/**
 * The devices app's tile for ioBroker.alarm.
 *
 * ## The panel is not in this project
 *
 * It lives in `../src-shared/src`, shared with the vis-2 widget set and reached here through the
 * `@alarm` alias. This project adds only what is particular to the devices app: the
 * `WidgetGeneric` subclass and its settings.
 *
 * ## No Module Federation sharing - on purpose
 *
 * `shared` is empty because the devices app shares nothing through federation; it hands its React,
 * MUI and gui-components out on `window.__iobrokerShared__` instead. Declaring them shared here
 * would make the runtime find nothing in the share scope and fall back to a copy bundled into this
 * tile - a second React, on which every hook of the panel fails. {@link hostShared} redirects the
 * imports to that global; see there.
 */

import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import commonjs from 'vite-plugin-commonjs';
import { federation } from '@module-federation/vite';
import { hostShared } from './hostShared';

/**
 * Resolves a path relative to this file.
 *
 * @param relative path relative to `src-devices`
 */
const dir = (relative: string): string => fileURLToPath(new URL(relative, import.meta.url));

const config = {
    plugins: [
        hostShared([
            dir('./src'),
            dir('../src-shared/src'),
            // The stub of the devices base class imports `Component` from react.
            dir('./node_modules/@iobroker/dm-widgets/build'),
        ]),
        federation({
            manifest: true,
            name: 'DevicesWidgetAlarmSet',
            filename: 'customDevices.js',
            exposes: {
                './Components': './src/Components.tsx',
                './translations': './src/translations',
            },
            remotes: {},
            shared: {},
            dts: false,
        }),
        react(),
        commonjs(),
    ],
    resolve: {
        alias: {
            '@alarm': dir('../src-shared/src'),
        },
        // The panel lives outside this project, so Node resolution would look for its packages
        // next to it and then further up - and find whatever a developer happens to have in a
        // parent folder. It only ever showed up in the sub-paths: `hostShared` catches the bare
        // names, but `react/jsx-runtime` went past it and pulled a React 18 runtime into the
        // bundle, on which every element this tile creates is refused by the host's React 19.
        dedupe: [
            'react',
            'react-dom',
            '@emotion/react',
            '@emotion/styled',
            '@mui/material',
            '@mui/system',
            '@mui/icons-material',
            '@iobroker/gui-components',
        ],
    },
    server: {
        fs: {
            // The panel and the words live outside this project root.
            allow: [dir('..')],
        },
    },
    base: './',
    build: {
        // Top-level await, emitted by the federation plugin, needs chrome89+.
        target: 'chrome89',
        outDir: './build',
        rollupOptions: {
            onwarn(warning: { code: string }, warn: (warning: { code: string }) => void): void {
                // "Module level directives cause errors when bundled" - harmless for "use client".
                if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
                    return;
                }
                warn(warning);
            },
        },
    },
};

export default config;
