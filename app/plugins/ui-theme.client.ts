// Applies saved UI theme + design tokens from localStorage before first paint to avoid flash
export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  // Theme palette
  const saved = localStorage.getItem('ui-theme') || 'cloud'
  document.documentElement.setAttribute('data-theme', saved)

  // Design system tokens (v3 — full token surface)
  try {
    const raw = localStorage.getItem('design-tokens')
    if (raw) {
      const t = JSON.parse(raw)
      const el = document.documentElement

      const BTN_SIZE_MAP: Record<string, { py: number; px: number; fontSize: number }> = {
        xs: { py: 4, px: 10, fontSize: 0.68 },
        sm: { py: 6, px: 14, fontSize: 0.74 },
        md: { py: 9, px: 22, fontSize: 0.80 },
        lg: { py: 12, px: 28, fontSize: 0.88 },
      }
      const sz = BTN_SIZE_MAP[t.btnSize] || BTN_SIZE_MAP.md

      // Buttons
      el.style.setProperty('--btn-radius', `${t.btnRadius ?? 3}px`)
      el.style.setProperty('--btn-py', `${sz.py}px`)
      el.style.setProperty('--btn-px', `${sz.px}px`)
      el.style.setProperty('--btn-font-size', `${sz.fontSize}rem`)
      el.style.setProperty('--btn-transform', t.btnTransform ?? 'none')
      el.style.setProperty('--btn-tracking', `${t.letterSpacing ?? 0.03}em`)
      if (t.btnWeight) el.style.setProperty('--btn-weight', String(t.btnWeight))

      if (t.btnStyle) {
        switch (t.btnStyle) {
          case 'filled':
            el.style.setProperty('--btn-bg', 'var(--btn-bg-base, rgba(0,0,0,0.07))')
            el.style.setProperty('--btn-border', 'var(--btn-border-base, rgba(0,0,0,0.14))')
            break
          case 'outline':
            el.style.setProperty('--btn-bg', 'transparent')
            el.style.setProperty('--btn-border', 'var(--btn-border-base, rgba(0,0,0,0.25))')
            break
          case 'ghost':
            el.style.setProperty('--btn-bg', 'transparent')
            el.style.setProperty('--btn-border', 'transparent')
            break
          case 'soft':
            el.style.setProperty('--btn-bg', 'var(--btn-bg-base, rgba(0,0,0,0.04))')
            el.style.setProperty('--btn-border', 'transparent')
            break
        }
      }

      // Typography
      if (t.fontFamily) el.style.setProperty('--ds-font-family', t.fontFamily)
      if (t.fontSize) el.style.setProperty('--ds-font-size', `${t.fontSize}rem`)
      if (t.fontWeight) el.style.setProperty('--ds-font-weight', String(t.fontWeight))
      if (t.headingWeight) el.style.setProperty('--ds-heading-weight', String(t.headingWeight))
      if (t.letterSpacing != null) el.style.setProperty('--ds-letter-spacing', `${t.letterSpacing}em`)
      if (t.lineHeight) el.style.setProperty('--ds-line-height', String(t.lineHeight))
      if (t.paragraphSpacing != null) el.style.setProperty('--ds-paragraph-spacing', `${t.paragraphSpacing}rem`)

      // Type scale
      if (t.typeScale) {
        const r = t.typeScale
        const fs = t.fontSize || 1
        el.style.setProperty('--ds-type-scale', String(r))
        el.style.setProperty('--ds-text-xs', `${(fs / r / r).toFixed(3)}rem`)
        el.style.setProperty('--ds-text-sm', `${(fs / r).toFixed(3)}rem`)
        el.style.setProperty('--ds-text-base', `${fs}rem`)
        el.style.setProperty('--ds-text-lg', `${(fs * r).toFixed(3)}rem`)
        el.style.setProperty('--ds-text-xl', `${(fs * r * r).toFixed(3)}rem`)
        el.style.setProperty('--ds-text-2xl', `${(fs * r * r * r).toFixed(3)}rem`)
        el.style.setProperty('--ds-text-3xl', `${(fs * r * r * r * r).toFixed(3)}rem`)
      }

      // Semantic colors
      if (t.accentHue != null) {
        el.style.setProperty('--ds-accent', `hsl(${t.accentHue}, ${t.accentSaturation ?? 14}%, ${t.accentLightness ?? 50}%)`)
        el.style.setProperty('--ds-accent-hue', String(t.accentHue))
        el.style.setProperty('--ds-accent-light', `hsl(${t.accentHue}, ${t.accentSaturation ?? 14}%, ${Math.min(95, (t.accentLightness ?? 50) + 35)}%)`)
        el.style.setProperty('--ds-accent-dark', `hsl(${t.accentHue}, ${t.accentSaturation ?? 14}%, ${Math.max(15, (t.accentLightness ?? 50) - 20)}%)`)
      }
      if (t.successHue != null) el.style.setProperty('--ds-success', `hsl(${t.successHue}, ${t.successSaturation ?? 71}%, 45%)`)
      if (t.errorHue != null) el.style.setProperty('--ds-error', `hsl(${t.errorHue}, ${t.errorSaturation ?? 72}%, 50%)`)
      if (t.warningHue != null) el.style.setProperty('--ds-warning', `hsl(${t.warningHue}, ${t.warningSaturation ?? 92}%, 50%)`)

      // Glass
      if (t.glassBlur != null) el.style.setProperty('--glass-blur', `${t.glassBlur}px`)
      if (t.glassOpacity != null) el.style.setProperty('--glass-bg-alpha', String(t.glassOpacity))
      if (t.glassBorderOpacity != null) el.style.setProperty('--glass-border-alpha', String(t.glassBorderOpacity))
      if (t.glassSaturation != null) el.style.setProperty('--glass-saturation', `${t.glassSaturation}%`)

      // Shadows
      if (t.shadowOffsetY != null) {
        el.style.setProperty('--ds-shadow', `0 ${t.shadowOffsetY}px ${t.shadowBlurRadius ?? 24}px ${t.shadowSpread ?? 0}px rgba(0,0,0,${t.shadowOpacity ?? 0.06})`)
        el.style.setProperty('--ds-shadow-y', `${t.shadowOffsetY}px`)
        el.style.setProperty('--ds-shadow-blur', `${t.shadowBlurRadius ?? 24}px`)
        el.style.setProperty('--ds-shadow-spread', `${t.shadowSpread ?? 0}px`)
        el.style.setProperty('--ds-shadow-alpha', String(t.shadowOpacity ?? 0.06))
      }

      // Spacing
      if (t.spacingBase != null) el.style.setProperty('--ds-spacing-unit', `${t.spacingBase}px`)
      if (t.spacingScale != null) el.style.setProperty('--ds-spacing', String(t.spacingScale))

      // Radii
      if (t.cardRadius != null) el.style.setProperty('--card-radius', `${t.cardRadius}px`)
      if (t.inputRadius != null) el.style.setProperty('--input-radius', `${t.inputRadius}px`)
      if (t.chipRadius != null) el.style.setProperty('--chip-radius', `${t.chipRadius}px`)
      if (t.modalRadius != null) el.style.setProperty('--modal-radius', `${t.modalRadius}px`)

      // Animation
      if (t.animDuration != null) {
        el.style.setProperty('--ds-anim-duration', `${t.animDuration}ms`)
        el.style.setProperty('--ds-anim-easing', t.animEasing || 'ease')
        el.style.setProperty('--ds-transition', `${t.animDuration}ms ${t.animEasing || 'ease'}`)
      }

      // Grid
      if (t.containerWidth != null) el.style.setProperty('--ds-container-width', `${t.containerWidth}px`)
      if (t.sidebarWidth != null) el.style.setProperty('--ds-sidebar-width', `${t.sidebarWidth}px`)
      if (t.gridGap != null) el.style.setProperty('--ds-grid-gap', `${t.gridGap}px`)
      if (t.gridColumns != null) el.style.setProperty('--ds-grid-columns', String(t.gridColumns))

      // Borders
      if (t.borderWidth != null) el.style.setProperty('--ds-border-width', `${t.borderWidth}px`)
      if (t.borderStyle) el.style.setProperty('--ds-border-style', t.borderStyle)

      // Dark mode
      if (t.darkElevation != null) el.style.setProperty('--ds-dark-elevation', String(t.darkElevation))
      if (t.darkSaturation != null) el.style.setProperty('--ds-dark-saturation', `${t.darkSaturation}%`)
    }
  } catch { /* ignore corrupt data */ }
})
