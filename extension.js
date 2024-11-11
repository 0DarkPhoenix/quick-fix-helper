const vscode = require("vscode");

function activate(context) {
	const disposable = vscode.commands.registerCommand(
		"quickFixHelper.showQuickFixesMenu",
		async () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				return;
			}

			const position = editor.selection.active;
			const diagnostics = vscode.languages
				.getDiagnostics(editor.document.uri)
				.filter((diagnostic) => diagnostic.range.contains(position))
				// Add severity check to only include errors and warnings
				.filter(
					(diagnostic) =>
						diagnostic.severity === vscode.DiagnosticSeverity.Error ||
						diagnostic.severity === vscode.DiagnosticSeverity.Warning ||
						diagnostic.severity === vscode.DiagnosticSeverity.Information,
				);

			if (diagnostics.length > 0) {
				await vscode.commands.executeCommand("editor.action.quickFix");
			}
		},
	);

	const cycleQuickFixes = vscode.commands.registerCommand(
		"quickFixHelper.cycleAllQuickFixes",
		async () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				return;
			}

			let currentIndex = 0;
			const processNextDiagnostic = async () => {
				const currentDiagnostics = vscode.languages.getDiagnostics(editor.document.uri);
				if (currentDiagnostics.length === 0 || currentIndex >= currentDiagnostics.length) {
					vscode.window.showInformationMessage("Completed all quick fixes");
					return;
				}

				const sortedDiagnostics = currentDiagnostics.sort((a, b) => {
					if (a.range.start.line !== b.range.start.line) {
						return a.range.start.line - b.range.start.line;
					}
					if (a.range.start.character !== b.range.start.character) {
						return a.range.start.character - b.range.start.character;
					}
					return (
						a.range.end.character -
						a.range.start.character -
						(b.range.end.character - b.range.start.character)
					);
				});

				const diagnostic = sortedDiagnostics[currentIndex];
				const position = diagnostic.range.start;
				const adjustedPosition = new vscode.Position(position.line, position.character + 1);
				editor.selection = new vscode.Selection(adjustedPosition, adjustedPosition);
				editor.revealRange(diagnostic.range);

				// Show the quick fix menu and wait for user selection
				await vscode.commands.executeCommand("editor.action.quickFix");

				// Wait for either a text change (fix applied) or quick fix menu dismissed
				await new Promise((resolve) => {
					const changeDisposable = vscode.workspace.onDidChangeTextDocument(() => {
						changeDisposable.dispose();
						selectionDisposable.dispose();
						currentIndex++;
						resolve();
					});

					const selectionDisposable = vscode.window.onDidChangeTextEditorSelection(() => {
						changeDisposable.dispose();
						selectionDisposable.dispose();
						currentIndex++;
						resolve();
					});
				});

				// Move to next diagnostic after user interaction
				if (currentIndex < sortedDiagnostics.length) {
					await processNextDiagnostic();
				} else {
					vscode.window.showInformationMessage("Completed all quick fixes");
				}
			};

			await processNextDiagnostic();
		},
	);

	let mouseHandler;
	function updateMouseHandler() {
		if (mouseHandler) {
			mouseHandler.dispose();
		}

		if (vscode.workspace.getConfiguration("quickFixHelper").get("enableAutoShowOnClick")) {
			mouseHandler = vscode.window.onDidChangeTextEditorSelection(async (event) => {
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
						await vscode.commands.executeCommand("quickFixHelper.showQuickFixesMenu");
					}, 10);
				}
			});
			context.subscriptions.push(mouseHandler);
		}
	}

	// Initial setup
	updateMouseHandler();

	// Listen for configuration changes
	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration("quickFixHelper.enableAutoShowOnClick")) {
				updateMouseHandler();
			}
		}),
	);

	context.subscriptions.push(disposable, cycleQuickFixes);
}

module.exports = {
	activate,
};
