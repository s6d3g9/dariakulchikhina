const fs = require('fs');
let code = fs.readFileSync('/Users/oxo/work/dariakulchikhina/app/composables/useUITheme.ts', 'utf-8');

// Replace UI_THEMES with GLASS_THEMES
code = code.replace('export const UI_THEMES: UITheme[] = [', 'export const GLASS_THEMES: UITheme[] = [');

const newThemes = `
export const M3_THEMES: UITheme[] = [
  {
    id: 'm3-ocean', label: 'Океан', swatch: '#d3e3fd', swatchDark: '#384b6b', btnPreview: 'M3 Ocean',
    vars: {
      '--sys-color-primary': '#0B57D0',
      '--sys-color-surface': '#F8F9FA'
    }, 
    darkVars: {
      '--sys-color-primary': '#A8C7FA',
      '--sys-color-surface': '#1F1F1F'
    }, 
    tokens: {}
  }
];

export const BRUTAL_THEMES: UITheme[] = [
  {
    id: 'brutal-mono', label: 'Моно', swatch: '#ffffff', swatchDark: '#000000', btnPreview: 'Brutal',
    vars: {
      '--brutal-bg': '#FFFFFF',
      '--brutal-text': '#000000',
    }, 
    darkVars: {
      '--brutal-bg': '#000000',
      '--brutal-text': '#FFFFFF',
    }, 
    tokens: {}
  }
];

export const UI_THEMES = [...GLASS_THEMES, ...M3_THEMES, ...BRUTAL_THEMES];

export const UI_THEMES_MAP: Record<string, UITheme[]> = {
  'concept-m3': M3_THEMES,
  'concept-brutal': BRUTAL_THEMES,
  'concept-glass': GLASS_THEMES,
  'concept-silence': GLASS_THEMES
};
`;

code = code.replace(/\]\n*\s*const LS_KEY/, ']\n' + newThemes + '\nconst LS_KEY');

const oldHook = `export function useUITheme() {
  const themeId = useState<string>('uiTheme', () => 'cloud')`;

const newHook = `import { computed } from '#imports'

export function useUITheme() {
  const { activeConceptSlug } = useDesignSystem()
  const themeId = useState<string>('uiTheme', () => 'cloud')

  const availableThemes = computed(() => {
    return UI_THEMES_MAP[activeConceptSlug?.value || 'concept-glass'] || GLASS_THEMES
  })`;

code = code.replace(oldHook, newHook);

// Replace UI_THEMES.find
code = code.replace(/const theme = UI_THEMES\.find\(t => t\.id === \(id \?\? themeId\.value\)\)/, 'const theme = availableThemes.value.find(t => t.id === (id ?? themeId.value)) || availableThemes.value[0]');
code = code.replace(/const theme = UI_THEMES\.find\(t => t\.id === id\)/g, 'const theme = availableThemes.value.find(t => t.id === id) || availableThemes.value[0]');

code = code.replace('return { themeId, applyTheme, applyThemeWithTokens, refreshThemeVars, initTheme, UI_THEMES }', 'return { themeId, applyTheme, applyThemeWithTokens, refreshThemeVars, initTheme, UI_THEMES, availableThemes }');

fs.writeFileSync('/Users/oxo/work/dariakulchikhina/app/composables/useUITheme.ts', code);
console.log('Done refactoring useUITheme');