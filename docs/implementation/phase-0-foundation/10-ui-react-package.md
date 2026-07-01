# Phase 0 / Week 2 / Friday: ui-react package

Цель: `@daria/ui-react` — component library на Radix UI + Tailwind + design-tokens. Closed set (I20) — canonical components.

## Шаг 1: Install deps

```bash
pnpm add react react-dom -F @daria/ui-react
pnpm add @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-slot -F @daria/ui-react
pnpm add class-variance-authority clsx tailwind-merge -F @daria/ui-react
pnpm add @daria/design-tokens -F @daria/ui-react
pnpm add -D @types/react @types/react-dom -F @daria/ui-react
```

## Шаг 2: Structure

```
packages/ui-react/
├── package.json
├── tsconfig.json
├── tailwind.config.js             — extends design-tokens preset
├── src/
│   ├── index.ts
│   ├── utils/
│   │   └── cn.ts                  — classname merge
│   ├── primitives/                — atomic building blocks
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   └── Icon.tsx
│   ├── layout/                     — closed set по I20
│   │   ├── Shell.tsx               — container
│   │   ├── ShellCenter.tsx
│   │   ├── ShellPanel.tsx
│   │   ├── ShellSwitcher.tsx
│   │   ├── CardView.tsx            — root card
│   │   ├── CardHeader.tsx
│   │   ├── CardTimeline.tsx
│   │   ├── CardSummary.tsx
│   │   ├── CardActions.tsx
│   │   ├── CardSectionStack.tsx
│   │   ├── CardFooter.tsx
│   │   ├── PanelHeader.tsx
│   │   ├── PanelStream.tsx
│   │   ├── PanelFooter.tsx
│   │   ├── Section.tsx
│   │   ├── Item.tsx
│   │   ├── Field.tsx
│   │   └── ActionBar.tsx
│   ├── controls/
│   │   ├── InversionButton.tsx
│   │   ├── ModeToggle.tsx
│   │   ├── SearchBar.tsx
│   │   └── SearchResults.tsx
│   └── feedback/
│       ├── LiveRegion.tsx          — ARIA announce
│       ├── Spinner.tsx
│       └── ErrorState.tsx
```

## Шаг 3: Core utility

`src/utils/cn.ts`:

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

## Шаг 4: Button (reference primitive)

`src/primitives/Button.tsx`:

```tsx
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../utils/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary-500 text-fg-inverse hover:bg-primary-600',
        secondary: 'bg-neutral-100 text-fg hover:bg-neutral-200',
        danger: 'bg-danger-500 text-fg-inverse hover:bg-danger-700',
        ghost: 'hover:bg-neutral-100 text-fg',
        outline: 'border border-border hover:bg-neutral-50',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'
```

## Шаг 5: CardView + layout primitives

`src/layout/CardView.tsx`:

```tsx
import * as React from 'react'
import { cn } from '../utils/cn'

export interface CardViewProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardView({ className, children, ...props }: CardViewProps) {
  return (
    <div
      role="article"
      className={cn(
        'flex flex-col h-full bg-bg border border-border rounded-lg overflow-hidden',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
```

`src/layout/CardHeader.tsx`:

```tsx
import * as React from 'react'
import { cn } from '../utils/cn'
import { InversionButton } from '../controls/InversionButton'

export interface CardHeaderProps extends React.HTMLAttributes<HTMLElement> {
  title: string
  subtitle?: string
  avatarUrl?: string
  badges?: React.ReactNode[]
  status?: { label: string; tone?: 'neutral' | 'success' | 'warning' | 'danger' }
  onInvert?: () => void
  mode?: string
  onModeChange?: (mode: string) => void
}

export function CardHeader({
  title,
  subtitle,
  avatarUrl,
  badges,
  status,
  onInvert,
  mode,
  onModeChange,
  className,
  ...props
}: CardHeaderProps) {
  return (
    <header
      className={cn('flex items-center gap-3 p-4 border-b border-border', className)}
      {...props}
    >
      {avatarUrl && (
        <img src={avatarUrl} alt="" className="w-12 h-12 rounded-full" />
      )}
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-semibold truncate">{title}</h1>
        {subtitle && (
          <p className="text-sm text-fg-secondary truncate">{subtitle}</p>
        )}
        {badges && badges.length > 0 && (
          <div className="flex gap-1 mt-1">{badges}</div>
        )}
      </div>
      {status && (
        <StatusIndicator label={status.label} tone={status.tone} />
      )}
      {onInvert && (
        <InversionButton onClick={onInvert} aria-label="Toggle view (⇄)" />
      )}
    </header>
  )
}

function StatusIndicator({ label, tone = 'neutral' }: { label: string; tone?: string }) {
  const toneClasses = {
    neutral: 'bg-neutral-100 text-fg',
    success: 'bg-success-50 text-success-700',
    warning: 'bg-warning-50 text-warning-700',
    danger: 'bg-danger-50 text-danger-700',
  }
  return (
    <span className={cn('text-xs font-medium px-2 py-1 rounded', toneClasses[tone as keyof typeof toneClasses])}>
      {label}
    </span>
  )
}
```

`src/layout/CardTimeline.tsx`:

```tsx
import * as React from 'react'
import { cn } from '../utils/cn'

export interface TimelineStep {
  id: string
  title: string
  status: 'pending' | 'active' | 'done' | 'failed' | 'skipped'
  timestamp?: string
}

export interface CardTimelineProps {
  steps: TimelineStep[]
  currentStepId?: string
  onStepClick?: (stepId: string) => void
  className?: string
}

export function CardTimeline({ steps, currentStepId, onStepClick, className }: CardTimelineProps) {
  return (
    <section
      aria-label="Timeline"
      className={cn('px-4 py-3 border-b border-border', className)}
    >
      <ol className="flex gap-2 overflow-x-auto">
        {steps.map((step, i) => (
          <li key={step.id} className="flex-shrink-0">
            <button
              className={cn(
                'flex items-center gap-1.5 text-xs px-2 py-1 rounded',
                statusTone(step.status),
                currentStepId === step.id && 'ring-2 ring-border-focus',
              )}
              aria-current={currentStepId === step.id ? 'step' : undefined}
              onClick={() => onStepClick?.(step.id)}
            >
              <StatusDot status={step.status} />
              <span className="font-medium">{step.title}</span>
            </button>
            {i < steps.length - 1 && (
              <span className="mx-1 text-fg-tertiary" aria-hidden>→</span>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}

function statusTone(status: string): string {
  switch (status) {
    case 'done': return 'bg-success-50 text-success-700'
    case 'active': return 'bg-primary-50 text-primary-700'
    case 'failed': return 'bg-danger-50 text-danger-700'
    case 'skipped': return 'bg-neutral-100 text-fg-tertiary'
    default: return 'bg-neutral-50 text-fg-secondary'
  }
}

function StatusDot({ status }: { status: string }) {
  const color = {
    done: 'bg-success-500',
    active: 'bg-primary-500 animate-pulse',
    failed: 'bg-danger-500',
    skipped: 'bg-neutral-300',
    pending: 'bg-neutral-300',
  }[status] ?? 'bg-neutral-300'
  return <span className={cn('w-1.5 h-1.5 rounded-full', color)} aria-hidden />
}
```

Аналогично (короче):

`CardSummary.tsx`, `CardActions.tsx`, `CardSectionStack.tsx`, `CardFooter.tsx` — simple wrappers с ARIA landmarks + tailwind classes.

`Section.tsx`:
```tsx
export function Section({ title, children, ...props }: SectionProps) {
  return (
    <section aria-labelledby={`section-${title}`} {...props}>
      {title && <h2 id={`section-${title}`} className="text-sm font-semibold mb-2 text-fg-secondary">{title}</h2>}
      {children}
    </section>
  )
}
```

`Item.tsx`:
```tsx
export function Item({ identity, status, meta, actions, onClick }: ItemProps) {
  return (
    <button
      className="w-full flex items-start gap-3 p-3 hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-border-focus text-start"
      onClick={onClick}
    >
      {identity.avatar && <img src={identity.avatar} alt="" className="w-10 h-10 rounded-full" />}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{identity.title}</span>
          {status && <StatusBadge status={status} />}
        </div>
        {meta && <p className="text-xs text-fg-tertiary truncate">{meta}</p>}
      </div>
      {actions}
    </button>
  )
}
```

## Шаг 6: InversionButton

`src/controls/InversionButton.tsx`:

```tsx
import * as React from 'react'
import { Button, ButtonProps } from '../primitives/Button'

export interface InversionButtonProps extends ButtonProps {
  currentView?: 'instance' | 'type'
}

export function InversionButton({
  currentView,
  ...props
}: InversionButtonProps) {
  const label = currentView === 'instance' ? 'Switch to type view' : 'Switch to instance view'
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      aria-pressed={currentView === 'type'}
      title={label}
      {...props}
    >
      ⇄
    </Button>
  )
}
```

## Шаг 7: LiveRegion для a11y

`src/feedback/LiveRegion.tsx`:

```tsx
import * as React from 'react'
import { useEffect, useRef } from 'react'

export interface LiveRegionProps {
  message: string
  politeness?: 'polite' | 'assertive'
}

export function LiveRegion({ message, politeness = 'polite' }: LiveRegionProps) {
  const ref = useRef<HTMLDivElement>(null)
  const lastMessage = useRef<string>('')

  useEffect(() => {
    // Throttle: 1 announcement per 2 seconds
    if (message && message !== lastMessage.current) {
      const now = Date.now()
      const last = parseInt(sessionStorage.getItem('daria:lastAnnounce') ?? '0', 10)
      if (now - last > 2000) {
        sessionStorage.setItem('daria:lastAnnounce', String(now))
        if (ref.current) ref.current.textContent = message
        lastMessage.current = message
      }
    }
  }, [message])

  return (
    <div
      ref={ref}
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    />
  )
}
```

## Шаг 8: Tailwind config

`packages/ui-react/tailwind.config.js`:

```js
import preset from '@daria/design-tokens/tailwind'

export default {
  presets: [preset],
  content: ['./src/**/*.{ts,tsx}'],
  plugins: [],
}
```

## Шаг 9: package.json

```json
{
  "name": "@daria/ui-react",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "peerDependencies": {
    "react": ">=18",
    "react-dom": ">=18"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  }
}
```

## Шаг 10: Exports

`src/index.ts`:

```ts
// Primitives
export * from './primitives/Button'
export * from './primitives/Input'
export * from './primitives/Badge'
export * from './primitives/Icon'

// Layout — closed set (I20)
export * from './layout/CardView'
export * from './layout/CardHeader'
export * from './layout/CardTimeline'
export * from './layout/CardSummary'
export * from './layout/CardActions'
export * from './layout/CardSectionStack'
export * from './layout/CardFooter'
export * from './layout/PanelHeader'
export * from './layout/PanelStream'
export * from './layout/PanelFooter'
export * from './layout/Section'
export * from './layout/Item'
export * from './layout/Field'
export * from './layout/ActionBar'

// Controls
export * from './controls/InversionButton'
export * from './controls/ModeToggle'
export * from './controls/SearchBar'
export * from './controls/SearchResults'

// Feedback
export * from './feedback/LiveRegion'
export * from './feedback/Spinner'
export * from './feedback/ErrorState'

// Utils
export { cn } from './utils/cn'
```

## Шаг 11: Storybook (опционально — nice to have)

```bash
pnpm add -D -F @daria/ui-react @storybook/react @storybook/addon-essentials
```

`packages/ui-react/.storybook/main.ts` + stories per component.

Можно делать позже, Phase 0 не блокирует.

## Checklist — Friday done (end of Week 2)

- [ ] `@daria/ui-react` builds
- [ ] Typecheck passes
- [ ] Button рендерит correct classes
- [ ] CardView + sub-components present
- [ ] InversionButton works
- [ ] LiveRegion aria-live correct
- [ ] All exports из `src/index.ts`
- [ ] Integration test — sample Next.js app renders <Button>

## Next

Week 3 / Monday: SigNoz deep setup → `11-signoz-setup.md`.
