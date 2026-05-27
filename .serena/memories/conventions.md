# Conventions

- Keep the extension architecture minimal; command implementations are registered directly in `activate` inside `extension.js`.
- New commands should keep the existing ID prefix `z0z_-extensions-for-visual-studio-code.` and be added in both `package.json` contributions and `extension.js` registration.
- Add menu entries or default keybindings only when the command is meant to be surfaced there; this repo keeps those bindings explicit in `package.json`/`keybindings.json`.
- Follow existing JS style: CommonJS modules, single quotes, semicolons, straightforward imperative code.
- Prefer user-visible failures through `vscode.window.showErrorMessage()` rather than silent failure.
- SCM resource handling assumes VS Code Git context objects with `uri.resourceUri`; Git exclude entries are normalized to POSIX separators before writing.
- Current tests only verify command registration, so behavior changes often require adding or extending integration coverage.