# Tech Stack

- JavaScript extension code in CommonJS style (`require`, `module.exports`).
- Targets VS Code engine `^1.75.0`.
- Runtime dependencies are the VS Code API plus Node built-ins (`fs`, `path`); no external production deps.
- Testing uses Mocha, `glob`, and `@vscode/test-electron` for integration tests inside a VS Code instance.
- Linting uses ESLint via `.eslintrc.json` with `node`, `commonjs`, and `mocha` environments; parser target is ES2018.
- Package manager is npm with `package-lock.json` committed.
- Packaging/publishing uses `vsce`/`@vscode/vsce`.