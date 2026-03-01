// Applies saved UI theme + design tokens from localStorage before first paint to avoid flash
export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  // Theme palette
  const saved = localStorage.getItem('ui-theme') || 'cloud'
  document.documentElement.setAttribute('data-theme', saved)

  // Design system tokens
  try {
    const raw = localStorage.getItem('design-tokens')
    if (raw) {
      const tokens = JSON.parse(raw)
      const el = document.documentElement

      const BTN_SIZE_MAP: Record<string, { py: number; px: number; fontSize: number }> = {
        xs: { py: 4, px: 10, fontSize: 0.7 },
        sm: { py: 6, px: 14, fontSize: 0.76 },
        md: { py: 9, px: 22, fontSize: 0.8 },
        lg: { py: 12, px: 28, fontSize: 0.88 },
      }
      const sz = BTN_SIZE_MAP[tokens.btnSize] || BTN_SIZE_MAP.md

      el.style.setProperty('--btn-radius', `${tokens.btnRadius ?? 3}px`)
      el.style.setProperty('--btn-py', `${sz.py}px`)
      el.style.setProperty('--btn-px', `${sz.px}px`)
      el.style.setProperty('--btn-font-size', `${sz.fontSize}rem`)
      el.style.setProperty('--btn-transform', tokens.btnTransform ?? 'none')
      el.style.setProperty('--btn-tracking', `${tokens.letterSpacing ?? 0.03}em`)

      if (tokens.fontFamily) el.style.setProperty('--ds-font-family', tokens.fontFamily)
      if (tokens.fontSize)   el.style.setProperty('--ds-font-size', `${tokens.fontSize}rem`)
      if (tokens.fontWeight) el.style.setProperty('--ds-font-weight', String(tokens.fontWeight))
      if (tokens.letterSpacing != null) el.style.setProperty('--ds-letter-spacing', `${tokens.letterSpacing}em`)
      if (tokens.lineHeight) el.style.setProperty('--ds-line-height', String(tokens.lineHeight))

      if (tokens.glassBlur != null) el.style.setProperty('--glass-blur', `${tokens.glassBlur}px`)
      if (tokens.glassOpacity != null) el.style.setProperty('--glass-bg-alpha', String(tokens.glassOpacity))
      if (tokens.glassBorderOpacity != null) el.style.setProperty('--glass-border-alpha', String(tokens.glassBorderOpacity))
      if (tokens.glassShadowIntensity != null) el.style.setProperty('--glass-shadow-alpha', String(tokens.glassShadowIntensity))
      if (tokens.spacingScale != null) el.style.setProperty('--ds-spacing', String(tokens.spacingScale))
      if (tokens.cardRadius != null) el.style.setProperty('--card-radius', `${tokens.cardRadius}px`)
      if (tokens.inputRadius != null) el.style.setProperty('--input-radius', `${tokens.inputRadius}px`)
    }
  } catch { /* ignore corrupt data */ }
})
