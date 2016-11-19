'use strict';
import * as vscode from 'vscode';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

import * as babel from 'babel-core';

// import * as babel from 'babel-core';

const tmpFolder = os.tmpdir();

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('extension.newRepl', () => {

        new Repl();
    });

    context.subscriptions.push(disposable);
}

const babelOptions: babel.TransformOptions = {
    presets: [path.join(__dirname, '../../node_modules/babel-preset-latest')]
};

class Repl {

    inputDocument: vscode.TextDocument;

    outputDocument: vscode.TextDocument;

    constructor() {
        const random = crypto.randomBytes(4).readUInt32LE(0);
        
        const inputFilePath = path.join(tmpFolder, 'vscode-babel-repl', `input_${random}.js`);
        const outputFilePath = path.join(tmpFolder, 'vscode-babel-repl', `output_${random}.js`);

        if (!fs.existsSync(path.join(tmpFolder, 'vscode-babel-repl'))) {
            fs.mkdirSync(path.join(tmpFolder, 'vscode-babel-repl'));
        }
        
        fs.closeSync(fs.openSync(inputFilePath, 'w'));
        fs.closeSync(fs.openSync(outputFilePath, 'w'));

        const inputUri = vscode.Uri.parse(`file://${inputFilePath}`);
        const outputUri = vscode.Uri.parse(`file://${outputFilePath}`);

        vscode.workspace.openTextDocument(inputUri).then((inputDocument) => {
            this.inputDocument = inputDocument;

            vscode.window.showTextDocument(inputDocument, vscode.ViewColumn.One);

            const changeEvent = vscode.workspace.onDidChangeTextDocument((event) => {
                if (event.document !== inputDocument) {
                    return;
                }

                const code = event.document.getText();
                const transformedCode = babel.transform(code, babelOptions);

                fs.writeFileSync(outputFilePath, transformedCode.code);
            });
        });
        vscode.workspace.openTextDocument(outputUri).then((outputDocument) => {
            this.outputDocument = outputDocument;

            vscode.window.showTextDocument(outputDocument, vscode.ViewColumn.Two, true);
        });
    }

}

// this method is called when your extension is deactivated
export function deactivate() {
}
