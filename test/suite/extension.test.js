const vscode = require('vscode');
const assert = require('assert');

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Starting tests.');

    test('Command registration', async () => {
        const commands = await vscode.commands.getCommands();
        assert.ok(commands.includes('z0z_-extensions-for-visual-studio-code.addToExclude'));
        assert.ok(commands.includes('z0z_-extensions-for-visual-studio-code.toggleProblemsVisibility'));
    });
});
