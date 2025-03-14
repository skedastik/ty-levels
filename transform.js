// node transform.py src_alf

const { automatable } = require('node-ty-levels');
const fs = require('fs');

if (process.argv.length < 3) {
    console.error('Usage: node transform.js src_file.alf')
    process.exit(1);
}

const inFile = process.argv[2];

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

const renderTree = node => {
    const chunks = [];
    node.children.forEach(child => chunks.push(child instanceof TreeNode ? renderTree(child) : child));
    let mergedChunk = chunks.join('\n');
    if (node.edits) {
        node.edits.forEach(edit => {
            if (!automatable[edit]) {
                throw new Error(`Encountered unsupported edit command "${edit}".`);
            }
            mergedChunk = automatable[edit](mergedChunk);
        });
    }
    return mergedChunk;
};

(async () => {
    const root = await buildTreeFromInFile();
    const renderedAlf = renderTree(root);
    console.log(renderedAlf);
})();
