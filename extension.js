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
            `Problems panel visibility ${!currentVisibility ? 'enabled' : 'disabled'}`
        );
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
    context.subscriptions.push(hoverProvider);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
}
