const fs = require('fs');
const path = 'app/composables/useDesignSystem.ts';
let content = fs.readFileSync(path, 'utf8');
const oldLogic = `    // Derive dropdown bg from current page bg: opaque surface clearly visible above page
    const isDark = el.classList.contains('dark')
    if (isDark) {
      el.style.setProperty('--dropdown-bg', 'rgba(18, 21, 30, 0.98)')
      el.style.setProperty('--dropdown-border', 'rgba(255,255,255,0.12)')
      el.style.setProperty('--dropdown-shadow', '0 4px 28px rgba(0,0,0,0.55), 0 1px 6px rgba(0,0,0,0.30)')
    } else {
      el.style.setProperty('--dropdown-bg', 'rgba(255, 255, 255, 0.97)')
      el.style.setProperty('--dropdown-border', 'rgba(0,0,0,0.10)')
      el.style.setProperty('--dropdown-shadow', '0 4px 24px rgba(0,0,0,0.13), 0 1px 4px rgba(0,0,0,0.07)')
    }`;
const newLogic = `    // Derive dropdown bg from current page bg: opaque surface clearly visible above page
    const isDark = el.classList.contains('dark')
    // Auto-calculate alpha based on how much blur is applied: high blur = low alpha (liquid glass effect)
    const ddAlpha = t.dropdownBlur > 16 ? Math.max(0.2, 1 - (t.dropdownBlur / 40)) : (isDark ? 0.98 : 0.97)
    
    if (isDark) {
      el.style.setProperty('--dropdown-bg', \`rgba(30, 30, 34, ${ddAlpha})\`)
      el.style.setProperty('--dropdown-border', 'rgba(255,255,255,0.12)')
      el.style.setProperty('--dropdown-shadow', '0 4px 28px rgba(0,0,0,0.55), 0 1px 6px rgba(0,0,0,0.30), inset 0 1px 1px rgba(255, 255, 255, 0.1)')
    } else {
      el.style.setProperty('--dropdown-bg', \`rgba(255, 255, 255, ${ddAlpha})\`)
      el.style.setProperty('--dropdown-border', 'rgba(0,0,0,0.10)')
      el.style.setProperty('--dropdown-shadow', '0 4px 24px rgba(0,0,0,0.13), 0 1px 4px rgba(0,0,0,0.07), inset 0 1px 1px rgba(255, 255, 255, 0.6)')
    }`;
content = content.replace(oldLogic, newLogic);
fs.writeFileSync(path, content, 'utf8');
console.log('Fixed dropdown transparency in JS');
