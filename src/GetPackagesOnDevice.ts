import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { type } from 'os';
var spawnCMD = require('spawn-command');

export class ApkTreeProvider implements vscode.TreeDataProvider<Apk> {
    private _onDidChangeTreeData: vscode.EventEmitter<Apk | undefined> = new vscode.EventEmitter<Apk | undefined>();
	readonly onDidChangeTreeData: vscode.Event<Apk | undefined> = this._onDidChangeTreeData.event;

    constructor() {
	}

    getTreeItem(element: Apk): vscode.TreeItem {
		return element;
	}
    getChildren(element?: undefined | Apk): vscode.ProviderResult<Apk[]> {
        if (element === undefined) {
            return this.getApks();
        }
        else {
            return element.childItems;
        }
        
    }

    generateTree(apks : Apk[]) : Apk {
        var newTree : Apk = new Apk("root","root","root",[],vscode.TreeItemCollapsibleState.Expanded);
        for(var i = 0; i < apks.length; i++){
            this.insertIntoTree(newTree, apks[i], apks[i].pkg.split("."));
        }
        return newTree;
    }

    insertIntoTree(node : Apk, theApk : Apk, furtherPath : string[]) {
        if(furtherPath.length === 1) {
            node.childItems.push(theApk);
        } else {
            var ele = node.childItems.find((pathPart) => pathPart.label === furtherPath[0]);
            if(ele === undefined) {
                //packages does not yet exist
                node.childItems.push(new Apk(
                    furtherPath[0],
                    furtherPath[0],
                    furtherPath[0],
                    [],
                    vscode.TreeItemCollapsibleState.Collapsed
                ));
                this.insertIntoTree(node.childItems[node.childItems.length-1],theApk,furtherPath.slice(1));
            }
            else {
                this.insertIntoTree(ele, theApk, furtherPath.slice(1));
            }
        }
    }

    getApks() : Promise<Apk[]>{
        var reg = new RegExp("^package:(?<apk_name>.*)");
        //reg.compile();
        return new Promise((accept, reject) => {
            //get all frida targets connected via USB
            console.log("[*] Try finding apks");
            var process = spawnCMD("adb shell pm list packages", []);
            console.log("[*] process spawned");
            var list : Apk[] = [];
            function addToList(data : any) {
            // console.log("got output: " + data);
                var buffer : string = data.toString();
                buffer.split('\n').forEach(element => {
                    var newEle = element.trim();
                    if(reg.test(newEle)) {
                        var result = reg.exec(newEle)
                        if (result !== null) {
                            if(result.groups !== undefined) {
                                var displayNameSplit = result.groups["apk_name"].split(".")
                                var displayName = displayNameSplit[displayNameSplit.length-1]
                                list.push(new Apk(`${displayName} (${newEle})`,result.groups["apk_name"], displayName,[],
                                vscode.TreeItemCollapsibleState.None,
                                {
                                    command : "apk.getApk",
                                    title : "Fetch APK",
                                    arguments : [result.groups["apk_name"]]
                                },
                                ));
                            }
                            
                        }
                        
                    }
                });

            }
            process.stdout.on('data', addToList);
            process.stderr.on('data', function(err : any) {
                console.log(err);
            });
            process.on('close', (status : any) => {
                if (status) {
                reject('frida-ps failed, is it installed?');
                } else {
                    console.log("finished");
                    list = list.sort((a,b) => a.displayName.localeCompare(b.displayName))
                accept([this.generateTree(list)]);
                }
                process = null;
                console.log("We found " + list.length + " targets");
            });
                });
    }
    refresh(): void {
		this._onDidChangeTreeData.fire();
	}
}
export class Apk extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly pkg: string,
        public readonly displayName : string,
        public childItems : Apk[],
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command
       
	) {
		super(label, vscode.TreeItemCollapsibleState.Collapsed);
    }
    
}
