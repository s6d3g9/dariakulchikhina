# Phase 0 / Week 2 / Wednesday: Design tokens package

Цель: `@daria/design-tokens` — single source of truth для colors, spacing, typography. Экстракт из v5 studio + расширение для v6.

## Шаг 1: Structure

```
packages/design-tokens/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                    — TypeScript exports
│   ├── tokens.ts                   — TS constants
│   └── generators/
│       ├── css.ts                  — generate CSS variables
│       ├── tailwind.ts             — Tailwind config preset
│       └── react-native.ts         — RN StyleSheet tokens
├── tokens/                          — source tokens в JSON
│   ├── colors/
│   │   ├── light.json
│   │   ├── dark.json
│   │   └── high-contrast.json
│   ├── typography.json
│   ├── spacing.json
│   ├── radii.json
│   ├── shadows.json
│   ├── motion.json
│   ├── z-indices.json
│   └── accessibility.json
└── dist/                            — generated outputs (gitignored)
    ├── tokens.css
    ├── tokens.dark.css
    ├── tokens.rn.json
    └── tailwind-preset.js
```

## Шаг 2: Source tokens (JSON)

`packages/design-tokens/tokens/colors/light.json`:

```json
{
  "neutral": {
    "0": "#ffffff",
    "50": "#fafafa",
    "100": "#f5f5f5",
    "200": "#e5e5e5",
    "300": "#d4d4d4",
    "400": "#a3a3a3",
    "500": "#737373",
    "600": "#525252",
    "700": "#404040",
    "800": "#262626",
    "900": "#171717",
    "1000": "#000000"
  },
  "primary": {
    "50": "#f0f9ff",
    "100": "#e0f2fe",
    "200": "#bae6fd",
    "300": "#7dd3fc",
    "400": "#38bdf8",
    "500": "#0ea5e9",
    "600": "#0284c7",
    "700": "#0369a1",
    "800": "#075985",
    "900": "#0c4a6e"
  },
  "accent": {
    "500": "#8b5cf6"
  },
  "success": {
    "50": "#f0fdf4",
    "500": "#22c55e",
    "700": "#15803d"
  },
  "warning": {
    "50": "#fffbeb",
    "500": "#f59e0b",
    "700": "#b45309"
  },
  "danger": {
    "50": "#fef2f2",
    "500": "#ef4444",
    "700": "#b91c1c"
  },
  "semantic": {
    "bg": {
      "primary": "{neutral.0}",
      "secondary": "{neutral.50}",
      "tertiary": "{neutral.100}"
    },
    "fg": {
      "primary": "{neutral.900}",
      "secondary": "{neutral.700}",
      "tertiary": "{neutral.500}",
      "inverse": "{neutral.0}"
    },
    "border": {
      "default": "{neutral.200}",
      "strong": "{neutral.300}",
      "focus": "{primary.500}"
    },
    "brand": {
      "default": "{primary.500}",
      "strong": "{primary.700}"
    },
    "private": {
      "border": "{neutral.800}",
      "bg": "{neutral.50}"
    }
  }
}
```

`packages/design-tokens/tokens/typography.json`:

```json
{
  "fontFamily": {
    "sans": "Inter, 'Helvetica Neue', Arial, sans-serif",
    "mono": "'JetBrains Mono', 'Courier New', monospace",
    "arabic": "Noto Sans Arabic, sans-serif",
    "cjk": "Noto Sans CJK, sans-serif"
  },
  "fontSize": {
    "xs": "0.75rem",
    "sm": "0.875rem",
    "base": "1rem",
    "lg": "1.125rem",
    "xl": "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
    "4xl": "2.25rem",
    "5xl": "3rem"
  },
  "fontWeight": {
    "normal": 400,
    "medium": 500,
    "semibold": 600,
    "bold": 700
  },
  "lineHeight": {
    "tight": 1.2,
    "normal": 1.5,
    "relaxed": 1.75
  },
  "letterSpacing": {
    "tight": "-0.025em",
    "normal": "0",
    "wide": "0.025em"
  }
}
```

`packages/design-tokens/tokens/spacing.json`:

```json
{
  "0": "0",
  "0.5": "0.125rem",
  "1": "0.25rem",
  "2": "0.5rem",
  "3": "0.75rem",
  "4": "1rem",
  "5": "1.25rem",
  "6": "1.5rem",
  "8": "2rem",
  "10": "2.5rem",
  "12": "3rem",
  "16": "4rem",
  "20": "5rem",
  "24": "6rem",
  "32": "8rem"
}
```

`packages/design-tokens/tokens/motion.json`:

```json
{
  "duration": {
    "fast": "150ms",
    "normal": "300ms",
    "slow": "500ms"
  },
  "easing": {
    "linear": "linear",
    "in": "cubic-bezier(0.4, 0, 1, 1)",
    "out": "cubic-bezier(0, 0, 0.2, 1)",
    "inOut": "cubic-bezier(0.4, 0, 0.2, 1)"
  },
  "reducedMotion": {
    "duration": "0.01ms"
  }
}
```

`packages/design-tokens/tokens/accessibility.json`:

```json
{
  "contrast": {
    "normalText": 4.5,
    "largeText": 3,
    "nonText": 3
  },
  "focus": {
    "ringWidth": "3px",
    "ringOffset": "2px",
    "ringColor": "{semantic.border.focus}"
  },
  "touchTarget": {
    "min": "44px",
    "recommended": "48px"
  },
  "zIndex": {
    "base": 0,
    "sticky": 10,
    "dropdown": 20,
    "modal": 30,
    "toast": 40,
    "tooltip": 50
  }
}
```

## Шаг 3: Token loader + resolver

`packages/design-tokens/src/tokens.ts`:

```ts
import lightColors from '../tokens/colors/light.json'
import darkColors from '../tokens/colors/dark.json'
import hcColors from '../tokens/colors/high-contrast.json'
import typography from '../tokens/typography.json'
import spacing from '../tokens/spacing.json'
import radii from '../tokens/radii.json'
import shadows from '../tokens/shadows.json'
import motion from '../tokens/motion.json'
import accessibility from '../tokens/accessibility.json'

type Theme = 'light' | 'dark' | 'high-contrast'

function resolveRefs(obj: any, root: any): any {
  if (typeof obj === 'string') {
    const match = obj.match(/^\{([^}]+)\}$/)
    if (match) {
      // Follow dotted path
      const parts = match[1].split('.')
      let value = root
      for (const part of parts) {
        value = value[part]
        if (value === undefined) throw new Error(`Unresolved ref: ${obj}`)
      }
      return resolveRefs(value, root)  // recursive for chained refs
    }
    return obj
  }
  if (Array.isArray(obj)) return obj.map(item => resolveRefs(item, root))
  if (typeof obj === 'object' && obj !== null) {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, resolveRefs(v, root)])
    )
  }
  return obj
}

function buildTokens(theme: Theme) {
  const colorsBase = theme === 'dark' ? darkColors : theme === 'high-contrast' ? hcColors : lightColors
  const raw = {
    colors: colorsBase,
    typography,
    spacing,
    radii,
    shadows,
    motion,
    accessibility,
  }
  return resolveRefs(raw, raw)
}

export const tokens = {
  light: buildTokens('light'),
  dark: buildTokens('dark'),
  highContrast: buildTokens('high-contrast'),
}

export type TokenTheme = typeof tokens.light
```

## Шаг 4: CSS generator

`packages/design-tokens/src/generators/css.ts`:

```ts
import { tokens } from '../tokens'
import * as fs from 'fs'
import * as path from 'path'

function flatten(obj: any, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(obj)) {
    const varName = prefix ? `${prefix}-${key}` : key
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flatten(value, varName))
    } else {
      result[varName] = String(value)
    }
  }
  return result
}

function toCSSVars(theme: 'light' | 'dark' | 'highContrast', selector: string) {
  const flat = flatten(tokens[theme])
  const vars = Object.entries(flat)
    .map(([k, v]) => `  --${k}: ${v};`)
    .join('\n')
  return `${selector} {\n${vars}\n}`
}

function generateCSS() {
  const output = [
    '/* AUTO-GENERATED from @daria/design-tokens */',
    '/* Regenerate: pnpm -F @daria/design-tokens build */',
    '',
    toCSSVars('light', ':root'),
    '',
    toCSSVars('dark', '[data-theme="dark"]'),
    '',
    '@media (prefers-color-scheme: dark) {',
    '  :root:not([data-theme]) {',
    '    ...',  // дубликат dark vars
    '  }',
    '}',
    '',
    toCSSVars('highContrast', '[data-theme="high-contrast"]'),
    '',
    '@media (prefers-reduced-motion: reduce) {',
    '  :root {',
    '    --motion-duration-fast: 0.01ms;',
    '    --motion-duration-normal: 0.01ms;',
    '    --motion-duration-slow: 0.01ms;',
    '  }',
    '}',
  ].join('\n')

  const outputPath = path.join(__dirname, '../../dist/tokens.css')
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, output)
  console.log(`Generated: ${outputPath}`)
}

generateCSS()
```

## Шаг 5: Tailwind preset generator

`packages/design-tokens/src/generators/tailwind.ts`:

```ts
import { tokens } from '../tokens'
import * as fs from 'fs'
import * as path from 'path'

function generateTailwindPreset() {
  const preset = {
    theme: {
      extend: {
        colors: {
          // Direct-map top-level colors
          ...tokens.light.colors.neutral && { neutral: tokens.light.colors.neutral },
          primary: tokens.light.colors.primary,
          accent: tokens.light.colors.accent,
          success: tokens.light.colors.success,
          warning: tokens.light.colors.warning,
          danger: tokens.light.colors.danger,
          // Semantic — as CSS vars (theme-aware)
          bg: {
            DEFAULT: 'var(--colors-semantic-bg-primary)',
            secondary: 'var(--colors-semantic-bg-secondary)',
            tertiary: 'var(--colors-semantic-bg-tertiary)',
          },
          fg: {
            DEFAULT: 'var(--colors-semantic-fg-primary)',
            secondary: 'var(--colors-semantic-fg-secondary)',
            tertiary: 'var(--colors-semantic-fg-tertiary)',
            inverse: 'var(--colors-semantic-fg-inverse)',
          },
          border: {
            DEFAULT: 'var(--colors-semantic-border-default)',
            strong: 'var(--colors-semantic-border-strong)',
            focus: 'var(--colors-semantic-border-focus)',
          },
        },
        fontFamily: tokens.light.typography.fontFamily,
        fontSize: tokens.light.typography.fontSize,
        fontWeight: tokens.light.typography.fontWeight,
        spacing: tokens.light.spacing,
        borderRadius: tokens.light.radii,
        boxShadow: tokens.light.shadows,
        transitionDuration: tokens.light.motion.duration,
        transitionTimingFunction: tokens.light.motion.easing,
        zIndex: tokens.light.accessibility.zIndex,
      },
    },
  }

  const output = `// AUTO-GENERATED
module.exports = ${JSON.stringify(preset, null, 2)}
`

  const outputPath = path.join(__dirname, '../../dist/tailwind-preset.js')
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, output)
  console.log(`Generated: ${outputPath}`)
}

generateTailwindPreset()
```

## Шаг 6: React Native generator

`packages/design-tokens/src/generators/react-native.ts`:

```ts
import { tokens } from '../tokens'
import * as fs from 'fs'
import * as path from 'path'

function generateRN() {
  const rnTokens = {
    light: tokens.light,
    dark: tokens.dark,
    highContrast: tokens.highContrast,
  }

  const output = `// AUTO-GENERATED для React Native
export const designTokens = ${JSON.stringify(rnTokens, null, 2)} as const

export type TokenTheme = typeof designTokens.light
`

  const outputPath = path.join(__dirname, '../../dist/tokens.rn.ts')
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, output)
  console.log(`Generated: ${outputPath}`)
}

generateRN()
```

## Шаг 7: Runtime theme switcher

`packages/design-tokens/src/index.ts`:

```ts
export { tokens, type TokenTheme } from './tokens'

// Client-side theme application
export function applyTheme(theme: 'light' | 'dark' | 'high-contrast' | 'auto') {
  if (typeof document === 'undefined') return

  if (theme === 'auto') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', theme)
  }
  
  // Persist
  localStorage.setItem('daria-theme', theme)
}

export function getTheme(): 'light' | 'dark' | 'high-contrast' | 'auto' {
  if (typeof localStorage === 'undefined') return 'auto'
  return (localStorage.getItem('daria-theme') as any) ?? 'auto'
}

// Hooks для React
export { useTheme } from './hooks/useTheme'  // TBD
```

## Шаг 8: Build scripts

`packages/design-tokens/package.json`:

```json
{
  "name": "@daria/design-tokens",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./css": "./dist/tokens.css",
    "./tailwind": "./dist/tailwind-preset.js",
    "./rn": "./dist/tokens.rn.ts"
  },
  "scripts": {
    "build": "pnpm build:css && pnpm build:tailwind && pnpm build:rn",
    "build:css": "tsx src/generators/css.ts",
    "build:tailwind": "tsx src/generators/tailwind.ts",
    "build:rn": "tsx src/generators/react-native.ts",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "devDependencies": {
    "tsx": "^4.0.0"
  }
}
```

## Шаг 9: Usage в apps

### Web (Next.js / Tailwind)

```ts
// apps/shell-web/tailwind.config.js
import preset from '@daria/design-tokens/tailwind'

export default {
  presets: [preset],
  content: [
    './app/**/*.{ts,tsx}',
    '../../packages/ui-react/**/*.{ts,tsx}',
    '../../packages/card-types/**/*.{ts,tsx}',
  ],
}
```

```tsx
// apps/shell-web/app/layout.tsx
import '@daria/design-tokens/css'

export default function RootLayout({ children }) {
  return <html data-theme="auto"><body>{children}</body></html>
}
```

### React Native

```ts
// apps/shell-mobile/src/theme.ts
import { designTokens } from '@daria/design-tokens/rn'

export const currentTheme = designTokens.light  // TODO: switch based on preferences
```

```tsx
// Usage
<Text style={{ color: currentTheme.colors.semantic.fg.primary, fontSize: currentTheme.typography.fontSize.base }}>
  Hello
</Text>
```

## Шаг 10: Validate

```bash
pnpm -F @daria/design-tokens build
ls packages/design-tokens/dist/
# tokens.css  tailwind-preset.js  tokens.rn.ts

# Inspect CSS
head -40 packages/design-tokens/dist/tokens.css
```

Expected output:
```css
/* AUTO-GENERATED from @daria/design-tokens */
:root {
  --colors-neutral-0: #ffffff;
  --colors-neutral-50: #fafafa;
  ...
  --colors-semantic-bg-primary: #ffffff;
  --colors-semantic-fg-primary: #171717;
  ...
}
[data-theme="dark"] {
  ...
}
```

## Шаг 11: Linter — no hardcoded colors

Add ESLint rule для enforcement I13:

```js
// eslint.config.mjs — add rule
{
  rules: {
    'no-restricted-syntax': ['error', {
      selector: 'Literal[value=/^#[0-9a-fA-F]{3,8}$/]',
      message: 'I13: Use design-tokens semantic colors, not hex literals',
    }],
  }
}
```

Exclude `packages/design-tokens/` itself (где tokens defined).

## Checklist — Wednesday done

- [ ] `@daria/design-tokens` builds (3 generators work)
- [ ] CSS tokens включая light/dark/high-contrast + prefers-reduced-motion
- [ ] Tailwind preset exported
- [ ] RN tokens exported
- [ ] Token refs resolve (`{semantic.bg.primary}` → actual color)
- [ ] ESLint I13 rule enforces no-hardcoded-hex
- [ ] Sample usage works в dummy Next.js / Expo app

## Next

Thursday: shell-panels package → `09-shell-panels-package.md`.
