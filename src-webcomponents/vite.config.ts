import react from '@vitejs/plugin-react';
import { checkManifest, getReactImportPath, REACT_SPECIFIERS, type WebComponentText } from '@iobroker/web-components';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

// with the extension: Vite may load its config natively, without a bundler that would add it
import { LANGUAGES, MANIFEST_FILE, MODULE_FILE, MODULE_PATH, WORD_KEYS } from './src/constants.ts';
import { buildManifest } from './src/manifest.ts';

/**
 * The web component `<iob-alarm-panel>`: one ES module, `admin/webcomponents/alarm-panel.js`, and its manifest
 * `alarm-panel.json` next to it (`common.webComponents`). Every host - vis-2, devices, Aura, admin - reads them from
 * `/adapter/alarm/webcomponents/`. No module federation: the host shares nothing but the socket.
 *
 * React is not bundled: the four React imports point at `lib/esm/react-19.js`, which web and admin serve beside
 * `adapter/`. The path is relative to the module, so a path prefix of a reverse proxy stays.
 *
 * The pure logic of the panel (`src-shared/src/states.ts`, `ui.ts`) is compiled in through the `@alarm` alias, as in
 * the two widget projects; its words come from `src-shared/i18n`, picked here.
 */

type Dictionary = Record<string, string>;

/**
 * A JSON file, relative to this one
 *
 * @param path e.g. `../io-package.json`
 */
function readJson<T>(path: string): T {
    return JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8')) as T;
}

/** The dictionary of the widgets, per language */
function readDictionaries(): Record<string, Dictionary> {
    return Object.fromEntries(
        LANGUAGES.map(lang => [lang, readJson<Dictionary>(`../src-shared/i18n/${lang}.json`)] as const),
    );
}

/**
 * A word of the dictionary in every language
 *
 * @param dictionaries the dictionary per language
 * @param key the word
 * @returns the texts, or the languages it is missing in
 */
function getWord(dictionaries: Record<string, Dictionary>, key: string): { text: Dictionary; missing: string[] } {
    const text: Dictionary = {};
    const missing: string[] = [];
    for (const lang of LANGUAGES) {
        const value = dictionaries[lang]?.[key];
        if (value) {
            text[lang] = value;
        } else {
            missing.push(lang);
        }
    }
    return { text, missing };
}

/** The words the element shows (`src/i18n.ts`): every word in every language, or the build fails */
function pickWords(): Record<string, Dictionary> {
    const dictionaries = readDictionaries();
    const picked: Record<string, Dictionary> = Object.fromEntries(LANGUAGES.map(lang => [lang, {}]));
    for (const key of WORD_KEYS) {
        const { text, missing } = getWord(dictionaries, key);
        if (missing.length) {
            throw new Error(`The word "${key}" of src-shared/i18n is missing in: ${missing.join(', ')}`);
        }
        for (const lang of LANGUAGES) {
            picked[lang][key] = text[lang];
        }
    }
    return picked;
}

interface DeviceWidget {
    name: string;
    label?: WebComponentText;
    description?: WebComponentText;
}

/**
 * Writes `alarm-panel.json` next to the module, checked like a host checks it. Its name is the label of the devices
 * tile, so that vis-2 and devices show their own widget instead of this one
 */
function manifestFile(): Plugin {
    return {
        name: 'alarm-web-component-manifest',
        generateBundle() {
            const dictionaries = readDictionaries();
            const ioPackage = readJson<{ common: { deviceWidgets?: { components?: DeviceWidget[] } } }>(
                '../io-package.json',
            );
            const widget = ioPackage.common.deviceWidgets?.components?.find(
                component => component.name === 'AlarmPanelComponent',
            );
            if (!widget?.label || !widget.description) {
                this.error(
                    'io-package.json: common.deviceWidgets has no AlarmPanelComponent with label and description',
                );
            }
            for (const [field, text] of Object.entries({ label: widget.label, description: widget.description })) {
                const missing = LANGUAGES.filter(lang => typeof text === 'string' || !text[lang]);
                if (missing.length) {
                    this.error(
                        `io-package.json: the ${field} of AlarmPanelComponent is missing in: ${missing.join(', ')}`,
                    );
                }
            }

            const manifest = buildManifest(
                key => {
                    const { text, missing } = getWord(dictionaries, key);
                    if (missing.length) {
                        this.error(`The word "${key}" of src-shared/i18n is missing in: ${missing.join(', ')}`);
                    }
                    return text as WebComponentText;
                },
                { name: widget.label, description: widget.description },
            );
            const problem = checkManifest(manifest);
            if (problem) {
                this.error(`${MANIFEST_FILE}: ${problem}`);
            }
            this.emitFile({
                type: 'asset',
                fileName: MANIFEST_FILE,
                source: `${JSON.stringify(manifest, null, 4)}\n`,
            });
        },
    };
}

const reactImport = getReactImportPath(MODULE_PATH);

export default {
    plugins: [react(), manifestFile()],
    resolve: {
        alias: {
            '@alarm': fileURLToPath(new URL('../src-shared/src', import.meta.url)),
        },
    },
    define: {
        __ALARM_WORDS__: JSON.stringify(pickWords()),
        'process.env.NODE_ENV': JSON.stringify('production'),
    },
    build: {
        target: 'es2022',
        outDir: './build',
        emptyOutDir: true,
        lib: {
            entry: './src/index.tsx',
            formats: ['es'],
            fileName: (): string => MODULE_FILE,
        },
        rollupOptions: {
            external: [...REACT_SPECIFIERS],
            output: {
                paths: Object.fromEntries(REACT_SPECIFIERS.map(specifier => [specifier, reactImport])),
                // one file: a host imports exactly one URL
                codeSplitting: false,
                // library mode keeps whitespace for the bundler of a consumer; this module is loaded as it is
                minify: true,
            },
        },
    },
};
