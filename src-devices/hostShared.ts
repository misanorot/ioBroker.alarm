/**
 * Hands the tile React, MUI and gui-components from the devices app, not from its own bundle.
 *
 * ## Why this exists
 *
 * The devices app does not share React through Module Federation. It creates its federation
 * instance with `shared: {}` and puts its modules on `window.__iobrokerShared__` instead
 * (`ioBroker.devices`, `src-admin/src/WidgetsManager/pluginLoader.ts`), because proxy-wrapped
 * shared modules caused trouble in production builds there.
 *
 * So a tile that simply imports `react` would get a copy bundled into itself - a second React.
 * A class component survives that; a hook does not: `useState` from one React called while the
 * other one is rendering fails with "Invalid hook call". The panel this tile shows with the vis-2
 * widget is built on hooks, so every import of these packages is redirected to a small module that
 * reads the devices app's own copy from that global.
 *
 * ## Why the export list is collected, not written out
 *
 * `@mui/icons-material` alone has over ten thousand exports; re-exporting all of them would put
 * every name into the bundle. Writing the list by hand would go stale the first time somebody adds
 * an import to the shared panel. So the names are read out of the sources at build time, and each
 * redirect module exports exactly the names something actually imports.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';

/** Packages the devices app provides on `window.__iobrokerShared__`, under these keys. */
export const HOST_SHARED_PACKAGES = [
    'react',
    'react-dom',
    '@mui/material',
    '@mui/icons-material',
    '@iobroker/gui-components',
] as const;

const VIRTUAL_PREFIX = '\0alarm-host-shared:';

/**
 * Every `.ts`/`.tsx`/`.js` file under a directory, tests excluded.
 *
 * @param dir directory to walk
 */
function sourceFiles(dir: string): string[] {
    const files: string[] = [];
    for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) {
            if (entry === 'node_modules') {
                continue;
            }
            files.push(...sourceFiles(path));
        } else if (/\.(tsx?|js)$/.test(entry) && !/\.test\.tsx?$/.test(entry) && !entry.endsWith('.d.ts')) {
            files.push(path);
        }
    }
    return files;
}

/**
 * Collects, per shared package, the names imported from it across the given directories.
 *
 * Understands the import forms this code base uses: default, named with and without `as`, and
 * inline `type` specifiers. A whole `import type` is skipped - it is erased at compile time and
 * needs nothing at runtime. A namespace import (`import * as X`) is refused, because it gives no
 * way of telling which names are used.
 *
 * @param dirs directories whose sources are scanned
 */
export function collectImportedNames(dirs: readonly string[]): Map<string, Set<string>> {
    const byPackage = new Map<string, Set<string>>();
    const importPattern = /import\s+(type\s+)?([^;]*?)\s+from\s+["']([^"']+)["']/g;

    for (const dir of dirs) {
        for (const file of sourceFiles(dir)) {
            const text = readFileSync(file, 'utf8');
            for (const match of text.matchAll(importPattern)) {
                const [, typeOnly, clause = '', source = ''] = match;
                if (typeOnly || !(HOST_SHARED_PACKAGES as readonly string[]).includes(source)) {
                    continue;
                }

                const names = byPackage.get(source) ?? new Set<string>();
                byPackage.set(source, names);

                if (/\*\s+as\s+/.test(clause)) {
                    throw new Error(`${file}: "import * as" from ${source} cannot be redirected to the devices app`);
                }

                const braces = /\{([^}]*)\}/.exec(clause);
                const defaultPart = clause
                    .replace(/\{[^}]*\}/, '')
                    .replace(/,/g, '')
                    .trim();
                if (defaultPart) {
                    names.add('default');
                }

                if (braces) {
                    for (const specifier of braces[1].split(',')) {
                        const trimmed = specifier.trim();
                        if (!trimmed || trimmed.startsWith('type ')) {
                            continue;
                        }
                        names.add(trimmed.split(/\s+as\s+/)[0].trim());
                    }
                }
            }
        }
    }

    return byPackage;
}

/**
 * The Vite plugin.
 *
 * @param scanDirs Every directory whose code ends up in the bundle and imports these packages -
 *   the tile's own sources, the shared panel, and the devices stub module, which imports `react`.
 */
export function hostShared(scanDirs: readonly string[]): Plugin {
    const used = collectImportedNames(scanDirs);

    return {
        name: 'alarm-host-shared',
        enforce: 'pre',
        resolveId(id: string) {
            return (HOST_SHARED_PACKAGES as readonly string[]).includes(id) ? VIRTUAL_PREFIX + id : null;
        },
        load(id: string) {
            if (!id.startsWith(VIRTUAL_PREFIX)) {
                return null;
            }
            const pkg = id.slice(VIRTUAL_PREFIX.length);
            const names = [...(used.get(pkg) ?? [])].filter(name => name !== 'default').sort();

            return [
                `const host = globalThis.__iobrokerShared__ && globalThis.__iobrokerShared__[${JSON.stringify(pkg)}];`,
                // Loud and early: a tile that silently rendered with undefined components would
                // fail far from the cause, inside some unrelated render.
                `if (!host) throw new Error(${JSON.stringify(`${pkg} is not provided by the devices app`)});`,
                // A namespace object has no meaningful default; React's default export is the
                // object itself.
                'export default host.default ?? host;',
                ...names.map(name => `export const ${name} = host.${name};`),
            ].join('\n');
        },
    };
}
