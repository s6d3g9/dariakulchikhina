import fs from 'fs';
import path from 'path';

function findVueFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            findVueFiles(filePath, fileList);
        } else if (filePath.endsWith('.vue')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

function fixHtml(content) {
    // 1. primary buttons
    content = content.replace(/<button([^>]*?)class="([^"]*)\ba-btn-save\b([^"]*)"([^>]*?)>([\s\S]*?)<\/button>/gm, (match, p1, c1, c2, p2, inner) => {
        return `<GlassButton variant="primary"${p1}class="${c1}${c2}"${p2}>${inner}</GlassButton>`;
    });

    // 2. secondary/sm buttons
    content = content.replace(/<button([^>]*?)class="([^"]*)\ba-btn-sm\b([^"]*)"([^>]*?)>([\s\S]*?)<\/button>/gm, (match, p1, c1, c2, p2, inner) => {
        let variant = 'secondary';
        if (c1.includes('a-btn-danger') || c2.includes('a-btn-danger')) {
            variant = 'danger';
            c1 = c1.replace(/\ba-btn-danger\b/g, '');
            c2 = c2.replace(/\ba-btn-danger\b/g, '');
        }
        return `<GlassButton variant="${variant}" density="compact"${p1}class="${c1}${c2}"${p2}>${inner}</GlassButton>`;
    });
    
    // 3. danger buttons
    content = content.replace(/<button([^>]*?)class="([^"]*)\ba-btn-danger\b([^"]*)"([^>]*?)>([\s\S]*?)<\/button>/gm, (match, p1, c1, c2, p2, inner) => {
        return `<GlassButton variant="danger"${p1}class="${c1}${c2}"${p2}>${inner}</GlassButton>`;
    });
    
    // 4. inputs
    content = content.replace(/<input([^>]*?)class="([^"]*)\bglass-input\b([^"]*)"([^>]*?)>/gm, (match, p1, c1, c2, p2) => {
        let fullTag = `<GlassInput${p1}class="${c1}${c2}"${p2}>`;
        if (fullTag.endsWith('/>')) return fullTag;
        return fullTag.replace(/>$/, ' />');
    });
    
    // 5. glass-card to GlassSurface wrapper (naive tag wrapper replacement)
    // ONLY replace <div class="... glass-card ..."> where it forms a strict block without nested glass-cards cleanly?
    // It's risky. Let's do a basic replacing ONLY if it has an empty content or simple content, actually let's skip glass-card wrapper replacement for now in mass, let's just do buttons/inputs.

    // Clean up empty class
    content = content.replace(/class="\s*"/g, '');
    
    return content;
}

const dirsToScan = [
    '/Users/oxo/work/dariakulchikhina/app/components',
    '/Users/oxo/work/dariakulchikhina/app/pages'
];

let changedCount = 0;
for (const dir of dirsToScan) {
    if (fs.existsSync(dir)) {
        const vueFiles = findVueFiles(dir);
        for (const file of vueFiles) {
            let content = fs.readFileSync(file, 'utf8');
            let newContent = fixHtml(content);
            if (content !== newContent) {
                fs.writeFileSync(file, newContent, 'utf-8');
                changedCount++;
                console.log('Migrated', file);
            }
        }
    }
}
console.log('Total files changed:', changedCount);