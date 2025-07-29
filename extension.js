const vscode = require("vscode");

function activate(context) {
	// Store settings at module level
	const settings = {
		openOnError: false,
		openOnWarning: false,
		openOnInfo: false,
		openOnHint: false,
		openMenuDelay: 150,
	};

	// Function to update settings
	const updateSettings = () => {
		settings.openOnError = vscode.workspace
			.getConfiguration("quickFixHelper")
			.get("openOnError");
		settings.openOnWarning = vscode.workspace
			.getConfiguration("quickFixHelper")
			.get("openOnWarning");
		settings.openOnInfo = vscode.workspace
			.getConfiguration("quickFixHelper")
			.get("openOnInfo");
		settings.openOnHint = vscode.workspace
			.getConfiguration("quickFixHelper")
			.get("openOnHint");
		settings.openMenuDelay = vscode.workspace
			.getConfiguration("quickFixHelper")
			.get("openMenuDelay");
	};

	// Initial settings load
	updateSettings();

	// Listen for ALL quickFixHelper setting changes
	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration("quickFixHelper")) {
				updateSettings();
				updateMouseHandler();
			}
		}),
	);

	const showQuickFixesMenu = vscode.commands.registerCommand(
		"quickFixHelper.showQuickFixesMenu",
		() => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				return;
			}

			if (
				!(
					settings.openOnError ||
					settings.openOnWarning ||
					settings.openOnInfo ||
					settings.openOnHint
				)
			) {
				return;
			}

			const position = editor.selection.active;

			// Store current position and create timeout
			const currentPosition = {
				line: position.line,
				character: position.character,
			};

			// Clear any existing timeout
			// @ts-ignore
			if (showQuickFixesMenu.timeout) {
				// @ts-ignore
				clearTimeout(showQuickFixesMenu.timeout);
			}

			// Create new timeout
			// @ts-ignore
			showQuickFixesMenu.timeout = setTimeout(async () => {
				// Check if position changed during timeout
				const newPosition = editor.selection.active;
				if (
					currentPosition.line !== newPosition.line ||
					currentPosition.character !== newPosition.character
				) {
					return;
				}

				const diagnostics = vscode.languages
					.getDiagnostics(editor.document.uri)
					.filter((diagnostic) => diagnostic.range.contains(position))
					.filter(
						(diagnostic) =>
							(settings.openOnError &&
								diagnostic.severity === vscode.DiagnosticSeverity.Error) ||
							(settings.openOnWarning &&
								diagnostic.severity === vscode.DiagnosticSeverity.Warning) ||
							(settings.openOnInfo &&
								diagnostic.severity ===
									vscode.DiagnosticSeverity.Information) ||
							(settings.openOnHint &&
								diagnostic.severity === vscode.DiagnosticSeverity.Hint),
					);

				if (diagnostics.length > 0) {
					await vscode.commands.executeCommand("editor.action.quickFix");
				}
			}, settings.openMenuDelay);
		},
	);

	const advanceToNextQuickFix = vscode.commands.registerCommand(
		"quickFixHelper.nextQuickFix",
		async () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				return;
			}

			// TODO: Disable the command 'workbench.action.acceptSelectedQuickOpenItem' to prevent issues with this command being mapped to 'ctrl+.'

			const currentDiagnostics = vscode.languages
				.getDiagnostics(editor.document.uri)
				.filter(
					(diagnostic) =>
						(settings.openOnError &&
							diagnostic.severity === vscode.DiagnosticSeverity.Error) ||
						(settings.openOnWarning &&
							diagnostic.severity === vscode.DiagnosticSeverity.Warning) ||
						(settings.openOnInfo &&
							diagnostic.severity === vscode.DiagnosticSeverity.Information) ||
						(settings.openOnHint &&
							diagnostic.severity === vscode.DiagnosticSeverity.Hint),
				);
			if (currentDiagnostics.length === 0) {
				vscode.window.showInformationMessage("No quick fixes available");
				return;
			}

			const sortedDiagnostics = currentDiagnostics.sort((a, b) => {
				if (a.range.start.line !== b.range.start.line) {
					return a.range.start.line - b.range.start.line;
				}
				return a.range.start.character - b.range.start.character;
			});

			const currentPosition = editor.selection.active;
			let skipCurrent = false;
			if (
				// @ts-ignore
				advanceToNextQuickFix.lastPosition &&
				// @ts-ignore
				currentPosition.line === advanceToNextQuickFix.lastPosition.line &&
				currentPosition.character ===
					// @ts-ignore
					advanceToNextQuickFix.lastPosition.character
			) {
				skipCurrent = true;
			}
			const nextDiagnostic = _findNextDiagnostic(currentPosition, skipCurrent);
			const position = nextDiagnostic.range.start;

			// Store the position for next comparison
			// @ts-ignore
			advanceToNextQuickFix.lastPosition = position;

			const adjustedPosition = new vscode.Position(
				position.line,
				position.character,
			);

			editor.selection = new vscode.Selection(
				adjustedPosition,
				adjustedPosition,
			);
			editor.revealRange(nextDiagnostic.range);

			await vscode.commands.executeCommand("editor.action.quickFix");

			function _findNextDiagnostic(cursorPosition, skipCurrent = false) {
				let nextDiagnostic;

				if (skipCurrent) {
					// Find the next diagnostic after the current position (including same line)
					nextDiagnostic = sortedDiagnostics.find((d) => {
						if (d.range.start.line === cursorPosition.line) {
							return d.range.start.character > cursorPosition.character;
						}
						if (d.range.start.line > cursorPosition.line) {
							return true;
						}
						return false;
					});
				} else {
					// Find the first diagnostic at or after the current position
					nextDiagnostic = sortedDiagnostics.find((d) => {
						if (d.range.start.line === cursorPosition.line) {
							return true;
						}
						if (d.range.start.line > cursorPosition.line) {
							return true;
						}
						return false;
					});
				}

				// If no diagnostic found after current position, wrap to the first one
				return nextDiagnostic || sortedDiagnostics[0];
			}
		},
	);

	let mouseHandler;
	function updateMouseHandler() {
		if (mouseHandler) {
			mouseHandler.dispose();
		}

		if (
			vscode.workspace.getConfiguration("quickFixHelper").get("autoShowOnClick")
		) {
			mouseHandler = vscode.window.onDidChangeTextEditorSelection((event) => {
				// Check if it's a mouse event and left button was released
				if (
					event.kind === vscode.TextEditorSelectionChangeKind.Mouse &&
					!vscode.window.activeTextEditor.selections.some(
						(selection) => !selection.isEmpty,
					)
				) {
					// Small delay to ensure we catch the mouse up event
					setTimeout(async () => {
						// Only proceed if no text is selected (indicating a mouse up event)
						if (!vscode.window.activeTextEditor.selection.isEmpty) {
							return;
						}
						await vscode.commands.executeCommand(
							"quickFixHelper.showQuickFixesMenu",
						);
					}, 10);
				}
			});
			context.subscriptions.push(mouseHandler);
		}
	}

	// Initial setup
	updateMouseHandler();

	context.subscriptions.push(showQuickFixesMenu, advanceToNextQuickFix);
}

module.exports = {
	activate,
};
