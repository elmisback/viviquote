"use strict";

const path = require('path')

Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "viviquote" is now active!');
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    let a = 42;

    /*
        Register keybinding.
        TODO What about editorHasMultipleSelections ?
    
        // see https://code.visualstudio.com/api/references/contribution-points#contributes.keybindings
    let config = {
        key: "ctrl+j",
        when: "editorHasSelection"
    }
    */
    
    const get_free_vars_js = slice => {
        const acorn = require('acorn')
        const walk = require('acorn-walk')
        // HACK not sure what's going on in init_state
        const init_state = (state = {}) => state.found && state.in_scope && state.free_vars ? state : { found: [], in_scope: [], free_vars: [] }

        const functions = ({
            Identifier(node, state, c) {
                state = init_state(state)     // ugly HACK to prevent failures on missing state (for non-rec calls)
                if (!state.in_scope.includes(node.name)) state.free_vars.push(node.name)
                state.found.push(node)
            },
            VariableDeclarator(node, state, c) {
                state = init_state(state)
                state.in_scope.push(node.id.name)
                c(node.id, state)
                node.init && c(node.init, state)
            },
            FunctionDeclaration(node, state, c) {
                state = init_state(state)
                node.id && state.in_scope.push(node.id.name)
                const old_scope = [...state.in_scope]
                node.params.map(p => state.in_scope.push(p.name))
                c(node.id, state)
                node.params.map(p => c(p, state))
                c(node.body, state)
                state.in_scope = old_scope
            },
            FunctionExpression(node, state, c) {  // anonymous function
                state = init_state(state)
                const old_scope = [...state.in_scope]
                node.params.map(p => state.in_scope.push(p.name))
                node.params.map(p => c(p, state))
                c(node.body, state)
                state.in_scope = old_scope
            },
            ArrowFunctionExpression(node, state, c) {
                state = init_state(state)
                const old_scope = [...state.in_scope]
                node.params.map(p => state.in_scope.push(p.name))
                node.params.map(p => c(p, state))
                c(node.body, state)
                state.in_scope = old_scope
            },
            ForStatement(node, state, c) {
                state = init_state(state)
                const old_scope = [...state.in_scope]
                c(node.init, state)
                c(node.test, state)
                c(node.update, state)
                c(node.body, state)
                state.in_scope = old_scope
            },
            ForInStatement(node, state, c) {
                state = init_state(state)
                const old_scope = [...state.in_scope]
                c(node.left, state)
                c(node.right, state)
                c(node.body, state)
                state.in_scope = old_scope
            },
            ForOfStatement(node, state, c) {
                state = init_state(state)
                const old_scope = [...state.in_scope]
                c(node.left, state)
                c(node.right, state)
                c(node.body, state)
                state.in_scope = old_scope
            },
            BlockStatement(node, state, c) {
                state = init_state(state)
                const old_scope = [...state.in_scope]
                node.body.map(e => c(e, state))
                state.in_scope = old_scope
            }
        })
        
        const free_vars = (() => {
            const state = { found: [], in_scope: [], free_vars: [] }
            walk.recursive(acorn.parse(slice, {
                ecmaVersion: 2020
            }), state, functions)
            return [...new Set(state.free_vars)]
        })()
        return free_vars
    }

    const update_annotations = async (config = {}) => {
        const default_conf = ({
            "1": `
                run(1, 2, (a, b) => a + b, "g")
            `,
            "2": `
                run(1, 2, "e")
            `
        })
        const editor = vscode.window.activeTextEditor;
        console.log('update annotations running')
        // console.log('finding annotations')
        const document = editor && editor.document
        // const slice = get_slice(1, document)
        // console.log(slice)
        
        // const free_vars = get_free_vars_js(slice)

        // console.log(free_vars)

        // TODO get user choices for the variables?
        const ex_fname = ann_doc?.fileName || (document.fileName.endsWith('.an') ? document.fileName : document.fileName + '.an')
        // TODO only make new file if missing
        console.log('here', ex_fname)
        const old_annotations = await (async () => {
            try { return JSON.parse(await vscode.workspace.fs.readFile(vscode.Uri.parse(ex_fname))) } catch (e) { }
        })() || {}
        console.log({ old_annotations, config })
        config = { ...default_conf, ...old_annotations, ...config }
        console.log({ config })
        await vscode.workspace.fs.writeFile(vscode.Uri.parse(ex_fname), Buffer.from(JSON.stringify(config)))
        webview.html = await get_view(ann_doc)
    }

    let disposable1 = vscode.commands.registerCommand('viviquote.runcommand', async () => {
        // The code you place here will be executed every time your command is executed
        try {

            const editor = vscode.window.activeTextEditor;
        
            // Put annotations into the file
            if (editor) {
                console.log('making annotation')
                const document = editor.document;
                const selection = editor.selection;

                // Get the word within the selection
                console.log(vscode.Position(selection.start.line, 0))
                // HACK (should really get end of line)
                const lines = selection.with(selection.start.with(selection.start.line, 0), selection.end.with(selection.end.line + 1, 0))
                const word = document.getText(lines);
                console.log(word)
                const reversed = word.split('').reverse().join('');
                // get lowest note number in the file
                const numbers = [...((document.getText()).match(/\/\/ START \d+/g) || [])].map(s => parseInt(s.split(' ')[2]))
                console.log(numbers)
                let k = 1
                while (numbers.includes(k)) {
                        k++
                }

                await editor.edit(editBuilder => {
                    editBuilder.replace(lines, `// START ${k}\n${word}// END ${k}\n`);
                })
            }

            // evaluate
            if (editor) {
                await update_annotations()
                /*
            console.log('finding annotations')
            const document = editor.document
            const slice = get_slice(1, document)
            console.log(slice)
            
            const free_vars = get_free_vars_js(slice)

            console.log(free_vars)

            // TODO get user choices for the variables?
            const ex_fname = document.fileName + '.an'
            // TODO only make new file if missing
            vscode.workspace.fs.writeFile(vscode.Uri.parse(ex_fname), Buffer.from(JSON.stringify({
                "1": `
                    run(1, 2, (a, b) => a + b, "e")
                `
            })))
            */

                //const ex_editor = await vscode.window.showTextDocument(vscode.Uri.parse(ex_fname), {viewColumn: vscode.ViewColumn.Beside})

                // const panel = vscode.window.createWebviewPanel(
                //     'examplePanel',
                //     path.basename(ex_fname + ' GUI'),
                //     vscode.ViewColumn.Beside,
                //     {}
                //   );
                // // And set its HTML content
                // panel.webview.html = `<img src="https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif" width="300" />`

                // Naively, we could just show the example document, but this will allow errors and won't let us visualize the output intelligently
                // 
                // await ex_editor.edit(editBuilder => {
                // 	editBuilder.insert(ex_editor.document.positionAt(0), `testing`);
                // });

                // The VSCode native notebook might work well for this, but for now we'll
                // build a simple custom webview.


                //const fn = watch_expr => Function(...free_vars, slice + '; return ' + watch_expr)(...free_vars.map(v => get_example_value(v)))
            }

            vscode.window.showInformationMessage('Ran command!');
        } catch (error) {
            console.error('application caught error', error)
        }
    })
    context.subscriptions.push(disposable1);

    // Register a custom command.
    let disposable = vscode.commands.registerCommand('viviquote.helloWorld', () => {
        // The code you place here will be executed every time your command is executed
        let b = 41;
        //let c = a + b;
        // Display a message box to the user
        vscode.window.showInformationMessage('Hello VS Code (!) from viviquote!');
    });
    context.subscriptions.push(disposable);

    vscode.workspace.onDidSaveTextDocument(async (document) => {
        if (document.languageId === "javascript" && document.uri.scheme === "file") {
            // do work
            await update_annotations()
            
            console.log('updated annotations')

        }
        //TODO limit to just 
        
    });
    console.log('registered')

    const get_view = async (document) => {
        console.log('testing')
        const orig_fname = document.fileName.slice(0, document.fileName.length - EXT.length)
        console.log({orig_fname})
        console.log(document.getText().slice(0, 10))
        const config = await (async () => {
            try { return JSON.parse(new TextDecoder().decode(await vscode.workspace.fs.readFile(vscode.Uri.parse(document.fileName)))) } catch (e) { }
        })() || {}
        
        const orig_doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(orig_fname)).then(doc => doc)
        console.log({orig_doc})
        const inputs = []
        const watch_exprs = []
        const outputs = []
        console.log(orig_doc.getText().match(/\/\/ START \d+/g))
        const new_slices = [...(orig_doc.getText()).match(/\/\/ START \d+/g)].map(s => s.split(' ')[2]).filter(s => !(s in config)).reduce((acc, e) => ({ ...acc, [e]: "" }), {})
        console.log({new_slices})
        console.log({config})
        const MISSING_SLICE = "_MISSING"
        let html = Object.entries({ ...config, ...new_slices}).map(([k, v], i) => {
            console.log(k, v)
            const get_slice = (i, document) => {
                const text = document.getText()
                const idx = text.indexOf(`// START ${i}\n`)
                if (idx == -1) return '_MISSING'
                const start_i = idx + 11
                const end_i = text.indexOf(`// END ${i}`)
                return text.slice(start_i, end_i)
            }
            const slice = get_slice(k, orig_doc)
            if (slice == MISSING_SLICE) return ''  // HACK should probably deal with missing slices more cleanly, separate from output, etc.
            console.log('slice', slice)
            const free_vars = get_free_vars_js(slice).filter(v => (Function('return this')() || (42, eval)('this'))[v] === undefined)  // weird HACK ignores global variables
            console.log('free', free_vars)

            // BUG console.log in orig kills it
            const run = (...args) => {
                const watch_expr = args[args.length - 1]
                args = args.slice(0, args.length - 1)
                console.log(free_vars.map((name, i) => [name, args[i]]))
                inputs.push(free_vars.map((name, i) => [name, args[i]]))
                watch_exprs.push(watch_expr)
                const out = Function(...free_vars, slice + `; return ` + watch_expr)(...args)
                //const out = eval(free_vars.map((name, i) => `let ${name} = ${args[i]} ;`).join('\n') + slice)
                outputs.push(out)       // risky after eval
                return out
            }
            // Do the run
            console.log('v', v)
            
            const output = (() => {
                if (v.trim() == '') return "Please input an expression."
                try {
                    return Function('run', 'return (' + v + ')')(run);
                } catch (e) {
                    try {
                        return Function('run', v)(run);  // get the proper error
                    } catch (e1) {
                        return 'Error: ' + e1
                    }
                }
            })()

            // Zip inputs and outputs
            const zipped = inputs[i]?.map(([name, value], i) => `${name} : ${value}`).map(s => '<li> ' + s).join('')
            return `<div id="slice${i}" class="slice">
                        <div id="index"> Slice ${k} </div>
                        <div id="free_vars"> <pre>run(${free_vars.join(', ')}, watch_string)</pre> </div>
                        <div id="annotation"> <textarea style="width:100%">${v}</textarea> </div>
                        <!--
                        <div class="run_output">
                            <div id="inputs"> inputs: <ul>${zipped}</ul> </div>
                            <div id="output_expr">watch expr: ${watch_exprs[i]}</div>
                            <div id="output_value">output: ${outputs[i]}</div>
                        </div>
                        -->
                        <div>
                        ${output}
                        </div>
                    </div>
                    <hr>
                    
                    `
        }).join('\n')
        html += `Stored JSON: <div id="raw"> <pre> ${JSON.stringify(config, null, '  ')} </pre></div>`
        const install_handlers = (ex_fname) => {
            const vscode = acquireVsCodeApi();
            [...document.querySelectorAll('.slice textarea')].map((cell, i) => {
                cell.onchange = () => {
                    const config = {}//JSON.parse(document.querySelector('#raw').textContent)
                    config[i+ 1] = cell.value
                        
                    //vscode.workspace.fs.writeFile(vscode.Uri.parse(ex_fname), Buffer.from(JSON.stringify(config)))
                    //vscode.postMessage({ message: config })
                    vscode.postMessage({
                        config
                    })
                    
                }
            })
        }
        
        html += `<script>
        (${install_handlers.toString()})("${document.fileName}")
                //TODO receive message
                //const vscode = acquireVsCodeApi();
                //window.addEventListener('message', event => { '' })

                
                // vscode.postMessage({
                //     command: 'alert',
                //     text: '🐛  on line ' + count
                // })
                </script>`
        return html
    }
    vscode.onmessage = m => console.log('message', m)

    const EXT = ".an"
    let webview = null
    let ann_doc = null
    let disposable2 = vscode.window.registerCustomEditorProvider('viviquote.codeAnnotator', {
        async resolveCustomTextEditor(document, webViewPanel, cancellationToken) {
            ann_doc = document
            
            webViewPanel.webview.options = {
                enableScripts: true,
            };
            webview = webViewPanel.webview
            console.log()
            webview.onDidReceiveMessage(({ config }) => update_annotations(config))
            console.log('calling get_view')
            webview.html = await get_view(document)//html//
            
            // TODO send message to webview ?
            //webview.postMessage()
        }
    })

    context.subscriptions.push(disposable2);
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map