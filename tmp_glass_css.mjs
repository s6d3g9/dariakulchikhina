import fs from 'fs';

let code = fs.readFileSync('/Users/oxo/work/dariakulchikhina/app/assets/css/main.css', 'utf8');

const replacement = `/* ── Sidebar/nav: translucent ──────────────────────────────── */
html[data-concept="glass"] .cab-nav {
  background: var(--glass-bg, rgba(255,255,255,0.15)) !important;
  backdrop-filter: blur(24px) !important;
  -webkit-backdrop-filter: blur(24px) !important;
  border-right: 1px solid color-mix(in srgb, var(--glass-text) 15%, transparent) !important;
}

html[data-concept="glass"] .adm-sidebar {
  background: var(--glass-bg) !important;
  backdrop-filter: blur(var(--glass-blur, 24px)) saturate(var(--glass-saturation, 180%)) !important;
  -webkit-backdrop-filter: blur(var(--glass-blur, 24px)) saturate(var(--glass-saturation, 180%)) !important;
  border-right: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent) !important;
  border-radius: 0 var(--card-radius, 28px) var(--card-radius, 28px) 0 !important;
  box-shadow: var(--glass-shadow) !important;
}

html.dark[data-concept="glass"] .adm-sidebar,
html.dark[data-concept="glass"] .cab-nav {
  border-right: 1px solid color-mix(in srgb, var(--glass-text) 5%, transparent) !important;
}

/* ── Nav items: rounded and fluid ────────────────────────── */
html[data-concept="glass"] .nav-item-glyph,
html[data-concept="glass"] .nav-context-glyph,
html[data-concept="glass"] .adm-sidebar-toggle-glyph {
  border-radius: 999px !important;
}

html[data-concept="glass"] .nav-search {
  border-radius: 999px !important;
}

html[data-concept="glass"] .nav-item,
html[data-concept="glass"] .cab-nav-item,
html[data-concept="glass"] .std-nav-item,
html[data-concept="glass"] .ent-nav-item {
  color: var(--glass-text) !important;
  border-radius: var(--chip-radius, 999px) !important;
}

html[data-concept="glass"] .cab-nav-item:hover,
html[data-concept="glass"] .nav-item:hover,
html[data-concept="glass"] .std-nav-item:hover,
html[data-concept="glass"] .ent-nav-item:hover {
  background: color-mix(in srgb, var(--glass-text) 6%, transparent) !important;
}

html[data-concept="glass"] .ent-nav-item.active,
html[data-concept="glass"] .cab-nav-item.active,
html[data-concept="glass"] .nav-item--active,
html[data-concept="glass"] .std-nav-item.active {
  background: color-mix(in srgb, var(--glass-text) 12%, transparent) !important;
  color: var(--glass-text) !important;
  border: none !important;
  border-bottom: none !important;
  box-shadow: inset 0 1px 1px color-mix(in srgb, var(--glass-text) 15%, transparent);
}`;

if (code.includes('/* ── Sidebar/nav: translucent ──────────────────────────────── */')) {
  code = code.replace(/\/\* ── Sidebar\/nav: translucent ──────────────────────────────── \*\/[\s\S]*?border-bottom: none !important;\n\}/g, replacement);
  fs.writeFileSync('/Users/oxo/work/dariakulchikhina/app/assets/css/main.css', code);
  console.log("Patched main.css");
} else {
  console.log("NOT FOUND in main.css");
}
