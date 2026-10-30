import { deleteFoldersRecursive, buildReact, copyFiles, npmInstall } from '@iobroker/build-tools';

// `buildReact` forks vite, and a fork inherits `process.execArgv` - here the loader of tsx. tsx then
// compiles the ESM of `@module-federation/vite` to CommonJS, where `import.meta.resolve` does not
// exist, and loading `vite.config.ts` fails. Vite must run on plain Node.
process.execArgv.length = 0;

function buildAdmin(): Promise<void> {
    return buildReact(`${__dirname}/src-admin/`, { rootDir: `${__dirname}/src-admin/`, vite: true });
}

function cleanAdmin(): void {
    deleteFoldersRecursive(`${__dirname}/admin/custom`);
    deleteFoldersRecursive(`${__dirname}/src-admin/build`);
}

function copyAllAdminFiles(): void {
    copyFiles(
        ['src-admin/build/**/*', '!src-admin/build/index.html', '!src-admin/build/mf-manifest.json'],
        'admin/custom/',
    );
    copyFiles(['src-admin/src/i18n/*.json'], 'admin/custom/i18n');
}

function copyI18nFiles(): void {
    copyFiles(['src/lib/i18n/*.json'], 'build/lib/i18n/');
}

// --- vis-2 widget set: src-widgets -> widgets/alarm --------------------------------------------

function buildWidgets(): Promise<void> {
    return buildReact(`${__dirname}/src-widgets/`, { rootDir: `${__dirname}/src-widgets/`, vite: true });
}

function cleanWidgets(): void {
    deleteFoldersRecursive(`${__dirname}/widgets/alarm`);
    deleteFoldersRecursive(`${__dirname}/src-widgets/build`);
}

/**
 * `index.html` is the stand-alone dev page and is not shipped. `mf-manifest.json` is: vis-2 reads
 * it next to the remote entry to see which shared modules the bundle was built against.
 */
function copyWidgetFiles(): void {
    copyFiles(['src-widgets/build/**/*', '!src-widgets/build/index.html'], 'widgets/alarm/');
}

// --- devices app tile: src-devices -> admin/dm-widgets ------------------------------------------

function buildDevices(): Promise<void> {
    return buildReact(`${__dirname}/src-devices/`, { rootDir: `${__dirname}/src-devices/`, vite: true });
}

function cleanDevices(): void {
    deleteFoldersRecursive(`${__dirname}/admin/dm-widgets`);
    deleteFoldersRecursive(`${__dirname}/src-devices/build`);
}

function copyDeviceFiles(): void {
    copyFiles(['src-devices/build/**/*', '!src-devices/build/index.html'], 'admin/dm-widgets/');
    // The tile's icon in the catalogue of the devices app, named by `common.deviceWidgets`.
    copyFiles(['src-devices/img/*'], 'admin/dm-widgets/');
}

if (process.argv.includes('--admin-0-clean')) {
    cleanAdmin();
} else if (process.argv.includes('--admin-1-npm')) {
    npmInstall(`${__dirname}/src-admin/`).catch((e: unknown) => console.error(e));
} else if (process.argv.includes('--admin-2-compile')) {
    buildAdmin().catch((e: unknown) => console.error(e));
} else if (process.argv.includes('--admin-3-copy')) {
    copyAllAdminFiles();
} else if (process.argv.includes('--widgets')) {
    cleanWidgets();
    npmInstall(`${__dirname}/src-widgets/`)
        .then(() => buildWidgets())
        .then(() => copyWidgetFiles())
        .catch((e: unknown) => console.error(e));
} else if (process.argv.includes('--devices')) {
    cleanDevices();
    npmInstall(`${__dirname}/src-devices/`)
        .then(() => buildDevices())
        .then(() => copyDeviceFiles())
        .catch((e: unknown) => console.error(e));
} else {
    cleanAdmin();
    npmInstall(`${__dirname}/src-admin/`)
        .then(() => buildAdmin())
        .then(() => copyAllAdminFiles())
        .then(() => copyI18nFiles())
        .catch((e: unknown) => console.error(e));
}
