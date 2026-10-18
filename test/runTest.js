const fs = require('fs/promises');
const path = require('path');
const { downloadAndUnzipVSCode, runTests } = require('@vscode/test-electron');

async function cleanupVSCodeCache(cachePath, vscodeExecutablePath) {
    const currentDirectory = path.relative(cachePath, vscodeExecutablePath).split(path.sep)[0];
    const entries = await fs.readdir(cachePath, { withFileTypes: true });

    if (!entries.some(entry => entry.isDirectory() && entry.name === currentDirectory && entry.name.startsWith('vscode-'))) {
        throw new Error('Cannot clean VS Code cache: executable is outside a cached VS Code build.');
    }

    for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith('vscode-') && entry.name !== currentDirectory) {
            try {
                await fs.rm(path.join(cachePath, entry.name), { recursive: true, force: true, maxRetries: 3 });
            } catch (err) {
                console.warn(`Could not remove cached VS Code build ${entry.name}`, err);
            }
        }
    }
}

async function main() {
    try {
        // The folder containing the Extension Manifest package.json
        // Passed to `--extensionDevelopmentPath`
        const extensionDevelopmentPath = path.resolve(__dirname, '../');

        // The path to the extension test script
        // Passed to --extensionTestsPath
        const extensionTestsPath = path.resolve(__dirname, './suite/index');

        // Keep the build selected for this run and remove older cached builds.
        const cachePath = path.join(extensionDevelopmentPath, '.vscode-test');
        const vscodeExecutablePath = await downloadAndUnzipVSCode({ cachePath, extensionDevelopmentPath });
        await cleanupVSCodeCache(cachePath, vscodeExecutablePath);

        await runTests({ extensionDevelopmentPath, extensionTestsPath, vscodeExecutablePath });
    } catch (err) {
        console.error('Failed to run tests', err);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { cleanupVSCodeCache };
