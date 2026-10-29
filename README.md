# Z0Z_ Extensions for Visual Studio Code

A collection of idiosyncratic tools for VS Code.

## Features

### Add to .git/info/exclude

Quickly add files to your `.git/info/exclude` list, allowing you to ignore files locally without modifying the project's `.gitignore`.

**Usage:**

1. Right-click on a file in the Source Control view.
2. Select "Add to .git/info/exclude".

### Toggle Problems Visibility

Quickly toggle the visibility of the Problems panel with a keyboard shortcut.

**Usage:**

- Press `Ctrl+Shift+M` to toggle the visibility of squiggly lines in editor windows.

### Reformat Trailing to Leading Commas

Quickly reformat a selected block of code or data from trailing commas to leading commas.

**Usage:**

- Select text and run "Reformat trailing → leading commas" from the Command Palette.
- Intended keyboard shortcut in `keybindings.json` is `Ctrl+Shift+C`.

### Move Python Suppressions to File Level

Select a suppression or a block of Python, then run **Move Python Suppressions to File Level** from the Command Palette. With no selection, it uses the cursor's line.

Converts rule-specific `ruff: ignore[...]`, `noqa: ...`, `pyright: ignore[...]`, and `ty: ignore[...]` comments. It adds missing rules to the file header and removes the converted inline comments from the selected lines. Existing headers stay in place; new rules are grouped by syntax. One Undo restores the edit.

`type: ignore`, blanket ignores, and other tools are left alone.

[![CC-BY-NC-4.0](https://raw.githubusercontent.com/hunterhogan/Z0Z_VScode/refs/heads/main/.github/CC-BY-NC-4.0.png)](https://creativecommons.org/licenses/by-nc/4.0/)

By law, authors retain their copyrights unless they grant exceptions. The [Attribution-NonCommercial 4.0 International Deed](https://github.com/hunterhogan/Z0Z_VScode#License-1-ov-file) outlines how you may use this work.

The restriction on commercial use (without a license) limits advantage-taking, unjust enrichment, and exploitation. You would be morally wrong if you were to enrich yourself by using this work while I am denied healthcare, housing, security of property, and the safety of my person.

To obtain and retain the right to use this work, you incur the cost of attributing the work to me. Your nominal cost might accrue as a benefit that mitigates my suffering or saves my life.

## Ideas

1. Automatic [grepWin](https://tools.stefankueng.com/grepWin.html) integration.
2. Integrate the docs of <https://ss64.com/> somehow.
3. Securely [manage Jupyter kernels.](https://github.com/microsoft/vscode-jupyter/wiki/Loading-Kernels-from-insecure-directories)
4. Manage [Jupyter widget sources.](https://github.com/microsoft/vscode-jupyter/wiki/IPyWidget-Support-in-VS-Code-Python)
