// node auto-edit.py src_alf dest_alf

const tyl = require('node-ty-levels');
const process = require('process');
const fs = require('fs');

if (process.argv.length < 4) {
    console.error('Usage: node auto-edit.js src_file.alf out_file.alf')
    process.exit(1);
}

const inFile = process.argv[2];
const outFile = process.argv[3];

class TreeNode {
    constructor(edits, parent) {
        this.edits = edits;
        this.parent = parent;
        this.children = [];
    }
}

const RGX_AUTO_BEGIN = /<!--\s*auto:\s*(.+?)\s*-->/;
const RGX_AUTO_END = /<!--\s*\/auto\s*-->/;

const buildTreeFromInFile = async () => {
    const root = new TreeNode();
    let curNode = root;
    const f = await fs.promises.open(inFile);
    for await (const line of f.readLines()) {
        const results = line.match(RGX_AUTO_BEGIN);
        if (results) {
            const edits = results[1].split(',').map(edit => edit.trim());
            const newNode = new TreeNode(edits, curNode);
            curNode.children.push(newNode);
            curNode = newNode;
            continue;
        }
        if (RGX_AUTO_END.test(line)) {
            if (!curNode.parent) {
                throw new Error('Encountered auto-edit end tag without matching start tag.');
            }
            curNode = curNode.parent;
            continue;
        }
        curNode.children.push(line);
    }
    if (curNode !== root) {
        throw new Error('Expected auto-edit end tag, but reached end of document.');
    }
    return root;
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
    node.children.forEach(child => chunks.push(child instanceof TreeNode ? renderTree(child) : child));
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

(async () => {
    console.log(`auto-edit.js -> Processing ${inFile}...`);
    try {
        const root = await buildTreeFromInFile();
        const renderedAlf = renderTree(root);
        fs.writeFileSync(outFile, renderedAlf);
    } catch (e) {
        console.error(`auto-edit.js -> Error: ${e.message}`);
        process.exit(1);
    }
})();
