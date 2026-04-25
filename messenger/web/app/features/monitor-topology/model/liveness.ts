import type { MessengerCliSession } from '../../../entities/sessions/model/useMessengerCliSessions'

// Liveness — derived "what is this session doing right now" view, kept on the
// frontend so we can refine it without round-tripping the schema. Priority is
// deliberate: terminal states (done/crashed) win over runtime states; the
// awaiting-user signal pre-empts everything else because it gates a human.
export type LivenessState =
  | 'streaming'
  | 'thinking'
  | 'tool'
  | 'awaiting-user'
  | 'idle-fresh'
  | 'idle-deep'
  | 'crashed'
  | 'done'

export interface LivenessMeta {
  state: LivenessState
  // Short Russian micro-copy for inline display.
  label: string
  // Vuetify color token; not a hard CSS color so theming stays consistent.
  color: 'primary' | 'secondary' | 'warning' | 'error' | 'success' | 'on-surface-variant'
  // Material icon name shown next to the row title for the at-a-glance state.
  icon: string
  // Whether the dot/accent should pulse — reserved for "alive right now".
  animated: boolean
  // Whether this state should be surfaced as user-attention demand
  // (drives the awaiting counter, badges, focus-grabbing styles).
  demandsAttention: boolean
  // Long-form sr-only sentence for screen readers and tooltips.
  srLabel: string
}

const AWAITING_SUBSTATE_PATTERNS = ['awaiting', 'tool_use_request', 'permission_request', 'human_input']

function elapsedToHuman(idleForMs: number | null | undefined): string {
  const ms = idleForMs ?? 0
  if (ms < 60_000) return `${Math.max(0, Math.floor(ms / 1000))} с`
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)} мин`
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)} ч`
  return `${Math.floor(ms / 86_400_000)} д`
}

function isAwaitingSubstate(substate: string | null | undefined): boolean {
  if (!substate) return false
  const lower = substate.toLowerCase()
  return AWAITING_SUBSTATE_PATTERNS.some(p => lower.includes(p))
}

function isStreamingSubstate(substate: string | null | undefined): boolean {
  if (!substate) return false
  const lower = substate.toLowerCase()
  return lower.includes('stream') || lower.includes('text_delta') || lower.includes('content_block')
}

export function deriveLiveness(session: MessengerCliSession): LivenessMeta {
  // Terminal: failed run wins over plain "done" so users can spot crashes
  // without opening the trace pane.
  const failed = session.runStatus === 'failed' || session.runStatus === 'errored' || Boolean(session.runError)
  if (session.status === 'done') {
    if (failed) {
      return {
        state: 'crashed',
        label: 'упала',
        color: 'error',
        icon: 'mdi-alert-circle-outline',
        animated: false,
        demandsAttention: true,
        srLabel: `Сессия завершилась с ошибкой${session.runError ? `: ${session.runError}` : ''}`,
      }
    }
    return {
      state: 'done',
      label: 'завершено',
      color: 'on-surface-variant',
      icon: 'mdi-check-circle-outline',
      animated: false,
      demandsAttention: false,
      srLabel: 'Сессия успешно завершена',
    }
  }

  // Awaiting-user — pre-empts every running state because nothing on the
  // server side will move it forward without a human.
  if (isAwaitingSubstate(session.lastSubstate)) {
    return {
      state: 'awaiting-user',
      label: 'ждёт ответа',
      color: 'warning',
      icon: 'mdi-hand-back-right-outline',
      animated: true,
      demandsAttention: true,
      srLabel: 'Сессия ждёт вашего ответа',
    }
  }

  // Active windows: tool > streaming > thinking. We trust isActive (server
  // computes it from a 90 s freshness window) over re-deriving from idleForMs.
  if (session.isActive) {
    if (session.lastTool) {
      return {
        state: 'tool',
        label: `вызывает ${session.lastTool}`,
        color: 'secondary',
        icon: 'mdi-wrench-outline',
        animated: true,
        demandsAttention: false,
        srLabel: `Сессия использует инструмент ${session.lastTool}`,
      }
    }
    if (isStreamingSubstate(session.lastSubstate)) {
      return {
        state: 'streaming',
        label: 'пишет ответ',
        color: 'primary',
        icon: 'mdi-pencil-outline',
        animated: true,
        demandsAttention: false,
        srLabel: 'Сессия генерирует ответ',
      }
    }
    return {
      state: 'thinking',
      label: 'думает',
      color: 'primary',
      icon: 'mdi-thought-bubble-outline',
      animated: false,
      demandsAttention: false,
      srLabel: 'Сессия размышляет',
    }
  }

  // Idle: fresh < 15 min, deep ≥ 15 min. Source of truth is server-computed
  // isIdle (uses ACTIVITY_IDLE_MS). idleForMs is just for the human label.
  if (session.isIdle) {
    return {
      state: 'idle-deep',
      label: `глубокий простой ${elapsedToHuman(session.idleForMs)}`,
      color: 'on-surface-variant',
      icon: 'mdi-sleep',
      animated: false,
      demandsAttention: false,
      srLabel: 'Сессия в глубоком простое — возможно зависла',
    }
  }

  return {
    state: 'idle-fresh',
    label: `тишина ${elapsedToHuman(session.idleForMs)}`,
    color: 'on-surface-variant',
    icon: 'mdi-clock-outline',
    animated: false,
    demandsAttention: false,
    srLabel: 'Сессия временно молчит',
  }
}
