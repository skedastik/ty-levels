// node auto-edit.py [options] [src_alf dest_alf]
//
// Apply auto-edit annotations. Can be run as a command or a daemon. If run as a
// command, annotations in src_alf are applied and written to dest_alf.
// Otherwise processing is performed via Unix domain sockets.
//
// The following options are supported:
//
// --simplify
//       Simplify algebraic expressions when applying auto-edit annotations.
// --daemon
//       Run as a daemon.

const process = require('process');
const fs = require('fs');
const net = require('net');
const { TransformEdit } = require('node-ty-levels');

const DAEMON_MODE = process.argv.includes('--daemon');
const DO_SIMPLIFY = process.argv.includes('--simplify');

const transformEdit = new TransformEdit({
    simplifyExpressions: DO_SIMPLIFY
});

class EditTreeNode {
    constructor(edits, parent) {
        this.edits = edits;
        this.parent = parent;
        this.children = [];
    }
}

class EditTreeBuilder {
    static RGX_AUTO_BEGIN = /<!--\s*auto:\s*(.+?)\s*-->/;
    static RGX_AUTO_END = /<!--\s*\/auto\s*-->/;

    static splitEdits(editListString) {
        const s = editListString + ',';
        const edits = [];
        let parens = 0;
        for (let i = 0, tokenStart = 0; i < s.length; i++) {
            if (s[i] === '(') {
                parens++;
                continue;
            } else if (s[i] === ')') {
                parens--;
                continue;
            } else if (s[i] === ',' && parens === 0) {
                edits.push(s.substring(tokenStart, i));
                tokenStart = i + 1;
            }
        }
        if (parens !== 0) {
            throw new Error(`Encountered malformed list of auto-edit commands "${editListString}".`);
        }
        return edits.map(edit => edit.trim());
    }

    constructor() {
        this.root = new EditTreeNode();
        this.curNode = this.root;
    }

    readLine(line) {
        const results = line.match(EditTreeBuilder.RGX_AUTO_BEGIN);
        if (results) {
            const edits = EditTreeBuilder.splitEdits(results[1]);
            const newNode = new EditTreeNode(edits, this.curNode);
            this.curNode.children.push(newNode);
            this.curNode = newNode;
            return;
        }
        if (EditTreeBuilder.RGX_AUTO_END.test(line)) {
            if (!this.curNode.parent) {
                throw new Error('Encountered auto-edit end tag without matching start tag.');
            }
            this.curNode = this.curNode.parent;
            return;
        }
        this.curNode.children.push(line);
    }

    eof() {
        if (this.curNode !== this.root) {
            throw new Error('Expected auto-edit end tag, but reached end of document.');
        }
        return this.root;
    }
}

const buildEditTreeFromFile = async inFile => {
    const builder = new EditTreeBuilder();
    const f = await fs.promises.open(inFile);
    for await (const line of f.readLines()) {
        builder.readLine(line);
    }
    return builder.eof();
};

const aliases = {
    mx: 'mirrorX',
    mz: 'mirrorZ',
    my: 'mirrorY',
    tx: 'translateX',
    tz: 'translateZ',
    ty: 'translateY',
    rc: 'rotate90Clockwise',
    rcc: 'rotate90Counterclockwise'
};

const renderEditTree = node => {
    const chunks = [];
    node.children.forEach(child => chunks.push(child instanceof EditTreeNode ? renderEditTree(child) : child));
    let mergedChunk = chunks.join('\n');
    if (node.edits) {
        node.edits.forEach(edit => {
            const results = edit.match(/([^()\s]+)(\s*\(\s*(.*?)\s*\))?/);
            if (!results) {
                throw new Error(`Encountered malformed edit command "${edit}".`);
            }
            const fnName = results[1];
            const args = results[3] ? results[3].split(',') : [];
            const editFn = transformEdit[fnName] || transformEdit[aliases[fnName]];
            if (!editFn) {
                throw new Error(`Encountered unrecognized edit command "${fnName}".`);
            }
            mergedChunk = editFn(mergedChunk, ...args);
        });
    }
    return mergedChunk;
};

const renderEditTreeAfterFinalSimplify = node => {
    const alf = renderEditTree(node);
    // Apply one final simplification pass to catch attributes unaffected by auto-edits.
    return DO_SIMPLIFY ? transformEdit.simplify(alf) : alf;
};

class AutoEditServer {
    static SOCKET_PATH = 'var/auto-edit.sock';
    static EOF_STRING = '<<<EOF>>>';

    start() {
        if (this.server) {
            return;
        }

        if (fs.existsSync(AutoEditServer.SOCKET_PATH)) {
            fs.unlinkSync(AutoEditServer.SOCKET_PATH);
        }

        this.server = net.createServer(client => {
            console.log('auto-edit.js -> Processing incoming ALF stream...');
            
            let buffer = [];
            let boundaryChars = '';
        
            client.on('data', data => {
                data = data.toString('utf-8');
                buffer.push(data);
                if (
                    data.indexOf(AutoEditServer.EOF_STRING) === -1
                    && (boundaryChars + data.substring(0, AutoEditServer.EOF_STRING.length - 1)).indexOf(AutoEditServer.EOF_STRING) === -1
                ) {
                    boundaryChars = data.substring(data.length - AutoEditServer.EOF_STRING.length + 1, data.length);
                    return;
                }
                buffer = buffer.join('');
                buffer = buffer.substring(0, buffer.length - AutoEditServer.EOF_STRING.length);
                const builder = new EditTreeBuilder();
                let lineStart = 0;
                for (let i = 0; i < buffer.length; i++) {
                    if (buffer[i] === '\n') {
                        builder.readLine(buffer.substring(lineStart, i));
                        lineStart = i + 1;
                    }
                }
                if (lineStart < buffer.length) {
                    builder.readLine(buffer.substring(lineStart, buffer.length));
                }
                client.write(renderEditTreeAfterFinalSimplify(builder.eof()) + AutoEditServer.EOF_STRING);
            });
        });

        this.server.listen(AutoEditServer.SOCKET_PATH, () => {
            console.log(`auto-edit.js -> Daemon listening on ${AutoEditServer.SOCKET_PATH}...`);
        });
    
        process.on('SIGINT', () => {
            console.log('auto-edit.js -> Received SIGINT. Shutting down...');
            this.server.close(() => {
                if (fs.existsSync(AutoEditServer.SOCKET_PATH)) {
                    fs.unlinkSync(AutoEditServer.SOCKET_PATH);
                }
                process.exit(0);
            });
        });
    }
}

if (DAEMON_MODE) {
    fs.mkdirSync('var', { recursive: true });
    const server = new AutoEditServer();
    server.start();
} else {
    if (process.argv.length < 4) {
        console.error('Usage: node auto-edit.js [options] src_file.alf out_file.alf')
        process.exit(1);
    }
    
    const inFile = process.argv[process.argv.length - 2];
    const outFile = process.argv[process.argv.length - 1];

    (async () => {
        console.log(`auto-edit.js -> Processing ${inFile}...`);
        try {
            const root = await buildEditTreeFromFile(inFile);
            let renderedAlf = renderEditTreeAfterFinalSimplify(root);
            fs.writeFileSync(outFile, renderedAlf);
        } catch (e) {
            console.error(`auto-edit.js -> Error: ${e.message}`);
            process.exit(1);
        }
    })();
}
