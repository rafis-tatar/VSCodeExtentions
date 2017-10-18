'use strict';
import * as vscode from 'vscode';
import { FileOperations } from "./FileOperations";

export function activate(context: vscode.ExtensionContext) {    
    let disposable = vscode.commands.registerCommand('extension.addLocalreference', () => {               
        
        let _fileOperation=new FileOperations ();
        _fileOperation.terminal = vscode.window.createTerminal('terminal references');
               
        vscode.window.showInputBox({prompt: 'Input .Net reference (.dll) full path'}).then(val=>{
            try{
                _fileOperation.init(val);
                _fileOperation.createNUSPECFile();
                _fileOperation.createContentType();
                _fileOperation.createRels();
                _fileOperation.createPSMDCP();
                _fileOperation.copyFileAndZipping().then(name=>{
                    _fileOperation.creatNugetConfig();
                    _fileOperation.addPackage(name);                   
                    //_fileOperation.terminal.dispose();                
                }) ;    
            }
            catch(err){
                if(err) vscode.window.showErrorMessage(err);
            }
        });

    });
    context.subscriptions.push(disposable);    
}
export function deactivate() {
}