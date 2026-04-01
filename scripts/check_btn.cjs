const fs = require('fs');
const glob = require('path');

const dirs = [
    '/Users/oxo/work/dariakulchikhina/app/components',
    '/Users/oxo/work/dariakulchikhina/app/pages'
];

let total = 0;
function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
        const p = dir + '/' + f;
        if (fs.statSync(p).isDirectory()) {
            walk(p);
        } else if (p.endsWith('.vue')) {
            const txt = fs.readFileSync(p, 'utf8');
            const matches = txt.match(/a-btn-(save|sm|danger)/g);
            if (matches) {
                total += matches.length;
                console.log(p.replace('/Users/oxo/work/dariakulchikhina', ''), matches.length);
            }
        }
    }
}
dirs.forEach(walk);
console.log('Total matches:', total);
