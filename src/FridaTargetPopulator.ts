    
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { type } from 'os';
var spawnCMD = require('spawn-command');

export class FridaTargetPopulator implements vscode.TreeDataProvider<FridaTarget> {
    private _onDidChangeTreeData: vscode.EventEmitter<FridaTarget | undefined> = new vscode.EventEmitter<FridaTarget | undefined>();
	readonly onDidChangeTreeData: vscode.Event<FridaTarget | undefined> = this._onDidChangeTreeData.event;

    constructor(private workspaceRoot: string | undefined) {
	}

    getTreeItem(element: FridaTarget): vscode.TreeItem {
		return element;
	}
    getChildren(element?: FridaTarget | FridaFolder | undefined): vscode.ProviderResult<FridaTarget[] | FridaScript[]> {
        if(element === undefined) {
            return  this.getFridaTargets();
        } else {
            var list = [];
            if(element.contextValue === "fridaTarget") {
                //first add some folders to store ios android or others
                list.push(new FridaFolder("ios", element));
                list.push(new FridaFolder("android", element));
                list.push(new FridaFolder("workspace", element));
            }
            else if (element.contextValue === "fridaFolder") {
                switch(element.label) {
                    case "android":
                            var folder = element as FridaFolder;
                            return this.getPredeginedAndroidScripts(folder.target);
                        break;
                    case "ios":
                        var folder = element as FridaFolder;
                        return this.getPredefinedIOSScripts(folder.target);
                    case "workspace":
                        var folder = element as FridaFolder;
                        if(this.workspaceRoot !== undefined) {
                            return vscode.workspace.findFiles("**/*.js").then((items) => {
                                var returnList : FridaScript[] = [];
                                items.forEach( (item) => {
                                    returnList.push(new FridaScript(
                                        path.basename(item.fsPath),
                                        item.fsPath,
                                        vscode.TreeItemCollapsibleState.None,
                                        {
                                            command: "extension.attachScriptToTarget",
                                            title: "",
                                            arguments :[
                                                (element as FridaFolder).target.pid, item.fsPath
                                            ]
                                        }
                                    ));
                                });
                                return returnList;
                            });
                        }
                        break;
                }
            }
            return list;
        }
        
    }
    getPredeginedAndroidScripts(element: FridaTarget | FridaFolder) : Promise<FridaScript[]> {
        return new Promise((accept, reject) => {
            var list : FridaScript[] = [];
            this.getFilesForScriptsFolder("android").then((files) => {
                files.forEach((item) => {
                    list.push(new FridaScript(item, path.join(__filename, '..', '..', 'frida_scripts','android', item),vscode.TreeItemCollapsibleState.None,{
                        command: 'extension.attachScriptToTarget',
                        title: '',
                        arguments: [(element as FridaTarget).pid, path.join(__filename, '..', '..', 'frida_scripts','android', item),]
                    }));
                });
                accept(list);
            });
           
        });
    }
    getFilesForScriptsFolder(where : string ) : Promise<string[]>{
        return new Promise((accept,reject)=> {
            var theFolder = path.join(__filename, '..', '..', 'frida_scripts', where);
            var folderList : string[] = [];
            console.log("looking in folder");
            fs.readdir(theFolder,(err, files) => {
                if(err) {
                    console.error(err);
                    reject();
                } else {
                    folderList.concat(files);
                    accept(files);
                }
            });
        });
    }
    getPredefinedIOSScripts(element : FridaTarget | FridaFolder) : Promise<FridaScript[]> {
        
       return new Promise((accept, reject) => {
            var list : FridaScript[] = [];
            this.getFilesForScriptsFolder("ios").then((files) => {
                files.forEach((item) => {
                    list.push(new FridaScript(item, path.join(__filename, '..', '..', 'frida_scripts','ios', item),vscode.TreeItemCollapsibleState.None,{
                        command: 'extension.attachScriptToTarget',
                        title: '',
                        arguments: [(element as FridaTarget).pid, path.join(__filename, '..', '..', 'frida_scripts','ios', item),]
                    }));
                });
                accept(list);
            });
           
        });
    }
    refresh(): void {
		this._onDidChangeTreeData.fire();
	}
    getFridaTargets() : Promise<FridaTarget[]>{
        var reg = new RegExp("^[0-9]");
        //reg.compile();
        return new Promise((accept, reject) => {
            //get all frida targets connected via USB
            console.log("[*] Try finding frida targets");
            var process = spawnCMD("frida-ps -U", []);
            console.log("[*] process spawned");
            var list : FridaTarget[] = [];
            function addToList(data : any) {
            // console.log("got output: " + data);
                var buffer : string = data.toString();
                buffer.split('\n').forEach(element => {
                    var newEle = element.trim();
                    if(reg.test(newEle)) {
                        list.push(new FridaTarget(newEle, vscode.TreeItemCollapsibleState.Collapsed));
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
                accept(list);
                }
                process = null;
                console.log("We found " + list.length + " targets");
            });
                });
    }


}

export class FridaTarget extends vscode.TreeItem {
    constructor(
        public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly command?: vscode.Command
	) {
		super(label, collapsibleState);
	}

	get tooltip(): string {
		return `${this.label}`;
	}

    get pid() : string {
        var regexp = new RegExp(/(?<pid>^[0-9]+)/);
        var result = regexp.exec(this.label);
        if (result !== null) {
            if(result.groups !== undefined) {
                return result.groups["pid"];
            }
            
        }
        return "";
    }

	get description(): string {
		return this.label;
	}

	iconPath = {
		light: path.join(__filename, '..', '..', 'resources', 'light', 'dependency.svg'),
		dark: path.join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg')
	};

	contextValue = 'fridaTarget';
}


export class FridaScript extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly scriptPath : string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly command?: vscode.Command
	) {
		super(label, collapsibleState);
	}

	get tooltip(): string {
		return `${this.label}`;
    }
    
    get pid() : string {
        return "-1";
    }

	get description(): string {
		return this.label;
	}

	iconPath = {
		light: path.join(__filename, '..', '..', 'resources', 'light', 'dependency.svg'),
		dark: path.join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg')
	};

	contextValue = 'fridaScript';
}

export class FridaFolder extends FridaTarget {
    constructor(
        public readonly label: string,
        public readonly target: FridaTarget
	) {
		super(label, vscode.TreeItemCollapsibleState.Collapsed);
	}
    contextValue = 'fridaFolder';
}
