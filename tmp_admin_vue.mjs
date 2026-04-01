import fs from 'fs';
let code = fs.readFileSync('/Users/oxo/work/dariakulchikhina/app/layouts/admin.vue', 'utf8');

code = code.replace(/\.admin-search-btn \{[\s\S]*?border-radius:\s*0;/g, match => match.replace('border-radius: 0;', 'border-radius: var(--btn-radius, 0);'));
code = code.replace(/\.admin-theme-btn \{[\s\S]*?border-radius:\s*0;/g, match => match.replace('border-radius: 0;', 'border-radius: var(--btn-radius, 0);'));
code = code.replace(/\.admin-notif-btn\s*\{[\s\S]*?border-radius:\s*0;/g, match => match.replace('border-radius: 0;', 'border-radius: var(--btn-radius, 0);'));

code = code.replace(/\.admin-sidebar-menu-btn \{([\s\S]*?)\}/, (match, p1) => {
    if (!p1.includes('border-radius')) {
        return `.admin-sidebar-menu-btn {${p1}  border-radius: var(--btn-radius, 0);\n}`;
    }
    return match;
});

code = code.replace(/\.adm-sidebar-toggle \{([\s\S]*?)\}/, (match, p1) => {
    if (!p1.includes('border-radius')) {
        return `.adm-sidebar-toggle {${p1}  border-radius: var(--btn-radius, 0);\n}`;
    }
    return match;
});

fs.writeFileSync('/Users/oxo/work/dariakulchikhina/app/layouts/admin.vue', code);
console.log("Patched admin.vue!");