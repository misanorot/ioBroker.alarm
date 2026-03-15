const { deleteFoldersRecursive, buildReact, copyFiles, npmInstall } = require('@iobroker/build-tools');

function buildAdmin() {
    return buildReact(`${__dirname}/src-admin/`, { rootDir: `${__dirname}/src-admin/`, vite: true });
}

function cleanAdmin() {
    deleteFoldersRecursive(`${__dirname}/admin/custom`);
    deleteFoldersRecursive(`${__dirname}/src-admin/build`);
}

function copyAllAdminFiles() {
    copyFiles(
        ['src-admin/build/**/*', '!src-admin/build/index.html', '!src-admin/build/mf-manifest.json'],
        'admin/custom/',
    );
    copyFiles(['src-admin/src/i18n/*.json'], 'admin/custom/i18n');
}

function copyI18nFiles() {
    copyFiles(['src/lib/i18n/*.json'], 'build/lib/i18n/');
}

if (process.argv.includes('--admin-0-clean')) {
    cleanAdmin();
} else if (process.argv.includes('--admin-1-npm')) {
    npmInstall(`${__dirname}/src-admin/`).catch(e => console.error(e));
} else if (process.argv.includes('--admin-2-compile')) {
    buildAdmin().catch(e => console.error(e));
} else if (process.argv.includes('--admin-3-copy')) {
    copyAllAdminFiles();
} else {
    cleanAdmin();
    npmInstall(`${__dirname}/src-admin/`)
        .then(() => buildAdmin())
        .then(() => copyAllAdminFiles())
        .then(() => copyI18nFiles())
        .catch(e => console.error(e));
}
