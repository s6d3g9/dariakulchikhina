const fs = require('fs');
let code = fs.readFileSync('/Users/oxo/work/dariakulchikhina/app/components/UIDesignPanel.vue', 'utf-8');

const insertPoint = `const { themeId, applyThemeWithTokens, UI_THEMES } = useUITheme()`;

if (!code.includes('watch(')) {
  code = code.replace(/import {([^}]+)} from 'vue'/, 'import { watch, $1 } from \'vue\'');
}

const watcher = `const { themeId, applyThemeWithTokens, UI_THEMES } = useUITheme()

watch(UI_THEMES, (themes) => {
  if (themes.length && !themes.find(t => t.id === themeId.value)) {
    themeId.value = themes[0].id
    applyThemeWithTokens(themeId.value)
  }
}, { immediate: true })`;

code = code.replace(insertPoint, watcher);
fs.writeFileSync('/Users/oxo/work/dariakulchikhina/app/components/UIDesignPanel.vue', code);
console.log('UIDesignPanel patched');
