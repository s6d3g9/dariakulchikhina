import type { MessengerAgentKnowledgeSourceRecord, MessengerAgentRepositoryRecord, MessengerAgentSettingsRecord } from './agent-settings-store.ts'

export interface MessengerAgentKnowledgePreset {
  summary: string
  repositories: MessengerAgentRepositoryRecord[]
  activeRepositoryId: string
  sources: MessengerAgentKnowledgeSourceRecord[]
}

function cloneRepositories(repositories: MessengerAgentRepositoryRecord[]) {
  return repositories.map(repository => ({ ...repository }))
}

function resolvePresetRepositories(settings: MessengerAgentSettingsRecord) {
  if (settings.ssh.repositories.length) {
    return {
      repositories: cloneRepositories(settings.ssh.repositories),
      activeRepositoryId: settings.ssh.activeRepositoryId || settings.ssh.repositories[0]?.id || '',
    }
  }

  const fallbackPath = settings.ssh.workspacePath.trim() || '/opt/daria-nuxt'
  return {
    repositories: [{
      id: 'repo-1',
      label: 'daria-nuxt',
      path: fallbackPath,
    }],
    activeRepositoryId: 'repo-1',
  }
}

function buildSource(
  agentId: string,
  sourceId: string,
  label: string,
  path: string,
  repositoryId: string,
): MessengerAgentKnowledgeSourceRecord {
  return {
    id: `${agentId}-${sourceId}`,
    label,
    repositoryId,
    path,
    type: 'rag',
    enabled: true,
  }
}

export function getMessengerAgentKnowledgePreset(settings: MessengerAgentSettingsRecord): MessengerAgentKnowledgePreset {
  const { repositories, activeRepositoryId } = resolvePresetRepositories(settings)
  const repositoryId = activeRepositoryId || repositories[0]?.id || 'repo-1'

  const byAgentId: Record<string, { summary: string; sources: MessengerAgentKnowledgeSourceRecord[] }> = {
    orchestrator: {
      summary: 'Базовый контур orchestration: messenger overview, deploy-path и общая архитектура продукта.',
      sources: [
        buildSource(settings.agentId, 'messenger-overview', 'Messenger Overview', 'docs/messenger/README.md', repositoryId),
        buildSource(settings.agentId, 'messenger-deploy', 'Messenger Deploy', 'docs/messenger/DEPLOY.md', repositoryId),
        buildSource(settings.agentId, 'platform-architecture', 'Platform Architecture', 'docs/ARCHITECTURE.md', repositoryId),
      ],
    },
    'messenger-ui': {
      summary: 'Точечный UI-контекст для messenger: продуктовые правила, M3 и standalone shell.',
      sources: [
        buildSource(settings.agentId, 'messenger-rules', 'Messenger Instructions', '.github/instructions/messenger.instructions.md', repositoryId),
        buildSource(settings.agentId, 'm3-rules', 'Messenger M3 UI', '.github/instructions/m3-ui.instructions.md', repositoryId),
        buildSource(settings.agentId, 'messenger-overview', 'Messenger Overview', 'docs/messenger/README.md', repositoryId),
      ],
    },
    'realtime-calls': {
      summary: 'Realtime и звонки: secret chat requirements, deploy baseline и messenger scope.',
      sources: [
        buildSource(settings.agentId, 'secret-chat', 'Secret Chat TZ', 'docs/messenger/SECRET_CHAT_TZ.md', repositoryId),
        buildSource(settings.agentId, 'messenger-deploy', 'Messenger Deploy', 'docs/messenger/DEPLOY.md', repositoryId),
        buildSource(settings.agentId, 'messenger-overview', 'Messenger Overview', 'docs/messenger/README.md', repositoryId),
      ],
    },
    'platform-ui': {
      summary: 'Основной UI-контекст платформы: brutalist architecture, UI contract и interface map.',
      sources: [
        buildSource(settings.agentId, 'ui-architecture', 'UI Architecture Rules', '.github/AGENTS.md', repositoryId),
        buildSource(settings.agentId, 'ui-rules', 'UI Instructions', '.github/instructions/ui.instructions.md', repositoryId),
        buildSource(settings.agentId, 'ui-interface', 'UI Interface', 'docs/UI_INTERFACE.md', repositoryId),
      ],
    },
    'api-platform': {
      summary: 'API-контракт платформы: server rules, H3/Zod patterns и Redis helper notes.',
      sources: [
        buildSource(settings.agentId, 'api-rules', 'API Instructions', '.github/instructions/api.instructions.md', repositoryId),
        buildSource(settings.agentId, 'backend-guide', 'Backend Guide', 'docs/rag/BACKEND_GUIDE.md', repositoryId),
        buildSource(settings.agentId, 'redis-patterns', 'Redis Patterns', 'docs/rag/REDIS_PATTERNS.md', repositoryId),
      ],
    },
    'db-platform': {
      summary: 'База данных и migrations: DB instructions, Drizzle patterns и словарь классов.',
      sources: [
        buildSource(settings.agentId, 'db-rules', 'DB Instructions', '.github/instructions/db.instructions.md', repositoryId),
        buildSource(settings.agentId, 'drizzle-patterns', 'Drizzle Patterns', 'docs/rag/DRIZZLE_PATTERNS.md', repositoryId),
        buildSource(settings.agentId, 'class-dictionary', 'Class Dictionary', 'docs/rag/CLASS_DICTIONARY.md', repositoryId),
      ],
    },
    'qa-release': {
      summary: 'Релизный messenger baseline: deploy doc, ecosystem config и product scope.',
      sources: [
        buildSource(settings.agentId, 'messenger-deploy', 'Messenger Deploy', 'docs/messenger/DEPLOY.md', repositoryId),
        buildSource(settings.agentId, 'messenger-ecosystem', 'Messenger Ecosystem', 'messenger/ecosystem.config.cjs', repositoryId),
        buildSource(settings.agentId, 'messenger-overview', 'Messenger Overview', 'docs/messenger/README.md', repositoryId),
      ],
    },
  }

  const preset = byAgentId[settings.agentId] ?? {
    summary: 'Для этого агента пока нет встроенного knowledge template.',
    sources: [],
  }

  return {
    summary: preset.summary,
    repositories,
    activeRepositoryId,
    sources: preset.sources,
  }
}