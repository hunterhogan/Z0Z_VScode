# Task Completion

- For normal code changes, run `npm run lint` and `npm test` before considering the task done.
- If command IDs, menu contributions, or activation wiring changed, verify the same command names stay aligned across `package.json`, `extension.js`, and `test/suite/extension.test.js`.
- If packaging or marketplace-facing metadata changed, also run `npm run package`.
- If keybinding behavior changed, verify `keybindings.json` still overrides the default Problems panel binding as intended.