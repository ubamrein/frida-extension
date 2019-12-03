import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { type } from 'os';
export class LocalExtractProvider implements vscode.TreeDataProvider<LocalApkForExtraction> {
    getTreeItem(element: LocalApkForExtraction): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }
    getChildren(element?: LocalApkForExtraction | undefined): vscode.ProviderResult<LocalApkForExtraction[]> {
        return vscode.workspace.findFiles("*pull.apk").then((items) => {
            return items.map((item) => {
                return new LocalApkForExtraction(path.basename(item.fsPath),
                {
                    "command" : "apk.extractApk",
                    "title" : "extract apk",
                    "arguments" : [path.basename(item.fsPath)]
                });
            });
        });
     }
    private _onDidChangeTreeData: vscode.EventEmitter<LocalApkForExtraction | undefined> = new vscode.EventEmitter<LocalApkForExtraction | undefined>();
	readonly onDidChangeTreeData: vscode.Event<LocalApkForExtraction | undefined> = this._onDidChangeTreeData.event;
    refresh(): void {
		this._onDidChangeTreeData.fire();
	}
    constructor() {
    }
}

export class LocalApkForExtraction extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly command: vscode.Command
	) {
		super(label, vscode.TreeItemCollapsibleState.None);
	}
}
