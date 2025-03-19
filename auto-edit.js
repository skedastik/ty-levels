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

    finish() {
        if (this.curNode !== this.root) {
            throw new Error('Expected auto-edit end tag, but reached end of document.');
        }
        return this.root;
    }
}

const buildEditTreeFromFile = async inFile => {
    // const root = new EditTreeNode();
    // let curNode = root;
    const builder = new EditTreeBuilder();
    const f = await fs.promises.open(inFile);
    for await (const line of f.readLines()) {
        builder.readLine(line);
        // const results = line.match(RGX_AUTO_BEGIN);
        // if (results) {
        //     const edits = splitEdits(results[1]);
        //     const newNode = new EditTreeNode(edits, curNode);
        //     curNode.children.push(newNode);
        //     curNode = newNode;
        //     continue;
        // }
        // if (RGX_AUTO_END.test(line)) {
        //     if (!curNode.parent) {
        //         throw new Error('Encountered auto-edit end tag without matching start tag.');
        //     }
        //     curNode = curNode.parent;
        //     continue;
        // }
        // curNode.children.push(line);
    }
    return builder.finish();
    // if (curNode !== root) {
    //     throw new Error('Expected auto-edit end tag, but reached end of document.');
    // }
    // return root;
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

if (process.env.AUTO_EDIT_DAEMONIZE) {
    console.log(`auto-edit.js -> Running in daemon mode...`);

    const SOCKET_PATH = 'tmp/auto-edit.sock';
    if (fs.existsSync(SOCKET_PATH)) {
        fs.unlinkSync(SOCKET_PATH);
    }

    let buffer = [];

    const server = net.createServer(client => {
        console.log('auto-edit.js -> Client connected.');
    
        client.on('data', (data) => {
            buffer.push(data);
        });
    
        client.on('end', () => {
            console.log('auto-edit.js -> Client disconnected. Processing...');
            // TODO
        });
    });

    server.listen(SOCKET_PATH, () => {
        console.log(`Daemon listening on ${SOCKET_PATH}`);
    });

    process.on('SIGINT', () => {
        console.log('auto-edit.js -> Received SIGINT. Shutting down...');
        server.close(() => {
            fs.unlinkSync(SOCKET_PATH);
            process.exit(0);
        });
    });
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
