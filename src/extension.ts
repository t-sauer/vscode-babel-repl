'use strict';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

import {
    commands,
    Disposable,
    ExtensionContext,
    TextDocument,
    Uri,
    ViewColumn,
    window,
    workspace
} from 'vscode';

import * as babel from 'babel-core';

const tmpFolder = os.tmpdir();
let repl: Repl;

export function activate(context: ExtensionContext) {
    let disposable = commands.registerCommand('extension.newRepl', () => {

        repl = new Repl();
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {
    repl.shutdown();
}


const babelOptions: babel.TransformOptions = {
    presets: [path.join(__dirname, '../../node_modules/babel-preset-latest')]
};

class Repl {

    changeEventDisposable: Disposable;

    constructor() {
        this.init();
    }

    async init() {
        const basePath = this.generateBasePath();

        const inputFilePath = path.join(basePath, `input.js`);
        const outputFilePath = path.join(basePath, `output.js`);

        this.generateFiles(inputFilePath, outputFilePath);

        const {
            inputTextDocument,
            outputTextDocument
        } = await this.openTextDocuments(inputFilePath, outputFilePath);

        const {
            inputEditor,
            outputEditor
        } = await this.showTextDocuments(inputTextDocument, outputTextDocument);

        this.changeEventDisposable = workspace.onDidChangeTextDocument((event) => {
            if (event.document !== inputTextDocument) {
                return;
            }

            const code = inputTextDocument.getText();
            const transformedCode = babel.transform(code, babelOptions);

            fs.writeFileSync(outputFilePath, transformedCode.code);
        });
    }

    private async openTextDocuments(inputFilePath: string, outputFilePath: string) {
        const inputUri = Uri.parse(`file://${inputFilePath}`);
        const outputUri = Uri.parse(`file://${outputFilePath}`);

        const inputTextDocument = await workspace.openTextDocument(inputUri);
        const outputTextDocument = await workspace.openTextDocument(outputUri);

        return { inputTextDocument, outputTextDocument };
    }

    private showTextDocuments(inputTextDocument: TextDocument, outputTextDocument: TextDocument) {
        const inputPromise = window.showTextDocument(inputTextDocument, ViewColumn.One);
        const outputPromise = window.showTextDocument(outputTextDocument, ViewColumn.Two, true);
        const promises = [inputPromise, outputPromise];

        return Promise.all(promises)
            .then(([inputEditor, outputEditor]) => ({ inputEditor, outputEditor }));
    }

    private generateBasePath(): string {
        const random = crypto.randomBytes(4).readUInt32LE(0).toString();
        const basePath = path.join(tmpFolder, 'vscode-babel-repl', random);

        if (!fs.existsSync(basePath)) {
            fs.mkdirSync(basePath);
        }

        return basePath;
    }

    private generateFiles(inputFilePath: string, outputFilePath: string) {
        fs.closeSync(fs.openSync(inputFilePath, 'w'));
        fs.closeSync(fs.openSync(outputFilePath, 'w'));
    }

    shutdown() {
        this.changeEventDisposable.dispose();
    }

}
