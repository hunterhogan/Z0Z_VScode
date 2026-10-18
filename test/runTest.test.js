const assert = require('assert');
const fs = require('fs/promises');
const path = require('path');
const { cleanupVSCodeCache } = require('./runTest');

suite('VS Code cache cleanup', () => {
    let directory;
    let cachePath;

    setup(async () => {
        directory = await fs.mkdtemp(path.join(__dirname, '.runner-cache-'));
        cachePath = path.join(directory, '.vscode-test');
        await fs.mkdir(cachePath);
    });

    teardown(async () => {
        await fs.rm(directory, { recursive: true, force: true });
    });

    for (const [build, executable] of [
        ['vscode-win32-x64-archive-1.1.0', 'Code.exe'],
        ['vscode-linux-x64-1.1.0', 'code'],
        ['vscode-darwin-arm64-1.1.0', 'Visual Studio Code.app/Contents/MacOS/Electron']
    ]) {
        test(`keeps ${build} and preserves other cache data`, async () => {
            const vscodeExecutablePath = path.join(cachePath, build, executable);
            await fs.mkdir(path.dirname(vscodeExecutablePath), { recursive: true });
            await fs.writeFile(vscodeExecutablePath, 'selected build');

            for (const name of ['vscode-linux-x64-1.0.0', 'vscode-linux-x64-1.2.0', 'user-data', 'extensions', 'other']) {
                await fs.mkdir(path.join(cachePath, name));
                await fs.writeFile(path.join(cachePath, name, 'data'), name);
            }
            await fs.writeFile(path.join(cachePath, 'vscode-not-a-directory'), 'keep this file');

            await cleanupVSCodeCache(cachePath, vscodeExecutablePath);
            await cleanupVSCodeCache(cachePath, vscodeExecutablePath);

            assert.deepStrictEqual((await fs.readdir(cachePath)).sort(), [
                build, 'user-data', 'extensions', 'other', 'vscode-not-a-directory'
            ].sort());
            assert.strictEqual(await fs.readFile(vscodeExecutablePath, 'utf8'), 'selected build');
            for (const name of ['user-data', 'extensions', 'other']) {
                assert.strictEqual(await fs.readFile(path.join(cachePath, name, 'data'), 'utf8'), name);
            }
        });
    }

    test('rejects an executable outside the cache before deleting builds', async () => {
        const build = 'vscode-linux-x64-1.0.0';
        await fs.mkdir(path.join(cachePath, build));

        await assert.rejects(
            cleanupVSCodeCache(cachePath, path.join(directory, build, 'code')),
            /executable is outside a cached VS Code build/
        );

        assert.deepStrictEqual(await fs.readdir(cachePath), [build]);
    });

    test('preserves linked directories and their targets', async () => {
        const build = 'vscode-linux-x64-1.1.0';
        await fs.mkdir(path.join(cachePath, build));
        const target = path.join(directory, 'linked-data');
        await fs.mkdir(target);
        await fs.writeFile(path.join(target, 'data'), 'keep linked data');
        const link = path.join(cachePath, 'vscode-linked');
        await fs.symlink(target, link, process.platform === 'win32' ? 'junction' : 'dir');

        await cleanupVSCodeCache(cachePath, path.join(cachePath, build, 'code'));

        assert.ok((await fs.lstat(link)).isSymbolicLink());
        assert.strictEqual(await fs.readFile(path.join(target, 'data'), 'utf8'), 'keep linked data');
    });

    test('warns about a locked build and continues cleaning other builds', async () => {
        const build = 'vscode-linux-x64-1.1.0';
        const lockedBuild = 'vscode-linux-x64-1.0.0';
        for (const name of [build, lockedBuild, 'vscode-linux-x64-1.2.0']) {
            await fs.mkdir(path.join(cachePath, name));
        }
        const lockedPath = path.join(cachePath, lockedBuild);
        const error = Object.assign(new Error('Build is in use'), { code: 'EBUSY' });
        const remove = fs.rm;
        const warn = console.warn;
        const warnings = [];
        fs.rm = async (target, options) => {
            if (target === lockedPath) {
                throw error;
            }
            return remove(target, options);
        };
        console.warn = (...args) => warnings.push(args);

        try {
            await cleanupVSCodeCache(cachePath, path.join(cachePath, build, 'code'));
        } finally {
            fs.rm = remove;
            console.warn = warn;
        }

        assert.deepStrictEqual((await fs.readdir(cachePath)).sort(), [build, lockedBuild].sort());
        assert.deepStrictEqual(warnings, [[`Could not remove cached VS Code build ${lockedBuild}`, error]]);
    });
});
