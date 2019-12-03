import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { type } from 'os';
export class LocalInstallProvider implements vscode.TreeDataProvider<LocalAppForInstallation> {
    getTreeItem(element: LocalAppForInstallation): vscode.TreeItem | Thenable<vscode.TreeItem> {
       return element;
    }
    getChildren(element?: LocalAppForInstallation | undefined): vscode.ProviderResult<LocalAppForInstallation[]> {
        return vscode.workspace.findFiles("*patched.apk").then((items) => {
            return items.map((item) => {
                console.log(item);
                return new LocalAppForInstallation(path.basename(item.fsPath),
                {
                    "command" : "apk.installApk",
                    "title" : "Install apk",
                    "arguments" : [path.basename(item.fsPath)]
                });
            });
        });
     }
    private _onDidChangeTreeData: vscode.EventEmitter<LocalAppForInstallation | undefined> = new vscode.EventEmitter<LocalAppForInstallation | undefined>();
	readonly onDidChangeTreeData: vscode.Event<LocalAppForInstallation | undefined> = this._onDidChangeTreeData.event;
    refresh(): void {
		this._onDidChangeTreeData.fire();
	}
    constructor() {
    }
}

export class LocalAppForInstallation extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly command: vscode.Command
	) {
		super(label, vscode.TreeItemCollapsibleState.None);
	}
}
