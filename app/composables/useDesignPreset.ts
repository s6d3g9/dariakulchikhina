export interface DesignPreset {
  id: string
  name: string
  swatch: string      // colour shown in the picker dot
  pageBg: string
  surface: string     // --glass-bg
  border: string      // --glass-border
  shadow: string      // --glass-shadow
}

export const DESIGN_PRESETS: DesignPreset[] = [
  {
    id: 'chalk',
    name: 'Chalk',
    swatch: '#f5f5f4',
    pageBg: '#f0efed',
    surface: 'rgba(255,255,255,0.52)',
    border: 'rgba(0,0,0,0.07)',
    shadow: '0 8px 24px rgba(0,0,0,0.06)',
  },
  {
    id: 'linen',
    name: 'Linen',
    swatch: '#f5ede0',
    pageBg: '#ede6da',
    surface: 'rgba(252,248,242,0.60)',
    border: 'rgba(110,85,55,0.11)',
    shadow: '0 8px 24px rgba(80,55,30,0.08)',
  },
  {
    id: 'mist',
    name: 'Mist',
    swatch: '#eaeff5',
    pageBg: '#e3eaf3',
    surface: 'rgba(238,244,252,0.58)',
    border: 'rgba(50,75,115,0.09)',
    shadow: '0 8px 24px rgba(30,50,90,0.07)',
  },
  {
    id: 'sand',
    name: 'Sand',
    swatch: '#f0e8d8',
    pageBg: '#e9e0cf',
    surface: 'rgba(248,242,232,0.58)',
    border: 'rgba(100,80,40,0.10)',
    shadow: '0 8px 24px rgba(70,50,20,0.08)',
  },
  {
    id: 'sage',
    name: 'Sage',
    swatch: '#e8ede8',
    pageBg: '#e0e7e0',
    surface: 'rgba(238,245,238,0.54)',
    border: 'rgba(50,85,50,0.09)',
    shadow: '0 8px 24px rgba(30,60,30,0.07)',
  },
]

const LS_KEY = 'design-preset'

export function useDesignPreset() {
  const presetId = useState<string>('designPreset', () => 'chalk')

  function applyPreset(id: string) {
    const preset = DESIGN_PRESETS.find(p => p.id === id)
    if (!preset) return
    presetId.value = id
    if (!import.meta.client) return
    localStorage.setItem(LS_KEY, id)
    const r = document.documentElement.style
    r.setProperty('--glass-page-bg', preset.pageBg)
    r.setProperty('--glass-bg',      preset.surface)
    r.setProperty('--glass-border',  preset.border)
    r.setProperty('--glass-shadow',  preset.shadow)
    // keep body bg in sync
    document.documentElement.style.setProperty('background', preset.pageBg)
  }

  function initPreset() {
    if (!import.meta.client) return
    const saved = localStorage.getItem(LS_KEY) || 'chalk'
    applyPreset(saved)
    presetId.value = saved
  }

  return { presetId, applyPreset, initPreset, DESIGN_PRESETS }
}
