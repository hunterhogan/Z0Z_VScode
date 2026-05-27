const vscode = require('vscode');
const assert = require('assert');

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Starting tests.');    test('Command registration', async () => {
        // give the extension time to activate
        await vscode.extensions.getExtension('hunterhogan.z0z_-extensions-for-visual-studio-code')?.activate();
        const commands = await vscode.commands.getCommands();
        assert.ok(commands.includes('z0z_-extensions-for-visual-studio-code.addToExclude'));
        assert.ok(commands.includes('z0z_-extensions-for-visual-studio-code.toggleProblemsVisibility'));
        assert.ok(commands.includes('z0z_-extensions-for-visual-studio-code.reformatTrailingCommasToLeadingCommas'));
    });
});
