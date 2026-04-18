import type { HybridControlPhase, HybridControlSprint, HybridControlTask } from '~~/shared/types/project'

export const phaseStatusLabels: Record<HybridControlPhase['status'], string> = {
  planned: 'запланирована',
  active: 'в работе',
  blocked: 'заблокирована',
  done: 'завершена',
}

export const sprintStatusLabels: Record<HybridControlSprint['status'], string> = {
  planned: 'запланирован',
  active: 'активен',
  review: 'на ревью',
  done: 'завершён',
}

export const taskStatusLabels: Record<HybridControlTask['status'], string> = {
  todo: 'к запуску',
  doing: 'в работе',
  review: 'на ревью',
  done: 'готово',
}
