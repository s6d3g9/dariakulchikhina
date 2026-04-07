# 12. Messenger + Services: матрица realtime-контуров

Документ покрывает три отдельные зоны, которые нельзя смешивать с основным Nuxt-приложением:

1. messenger/core — realtime backend и агентный runtime.
2. messenger/web — отдельный consumer-style web client.
3. services/communications-service — отдельный сервис коммуникаций.

## messenger/core -> bounded contexts

### Базовая инфраструктура
- messenger/core/src/index.ts остается bootstrap entrypoint
- messenger/core/src/config.ts остается config entrypoint
- messenger/core/src/server.ts -> messenger/core/src/realtime/server.ts

### Auth и crypto
- auth.ts -> auth/auth.ts
- auth-store.ts -> auth/auth-store.ts
- crypto-store.ts -> crypto/crypto-store.ts

### Contacts, conversations, media
- contact-store.ts -> contacts/contact-store.ts
- conversation-store.ts -> conversations/conversation-store.ts
- media-store.ts -> media/media-store.ts
- storage-paths.ts -> media/storage-paths.ts

### Agents и AI runtime
- agent-knowledge-presets.ts -> agents/agent-knowledge-presets.ts
- agent-knowledge-store.ts -> agents/agent-knowledge-store.ts
- agent-llm.ts -> agents/agent-llm.ts
- agent-run-store.ts -> agents/agent-run-store.ts
- agent-settings-store.ts -> agents/agent-settings-store.ts
- agent-store.ts -> agents/agent-store.ts
- agent-workspace-store.ts -> agents/agent-workspace-store.ts
- user-ai-settings-store.ts -> profile/user-ai-settings-store.ts

### Calls, transcription, project engine
- call-analysis-service.ts -> calls/call-analysis-service.ts
- livekit-stt-bot.ts -> calls/livekit-stt-bot.ts
- transcription-service.ts -> transcription/transcription-service.ts
- project-engine-store.ts -> project-engine/project-engine-store.ts

## messenger/web target FSD

- core/api/**
- core/realtime/messenger-realtime.ts
- core/calls/livekit.client.ts
- shared/ui/**
- entities/{agents,calls,contacts,conversations,media,messages,settings}/**
- features/{audio-draft,call-overlay,chat-composer,contact-invite,conversation-switch,message-thread,project-engine}/**
- widgets/{agent-workspace,chat,chats,contacts,settings,shell}/**
- pages/{index,login,register}.vue

## messenger/web key moves

### Shell и базовый каркас
- MessengerAppShell.vue -> widgets/shell/MessengerAppShell.vue
- MessengerIcon.vue -> shared/ui/MessengerIcon.vue
- MessengerDockField.vue -> shared/ui/MessengerDockField.vue
- MessengerAuthField.vue -> shared/ui/MessengerAuthField.vue
- MessengerProgressCircular.vue -> shared/ui/MessengerProgressCircular.vue
- MessengerProgressLinear.vue -> shared/ui/MessengerProgressLinear.vue

### Chat / chats / contacts / settings
- MessengerChatSection.vue -> widgets/chat/MessengerChatSection.vue
- MessengerChatsSection.vue -> widgets/chats/MessengerChatsSection.vue
- MessengerContactsSection.vue -> widgets/contacts/MessengerContactsSection.vue
- MessengerSettingsSection.vue -> widgets/settings/MessengerSettingsSection.vue
- MessengerChatHeader.vue -> features/conversation-switch/ui/MessengerChatHeader.vue
- MessengerMessageThread.vue -> features/message-thread/ui/MessengerMessageThread.vue
- MessengerChatComposerDock.vue -> features/chat-composer/ui/MessengerChatComposerDock.vue
- MessengerChatComposerContexts.vue -> features/chat-composer/ui/MessengerChatComposerContexts.vue
- MessengerChatMediaMenu.vue -> features/chat-composer/ui/MessengerChatMediaMenu.vue
- MessengerSharedGallery.vue -> entities/media/ui/MessengerSharedGallery.vue
- MessengerAudioBubblePlayer.vue -> entities/messages/ui/MessengerAudioBubblePlayer.vue
- MessengerAudioComposerDraft.vue -> features/audio-draft/ui/MessengerAudioComposerDraft.vue
- MessengerCallOverlay.vue -> features/call-overlay/ui/MessengerCallOverlay.vue
- MessengerCallAnalysisPanel.vue -> entities/calls/ui/MessengerCallAnalysisPanel.vue

### Agents и project engine
- MessengerAgentsSection.vue -> widgets/agent-workspace/MessengerAgentsSection.vue
- MessengerAgentGraphEditor.vue -> entities/agents/ui/MessengerAgentGraphEditor.vue
- MessengerAgentChatWorkspace.vue -> widgets/agent-workspace/MessengerAgentChatWorkspace.vue
- MessengerProjectEngineGraph.vue -> features/project-engine/ui/MessengerProjectEngineGraph.vue

### Composables
- useMessengerAuth.ts -> entities/auth/model/useMessengerAuth.ts
- useMessengerContacts.ts -> entities/contacts/model/useMessengerContacts.ts
- useMessengerConversations.ts -> entities/conversations/model/useMessengerConversations.ts
- useMessengerConversationState.ts -> entities/conversations/model/useMessengerConversationState.ts
- useMessengerRealtime.ts -> core/realtime/useMessengerRealtime.ts
- useMessengerCalls.ts -> entities/calls/model/useMessengerCalls.ts
- useMessengerCrypto.ts -> entities/messages/model/useMessengerCrypto.ts
- useMessengerSettings.ts -> entities/settings/model/useMessengerSettings.ts
- useMessengerSections.ts -> widgets/shell/model/useMessengerSections.ts
- useMessengerViewport.ts -> shared/composables/useMessengerViewport.ts
- useMessengerInstall.ts -> core/runtime/useMessengerInstall.ts
- useMessengerFeatures.ts -> core/runtime/useMessengerFeatures.ts
- useMessengerHoldActions.ts -> features/chat-composer/model/useMessengerHoldActions.ts
- useMessengerKlipy.ts -> entities/messages/model/useMessengerKlipy.ts
- useMessengerProjectEngine.ts -> features/project-engine/model/useMessengerProjectEngine.ts
- useMessengerAgents.ts -> entities/agents/model/useMessengerAgents.ts
- useMessengerAgentKnowledge.ts -> entities/agents/model/useMessengerAgentKnowledge.ts
- useMessengerAgentRuns.ts -> entities/agents/model/useMessengerAgentRuns.ts
- useMessengerAgentRuntime.ts -> entities/agents/model/useMessengerAgentRuntime.ts
- useMessengerAgentWorkspace.ts -> widgets/agent-workspace/model/useMessengerAgentWorkspace.ts
- useMessengerAgentEdgePayloads.ts -> entities/agents/model/useMessengerAgentEdgePayloads.ts

## services/communications-service

- src/index.ts и src/config.ts сохраняются
- src/auth.ts -> src/auth/auth.ts
- src/store.ts -> src/store/store.ts
- src/pg-store.ts -> src/store/pg-store.ts
- src/types.ts сохраняется

## Новые realtime-файлы первого этапа

### messenger/core
- realtime/server.ts
- auth/auth.ts
- auth/auth-store.ts
- agents/agent-run-store.ts
- calls/call-analysis-service.ts
- transcription/transcription-service.ts

### messenger/web
- core/realtime/messenger-realtime.ts
- widgets/shell/MessengerAppShell.vue
- widgets/chat/MessengerChatSection.vue
- widgets/chats/MessengerChatsSection.vue
- widgets/contacts/MessengerContactsSection.vue
- widgets/settings/MessengerSettingsSection.vue
- widgets/agent-workspace/MessengerAgentChatWorkspace.vue

### communications-service
- src/auth/auth.ts
- src/store/store.ts
- src/store/pg-store.ts

Эти файлы замыкают отдельный realtime-контур и позволяют рефакторить его независимо от main app.