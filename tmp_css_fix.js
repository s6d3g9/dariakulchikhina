const fs = require('fs');
let c = fs.readFileSync('app/assets/css/main.css', 'utf8');

c = c.replace(/backdrop-filter:\s*none\s*!important;/gi, '');
c = c.replace(/-webkit-backdrop-filter:\s*none\s*!important;/gi, '');

c = c.replace(/\[data-dark-surface\] \.glass-card,\n\[data-dark-surface\] \.glass-surface \{[\s\S]*?\}/g, 
  '[data-dark-surface] .glass-card,\n[data-dark-surface] .glass-surface {\n  background: color-mix(in srgb, var(--color-surface, var(--glass-bg)) calc(var(--glass-opacity, 0.4) * 100%), transparent) !important;\n  border: 1px solid color-mix(in srgb, var(--glass-text) calc(var(--glass-border-opacity, 0.2) * 100%), transparent) !important;\n  box-shadow: none !important;\n}');

c = c.replace(/\[data-dark-surface\] \.pj-modal \{[\s\S]*?\}/g, 
  '[data-dark-surface] .pj-modal {\n  background: color-mix(in srgb, var(--color-surface, var(--glass-bg)) calc(var(--glass-opacity, 0.4) * 100%), transparent) !important;\n  border-color: color-mix(in srgb, var(--glass-text) 8%, transparent) !important;\n}');

c = c.replace(/\[data-dark-surface\] \.u-modal,\n\[data-dark-surface\] \.cab-modal \{[\s\S]*?\}/g, 
  '[data-dark-surface] .u-modal,\n[data-dark-surface] .cab-modal {\n  background: color-mix(in srgb, var(--color-surface, var(--glass-bg)) calc(var(--glass-opacity, 0.4) * 100%), transparent) !important;\n  border: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent) !important;\n  box-shadow: 0 24px 80px rgba(0,0,0,0.6) !important;\n  color: var(--glass-text, #e0e0e0);\n}');

fs.writeFileSync('app/assets/css/main.css', c);