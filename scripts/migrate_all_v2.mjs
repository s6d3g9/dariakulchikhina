import fs from 'fs';
import path from 'path';

const dirsToScan = [
    '/Users/oxo/work/dariakulchikhina/app/components',
    '/Users/oxo/work/dariakulchikhina/app/pages'
];

function findVueFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (filePath.includes('GlassButton.vue')) continue; // skip the primitive itself
        
        if (fs.statSync(filePath).isDirectory()) {
            findVueFiles(filePath, fileList);
        } else if (filePath.endsWith('.vue')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

function fixHtml(content) {
    // A robust regex to find <button ... class="..." ...>...</button>
    // Since Vue class attributes can be tricky, let's just find ANY <button> that contains 'a-btn-' and systematically replace it.
    
    // We can match the entire button: /<button[\s\S]*?<\/button>/g
    return content.replace(/<button([\s\S]*?)<\/button>/g, (fullMatch, body) => {
        if (!fullMatch.includes('a-btn-save') && !fullMatch.includes('a-btn-sm') && !fullMatch.includes('a-btn-danger')) {
            return fullMatch;
        }

        // Inside the fullMatch, replace <button -> <GlassButton, </button> -> </GlassButton>
        let res = fullMatch.replace(/^<button/, '<GlassButton').replace(/<\/button>$/, '</GlassButton>');
        
        let variant = 'primary';
        let density = 'default';
        if (res.includes('a-btn-sm')) {
            variant = 'secondary';
            density = 'compact';
            res = res.replace(/\ba-btn-sm\b/g, '');
        }
        if (res.includes('a-btn-danger')) {
            variant = 'danger';
            res = res.replace(/\ba-btn-danger\b/g, '');
        }
        if (res.includes('a-btn-save')) {
            variant = 'primary';
            res = res.replace(/\ba-btn-save\b/g, '');
        }
        
        // Add variant and density right after <GlassButton
        res = res.replace('<GlassButton', `<GlassButton variant="${variant}" density="${density}"`);
        
        return res;
    });
}

function fixInputs(content) {
    return content.replace(/<input([\s\S]*?)>/g, (fullMatch, body) => {
        if (!fullMatch.includes('glass-input')) return fullMatch;
        
        let res = fullMatch.replace(/^<input/, '<GlassInput');
        if (!res.endsWith('/>')) {
             res = res.replace(/>$/, ' />');
        }
        res = res.replace(/\bglass-input\b/g, '');
        return res;
    });
}

let changedCount = 0;
for (const dir of dirsToScan) {
    if (fs.existsSync(dir)) {
        const vueFiles = findVueFiles(dir);
        for (const file of vueFiles) {
            let content = fs.readFileSync(file, 'utf8');
            let newContent = fixHtml(content);
            newContent = fixInputs(newContent);
            
            // Clean up empty class left behind
            newContent = newContent.replace(/class="\s*"/g, '');
            newContent = newContent.replace(/class='\s*'/g, '');

            if (content !== newContent) {
                fs.writeFileSync(file, newContent, 'utf-8');
                changedCount++;
                console.log('Migrated', file);
            }
        }
    }
}
console.log('Success, migrated files:', changedCount);
