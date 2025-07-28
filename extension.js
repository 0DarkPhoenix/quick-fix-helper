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

			// try {
			// 	await vscode.commands.executeCommand("workbench.action.closeQuickOpen");
			// 	console.log("Closed quick fix menu");
			// } catch (error) {
			// 	// Command might fail if no menu is open, which is fine
			// 	console.log("Failed to close quick open menu: ", error);
			// }

			// Small delay to ensure the menu is closed
			await new Promise((resolve) => setTimeout(resolve, 50));

			const currentDiagnostics = vscode.languages.getDiagnostics(
				editor.document.uri,
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

			let nextDiagnostic = _findNextDiagnostic(editor.selection.active.line);
			let position = nextDiagnostic.range.start;

			// Check if this is the same position as last time
			if (
				// @ts-ignore
				advanceToNextQuickFix.lastPosition &&
				// @ts-ignore
				position.line === advanceToNextQuickFix.lastPosition.line &&
				// @ts-ignore
				position.character === advanceToNextQuickFix.lastPosition.character
			) {
				// Find the next diagnostic after the current line
				nextDiagnostic = _findNextDiagnostic(editor.selection.active.line + 1);
				position = nextDiagnostic.range.start;
			}

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

			function _findNextDiagnostic(cursorLine) {
				const nextDiagnostic =
					sortedDiagnostics.find(
						(d) =>
							d.range.start.line === cursorLine ||
							d.range.start.line > cursorLine,
					) || sortedDiagnostics[0];
				return nextDiagnostic;
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
