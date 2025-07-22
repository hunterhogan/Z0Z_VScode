# Copilot Instructions for Z0Z_ VS Code Extension

## Project Overview
This is a VS Code extension that provides utility commands for developers, specifically focused on Git workflow enhancements and UI productivity tools. The extension follows a minimal, single-file architecture with straightforward command registration patterns.

## Architecture & Key Files

### Core Structure
- **`extension.js`**: Main entry point containing all command implementations
- **`package.json`**: Extension manifest with command contributions and menu bindings
- **`keybindings.json`**: Default keybinding configurations (not automatically applied)

### Command Pattern
Commands follow the naming convention `z0z_-extensions-for-visual-studio-code.{commandName}` and are registered in both `package.json` contributions and `extension.js` activate function.

Example command registration:
```javascript
let disposable = vscode.commands.registerCommand('z0z_-extensions-for-visual-studio-code.addToExclude', async (uri) => {
    // Command implementation
});
context.subscriptions.push(disposable);
```

## Development Workflows

### Testing
- Run tests with `npm test` (uses @vscode/test-electron)
- Test files in `test/suite/` verify command registration
- Tests run in actual VS Code instance, not mocked environment

### Publishing
- Two GitHub workflows: one for releases, one for general CI
- Use `npm run package` to create .vsix file locally
- Release workflow publishes to VS Code Marketplace on tag push
- Requires `VSCE_PAT` secret for marketplace authentication

### Linting
- ESLint configured for Node.js/CommonJS environment with Mocha support
- Run `npm run lint` before publishing (enforced by vscode:prepublish script)

## Project-Specific Patterns

### Git Integration
The `addToExclude` command demonstrates the project's approach to Git integration:
- Works with VS Code's SCM provider context
- Converts Windows paths to POSIX format for Git compatibility
- Opens the exclude file after modification for user verification

### Menu Context Integration
Commands are exposed through VS Code's context menu system:
```json
"menus": {
    "scm/resourceState/context": [{
        "command": "z0z_-extensions-for-visual-studio-code.addToExclude",
        "when": "scmProvider == git",
        "group": "1_modification@4"
    }]
}
```

### Configuration Approach
This extension avoids complex configuration - it provides opinionated tools that work out of the box. The `keybindings.json` file shows intended keybindings but users must manually add them to their settings.

## Dependencies & Integration
- Minimal dependencies: only VS Code API and Node.js built-ins
- Uses `fs` and `path` modules for file system operations
- Integrates with VS Code's workspace, SCM, and command systems
- No external runtime dependencies (only devDependencies for tooling)

When adding new commands, ensure they follow the established patterns for naming, registration, and error handling with user-friendly error messages via `vscode.window.showErrorMessage()`.
