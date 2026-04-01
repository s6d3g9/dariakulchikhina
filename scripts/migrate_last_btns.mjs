import fs from 'fs';
import glob from 'path';

const files = [
    '/Users/oxo/work/dariakulchikhina/app/components/AdminClientProfile.vue',
    '/Users/oxo/work/dariakulchikhina/app/components/AdminDesignerCabinet.vue',
    '/Users/oxo/work/dariakulchikhina/app/components/AdminMaterials.vue',
    '/Users/oxo/work/dariakulchikhina/app/components/AdminProjectControl.vue',
    '/Users/oxo/work/dariakulchikhina/app/components/AdminTZ.vue',
    '/Users/oxo/work/dariakulchikhina/app/pages/admin/clients/index.vue',
    '/Users/oxo/work/dariakulchikhina/app/pages/admin/projects/[slug].vue',
    '/Users/oxo/work/dariakulchikhina/app/pages/client/[slug]/index.vue',
    '/Users/oxo/work/dariakulchikhina/app/pages/register.vue'
];

for (const file of files) {
    if (!fs.existsSync(file)) continue;
    let content = fs.readFileSync(file, 'utf8');

    // If it's still a <button>, convert to <GlassButton>
    content = content.replace(/<button([^>]+)class="([^"]*)(a-btn-save|a-btn-sm|a-btn-danger)([^"]*)"([^>]*)>([\s\S]*?)<\/button>/gm, (m, p1, pre, cl, post, p2, inner) => {
        let variant = 'primary';
        let density = 'default';
        if (cl === 'a-btn-sm' || pre.includes('a-btn-sm') || post.includes('a-btn-sm')) {
            variant = 'secondary';
            density = 'compact';
        }
        if (cl === 'a-btn-danger' || pre.includes('a-btn-danger') || post.includes('a-btn-danger')) {
            variant = 'danger';
        }
        
        let newClasses = (pre + post).replace(/\ba-btn-(save|sm|danger)\b/g, '').replace(/\s+/g, ' ').trim();
        let classAttr = newClasses ? ` class="${newClasses}"` : '';
        
        return `<GlassButton variant="${variant}" density="${density}"${p1}${classAttr}${p2}>${inner}</GlassButton>`;
    });

    // If it's already a GlassButton but has residual classes, clean them up
    content = content.replace(/<GlassButton([^>]+)class="([^"]*)(a-btn-save|a-btn-sm|a-btn-danger)([^"]*)"([^>]*)>/gm, (m, p1, pre, cl, post, p2) => {
        let newClasses = (pre + post).replace(/\ba-btn-(save|sm|danger)\b/g, '').replace(/\s+/g, ' ').trim();
        let classAttr = newClasses ? ` class="${newClasses}"` : '';
        return `<GlassButton${p1}${classAttr}${p2}>`;
    });

    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed', file);
}
