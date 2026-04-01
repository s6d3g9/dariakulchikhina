const fs = require('fs');
let s = fs.readFileSync('app/assets/css/main.css', 'utf8');
s = s.replace('html[data-concept="glass"] .nav-search {', '/* ── Force rounded elements in glass sidebar ── */
html[data-concept="glass"] .adm-sidebar .nav-item,
html[data-concept="glass"] .adm-sidebar .admin-search-btn,
html[data-concept="glass"] .adm-sidebar .admin-search-kbd,
html[data-concept="glass"] .adm-sidebar .admin-theme-btn,
html[data-concept="glass"] .adm-sidebar .admin-notif-btn,
html[data-concept="glass"] .adm-sidebar .admin-notif-item,
html[data-concept="glass"] .adm-sidebar .admin-notif-dropdown {
  border-radius: var(--chip-radius, 999px) \!important;
}

html[data-concept="glass"] .admin-sidebar-menu-btn {
  border-radius: var(--chip-radius, 999px) \!important;
}

html[data-concept="glass"] .nav-search {');
fs.writeFileSync('app/assets/css/main.css', s);
