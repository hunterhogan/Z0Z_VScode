# Core

- Small VS Code extension repository with a minimal single-entrypoint layout.
- Runtime entrypoint: `extension.js`; extension manifest and command/menu contributions: `package.json`.
- User-facing docs/default bindings: `README.md`, `keybindings.json`.
- Tests live under `test/`; `test/runTest.js` launches VS Code integration tests and `test/suite/index.js` loads `*.test.js` files.
- Contributed commands are currently limited to adding selected SCM resources to `.git/info/exclude` and toggling Problems visibility.
- Read `mem:tech_stack` for runtime/tooling, `mem:suggested_commands` for daily commands, `mem:conventions` for extension-specific patterns, and `mem:task_completion` for done checks.