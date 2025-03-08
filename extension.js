const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

function activate(context) {
    let disposable = vscode.commands.registerCommand('z0z_-extensions-for-visual-studio-code.addToExclude', async (uri) => {
        if (!uri?.resourceUri) {
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
        
        // Show notification to user
        vscode.window.showInformationMessage(
            `Problems visibility ${!currentVisibility ? 'enabled' : 'disabled'}`
        );
    });

    let addPyrightIgnore = vscode.commands.registerCommand('z0z_-extensions-for-visual-studio-code.addPyrightIgnore', async (problemItem) => {
        // Extract diagnostic rule from the problemItem
        if (!problemItem || !problemItem.code || !problemItem.code.value) {
            vscode.window.showErrorMessage('Unable to determine diagnostic rule.');
            return;
        }

        const diagnosticRule = problemItem.code.value;
        
        // Open the file with the issue
        const resourceUri = vscode.Uri.parse(problemItem.resource.toString());
        const document = await vscode.workspace.openTextDocument(resourceUri);
        const editor = await vscode.window.showTextDocument(document);
        
        // Position is 0-indexed in VS Code API
        const lineIndex = problemItem.startLineNumber - 1;
        const line = document.lineAt(lineIndex);
        const lineText = line.text;
        
        // Check if the line already has a pyright ignore comment
        const pyrightIgnoreRegex = /# pyright: ignore\[(.*?)\]/;
        const ignoreMatch = lineText.match(pyrightIgnoreRegex);
        
        let newText;
        let position;

        if (ignoreMatch) {
            // Line already has an ignore comment, append to it
            const existingRules = ignoreMatch[1];
            const updatedRules = existingRules.includes(diagnosticRule) 
                ? existingRules 
                : `${existingRules}, ${diagnosticRule}`;
                
            const beforeComment = lineText.substring(0, ignoreMatch.index);
            const afterComment = lineText.substring(ignoreMatch.index + ignoreMatch[0].length);
            
            newText = `${beforeComment}# pyright: ignore[${updatedRules}]${afterComment}`;
            position = new vscode.Position(lineIndex, 0);
        } else {
            // Line doesn't have an ignore comment, add new one
            newText = `${lineText} # pyright: ignore[${diagnosticRule}]`;
            position = new vscode.Position(lineIndex, 0);
        }
        
        // Create the edit
        const edit = new vscode.WorkspaceEdit();
        edit.replace(resourceUri, new vscode.Range(position, line.range.end), newText);
        
        // Apply the edit
        await vscode.workspace.applyEdit(edit);
        vscode.window.showInformationMessage(`Added pyright ignore for "${diagnosticRule}"`);
    });

    let hoverProvider = vscode.languages.registerHoverProvider('*', {
        provideHover(document, position, token) {
            const diagnostic = vscode.languages.getDiagnostics(document.uri)
                .find(d => d.range.contains(position));

            if (diagnostic) {
                const toggleCommand = {
                    command: 'z0z_-extensions-for-visual-studio-code.toggleProblemsVisibility',
                    title: 'Toggle Problems Visibility'
                };
                return new vscode.Hover([
                    diagnostic.message,
                    new vscode.MarkdownString(`[Toggle Problems Visibility](command:z0z_-extensions-for-visual-studio-code.toggleProblemsVisibility)`)
                ]);
            }
        }
    });

    context.subscriptions.push(disposable);
    context.subscriptions.push(toggleProblemsVisibility);
    context.subscriptions.push(addPyrightIgnore);
    context.subscriptions.push(hoverProvider);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
}
