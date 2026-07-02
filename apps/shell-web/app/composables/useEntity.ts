import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import type { Entity } from '@daria/shell-panels/entity'
import {
  createRefactorProvider,
  refactorProvider,
  type EntityProvider,
} from '../providers/refactor-provider'

declare global {
  interface Window {
    __SHELL_API_BASE__?: string
  }
}

type EntityView = Entity['view']

export interface UseEntityOptions {
  kind?: MaybeRefOrGetter<string>
  id: MaybeRefOrGetter<string | null | undefined>
  view?: MaybeRefOrGetter<EntityView>
  apiBase?: MaybeRefOrGetter<string | undefined>
  provider?: EntityProvider
  immediate?: boolean
}

function resolveApiBase(explicit: string | undefined): string | undefined {
  if (explicit) {
    return explicit
  }

  if (typeof window !== 'undefined') {
    return window.__SHELL_API_BASE__
  }

  return undefined
}

export function useEntity(options: UseEntityOptions) {
  const entity = ref<Entity | null>(null)
  const pending = ref(false)
  const error = ref<Error | null>(null)

  const kind = computed(() => toValue(options.kind) ?? 'person-profile')
  const id = computed(() => toValue(options.id) ?? null)
  const view = computed<EntityView>(() => toValue(options.view) ?? 'instance')
  const apiBase = computed(() => resolveApiBase(toValue(options.apiBase)))

  async function refresh() {
    const currentId = id.value
    if (!currentId) {
      entity.value = null
      error.value = null
      return null
    }

    pending.value = true
    error.value = null

    try {
      const provider = options.provider ?? (apiBase.value
        ? createRefactorProvider({ apiBase: apiBase.value })
        : refactorProvider)
      const nextEntity = await provider.getEntity(kind.value, currentId, view.value)
      entity.value = nextEntity
      return nextEntity
    } catch (cause) {
      const nextError = cause instanceof Error ? cause : new Error(String(cause))
      error.value = nextError
      entity.value = null
      return null
    } finally {
      pending.value = false
    }
  }

  if (options.immediate !== false) {
    watch([kind, id, view, apiBase], () => {
      void refresh()
    }, { immediate: true })
  }

  return {
    entity,
    pending,
    error,
    refresh,
  }
}
