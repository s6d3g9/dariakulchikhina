import fs from 'fs';

const files = [
    '/Users/oxo/work/dariakulchikhina/app/layouts/admin.vue',
    '/Users/oxo/work/dariakulchikhina/app/components/AdminProjectControl.vue'
];

function fixHtml(content) {
    // 1. replace primary buttons
    content = content.replace(/<button([^>]*?)class="([^"]*)\ba-btn-save\b([^"]*)"([^>]*?)>([\s\S]*?)<\/button>/gm, (match, p1, c1, c2, p2, inner) => {
        return `<GlassButton variant="primary"${p1}class="${c1}${c2}"${p2}>${inner}</GlassButton>`;
    });

    // 2. replace secondary/sm buttons
    content = content.replace(/<button([^>]*?)class="([^"]*)\ba-btn-sm\b([^"]*)"([^>]*?)>([\s\S]*?)<\/button>/gm, (match, p1, c1, c2, p2, inner) => {
        let variant = 'secondary';
        if (c1.includes('a-btn-danger') || c2.includes('a-btn-danger')) {
            variant = 'danger';
            c1 = c1.replace(/\ba-btn-danger\b/g, '');
            c2 = c2.replace(/\ba-btn-danger\b/g, '');
        }
        return `<GlassButton variant="${variant}" density="compact"${p1}class="${c1}${c2}"${p2}>${inner}</GlassButton>`;
    });
    
    // 3. replace danger buttons
    content = content.replace(/<button([^>]*?)class="([^"]*)\ba-btn-danger\b([^"]*)"([^>]*?)>([\s\S]*?)<\/button>/gm, (match, p1, c1, c2, p2, inner) => {
        return `<GlassButton variant="danger"${p1}class="${c1}${c2}"${p2}>${inner}</GlassButton>`;
    });
    
    // 4. replace normal unclassed inputs with glass-input (well, we only mapped inputs with class="glass-input")
    content = content.replace(/<input([^>]*?)class="([^"]*)\bglass-input\b([^"]*)"([^>]*?)>/gm, (match, p1, c1, c2, p2) => {
        let fullTag = `<GlassInput${p1}class="${c1}${c2}"${p2}>`;
        if (fullTag.endsWith('/>')) return fullTag;
        return fullTag.replace(/>$/, ' />');
    });

    // Clean up empty class
    content = content.replace(/class="\s*"/g, '');

    return content;
}

for (const file of files) {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        let newContent = fixHtml(content);
        fs.writeFileSync(file, newContent, 'utf-8');
        console.log('Migrated', file);
    }
}
