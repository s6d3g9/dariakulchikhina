# 12. Messenger + Services: project-centric topology и realtime-контуры

Документ описывает три отдельные isolated runtime'а, которые нельзя смешивать с основным Nuxt-приложением:

1. **`messenger/core`** — realtime backend и agentruntime. Управляет проектами, агентами и их конфигурацией.
2. **`messenger/web`** — FSD-структурированный consumer-style web client. Отличен от основной `app/`.
3. **`services/communications-service`** — сервис коммуникаций для E2EE-вызовов и WebRTC-сигнализации.

## Project-Centric Architecture (Wave8)

Вместо статичного списка 12 hardcoded агентов, messenger теперь организован вокруг **проектов** как верхнего уровня:

- **Проекты** — контейнер конфигурации (connectors, skills, plugins, MCP, external APIs).
- **Агенты** — создаются внутри проекта; доступные типы: Composer, Orchestrator, Worker, Custom.
- **Connectors** — Claude CLI subscription (primary), GitHub Copilot, OpenAI-compatible API (fallback).
- **Skills & Plugins** — наследуют глобальный набор + per-project overrides.
- **MCP servers** — проект декларирует свои MCP-endpoints; агенты их видят.
- **External APIs** — OpenAPI-совместимые сервисы (GitHub, Linear, Notion и т.д.).

Legacy 12-agents list переведён в **templates library** — доступны как стартовые конфигурации для новых проектов.

Все source и target пути ниже — репозиторно-корневые для машинной проверки `scripts/verify-architecture-docs.mjs`.

## messenger/core -> bounded contexts

### Базовая инфраструктура
- messenger/core/src/index.ts -> messenger/core/src/index.ts  (bootstrap entrypoint, stays)
- messenger/core/src/config.ts -> messenger/core/src/config.ts  (config entrypoint, stays)
- messenger/core/src/server.ts -> messenger/core/src/realtime/server.ts

### Auth и crypto
- messenger/core/src/auth.ts -> messenger/core/src/auth/auth.ts
- messenger/core/src/auth-store.ts -> messenger/core/src/auth/auth-store.ts
- messenger/core/src/crypto-store.ts -> messenger/core/src/crypto/crypto-store.ts

### Projects и конфигурация (Wave8)
- messenger/core/src/project-store.ts -> messenger/core/src/projects/project-store.ts (CRUD проектов, connectors, skills, plugins, MCP, external APIs)
- messenger/core/src/project-routes.ts -> messenger/core/src/projects/project-routes.ts (HTTP handlers для /projects/* endpoints)

### Contacts, conversations, media
- messenger/core/src/contact-store.ts -> messenger/core/src/contacts/contact-store.ts
- messenger/core/src/conversation-store.ts -> messenger/core/src/conversations/conversation-store.ts
- messenger/core/src/media-store.ts -> messenger/core/src/media/media-store.ts
- messenger/core/src/storage-paths.ts -> messenger/core/src/media/storage-paths.ts

### Agents и AI runtime
- messenger/core/src/agent-knowledge-presets.ts -> messenger/core/src/agents/agent-knowledge-presets.ts
- messenger/core/src/agent-knowledge-store.ts -> messenger/core/src/agents/agent-knowledge-store.ts
- messenger/core/src/agent-llm.ts -> messenger/core/src/agents/agent-llm.ts
- messenger/core/src/agent-run-store.ts -> messenger/core/src/agents/agent-run-store.ts
- messenger/core/src/agent-settings-store.ts -> messenger/core/src/agents/agent-settings-store.ts
- messenger/core/src/agent-store.ts -> messenger/core/src/agents/agent-store.ts (теперь включает project_id для scope)
- messenger/core/src/agent-workspace-store.ts -> messenger/core/src/agents/agent-workspace-store.ts
- messenger/core/src/user-ai-settings-store.ts -> messenger/core/src/profile/user-ai-settings-store.ts

### Calls, transcription, project engine
- messenger/core/src/call-analysis-service.ts -> messenger/core/src/calls/call-analysis-service.ts
- messenger/core/src/livekit-stt-bot.ts -> messenger/core/src/calls/livekit-stt-bot.ts
- messenger/core/src/transcription-service.ts -> messenger/core/src/transcription/transcription-service.ts
- messenger/core/src/project-engine-store.ts -> messenger/core/src/project-engine/project-engine-store.ts

## messenger/web target FSD (project-centric)

### Core runtime
- messenger/web/app/core/api/ (API client)
- messenger/web/app/core/realtime/messenger-realtime.ts
- messenger/web/app/core/calls/livekit.client.ts

### Shared UI & utilities
- messenger/web/app/shared/ui/
- messenger/web/app/shared/composables/

### Entities (project-centric Wave8)
- messenger/web/app/entities/projects/ (useMessengerProjects, ProjectCard)
- messenger/web/app/entities/connectors/ (useMessengerConnectors)
- messenger/web/app/entities/mcp/ (useMessengerMcp)
- messenger/web/app/entities/external-apis/ (useMessengerExternalApis)
- messenger/web/app/entities/{agents,calls,contacts,conversations,media,messages,settings}/

### Features (project-centric Wave8)
- messenger/web/app/features/project-create/ (ProjectCreateDialog)
- messenger/web/app/features/project-config/ (ProjectConfigTabs)
- messenger/web/app/features/agent-picker/ (AgentPicker)
- messenger/web/app/features/composer-bootstrap/ (ComposerBootstrapDialog)
- messenger/web/app/features/{audio-draft,call-overlay,chat-composer,contact-invite,conversation-switch,message-thread,project-engine}/

### Widgets (project-centric Wave8)
- messenger/web/app/widgets/projects-shell/ (ProjectsList)
- messenger/web/app/widgets/project-workspace/ (ProjectWorkspace с табами)
- messenger/web/app/widgets/{agent-workspace,chat,chats,contacts,settings,shell}/

### Pages (project-centric Wave8)
- messenger/web/app/pages/projects/index.vue (Project list)
- messenger/web/app/pages/projects/[projectSlug].vue (Project detail)
- messenger/web/app/pages/login.vue
- messenger/web/app/pages/register.vue
- messenger/web/app/pages/legacy-agents.vue (deprecated, фаза Phase 3)

## messenger/web key moves (Wave8 project-centric)

### Project-related components (новое — Wave8)
- messenger/web/app/components/projects/ProjectCreateDialog.vue -> messenger/web/app/features/project-create/ui/ProjectCreateDialog.vue
- messenger/web/app/components/projects/ProjectConfigTabs.vue -> messenger/web/app/features/project-config/ui/ProjectConfigTabs.vue (Connectors, Skills, Plugins, MCP, External APIs tabs)
- messenger/web/app/components/projects/ProjectCard.vue -> messenger/web/app/entities/projects/ui/ProjectCard.vue
- messenger/web/app/components/projects/ProjectsList.vue -> messenger/web/app/widgets/projects-shell/MessengerProjectsList.vue
- messenger/web/app/components/projects/ProjectWorkspace.vue -> messenger/web/app/widgets/project-workspace/MessengerProjectWorkspace.vue
- messenger/web/app/components/projects/AgentPicker.vue -> messenger/web/app/features/agent-picker/ui/AgentPicker.vue
- messenger/web/app/components/projects/ComposerBootstrapDialog.vue -> messenger/web/app/features/composer-bootstrap/ui/ComposerBootstrapDialog.vue

### Shell и базовый каркас
- messenger/web/app/components/messenger/MessengerAppShell.vue -> messenger/web/app/widgets/shell/MessengerAppShell.vue
- messenger/web/app/components/messenger/MessengerIcon.vue -> messenger/web/app/shared/ui/MessengerIcon.vue
- messenger/web/app/components/messenger/MessengerDockField.vue -> messenger/web/app/shared/ui/MessengerDockField.vue
- messenger/web/app/components/messenger/MessengerAuthField.vue -> messenger/web/app/shared/ui/MessengerAuthField.vue
- messenger/web/app/components/messenger/MessengerProgressCircular.vue -> messenger/web/app/shared/ui/MessengerProgressCircular.vue
- messenger/web/app/components/messenger/MessengerProgressLinear.vue -> messenger/web/app/shared/ui/MessengerProgressLinear.vue

### Chat / chats / contacts / settings
- messenger/web/app/components/messenger/MessengerChatSection.vue -> messenger/web/app/widgets/chat/MessengerChatSection.vue
- messenger/web/app/components/messenger/MessengerChatsSection.vue -> messenger/web/app/widgets/chats/MessengerChatsSection.vue
- messenger/web/app/components/messenger/MessengerContactsSection.vue -> messenger/web/app/widgets/contacts/MessengerContactsSection.vue
- messenger/web/app/components/messenger/MessengerSettingsSection.vue -> messenger/web/app/widgets/settings/MessengerSettingsSection.vue
- messenger/web/app/components/messenger/MessengerChatHeader.vue -> messenger/web/app/features/conversation-switch/ui/MessengerChatHeader.vue
- messenger/web/app/components/messenger/MessengerMessageThread.vue -> messenger/web/app/features/message-thread/ui/MessengerMessageThread.vue
- messenger/web/app/components/messenger/MessengerChatComposerDock.vue -> messenger/web/app/features/chat-composer/ui/MessengerChatComposerDock.vue
- messenger/web/app/components/messenger/MessengerChatComposerContexts.vue -> messenger/web/app/features/chat-composer/ui/MessengerChatComposerContexts.vue
- messenger/web/app/components/messenger/MessengerChatMediaMenu.vue -> messenger/web/app/features/chat-composer/ui/MessengerChatMediaMenu.vue
- messenger/web/app/components/messenger/MessengerSharedGallery.vue -> messenger/web/app/entities/media/ui/MessengerSharedGallery.vue
- messenger/web/app/components/messenger/MessengerAudioBubblePlayer.vue -> messenger/web/app/entities/messages/ui/MessengerAudioBubblePlayer.vue
- messenger/web/app/components/messenger/MessengerAudioComposerDraft.vue -> messenger/web/app/features/audio-draft/ui/MessengerAudioComposerDraft.vue
- messenger/web/app/components/messenger/MessengerCallOverlay.vue -> messenger/web/app/features/call-overlay/ui/MessengerCallOverlay.vue
- messenger/web/app/components/messenger/MessengerCallAnalysisPanel.vue -> messenger/web/app/entities/calls/ui/MessengerCallAnalysisPanel.vue

### Agents и project engine
- messenger/web/app/components/messenger/MessengerAgentsSection.vue -> messenger/web/app/widgets/agent-workspace/MessengerAgentsSection.vue
- messenger/web/app/components/messenger/MessengerAgentGraphEditor.vue -> messenger/web/app/entities/agents/ui/MessengerAgentGraphEditor.vue
- messenger/web/app/components/messenger/MessengerAgentChatWorkspace.vue -> messenger/web/app/widgets/agent-workspace/MessengerAgentChatWorkspace.vue
- messenger/web/app/components/messenger/MessengerProjectEngineGraph.vue -> messenger/web/app/features/project-engine/ui/MessengerProjectEngineGraph.vue

### Composables (Wave8 project-centric additions)
- messenger/web/app/composables/useMessengerProjects.ts -> messenger/web/app/entities/projects/model/useMessengerProjects.ts (CRUD projects)
- messenger/web/app/composables/useMessengerConnectors.ts -> messenger/web/app/entities/connectors/model/useMessengerConnectors.ts (CRUD connectors)
- messenger/web/app/composables/useMessengerMcp.ts -> messenger/web/app/entities/mcp/model/useMessengerMcp.ts (CRUD MCP servers)
- messenger/web/app/composables/useMessengerExternalApis.ts -> messenger/web/app/entities/external-apis/model/useMessengerExternalApis.ts (CRUD external APIs)
- messenger/web/app/composables/useProjectCreate.ts -> messenger/web/app/features/project-create/model/useProjectCreate.ts
- messenger/web/app/composables/useComposerBootstrap.ts -> messenger/web/app/features/composer-bootstrap/model/useComposerBootstrap.ts

### Composables (existing)
- messenger/web/app/composables/useMessengerAuth.ts -> messenger/web/app/entities/auth/model/useMessengerAuth.ts
- messenger/web/app/composables/useMessengerContacts.ts -> messenger/web/app/entities/contacts/model/useMessengerContacts.ts
- messenger/web/app/composables/useMessengerConversations.ts -> messenger/web/app/entities/conversations/model/useMessengerConversations.ts
- messenger/web/app/composables/useMessengerConversationState.ts -> messenger/web/app/entities/conversations/model/useMessengerConversationState.ts
- messenger/web/app/composables/useMessengerRealtime.ts -> messenger/web/app/core/realtime/useMessengerRealtime.ts
- messenger/web/app/composables/useMessengerCalls.ts -> messenger/web/app/entities/calls/model/useMessengerCalls.ts
- messenger/web/app/composables/useMessengerCrypto.ts -> messenger/web/app/entities/messages/model/useMessengerCrypto.ts
- messenger/web/app/composables/useMessengerSettings.ts -> messenger/web/app/entities/settings/model/useMessengerSettings.ts
- messenger/web/app/composables/useMessengerSections.ts -> messenger/web/app/widgets/shell/model/useMessengerSections.ts
- messenger/web/app/composables/useMessengerViewport.ts -> messenger/web/app/shared/composables/useMessengerViewport.ts
- messenger/web/app/composables/useMessengerInstall.ts -> messenger/web/app/core/runtime/useMessengerInstall.ts
- messenger/web/app/composables/useMessengerFeatures.ts -> messenger/web/app/core/runtime/useMessengerFeatures.ts
- messenger/web/app/composables/useMessengerHoldActions.ts -> messenger/web/app/features/chat-composer/model/useMessengerHoldActions.ts
- messenger/web/app/composables/useMessengerKlipy.ts -> messenger/web/app/entities/messages/model/useMessengerKlipy.ts
- messenger/web/app/composables/useMessengerProjectEngine.ts -> messenger/web/app/features/project-engine/model/useMessengerProjectEngine.ts
- messenger/web/app/composables/useMessengerAgents.ts -> messenger/web/app/entities/agents/model/useMessengerAgents.ts
- messenger/web/app/composables/useMessengerAgentKnowledge.ts -> messenger/web/app/entities/agents/model/useMessengerAgentKnowledge.ts
- messenger/web/app/composables/useMessengerAgentRuns.ts -> messenger/web/app/entities/agents/model/useMessengerAgentRuns.ts
- messenger/web/app/composables/useMessengerAgentRuntime.ts -> messenger/web/app/entities/agents/model/useMessengerAgentRuntime.ts
- messenger/web/app/composables/useMessengerAgentWorkspace.ts -> messenger/web/app/widgets/agent-workspace/model/useMessengerAgentWorkspace.ts
- messenger/web/app/composables/useMessengerAgentEdgePayloads.ts -> messenger/web/app/entities/agents/model/useMessengerAgentEdgePayloads.ts

## services/communications-service

- services/communications-service/src/index.ts -> services/communications-service/src/index.ts  (bootstrap, stays)
- services/communications-service/src/config.ts -> services/communications-service/src/config.ts  (config, stays)
- services/communications-service/src/auth.ts -> services/communications-service/src/auth/auth.ts
- services/communications-service/src/store.ts -> services/communications-service/src/store/store.ts
- services/communications-service/src/pg-store.ts -> services/communications-service/src/store/pg-store.ts
- services/communications-service/src/types.ts -> services/communications-service/src/types.ts  (contracts, stays)

## Новые realtime-файлы (Wave8 project-centric)

### messenger/core (Wave8 additions)
- messenger/core/src/projects/project-store.ts (CRUD projects, connectors, skills, plugins, MCP, external APIs)
- messenger/core/src/projects/project-routes.ts (HTTP handlers for /projects/*, /projects/:id/*, /projects/:id/agents)
- messenger/core/src/agents/agent-store.ts (обновлено для поддержки project_id)

### messenger/web (Wave8 additions)
- messenger/web/app/entities/projects/model/useMessengerProjects.ts
- messenger/web/app/entities/connectors/model/useMessengerConnectors.ts
- messenger/web/app/entities/mcp/model/useMessengerMcp.ts
- messenger/web/app/entities/external-apis/model/useMessengerExternalApis.ts
- messenger/web/app/features/project-create/ui/ProjectCreateDialog.vue
- messenger/web/app/features/project-create/model/useProjectCreate.ts
- messenger/web/app/features/project-config/ui/ProjectConfigTabs.vue
- messenger/web/app/features/agent-picker/ui/AgentPicker.vue
- messenger/web/app/features/composer-bootstrap/ui/ComposerBootstrapDialog.vue
- messenger/web/app/features/composer-bootstrap/model/useComposerBootstrap.ts
- messenger/web/app/widgets/projects-shell/MessengerProjectsList.vue
- messenger/web/app/widgets/project-workspace/MessengerProjectWorkspace.vue
- messenger/web/app/pages/projects/index.vue
- messenger/web/app/pages/projects/[projectSlug].vue

### Наследованные из Wave7
- messenger/core/src/realtime/server.ts
- messenger/core/src/auth/auth.ts
- messenger/core/src/auth/auth-store.ts
- messenger/core/src/agents/agent-run-store.ts
- messenger/core/src/calls/call-analysis-service.ts
- messenger/core/src/transcription/transcription-service.ts

### messenger/web (Wave7 refactored)
- messenger/web/app/core/realtime/messenger-realtime.ts
- messenger/web/app/widgets/shell/MessengerAppShell.vue
- messenger/web/app/widgets/chat/MessengerChatSection.vue
- messenger/web/app/widgets/chats/MessengerChatsSection.vue
- messenger/web/app/widgets/contacts/MessengerContactsSection.vue
- messenger/web/app/widgets/settings/MessengerSettingsSection.vue
- messenger/web/app/widgets/agent-workspace/MessengerAgentChatWorkspace.vue

### communications-service
- services/communications-service/src/auth/auth.ts
- services/communications-service/src/store/store.ts
- services/communications-service/src/store/pg-store.ts

Эти файлы замыкают отдельный realtime-контур и позволяют рефакторить его независимо от main app. Теперь с поддержкой project-centric архитектуры.

## Current Status vs Target (2026-04-20, Wave8 project-centric)

- Status source: `14-refactor-roadmap.md`, doc-23, и completed wave8 phases.
- **Что достигнуто (Wave8 W1-W6)**:
  - W1: project-centric DB schema с `messenger_projects`, connectors, skills, plugins, MCP, external APIs
  - W2: Core API (`project-store.ts`, `project-routes.ts`) с CRUD и дымовыми тестами
  - W3: Frontend projects shell с navigation (/projects, /projects/:slug)
  - W4: Connectors + Skills/Plugins tabs с per-project config
  - W5: MCP + External APIs tabs с CRUD и health-checks
  - W6: Agent creation (Composer) + bootstrap dialog (manual/auto modes) + JSON proposal parsing
  - Отдельные runtime-контуры (`messenger/core`, `messenger/web`, `services/communications-service`) независимы от main Nuxt app
  - FSD-структура в `messenger/web/app/{entities,features,widgets,pages}` для проектов и связанных конфигураций
- **W7 (Wave8) — это wave текущей документации**:
  - Переводим 12-agents hardcoded list в templates library для per-project использования
  - Актуализируем doc-12 с project-centric топологией (текущий документ)
  - Добавляем roadmap-записи по W1-W7 с commit SHA'ами
  - Помечаем Phase 7 acceptance criteria как complete в doc-23
- **Критерий завершения Wave8**: realtime-контур полностью спроектирован для project-centric моделі; легаси `/legacy-agents` удален в Phase 3 (будущее).
