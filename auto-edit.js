// node auto-edit.py src_alf dest_alf

const tyl = require('node-ty-levels');
const process = require('process');
const fs = require('fs');
const { performance } = require('perf_hooks');

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

const splitEdits = editListString => {
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
};

const buildTreeFromInFile = async () => {
    const root = new TreeNode();
    let curNode = root;
    const f = await fs.promises.open(inFile);
    for await (const line of f.readLines()) {
        const results = line.match(RGX_AUTO_BEGIN);
        if (results) {
            const edits = splitEdits(results[1]);
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

let tJoiningChunks = 0;
let tEditFunctions = 0;

const renderTree = node => {
    const chunks = [];
    node.children.forEach(child => chunks.push(child instanceof TreeNode ? renderTree(child) : child));
    const t = performance.now();
    let mergedChunk = chunks.join('\n');
    tJoiningChunks += (performance.now() - t);
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
            const t2 = performance.now();
            mergedChunk = editFn(mergedChunk, ...args);
            tEditFunctions += (performance.now() - t2);
        });
    }
    return mergedChunk;
};

const roundTwoDecimals = x => Math.round(x * 100) / 100;

(async () => {
    console.log(`auto-edit.js -> Processing ${inFile}...`);
    try {
        const root = await buildTreeFromInFile();
        
        const t = performance.now();
        let renderedAlf = renderTree(root);
        if (!process.env.NO_SIMPLIFY) {
            renderedAlf = tyl.simplify(renderedAlf);
        }
        console.log(`auto-edit.js -> renderTree ->           Joining chunks: ${roundTwoDecimals(tJoiningChunks)}ms`);

        console.log(`auto-edit.js -> renderTree -> Executing edit functions: ${roundTwoDecimals(tEditFunctions)}ms`);
        console.log(`auto-edit.js -> renderTree ->          mathjs.simplify: ${roundTwoDecimals(tyl.tMathJs.simplifyElapsed)}ms`);
        console.log(`auto-edit.js -> renderTree ->    mathjs.simplify calls: ${roundTwoDecimals(tyl.tMathJs.simplifyInvocations)}`);
        console.log(`auto-edit.js -> renderTree ->       Total time elapsed: ${roundTwoDecimals(performance.now() - t)}ms`);

        fs.writeFileSync(outFile, renderedAlf);
        
        console.log(`auto-edit.js -> Done. Time elapsed: ${roundTwoDecimals(performance.now() - t)}ms`);
    } catch (e) {
        console.error(`auto-edit.js -> Error: ${e.message}`);
        process.exit(1);
    }
})();
