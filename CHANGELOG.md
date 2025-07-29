## [0.3.1] - 2025-07-29
### Changed
- Changed default keybind of the nextQuickFix command on MacOS from `ctrl + .` to `cmd + .`

### Fixed
- Fixed a bug where the nextQuickFix command could only detect the first quick fix when multiple quick fixes were available on the same line


## [0.3.0] - 2025-07-28
### Changed
- Changed the behavior of the nextQuickFix command so it advances to the next quick fix including the current line instead of strictly searching after the cursor position
- Changed the default keybind for nextQuickFix from `ctrl + meta + alt + q` to `ctrl + .`

## [0.2.0] - 2025-02-22
### Added
- Added a delay for opening the quick fix menu to make it easier to select text with an available quick fix when double clicking. This delay is customizable via the settings

## [0.1.1] - 2024-11-17
### Added
- Updated the README for the newly added settings

## [0.1.0] - 2024-11-17
### Added
- Added the command quickFixHelper.nextQuickFix as a replacement for the cycleAllQuickFixes command
- Added togglable settings for showing the quick fix menu for errors, warnings, information and hints

### Changed
- Changed command name quickFixHelper.enableAutoShowOnClick to quickFixHelper.autoShowOnClick
- Removed the quickFixHelper.cycleAllQuickFixes command

## [0.0.4] - 2024-11-12
### Fixed
- Fixed a bug where the quick fix menu wouldn't open for hints

## [0.0.3] - 2024-11-11
### Fixed
- Fixed unintentional opening of quick fix menu when creating a selection using the mouse
- Fixed an issue where the quick fix menu would rarely not open when using the cycleAllQuickFixes command

### Known Issues
- Closing the quick fix menu doesn't continue to the next quick fix when using the cycleAllQuickFixes command

## [0.0.2] - 2024-11-09
### Added
- Added the command cycleAllQuickFixes which cycles through all areas with a quick fix one by one
- Added a new setting to turn off the behavior to automatically open the quick fix menu when clicking on an area with an available quick fix

## [0.0.1] - 2024-11-08
### Initial release