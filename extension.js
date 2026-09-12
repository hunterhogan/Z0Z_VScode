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
    context.subscriptions.push(vscode.commands.registerCommand(
        'z0z_-extensions-for-visual-studio-code.promoteDiagnosticSuppressions',
        promoteDiagnosticSuppressions
    ));
}

async function promoteDiagnosticSuppressions() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'python') {
        return;
    }

    const document = editor.document;
    const text = document.getText();
    const selectedLines = new Set();
    for (const selection of editor.selections) {
        const lastLine = !selection.isEmpty && selection.end.character === 0
            ? selection.end.line - 1 : selection.end.line;
        for (let line = selection.start.line; line <= lastLine; line++) {
            selectedLines.add(line);
        }
    }

    // Keep the shebang, encoding cookie, and existing header comments first.
    let headerEnd = 0;
    for (let line = 0; line < document.lineCount; line++) {
        const textLine = document.lineAt(line);
        if (textLine.text.trim() && !textLine.text.trimStart().startsWith('#')) {
            break;
        }
        headerEnd = document.offsetAt(textLine.rangeIncludingLineBreak.end);
    }

    const suppressionTypes = [
        {
            name: 'ruff',
            inline: /^#\s*ruff:\s*ignore\s*\[([\w, -]+)\]/,
            file: /^#\s*ruff:\s*file-ignore\s*\[([\w, -]+)\]/,
            format: rules => `# ruff: file-ignore[${rules.join(', ')}]`
        },
        {
            name: 'noqa',
            inline: /^#\s*noqa:\s*([A-Z]+\d+(?:\s*,\s*[A-Z]+\d+)*)\b/,
            file: /^#\s*ruff:\s*noqa:\s*([A-Z]+\d+(?:\s*,\s*[A-Z]+\d+)*)\b/,
            format: rules => `# ruff: noqa: ${rules.join(', ')}`
        },
        {
            name: 'pyright',
            inline: /^#\s*pyright:\s*ignore\s*\[([\w, ]+)\]/,
            file: /^#\s*pyright:\s*(.*)/,
            format: rules => `# pyright: ${rules.map(rule => `${rule}=false`).join(', ')}`
        },
        {
            name: 'ty',
            inline: /^#\s*ty:\s*ignore\s*\[([\w, -]+)\]/,
            file: /^#\s*ty:\s*ignore\s*\[([\w, -]+)\]/,
            format: rules => `# ty: ignore[${rules.join(', ')}]`
        }
    ];
    const comments = pythonComments(text);
    const replacements = [];
    const headers = [];

    for (const suppressionType of suppressionTypes) {
        const existingRules = new Set();
        const selectedRules = new Set();
        for (const comment of comments) {
            const position = document.positionAt(comment.start);
            const lineStart = document.offsetAt(new vscode.Position(position.line, 0));
            const beforeComment = text.slice(lineStart, comment.start);
            const isHeader = !beforeComment.trim() &&
                (suppressionType.name !== 'ty' || comment.start < headerEnd);
            const fileMatch = isHeader && suppressionType.file.exec(comment.text);
            if (fileMatch && suppressionType.name === 'pyright') {
                const settings = fileMatch[1].match(/\breport\w+\s*=\s*(?:false|none)\b/g) || [];
                for (const setting of settings) {
                    existingRules.add(setting.split('=')[0].trim());
                }
            } else if (fileMatch) {
                for (const rule of fileMatch[1].split(',')) {
                    existingRules.add(rule.trim());
                }
            }

            const match = suppressionType.inline.exec(comment.text);
            if (!match || !selectedLines.has(position.line) || (suppressionType.name === 'ty' && isHeader)) {
                continue;
            }
            for (const rule of match[1].split(',')) {
                if (rule.trim()) {
                    selectedRules.add(rule.trim());
                }
            }

            // Retain an explanation (or another comment) after the directive.
            const remainder = comment.text.slice(match[0].length).trimStart();
            const replacement = remainder && (remainder.startsWith('#') ? remainder : `# ${remainder}`);
            const start = replacement ? comment.start : lineStart + beforeComment.trimEnd().length;
            replacements.push({
                range: new vscode.Range(document.positionAt(start), document.positionAt(comment.end)),
                text: replacement
            });
        }
        const missingRules = [...selectedRules].filter(rule => !existingRules.has(rule));
        if (missingRules.length) {
            headers.push(suppressionType.format(missingRules));
        }
    }

    if (!replacements.length) {
        vscode.window.showInformationMessage('No rule-specific Ruff, Pyright, or ty suppressions on the selected lines.');
        return;
    }
    const lineEnding = document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
    await editor.edit(edit => {
        for (const replacement of replacements) {
            edit.replace(replacement.range, replacement.text);
        }
        if (headers.length) {
            const separator = headerEnd && !text.slice(0, headerEnd).endsWith('\n') ? lineEnding : '';
            edit.insert(document.positionAt(headerEnd), separator + headers.join(lineEnding) + lineEnding);
        }
    });
}

// Skip quoted Python text so a suppression example inside a string stays text.
function pythonComments(text) {
    const comments = [];
    let quote = '';
    for (let offset = 0; offset < text.length;) {
        const character = text[offset];
        if (quote) {
            if (character === '\\') {
                offset += 2;
            } else if (text.startsWith(quote, offset)) {
                offset += quote.length;
                quote = '';
            } else {
                offset++;
            }
        } else if (character === '"' || character === "'") {
            quote = text.startsWith(character.repeat(3), offset) ? character.repeat(3) : character;
            offset += quote.length;
        } else if (character === '#') {
            const start = offset;
            while (offset < text.length && text[offset] !== '\r' && text[offset] !== '\n') {
                offset++;
            }
            comments.push({ start, end: offset, text: text.slice(start, offset) });
        } else {
            offset++;
        }
    }
    return comments;
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
