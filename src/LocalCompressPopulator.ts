import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { type } from 'os';
export class LocalCompressPopulator implements vscode.TreeDataProvider<Folder> {
    getTreeItem(element: Folder): vscode.TreeItem | Thenable<vscode.TreeItem> {
       return element;
    }
    getChildren(element?: Folder | undefined): vscode.ProviderResult<Folder[]> {
        return new Promise((accept, reject)=> {
            if(vscode.workspace.rootPath !== undefined) {
            
                fs.readdir(vscode.workspace.rootPath, (err, items) => {
                    if(err) {
                        accept([]);
                    }
                    else {
                       accept( items.filter((item) => {
                           console.log(item);
                            return item.endsWith("_extracted");
                        }).map((item) => {
                            return new Folder(item,
                            {
                                "command" : "apk.zipApk",
                                "title" : "Zip apk",
                                "arguments" : [item]
                            });
                        }));
                    }
            });
            
            
        }
        else {
            return [];
        }
        });
     }
    private _onDidChangeTreeData: vscode.EventEmitter<Folder | undefined> = new vscode.EventEmitter<Folder | undefined>();
	readonly onDidChangeTreeData: vscode.Event<Folder | undefined> = this._onDidChangeTreeData.event;
    refresh(): void {
		this._onDidChangeTreeData.fire();
	}
    constructor() {
    }
}

export class Folder extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly command: vscode.Command
	) {
		super(label, vscode.TreeItemCollapsibleState.None);
    }
    contextValue = "folder";
}
