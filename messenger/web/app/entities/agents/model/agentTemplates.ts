export interface AgentTemplate {
  key: 'composer' | 'orchestrator' | 'worker' | 'custom'
  icon: string
  title: string
  description: string
  color: string
  recommended: boolean
}

export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    key: 'composer',
    icon: 'mdi-robot-outline',
    title: 'Composer',
    description: 'Главный агент проекта. Координирует остальных, анализирует задачи, предлагает конфигурацию.',
    color: 'primary',
    recommended: true,
  },
  {
    key: 'orchestrator',
    icon: 'mdi-graph-outline',
    title: 'Orchestrator',
    description: 'Управляет цепочками задач и делегирует выполнение worker-агентам.',
    color: 'secondary',
    recommended: false,
  },
  {
    key: 'worker',
    icon: 'mdi-hammer-wrench',
    title: 'Worker',
    description: 'Выполняет конкретную задачу: код, текст, анализ, API-вызовы.',
    color: 'info',
    recommended: false,
  },
  {
    key: 'custom',
    icon: 'mdi-cog-outline',
    title: 'Custom',
    description: 'Агент с произвольным системным промптом и конфигурацией.',
    color: 'surface-variant',
    recommended: false,
  },
]
