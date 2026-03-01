export interface UITheme {
  id: string
  label: string
  swatch: string      // page bg colour shown in picker
  btnPreview: string  // small sample of btn style description
}

export const UI_THEMES: UITheme[] = [
  { id: 'cloud',     label: 'Cloud',     swatch: '#f4f4f2', btnPreview: 'серый' },
  { id: 'linen',     label: 'Linen',     swatch: '#ede8de', btnPreview: 'кремовый' },
  { id: 'stone',     label: 'Stone',     swatch: '#e8e5e0', btnPreview: 'GREIGE' },
  { id: 'fog',       label: 'Fog',       swatch: '#eeeef0', btnPreview: 'rounded' },
  { id: 'parchment', label: 'Parchment', swatch: '#f2ece1', btnPreview: 'OUTLINE' },
]

const LS_KEY = 'ui-theme'

export function useUITheme() {
  const themeId = useState<string>('uiTheme', () => 'cloud')

  function applyTheme(id: string) {
    themeId.value = id
    if (!import.meta.client) return
    document.documentElement.setAttribute('data-theme', id)
    localStorage.setItem(LS_KEY, id)
  }

  function initTheme() {
    if (!import.meta.client) return
    const saved = localStorage.getItem(LS_KEY) || 'cloud'
    applyTheme(saved)
  }

  return { themeId, applyTheme, initTheme, UI_THEMES }
}
