// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { FridaTargetPopulator, FridaTarget, FridaScript } from './FridaTargetPopulator';
import { setFlagsFromString } from 'v8';
import { connect } from 'tls';
import { Apk, ApkTreeProvider } from './GetPackagesOnDevice';
import { LocalExtractProvider } from './LocallExtractProvider';
import { LocalInstallProvider } from './LocalInstallProvider';
import { LocalCompressPopulator, Folder } from './LocalCompressPopulator';
import { arch } from 'os';
import { TextDecoder } from 'util';
import { URL } from 'url';
import * as https from 'https'
import { pipeline } from 'stream';
import * as semver from 'semver';
import { HttpsConnection } from './HttpsConnection';

var spawnCMD = require('spawn-command');
var spawn = require('spawncommand');

var globalTerminal : vscode.Terminal;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	globalTerminal = vscode.window.createTerminal("adb extension");
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
		console.log('Congratulations, your extension "frida-extension" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const apkTool = path.join(__filename, "..","..", "tools", "apktool.jar");
	const apkToolVersion = path.join(__filename, "..","..", "tools", "apktool.version");
	//check if apktool exists, if not download it
	const toolsDir = path.join(__filename, "..","..", "tools");
	if(!fs.existsSync(toolsDir)){
		fs.mkdirSync(toolsDir);
	}
	if(!fs.existsSync(apkTool)) {
		downloadAPKTool(apkTool);
	}
	else {
		console.log("APKTool already exists, download it anyways");
		if(fs.existsSync(apkToolVersion)) {
			const versionString = fs.readFileSync(apkToolVersion).toString();
			downloadAPKTool(apkTool, versionString);
		} else {
			downloadAPKTool(apkTool);
		}
	}
	let disposable = vscode.commands.registerCommand('extension.attachScriptToTarget', (target, script) => {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		var terminal = vscode.window.createTerminal(target + " => " + script);
		terminal.sendText("frida -U -p " + target + " -l " + script + "\n");
		terminal.show();
	});            

	vscode.commands.registerCommand('apk.getApk', async (packageName)=>{
		var reg = new RegExp("^package:(?<apk_name>.*)");
		console.log("[*] Try finding apks");
		var process = spawnCMD("adb shell pm path " + packageName, []);
		console.log("[*] process spawned");
		var list : Apk[] = [];
		var command = "";
		var pullAdb = (data : any) => {
			command += new TextDecoder().decode(data);
			if(reg.test(command)) {
				var res = reg.exec(command);                                          
				if(res !== null) {
					if(res.groups !== undefined && res.groups["apk_name"] !== "") {
						//var terminal = vscode.window.createTerminal("adb pull");
						globalTerminal.sendText("adb pull " + res.groups["apk_name"] + " " +  packageName+"_pull.apk\n");
						globalTerminal.show();
					}
				}
			}
		};

		process.stdout.on('data', pullAdb);
		process.stderr.on('data', function(err : any) {
			console.log(err);
		});
		
	});

	vscode.commands.registerCommand("apk.extractApk", (apk) => {
		//var terminal = vscode.window.createTerminal("apktool extract");
		globalTerminal.sendText("java -jar " + apkTool+" --use-aapt2 -f d " + apk + " -o " + apk.replace(".apk", "_extracted")+ "\n");
		globalTerminal.show();
	});

	vscode.commands.registerCommand("apk.zipApk", (folder) => {
		//var terminal = vscode.window.createTerminal("apktool extract");
		globalTerminal.sendText(" java -jar " + apkTool+" --use-aapt2 b -o " + folder.replace("_extracted", "_unaligned.apk") + " " +folder  +"\n");
		globalTerminal.sendText("keytool -genkey -v -keystore custom.keystore -alias mykeyaliasname -keyalg RSA -keysize 2048 -validity 10000 -storepass fridastore -dname 'cn=Frida, ou=Frida, o=Frida, c=Frida'\n");
		globalTerminal.sendText("jarsigner -sigalg SHA1withRSA -digestalg SHA1 -keystore custom.keystore -storepass fridastore " + folder.replace("_extracted", "_unaligned.apk") + " mykeyaliasname");
		globalTerminal.sendText("zipalign -f 4 "+ folder.replace("_extracted", "_unaligned.apk")  + " "+ folder.replace("_extracted", "_patched.apk"));
		globalTerminal.show();
	});

	vscode.commands.registerCommand("apk.installApk", (apk) => {
		//var terminal = vscode.window.createTerminal("apktool extract");
		globalTerminal.sendText("adb install " + apk + "\n");
		globalTerminal.show();
	});
	
	vscode.commands.registerCommand("frida.getVersionForFolder",async (folder : Folder) => {
		if(vscode.workspace.workspaceFolders === undefined) {
			vscode.window.showErrorMessage("We need a workspace");
			return;
		}
		var theFolder = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, folder.label);
		fs.exists(path.join(theFolder, "lib"), async (exists) => {
			if(!exists) 
			{
				await fs.mkdirSync(path.join(theFolder, "lib"));
			}
			fs.readdir(path.join(theFolder,"lib"),(err,files)=>{
				var folders = [];
				var archs = files.map((item)=> {
					if(item.includes("armeabi")) {
						return {
							folder : item,
							arch : "arm"
						};
					} else if( item.includes("arm64")) {
						return {
							folder : item,
							arch : "arm64"
						};
					}
					
				});
			
				//var terminal =  vscode.window.createTerminal("Download frida");
				
				archs.forEach(element => {
					if (element === undefined) {
						return;
					}
					//globalTerminal.sendText("wget '" + getFridaDownloadLink("12.7.5", element.arch, "android") + "' -O " +  path.join(theFolder, "lib", element.folder,"libfrida-gadget.so.xz") + "\n");
					HttpsConnection.get(getFridaDownloadLink("12.7.5", element.arch, "android"),function(fileBuffer){
						let fileZip = fs.createWriteStream(path.join(theFolder, "lib", element.folder,"libfrida-gadget.so.xz"));
						fileZip.write(fileBuffer);
						fileZip.close();
						globalTerminal.sendText("unxz -f " + path.join(theFolder, "lib", element.folder,"libfrida-gadget.so.xz") + "\n");
						globalTerminal.show();
					});
					
					
				});
			});
		});
	});
	vscode.commands.registerCommand("frida.downloadFrida",() => {
		vscode.window.showInputBox({
			 value :  "12.7.5",
			prompt : "Frida Version"
		}).then((version) => {
			vscode.window.showInputBox({
				value :  "arm64",
			   prompt : "Target architecture"
		   })
		   .then((arch) => {
			vscode.window.showInputBox({
				value :  "android",
				prompt : "Target platform"
			   })
			.then((platform) => {
				if(version === undefined || arch === undefined || platform === undefined) {
					return;
				}
				//var terminal = vscode.window.createTerminal("download frida");
				if(vscode.workspace.rootPath === undefined) {
					vscode.window.showErrorMessage("We need a workspace");
					return;
				}
				fs.mkdir(path.join(vscode.workspace.rootPath,"frida_libraries"),(err) => {
					if(err) {
						vscode.window.showErrorMessage("Could not create directory. We need a workspace");
					}
					//globalTerminal.sendText("wget " + getFridaDownloadLink(version,arch,platform) + ` -O frida_libraries/frida-gadget-${version}-${platform}-${arch}.xz\n`);

					HttpsConnection.get( getFridaDownloadLink(version,arch,platform),function(fileBuffer){
						let fileZip = fs.createWriteStream(path.join(vscode.workspace.rootPath!,"frida_libraries",`frida-gadget-${version}-${platform}-${arch}.xz`));
						fileZip.write(fileBuffer);
						fileZip.close();
						globalTerminal.sendText(`unxz frida_libraries/frida-gadget-${version}-${platform}-${arch}.xz\n`);
						globalTerminal.show();
					});
				});
				
			   
			});
		   });
		});
	});
	

	const treeProvider = new FridaTargetPopulator(vscode.workspace.rootPath);
	vscode.window.registerTreeDataProvider('fridaTarget', treeProvider);
	vscode.commands.registerCommand('fridaTarget.refreshEntry', () => treeProvider.refresh());
	
	const apkProvider = new ApkTreeProvider();
	vscode.window.registerTreeDataProvider('android-apkView', apkProvider);
	vscode.commands.registerCommand('apk.refreshEntry', () => apkProvider.refresh());
	
	const localExtractProvider = new LocalExtractProvider();
	vscode.window.registerTreeDataProvider('android-localPulled', localExtractProvider);
	vscode.commands.registerCommand('apk.local.refreshEntry', () => localExtractProvider.refresh());

	const localInstallProvider = new LocalInstallProvider();
	vscode.window.registerTreeDataProvider('android-localPulledPatched', localInstallProvider);
	vscode.commands.registerCommand('apk.install.refreshEntry', () => localInstallProvider.refresh());

	const localcompress = new LocalCompressPopulator();
	vscode.window.registerTreeDataProvider('android-localReadyForZip', localcompress);
	vscode.commands.registerCommand('apk.compress.refreshEntry', () => localcompress.refresh());

	const localExtractWatcher = vscode.workspace.createFileSystemWatcher("**/*_pull.apk",false,false,false);
	const localInstallWatcher = vscode.workspace.createFileSystemWatcher("**/*_pull_patched.apk",false,false,false);
	const localCompresslWatcher = vscode.workspace.createFileSystemWatcher("**/*_pull_extracted",false,false,false);

	localExtractWatcher.onDidCreate(function() {
		localExtractProvider.refresh();
	});
	localExtractWatcher.onDidChange(function() {
		localExtractProvider.refresh();
	});
	localExtractWatcher.onDidDelete(function() {
		localExtractProvider.refresh();
	});

	localInstallWatcher.onDidCreate(function() {
		localInstallProvider.refresh();
	});
	localInstallWatcher.onDidChange(function() {
		localInstallProvider.refresh();
	});
	localInstallWatcher.onDidDelete(function() {
		localInstallProvider.refresh();
	});

	localCompresslWatcher.onDidCreate(function() {
		localcompress.refresh();
	});
	localCompresslWatcher.onDidChange(function() {
		localcompress.refresh();
	});
	localCompresslWatcher.onDidDelete(function() {
		localcompress.refresh();
	});

	
	let b = vscode.commands.registerCommand('extension.startFrida', (node : FridaTarget) => {
		var terminal = vscode.window.createTerminal(node.label);
		terminal.sendText("frida -U -p " + node.pid + "\n");
		terminal.show();
	});
	let c = vscode.commands.registerCommand("extension.openScript", (node : FridaScript) => {
		console.log("open document");
		vscode.workspace.openTextDocument(node.scriptPath).then((doc) => {
			vscode.window.showTextDocument(doc);
		});
		
	});
	vscode.commands.registerCommand("extension.installFridaTools", () => {
		//var terminal = vscode.window.createTerminal("Install frida");
		globalTerminal.sendText("pip3 install --upgrade frida-tools\n");
		globalTerminal.show();
	});

	//we are back on to copy the resources
	if(vscode.workspace.rootPath !== undefined) {
		var extensionPath = path.join(__filename, '..', '..', 'types', 'frida-gum.d.ts');
		var destination = path.join(vscode.workspace.rootPath, "types", "frida-gum.d.ts");
		var destFolder = path.join(vscode.workspace.rootPath, "types");
		console.log(fs.existsSync(extensionPath));
		if(!fs.existsSync(destFolder)) {
			fs.mkdirSync(destFolder);
		}
		fs.copyFile(extensionPath, destination, (err) => {
			if(err) {
				console.error("Could not copy file");
				console.error(err);
			}
			else {
				vscode.workspace.openTextDocument(destination);
			}
		});
		
	}
	
	context.subscriptions.push(disposable);
	
}

// this method is called when your extension is deactivated
export function deactivate() {}

function getFridaDownloadLink(fridaVersion : string, arch: string, platform : string) : string{
	return `https://github.com/frida/frida/releases/download/${fridaVersion}/frida-gadget-${fridaVersion}-${platform}-${arch}.so.xz`;

}

function downloadAPKTool(apkTool: string, currentVersion? : string) {
	console.log("Download newer version of apktool");
	
	https.get("https://github.com/iBotPeaches/Apktool/releases/latest", function callback(response) {
		const version = path.basename(response.headers.location!).replace("v","");
		if(currentVersion && semver.gte(currentVersion, version)) {
			return;
		}
		console.log("Check latest version: "+ version);
		HttpsConnection.get(`https://github.com/iBotPeaches/Apktool/releases/download/v${ version }/apktool_${ version }.jar`, function fileCallback(fileBytes) {
			const file = fs.createWriteStream(apkTool);
			file.write(fileBytes);
			file.close();
			const versionFile = fs.createWriteStream(apkTool.replace("apktool.jar", "apktool.version"));
			versionFile.write(version);
			versionFile.close();
		});
	});
}