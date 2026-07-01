# Shell Core — React implementation

`packages/shell-core` — runtime shell с 4 панелями + центральной картой + switcher + search. Работает в Next.js (apps/shell-web) и Expo (apps/shell-mobile) через одинаковый API.

## Structure

```
packages/shell-core/
├── package.json
├── src/
│   ├── index.ts
│   ├── Shell.tsx               — корневой компонент
│   ├── state/
│   │   ├── store.ts            — Zustand store
│   │   ├── actions.ts          — focus.set(), focus.back(), etc.
│   │   └── types.ts            — ShellState
│   ├── panels/
│   │   ├── TopPanel.tsx
│   │   ├── LeftPanel.tsx
│   │   ├── RightPanel.tsx
│   │   ├── BottomPanel.tsx
│   │   └── Panel.tsx           — общая обёртка
│   ├── center/
│   │   ├── CenterCard.tsx
│   │   ├── Switcher.tsx
│   │   └── InversionButton.tsx
│   ├── navigation/
│   │   ├── useStack.ts
│   │   └── useDeepLink.ts
│   ├── resolver/
│   │   ├── cardTypeResolver.ts  — reads registry
│   │   └── panelResolver.ts
│   └── hooks/
│       ├── useCardTelemetry.ts
│       └── useFractalHarness.ts
└── tests/
```

## package.json

```json
{
  "name": "@daria/shell-core",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "peerDependencies": {
    "react": ">=18",
    "react-dom": ">=18"
  },
  "dependencies": {
    "zustand": "^4.5.0",
    "@daria/ui-react": "workspace:*",
    "@daria/shell-panels": "workspace:*",
    "@daria/card-types": "workspace:*"
  }
}
```

## state/types.ts

```typescript
export type Kind = string  // card-type kind, e.g. 'person-profile', 'car'
export type View = 'instance' | 'type'
export type Mode = 'consumer' | 'provider' | 'creator' | 'marketplace' | string

export interface Focus {
  kind: Kind
  id: string
  view: View
  mode?: Mode
}

export interface PanelState {
  loading: boolean
  error?: ErrorCode
  data?: unknown
  scrollPosition: number
  filter?: Record<string, unknown>
}

export interface StackEntry {
  focus: Focus
  panels: Record<PanelSlot, PanelState>
  timestamp: Date
  source: 'search' | 'panel-tap' | 'deep-link' | 'inversion' | 'back'
}

export type PanelSlot = 'top' | 'left' | 'right' | 'bottom'

export interface OverlayEntry {
  id: string
  kind: 'modal' | 'bottom-sheet' | 'toast' | 'confirm' | 'picker'
  content: unknown
  dismissOn?: 'tap-outside' | 'explicit' | 'timeout'
}

export interface ShellState {
  focus: Focus | null
  stack: StackEntry[]
  panels: Record<PanelSlot, PanelState>
  user: { id: string; roles: string[]; region: string; locale: string; tz: string } | null
  device: { platform: 'web' | 'ios' | 'android' | 'desktop'; online: boolean }
  sync: { lastAppliedEventId?: string; outboxPending: number; state: 'idle' | 'syncing' | 'error' }
  theme: 'light' | 'dark' | 'auto' | 'high-contrast'
  dir: 'ltr' | 'rtl'
  search: { query?: string; results?: unknown[] }
  overlays: OverlayEntry[]
}

export type ErrorCode = 
  | 'ENTITY_NOT_FOUND'
  | 'NETWORK'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'POLICY_DENY'
  | 'INTERNAL'
```

## state/store.ts

```typescript
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { ShellState, Focus, PanelSlot } from './types'

interface ShellStore extends ShellState {
  // Actions
  setFocus: (focus: Focus, source?: StackEntry['source']) => void
  back: () => boolean
  invert: () => void
  setMode: (mode: string) => void
  updatePanel: (slot: PanelSlot, patch: Partial<PanelState>) => void
  pushOverlay: (overlay: OverlayEntry) => void
  popOverlay: () => void
  
  // Derived
  canGoBack: () => boolean
}

const initialPanels: Record<PanelSlot, PanelState> = {
  top: { loading: false, scrollPosition: 0 },
  left: { loading: false, scrollPosition: 0 },
  right: { loading: false, scrollPosition: 0 },
  bottom: { loading: false, scrollPosition: 0 },
}

export const useShellStore = create<ShellStore>()(
  subscribeWithSelector((set, get) => ({
    focus: null,
    stack: [],
    panels: initialPanels,
    user: null,
    device: { platform: detectPlatform(), online: navigator?.onLine ?? true },
    sync: { outboxPending: 0, state: 'idle' },
    theme: 'auto',
    dir: 'ltr',
    search: {},
    overlays: [],

    setFocus: (focus, source = 'panel-tap') => {
      const state = get()
      
      // Idempotent: if same focus, no-op
      if (state.focus && focusEqual(state.focus, focus)) {
        return
      }

      // Push current to stack
      const newStack = state.focus
        ? [
            ...state.stack.slice(-19),  // max 20
            {
              focus: state.focus,
              panels: state.panels,
              timestamp: new Date(),
              source,
            },
          ]
        : state.stack

      set({
        focus,
        stack: newStack,
        panels: {
          top: { loading: true, scrollPosition: 0 },
          left: { loading: true, scrollPosition: 0 },
          right: { loading: true, scrollPosition: 0 },
          bottom: { loading: true, scrollPosition: 0 },
        },
      })
    },

    back: () => {
      const state = get()
      if (state.stack.length === 0) return false
      
      const prev = state.stack[state.stack.length - 1]
      set({
        focus: prev.focus,
        panels: prev.panels,  // restore scroll positions
        stack: state.stack.slice(0, -1),
      })
      return true
    },

    invert: () => {
      const state = get()
      if (!state.focus) return
      
      set({
        focus: {
          ...state.focus,
          view: state.focus.view === 'instance' ? 'type' : 'instance',
        },
        panels: {
          top: { loading: true, scrollPosition: 0 },
          left: { loading: true, scrollPosition: 0 },
          right: { loading: true, scrollPosition: 0 },
          bottom: { loading: true, scrollPosition: 0 },
        },
        // NOTE: inversion НЕ пушит в stack (invariant из 29-shell-state-model §4 G4)
      })
    },

    setMode: (mode: string) => {
      const state = get()
      if (!state.focus) return
      set({
        focus: { ...state.focus, mode },
        // Mode doesn't re-render panels в большинстве случаев, но card-type может опционально
      })
    },

    updatePanel: (slot, patch) => {
      set(state => ({
        panels: { ...state.panels, [slot]: { ...state.panels[slot], ...patch } },
      }))
    },

    pushOverlay: (overlay) => {
      set(state => ({ overlays: [...state.overlays, overlay] }))
    },

    popOverlay: () => {
      set(state => ({ overlays: state.overlays.slice(0, -1) }))
    },

    canGoBack: () => get().stack.length > 0,
  }))
)

function focusEqual(a: Focus, b: Focus): boolean {
  return a.kind === b.kind && a.id === b.id && a.view === b.view && a.mode === b.mode
}

function detectPlatform(): 'web' | 'ios' | 'android' | 'desktop' {
  if (typeof window === 'undefined') return 'web'
  const ua = navigator.userAgent
  if (/iPhone|iPad/.test(ua)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  if (window.__TAURI__) return 'desktop'
  return 'web'
}
```

## Shell.tsx

```tsx
import React, { useEffect } from 'react'
import { TopPanel } from './panels/TopPanel'
import { LeftPanel } from './panels/LeftPanel'
import { RightPanel } from './panels/RightPanel'
import { BottomPanel } from './panels/BottomPanel'
import { CenterCard } from './center/CenterCard'
import { useShellStore } from './state/store'
import { useDeepLink } from './navigation/useDeepLink'
import { useBackGesture } from './hooks/useBackGesture'
import { useInversionGesture } from './hooks/useInversionGesture'

export function Shell({ initialFocus }: { initialFocus?: Focus }) {
  const setFocus = useShellStore(s => s.setFocus)
  const dir = useShellStore(s => s.dir)

  // Initialize from deep-link или initialFocus
  useDeepLink()

  useEffect(() => {
    if (initialFocus) {
      setFocus(initialFocus, 'deep-link')
    }
  }, [initialFocus])

  // Gesture handlers
  useBackGesture()
  useInversionGesture()

  return (
    <div 
      dir={dir}
      className="daria-shell"
      style={{
        display: 'grid',
        gridTemplateRows: 'auto 1fr auto',
        gridTemplateColumns: 'auto 1fr auto',
        height: '100vh',
        width: '100vw',
      }}
    >
      {/* Top panel */}
      <div style={{ gridColumn: '1 / -1' }}>
        <TopPanel />
      </div>

      {/* Left + Center + Right */}
      <LeftPanel />
      <CenterCard />
      <RightPanel />

      {/* Bottom panel */}
      <div style={{ gridColumn: '1 / -1' }}>
        <BottomPanel />
      </div>

      {/* Overlays absolute-positioned */}
      <Overlays />
    </div>
  )
}
```

## panels/Panel.tsx (общая обёртка)

```tsx
import React, { useEffect } from 'react'
import { useShellStore } from '../state/store'
import { panelResolver } from '../resolver/panelResolver'
import type { PanelSlot } from '../state/types'

export function Panel({ slot }: { slot: PanelSlot }) {
  const focus = useShellStore(s => s.focus)
  const panelState = useShellStore(s => s.panels[slot])
  const updatePanel = useShellStore(s => s.updatePanel)

  useEffect(() => {
    if (!focus) return

    let cancelled = false
    updatePanel(slot, { loading: true, error: undefined })

    panelResolver.resolve({
      slot,
      kind: focus.kind,
      view: focus.view,
      mode: focus.mode,
    })
      .then(({ Component, prefetchedData }) => {
        if (cancelled) return
        updatePanel(slot, { loading: false, data: prefetchedData })
      })
      .catch(err => {
        if (cancelled) return
        updatePanel(slot, { loading: false, error: classifyError(err) })
      })

    return () => { cancelled = true }
  }, [focus?.kind, focus?.id, focus?.view, focus?.mode, slot])

  if (!focus) return <EmptyPanel slot={slot} />
  if (panelState.loading) return <LoadingPanel slot={slot} />
  if (panelState.error) return <ErrorPanel slot={slot} error={panelState.error} />

  return <RenderPanel slot={slot} focus={focus} data={panelState.data} />
}

function RenderPanel({ slot, focus, data }) {
  const [Component, setComponent] = React.useState<React.ComponentType | null>(null)

  React.useEffect(() => {
    panelResolver.getComponent({ slot, kind: focus.kind, view: focus.view })
      .then(setComponent)
  }, [slot, focus.kind, focus.view])

  if (!Component) return null
  return <Component focus={focus} data={data} />
}
```

## resolver/panelResolver.ts

```typescript
import { cardTypeRegistry } from '@daria/card-types'
import type { PanelSlot, View, Mode } from '../state/types'

interface PanelKey {
  slot: PanelSlot
  kind: string
  view: View
  mode?: Mode
}

interface ResolvedPanel {
  Component: React.ComponentType<any>
  prefetchedData?: unknown
}

class PanelResolver {
  private cache = new Map<string, ResolvedPanel>()

  async resolve(key: PanelKey): Promise<ResolvedPanel> {
    const cacheKey = this.getCacheKey(key)
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!
    }

    const cardType = cardTypeRegistry[key.kind]
    if (!cardType) {
      throw new Error(`Unknown card-type: ${key.kind}`)
    }

    // Load panel component
    const viewDef = cardType[key.view]
    if (!viewDef) {
      throw new Error(`No ${key.view} view для card-type ${key.kind}`)
    }

    const module = await viewDef[key.slot]()
    const Component = (module as any).default

    // TODO: prefetch data via SDK
    const prefetchedData = null

    const resolved = { Component, prefetchedData }
    this.cache.set(cacheKey, resolved)
    return resolved
  }

  async getComponent(key: PanelKey): Promise<React.ComponentType<any>> {
    const { Component } = await this.resolve(key)
    return Component
  }

  clearCache() {
    this.cache.clear()
  }

  private getCacheKey(key: PanelKey): string {
    return `${key.slot}:${key.kind}:${key.view}:${key.mode ?? ''}`
  }
}

export const panelResolver = new PanelResolver()
```

## navigation/useDeepLink.ts

```typescript
import { useEffect } from 'react'
import { useShellStore } from '../state/store'

// Parse URL path → focus
export function useDeepLink() {
  const setFocus = useShellStore(s => s.setFocus)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const parseAndApply = () => {
      const path = window.location.pathname
      const search = new URLSearchParams(window.location.search)

      // /e/<kind>/<id>
      const entityMatch = path.match(/^\/e\/([a-z-]+)\/([a-zA-Z0-9_-]+)/)
      if (entityMatch) {
        setFocus({
          kind: entityMatch[1],
          id: entityMatch[2],
          view: (search.get('view') as 'instance' | 'type') ?? 'instance',
          mode: search.get('mode') ?? undefined,
        }, 'deep-link')
        return
      }

      // /c/<conversation-id>
      const convMatch = path.match(/^\/c\/([a-zA-Z0-9_-]+)/)
      if (convMatch) {
        setFocus({
          kind: 'conversation',
          id: convMatch[1],
          view: 'instance',
        }, 'deep-link')
        return
      }

      // /s/<query> — search
      const searchMatch = path.match(/^\/s\/(.+)/)
      if (searchMatch) {
        // Open search overlay with query
        useShellStore.setState({
          search: { query: decodeURIComponent(searchMatch[1]) },
        })
      }
    }

    parseAndApply()

    // Listen to back/forward buttons
    window.addEventListener('popstate', parseAndApply)
    return () => window.removeEventListener('popstate', parseAndApply)
  }, [])
}

// Reverse: update URL from focus
useShellStore.subscribe(
  state => state.focus,
  (focus) => {
    if (!focus || typeof window === 'undefined') return
    const url = `/e/${focus.kind}/${focus.id}${
      focus.view === 'type' ? '?view=type' : ''
    }${focus.mode ? `${focus.view === 'type' ? '&' : '?'}mode=${focus.mode}` : ''}`
    window.history.pushState({}, '', url)
  }
)
```

## hooks/useInversionGesture.ts

```typescript
import { useEffect } from 'react'
import { useShellStore } from '../state/store'

// Keyboard + swipe для inversion
export function useInversionGesture() {
  const invert = useShellStore(s => s.invert)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Swap key (e.g. '/') для quick inversion
      if (e.key === 'i' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        invert()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [invert])
}
```

## hooks/useCardTelemetry.ts

```typescript
import { useEffect } from 'react'
import { useShellStore } from '../state/store'
import { trace } from '@opentelemetry/api'

// Emit telemetry events per shell action — auto для всех card-types
export function useCardTelemetry() {
  const focus = useShellStore(s => s.focus)
  const user = useShellStore(s => s.user)

  useEffect(() => {
    if (!focus || !user) return

    const tracer = trace.getTracer('shell')
    const span = tracer.startSpan('shell.focus.opened', {
      attributes: {
        'card.kind': focus.kind,
        'card.view': focus.view,
        'card.mode': focus.mode,
        'entity.id': focus.id,
        'user.id': user.id,
        'user.region': user.region,
      },
    })
    
    return () => span.end()
  }, [focus?.kind, focus?.id, focus?.view, focus?.mode, user?.id])
}
```

## Usage в apps/shell-web

```tsx
// apps/shell-web/app/layout.tsx
import { Shell } from '@daria/shell-core'

export default function RootLayout() {
  return (
    <html>
      <body>
        <Shell />
      </body>
    </html>
  )
}
```

## Usage в apps/shell-mobile

```tsx
// apps/shell-mobile/App.tsx
import { Shell } from '@daria/shell-core'

export default function App() {
  return <Shell />
}
```

Same component — thanks to `react-native-web` adapter в `@daria/ui-react`.

## Tests

```typescript
// packages/shell-core/tests/store.test.ts
import { useShellStore } from '../src/state/store'

beforeEach(() => {
  useShellStore.setState({ focus: null, stack: [], panels: initialPanels })
})

test('setFocus pushes previous to stack', () => {
  const store = useShellStore.getState()
  
  store.setFocus({ kind: 'car', id: '1', view: 'instance' })
  store.setFocus({ kind: 'car', id: '2', view: 'instance' })
  
  expect(useShellStore.getState().stack).toHaveLength(1)
  expect(useShellStore.getState().stack[0].focus.id).toBe('1')
})

test('invert does not push to stack', () => {
  const store = useShellStore.getState()
  store.setFocus({ kind: 'car', id: '1', view: 'instance' })
  store.invert()
  
  expect(useShellStore.getState().focus?.view).toBe('type')
  expect(useShellStore.getState().stack).toHaveLength(0)
})

test('back restores previous focus', () => {
  const store = useShellStore.getState()
  store.setFocus({ kind: 'car', id: '1', view: 'instance' })
  store.setFocus({ kind: 'car', id: '2', view: 'instance' })
  
  expect(store.back()).toBe(true)
  expect(useShellStore.getState().focus?.id).toBe('1')
})

test('idempotent setFocus no-op', () => {
  const store = useShellStore.getState()
  const f = { kind: 'car', id: '1', view: 'instance' as const }
  store.setFocus(f)
  store.setFocus(f)
  
  expect(useShellStore.getState().stack).toHaveLength(0)
})
```
