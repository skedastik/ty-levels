// node auto-edit.py src_alf dest_alf

const tyl = require('node-ty-levels');
const process = require('process');
const fs = require('fs');
const net = require('net');

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
        } else if (EditTreeBuilder.RGX_AUTO_END.test(line)) {
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

const renderTree = node => {
    const chunks = [];
    node.children.forEach(child => chunks.push(child instanceof EditTreeNode ? renderTree(child) : child));
    let mergedChunk = chunks.join('\n');
    if (node.edits) {
        node.edits.forEach(edit => {
            const results = edit.match(/([^()\s]+)(\s*\(\s*(.*?)\s*\))?/);
            if (!results) {
                throw new Error(`Encountered malformed edit command "${edit}".`);
            }
            const fnName = results[1];
            const args = results[3] ? results[3].split(',') : [];
            const editFn = tyl[fnName] || tyl[aliases[fnName]];
            if (!editFn) {
                throw new Error(`Encountered unrecognized edit command "${fnName}".`);
            }
            mergedChunk = editFn(mergedChunk, ...args);
        });
    }
    return mergedChunk;
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
            console.log('auto-edit.js -> Client connected. Processing stream...');
            
            let buffer = [];
        
            client.on('data', data => {
                data = data.toString('utf-8');
                let eof = false;
                const eofIndex = data.indexOf(AutoEditServer.EOF_STRING);
                if (eofIndex >= 0) {
                    data = data.substring(0, eofIndex);
                    eof = true;
                }
                buffer.push(data);
                if (!eof) {
                    return;
                }
                buffer = buffer.join('');
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
                client.write(renderTree(builder.eof()) + AutoEditServer.EOF_STRING);
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

if (process.env.DAEMON_MODE) {
    fs.mkdirSync('var', { recursive: true });
    const server = new AutoEditServer();
    server.start();
} else {
    if (process.argv.length < 4) {
        console.error('Usage: node auto-edit.js src_file.alf out_file.alf')
        process.exit(1);
    }
    
    const inFile = process.argv[2];
    const outFile = process.argv[3];

    (async () => {
        console.log(`auto-edit.js -> Processing ${inFile}...`);
        try {
            const root = await buildEditTreeFromFile(inFile);
            let renderedAlf = renderTree(root);
            if (!process.env.NO_SIMPLIFY) {
                renderedAlf = tyl.simplify(renderedAlf);
            }
            fs.writeFileSync(outFile, renderedAlf);
        } catch (e) {
            console.error(`auto-edit.js -> Error: ${e.message}`);
            process.exit(1);
        }
    })();
}
