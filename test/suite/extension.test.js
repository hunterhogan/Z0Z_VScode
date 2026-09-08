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
        assert.ok(commands.includes('z0z_-extensions-for-visual-studio-code.normalizeHashCommentMarkers'));
    });

    test('Normalize Hash Comment Markers', async () => {
        const text = [
            '# =Text\r',          // CRLF preservation check (if split properly)
            '# ===== Section',
            '# -- Section',
            '# -------- Section',
            '\t# \t -- Tabbed',
            '  #   = Spaces',
            '# - item',             // negative
            '# ordinary',           // negative
            'code  # -- inline',    // negative
            '#=Text',               // already normalized
            '"# =\"',                // string literal
            ' "# --"'               // string literal with space
        ].join('\n');

        const expectedText = [
            '#=Text\r', 
            '#===== Section',
            '#-- Section',
            '#-------- Section',
            '\t#-- Tabbed',
            '  #= Spaces',
            '# - item',
            '# ordinary',
            'code  # -- inline',
            '#=Text',
            '"# =\"',
            ' "# --"'
        ].join('\n');

        const document = await vscode.workspace.openTextDocument({ content: text });
        const editor = await vscode.window.showTextDocument(document);

        // Execute fallback (whole document since selections are empty by default: 0,0 to 0,0)
        await vscode.commands.executeCommand('z0z_-extensions-for-visual-studio-code.normalizeHashCommentMarkers');

        // Check fallback result
        assert.strictEqual(document.getText().replace(/\r\n/g, '\n'), expectedText.replace(/\r\n/g, '\n'), 'Whole document normalization failed');

        // Check idempotence
        await vscode.commands.executeCommand('z0z_-extensions-for-visual-studio-code.normalizeHashCommentMarkers');
        assert.strictEqual(document.getText().replace(/\r\n/g, '\n'), expectedText.replace(/\r\n/g, '\n'), 'Command is not idempotent');

        // Check one-step Undo
        await vscode.commands.executeCommand('undo');
        assert.strictEqual(document.getText().replace(/\r\n/g, '\n'), text.replace(/\r\n/g, '\n'), 'Undo did not restore the document');

        // Check multiple non-empty selections
        editor.selections = [
            new vscode.Selection(1, 0, 1, 5),   // selects part of line 1
            new vscode.Selection(2, 0, 3, 5)    // selects part of line 2 and 3
        ];
        
        await vscode.commands.executeCommand('z0z_-extensions-for-visual-studio-code.normalizeHashCommentMarkers');
        
        const partialExpectedLines = text.split('\n');
        partialExpectedLines[1] = '#===== Section';
        partialExpectedLines[2] = '#-- Section';
        partialExpectedLines[3] = '#-------- Section';
        
        assert.strictEqual(document.getText().replace(/\r\n/g, '\n'), partialExpectedLines.join('\n').replace(/\r\n/g, '\n'), 'Multiple selections normalization failed');
        
        // close the editor
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });
});
