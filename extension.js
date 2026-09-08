const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

function activate(context) {
    let disposable = vscode.commands.registerCommand('z0z_-extensions-for-visual-studio-code.addToExclude', async (uri) => {
        if (!uri || !uri.resourceUri) {
            return;
        }

        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri.resourceUri);
        if (!workspaceFolder) {
            return;
        }

        const gitExcludePath = path.join(workspaceFolder.uri.fsPath, '.git', 'info', 'exclude');
        // Convert to POSIX style path
        const relativePath = path.relative(workspaceFolder.uri.fsPath, uri.resourceUri.fsPath)
            .split(path.sep)
            .join('/');

        try {
            fs.appendFileSync(gitExcludePath, `${relativePath}\n`);
            const excludeUri = vscode.Uri.file(gitExcludePath);
            await vscode.window.showTextDocument(excludeUri, { preview: false });
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to add to .git/info/exclude: ${error.message}`);
        }
    });

    let toggleProblemsVisibility = vscode.commands.registerCommand('z0z_-extensions-for-visual-studio-code.toggleProblemsVisibility', async () => {
        const config = vscode.workspace.getConfiguration('problems');
        const currentVisibility = config.get('visibility');
        await config.update('visibility', !currentVisibility, true);
    });

    let reformatLeadingCommas = vscode.commands.registerCommand('z0z_-extensions-for-visual-studio-code.reformatTrailingCommasToLeadingCommas', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        const selections = editor.selections;
        const validSelections = selections.filter(selection => !selection.isEmpty);
        
        if (validSelections.length === 0) {
            vscode.window.showInformationMessage('Please select text to reformat.');
            return;
        }

        await editor.edit(editBuilder => {
            for (const selection of validSelections) {
                const text = editor.document.getText(selection);
                const newText = reformatTrailingCommasToLeadingCommas(text);
                editBuilder.replace(selection, newText);
            }
        });
    });

    let normalizeHashCommentMarkers = vscode.commands.registerCommand('z0z_-extensions-for-visual-studio-code.normalizeHashCommentMarkers', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        const selections = editor.selections;
        const validSelections = selections.filter(selection => !selection.isEmpty);
        
        await editor.edit(editBuilder => {
            const document = editor.document;
            let rangesToProcess = [];

            if (validSelections.length === 0) {
                // whole document fallback
                for (let i = 0; i < document.lineCount; i++) {
                    rangesToProcess.push(document.lineAt(i).range);
                }
            } else {
                for (const selection of validSelections) {
                    for (let i = selection.start.line; i <= selection.end.line; i++) {
                        rangesToProcess.push(document.lineAt(i).range);
                    }
                }
            }

            const uniqueLines = new Set();
            for (const range of rangesToProcess) {
                if (!uniqueLines.has(range.start.line)) {
                    uniqueLines.add(range.start.line);
                    const lineText = document.lineAt(range.start.line).text;
                    const match = /^([ \t]*)#([ \t]+)(=+|-{2,})/.exec(lineText);
                    if (match) {
                        const startChar = match[1].length + 1; // start of whitespace after #
                        const endChar = startChar + match[2].length;
                        const spaceRange = new vscode.Range(range.start.line, startChar, range.start.line, endChar);
                        editBuilder.delete(spaceRange);
                    }
                }
            }
        });
    });

    context.subscriptions.push(disposable);
    context.subscriptions.push(toggleProblemsVisibility);
    context.subscriptions.push(reformatLeadingCommas);
    context.subscriptions.push(normalizeHashCommentMarkers);
}

function reformatTrailingCommasToLeadingCommas(text) {
    const lineEnding = text.includes('\r\n') ? '\r\n' : '\n';
    const lines = text.replace(/\r\n/g, '\n').split('\n');

    for (let indexLine = 0; indexLine < lines.length - 1; indexLine++) {
        const lineStrippedRight = lines[indexLine].trimEnd();
        if (!lineStrippedRight.endsWith(',')) {
            continue;
        }
        const lineFollowing = lines[indexLine + 1];
        const lineFollowingStrippedLeft = lineFollowing.trimStart();
        if (!lineFollowingStrippedLeft || /^[\]\)\}]/.test(lineFollowingStrippedLeft)) {
            lines[indexLine] = lineStrippedRight.slice(0, -1);
        } else {
            const indentation = lineFollowing.slice(0, lineFollowing.length - lineFollowingStrippedLeft.length);
            lines[indexLine] = lineStrippedRight.slice(0, -1);
            lines[indexLine + 1] = indentation + ', ' + lineFollowingStrippedLeft;
        }
    }

    const lastLineStrippedRight = lines[lines.length - 1].trimEnd();
    if (lastLineStrippedRight.endsWith(',')) {
        lines[lines.length - 1] = lastLineStrippedRight.slice(0, -1);
    }

    return lines.join(lineEnding);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
}
