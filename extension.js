const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

function activate(context) {
    let disposable = vscode.commands.registerCommand('git-exclude.addToExclude', async (uri) => {
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

    context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
}
