const assert = require('assert');
const vscode = require('vscode');

const command = 'z0z_-extensions-for-visual-studio-code.promoteDiagnosticSuppressions';

async function openPython(text, selections) {
    const document = await vscode.workspace.openTextDocument({ language: 'python', content: text });
    const editor = await vscode.window.showTextDocument(document);
    editor.selections = selections.map(range => new vscode.Selection(...range));
    return editor;
}

suite('Move Python Suppressions to File Level', () => {
    suiteSetup(async () => {
        await vscode.extensions.getExtension('hunterhogan.z0z_-extensions-for-visual-studio-code').activate();
    });

    teardown(async () => {
        await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
    });

    test('promotes mixed selected suppressions and preserves explanations', async () => {
        const editor = await openPython([
            'print(value)  # ruff: ignore[print]',
            'x = bad  # pyright: ignore[reportArgumentType, reportAssignmentType]',
            'y = bad  # ty: ignore[invalid-argument-type]',
            'from x import y  # noqa: F401  # explanation',
            ''
        ].join('\n'), [[0, 0, 4, 0]]);
        await vscode.commands.executeCommand(command);
        assert.strictEqual(editor.document.getText(), [
            '# ruff: file-ignore[print]',
            '# ruff: noqa: F401',
            '# pyright: reportArgumentType=false, reportAssignmentType=false',
            '# ty: ignore[invalid-argument-type]',
            'print(value)',
            'x = bad',
            'y = bad',
            'from x import y  # explanation',
            ''
        ].join('\n'));
    });

    test('uses the cursor line with no selection', async () => {
        const editor = await openPython('a = 1\nprint(a)  # ruff: ignore[print]\n', [[1, 2, 1, 2]]);
        await vscode.commands.executeCommand(command);
        assert.strictEqual(editor.document.getText(), '# ruff: file-ignore[print]\na = 1\nprint(a)\n');
    });

    test('supports multiple selections and excludes an end line at column zero', async () => {
        const editor = await openPython([
            'print(1)  # ruff: ignore[print]',
            'print(2)  # ruff: ignore[print]',
            'x = 1  # ruff: ignore[unused-variable]',
            ''
        ].join('\n'), [[0, 0, 1, 0], [2, 7, 2, 38]]);
        await vscode.commands.executeCommand(command);
        assert.strictEqual(editor.document.getText(), [
            '# ruff: file-ignore[print, unused-variable]',
            'print(1)',
            'print(2)  # ruff: ignore[print]',
            'x = 1',
            ''
        ].join('\n'));
    });

    test('repeating is a no-op and one Undo restores the original', async () => {
        const text = 'print(1)  # noqa: T201\n';
        const editor = await openPython(text, [[0, 0, 1, 0]]);
        await vscode.commands.executeCommand(command);
        const expected = '# ruff: noqa: T201\nprint(1)\n';
        assert.strictEqual(editor.document.getText(), expected);
        await vscode.commands.executeCommand(command);
        assert.strictEqual(editor.document.getText(), expected);
        await vscode.commands.executeCommand('undo');
        assert.strictEqual(editor.document.getText(), text);
    });

    test('preserves CRLF and inserts before the docstring after shebang and encoding', async () => {
        const editor = await openPython([
            '#!/usr/bin/env python',
            '# -*- coding: utf-8 -*-',
            '"""Module docs."""',
            '',
            'print(1)  # ty: ignore[invalid-argument-type]',
            ''
        ].join('\r\n'), [[4, 0, 5, 0]]);
        await vscode.commands.executeCommand(command);
        assert.strictEqual(editor.document.getText(), [
            '#!/usr/bin/env python',
            '# -*- coding: utf-8 -*-',
            '# ty: ignore[invalid-argument-type]',
            '"""Module docs."""',
            '',
            'print(1)',
            ''
        ].join('\r\n'));
    });

    test('preserves existing headers and adds only missing rules', async () => {
        const editor = await openPython([
            '# ruff: file-ignore[print]',
            '# pyright: strict, reportUnnecessaryComparison=false',
            '# ty: ignore[invalid-argument-type]',
            'print(1)  # ruff: ignore[print]',
            'x = 1  # ruff: ignore[unused-variable]',
            'x = bad  # pyright: ignore[reportUnnecessaryComparison]',
            'y = bad  # ty: ignore[invalid-argument-type]',
            ''
        ].join('\n'), [[0, 0, 7, 0]]);
        await vscode.commands.executeCommand(command);
        assert.strictEqual(editor.document.getText(), [
            '# ruff: file-ignore[print]',
            '# pyright: strict, reportUnnecessaryComparison=false',
            '# ty: ignore[invalid-argument-type]',
            '# ruff: file-ignore[unused-variable]',
            'print(1)',
            'x = 1',
            'x = bad',
            'y = bad',
            ''
        ].join('\n'));
    });

    test('ignores strings, other tools, and blanket comments', async () => {
        const unchanged = [
            'x = "# noqa: F401"',
            'example = """',
            '# ruff: ignore[print]',
            '"""',
            'y = 1  # noqa',
            'z = 1  # type: ignore[foo]',
            'import x  # pylint: disable=unused-import',
            ''
        ].join('\n');
        const editor = await openPython(unchanged + 'print(1)  # noqa: T201\n', [[0, 0, 8, 0]]);
        await vscode.commands.executeCommand(command);
        assert.strictEqual(editor.document.getText(), '# ruff: noqa: T201\n' + unchanged + 'print(1)\n');
    });

    test('leaves non-Python documents alone', async () => {
        const text = 'x # noqa: F401\n';
        const document = await vscode.workspace.openTextDocument({ language: 'javascript', content: text });
        await vscode.window.showTextDocument(document);
        await vscode.commands.executeCommand(command);
        assert.strictEqual(document.getText(), text);
    });
});
