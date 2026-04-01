const fs = require('fs');
const cssPath = '/Users/oxo/work/dariakulchikhina/app/assets/css/main.css';
let css = fs.readFileSync(cssPath, 'utf-8');

const missingSelectors = `
/* Add missing Liquid Glass elements: Tooltips, Modals, Dropdowns */
html[data-concept="glass"] .a-modal,
html[data-concept="glass"] .admin-dropdown-menu,
html[data-concept="glass"] .cab-nav,
html[data-concept="glass"] .glass-chip,
html[data-concept="glass"] .admin-notif-dropdown {
  position: relative;
  background: var(--glass-bg, rgba(255, 255, 255, 0.4)) !important;
  backdrop-filter: blur(40px) saturate(150%) !important;
  -webkit-backdrop-filter: blur(40px) saturate(150%) !important;
  border: none !important;
  box-shadow: 
    inset 0 1px 2px rgba(255,255,255,0.3),
    inset 0 0 0 1px rgba(255,255,255,0.3),
    0 12px 32px rgba(0,0,0,0.05),
    0 1px 2px rgba(0,0,0,0.03) !important;
  overflow: hidden;
  z-index: 100;
}

html.dark[data-concept="glass"] .a-modal,
html.dark[data-concept="glass"] .admin-dropdown-menu,
html.dark[data-concept="glass"] .cab-nav,
html.dark[data-concept="glass"] .glass-chip,
html.dark[data-concept="glass"] .admin-notif-dropdown {
  background: var(--glass-bg, rgba(20, 20, 24, 0.35)) !important;
  box-shadow: 
    inset 0 1px 2px rgba(255,255,255,0.1),
    inset 0 0 0 1px rgba(255,255,255,0.1),
    0 12px 32px rgba(0,0,0,0.5),
    0 1px 3px rgba(0,0,0,0.5) !important;
  border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
}

html[data-concept="glass"] .a-modal::before,
html[data-concept="glass"] .admin-dropdown-menu::before,
html[data-concept="glass"] .cab-nav::before,
html[data-concept="glass"] .glass-chip::before,
html[data-concept="glass"] .admin-notif-dropdown::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%, rgba(255,255,255,0.15) 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
  z-index: -1;
}

html.dark[data-concept="glass"] .a-modal::before,
html.dark[data-concept="glass"] .admin-dropdown-menu::before,
html.dark[data-concept="glass"] .cab-nav::before,
html.dark[data-concept="glass"] .glass-chip::before,
html.dark[data-concept="glass"] .admin-notif-dropdown::before {
  background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%, rgba(255,255,255,0.05) 100%);
}
`;

css += '\n' + missingSelectors;
fs.writeFileSync(cssPath, css);
console.log('Appended missing modal/nav glass treatments.');
