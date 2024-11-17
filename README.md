# Quick Fix Helper

## Overview

Quick Fix Helper is a Visual Studio Code extension that makes opening the quick fix menu way easier by automatically opening it when left clicking on an area with an error or warning. This way you don't have to rely on inconvenient shortcuts or wait until a context window appears where you can click on the quick fix link.

## Usage

The extension activates automatically when VS Code starts. Simply click on any code that has diagnostics (errors, warnings, or hints) and the quick fix menu will appear if fixes are available.

### Commands

The extension provides the following commands:

- `Quick Fix Helper: Show Quick Fixes Menu` - Opens the quick fixes menu at the current cursor position if there are any fixes available.
- `Quick Fix Helper: Advance To Next Quick Fix` - Goes to the next quick fix. This command is handy when going through all available quick fixes in a file. Keybind: `Ctrl+Win+Alt+q` (Windows) and `Ctrl+Option+Cmd+q` (MacOS).

## Extension Settings

This extension contributes the following settings:

- `quickFixHelper.autoShowOnClick`: Enable/disable automatically opening the quick fix menu when clicking on an area with an available quick fix (Default: `true`).


## License

This extension is licensed under the MIT License.
