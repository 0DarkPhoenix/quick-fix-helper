const vscode = require("vscode");

function activate(context) {
	const disposable = vscode.commands.registerCommand(
		"quick-fix-helper.showQuickFixesMenu",
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

	const mouseHandler = vscode.window.onDidChangeTextEditorSelection(async (event) => {
		if (event.kind === vscode.TextEditorSelectionChangeKind.Mouse) {
			await vscode.commands.executeCommand("quick-fix-helper.showQuickFixesMenu");
		}
	});

	context.subscriptions.push(disposable, mouseHandler);
}

module.exports = {
	activate,
};
