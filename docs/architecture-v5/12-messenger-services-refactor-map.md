# 12. Messenger + Services: матрица realtime-контуров

Документ покрывает три отдельные зоны, которые нельзя смешивать с основным Nuxt-приложением:

1. `messenger/core` — realtime backend и агентный runtime.
2. `messenger/web` — отдельный consumer-style web client.
3. `services/communications-service` — отдельный сервис коммуникаций.

Все source и target пути — репозиторно-корневые, чтобы `scripts/verify-architecture-docs.mjs` мог машинно проверять их существование.

## messenger/core -> bounded contexts

### Базовая инфраструктура
- messenger/core/src/index.ts -> messenger/core/src/index.ts  (bootstrap entrypoint, stays)
- messenger/core/src/config.ts -> messenger/core/src/config.ts  (config entrypoint, stays)
- messenger/core/src/server.ts -> messenger/core/src/realtime/server.ts

### Auth и crypto
- messenger/core/src/auth.ts -> messenger/core/src/auth/auth.ts
- messenger/core/src/auth-store.ts -> messenger/core/src/auth/auth-store.ts
- messenger/core/src/crypto-store.ts -> messenger/core/src/crypto/crypto-store.ts

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
- messenger/core/src/agent-store.ts -> messenger/core/src/agents/agent-store.ts
- messenger/core/src/agent-workspace-store.ts -> messenger/core/src/agents/agent-workspace-store.ts
- messenger/core/src/user-ai-settings-store.ts -> messenger/core/src/profile/user-ai-settings-store.ts

### Calls, transcription, project engine
- messenger/core/src/call-analysis-service.ts -> messenger/core/src/calls/call-analysis-service.ts
- messenger/core/src/livekit-stt-bot.ts -> messenger/core/src/calls/livekit-stt-bot.ts
- messenger/core/src/transcription-service.ts -> messenger/core/src/transcription/transcription-service.ts
- messenger/core/src/project-engine-store.ts -> messenger/core/src/project-engine/project-engine-store.ts

## messenger/web target FSD

- messenger/web/app/core/api/
- messenger/web/app/core/realtime/messenger-realtime.ts
- messenger/web/app/core/calls/livekit.client.ts
- messenger/web/app/shared/ui/
- messenger/web/app/entities/{agents,calls,contacts,conversations,media,messages,settings}/
- messenger/web/app/features/{audio-draft,call-overlay,chat-composer,contact-invite,conversation-switch,message-thread,project-engine}/
- messenger/web/app/widgets/{agent-workspace,chat,chats,contacts,settings,shell}/
- messenger/web/app/pages/index.vue
- messenger/web/app/pages/login.vue
- messenger/web/app/pages/register.vue

## messenger/web key moves

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

### Composables
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

## Новые realtime-файлы первого этапа

### messenger/core
- messenger/core/src/realtime/server.ts
- messenger/core/src/auth/auth.ts
- messenger/core/src/auth/auth-store.ts
- messenger/core/src/agents/agent-run-store.ts
- messenger/core/src/calls/call-analysis-service.ts
- messenger/core/src/transcription/transcription-service.ts

### messenger/web
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

Эти файлы замыкают отдельный realtime-контур и позволяют рефакторить его независимо от main app.

## Current Status vs Target (2026-04-20)

- Status source: `15-target-alignment-audit.md` (статус: **Aligned**, 68/68 move rows done).
- Все 68 переносов выполнены: `messenger/core/src/**` разложен по 11 bounded contexts; `messenger/web/app/**` соответствует FSD; `services/communications-service/src/**` разложен по auth/store.
- Realtime-контур полностью независим от main Nuxt app; cross-boundary-контракты идут только через `shared/**`.
