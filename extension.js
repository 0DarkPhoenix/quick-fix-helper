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
				.filter((diagnostic) => diagnostic.range.contains(position));

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
				await new Promise((resolve) => {
					const disposable = vscode.languages.onDidChangeDiagnostics((e) => {
						if (
							e.uris.some((uri) => uri.toString() === editor.document.uri.toString())
						) {
							disposable.dispose();
							resolve();
						}
					});

					// Add a timeout in case no diagnostic update occurs
					setTimeout(() => {
						disposable.dispose();
						resolve();
					}, 100);
				});

				const currentDiagnostics = vscode.languages.getDiagnostics(editor.document.uri);
				if (currentDiagnostics.length === 0) {
					vscode.window.showInformationMessage("No more quick fixes available");
					return;
				}

				const sortedDiagnostics = currentDiagnostics.sort((a, b) => {
					// First compare by line number
					if (a.range.start.line !== b.range.start.line) {
						return a.range.start.line - b.range.start.line;
					}
					// If on same line, compare by character position
					if (a.range.start.character !== b.range.start.character) {
						return a.range.start.character - b.range.start.character;
					}
					// If at same position, compare by length of the diagnostic range
					return (
						a.range.end.character -
						a.range.start.character -
						(b.range.end.character - b.range.start.character)
					);
				});

				if (currentIndex >= sortedDiagnostics.length) {
					currentIndex = 0;
				}

				const diagnostic = sortedDiagnostics[currentIndex];
				const position = diagnostic.range.start;
				editor.selection = new vscode.Selection(position, position);
				editor.revealRange(diagnostic.range);

				await new Promise((resolve) => {
					const disposable = vscode.workspace.onDidChangeTextDocument(() => {
						disposable.dispose();
						currentIndex++;
						resolve();
					});

					const focusDisposable = vscode.window.onDidChangeActiveTextEditor(() => {
						focusDisposable.dispose();
						currentIndex++;
						resolve();
					});

					vscode.commands.executeCommand("editor.action.quickFix");
				});

				await processNextDiagnostic();
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
				if (event.kind === vscode.TextEditorSelectionChangeKind.Mouse) {
					await vscode.commands.executeCommand("quickFixHelper.showQuickFixesMenu");
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
