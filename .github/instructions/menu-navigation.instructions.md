---
applyTo: "messenger/web/**"
---

# Messenger — navigation and shell structure

> Source of truth для standalone messenger shell: `messenger/web/app/components/messenger/MessengerAppShell.vue`, `messenger/web/app/composables/useMessengerConversationState.ts`, `messenger/web/app/composables/useMessengerSections.ts`.

## Route shell

- `messenger/web/app/pages/login.vue` — login
- `messenger/web/app/pages/register.vue` — register
- `messenger/web/app/pages/index.vue` — authenticated shell
- в production messenger живет под base URL `/messenger/`; в local dev/preview корневой route может быть `/`

После auth section switches происходят внутри `MessengerAppShell`, а не через отдельные file routes на каждую секцию.

## Section state model

`useMessengerConversationState()` хранит:

```ts
activeConversationId: string | null
activeSection: 'chat' | 'chats' | 'contacts' | 'agents' | 'settings'
mediaSheetOpen: boolean
```

`useMessengerSections()` определяет набор доступных секций:

- базовые: `chat`, `chats`, `contacts`, `settings`
- дополнительная: `agents`, только если включен feature flag

Правила:

- `chat` не должен активироваться без `activeConversationId`
- `agents` не должен рендериться, если feature выключен
- section keys являются shell contract; не переименовывать их без синхронной правки composables и UI

## Shell layout

### Desktop

- слева — `messenger-desktop-nav`
- справа — `messenger-section-wrap` с mounted section components

### Mobile

- снизу — кастомный `messenger-bottom-nav`
- nav скрывается, когда открыта клавиатура, media sheet или analysis panel
- `MessengerCallOverlay` остается частью shell и может перекрывать sections

Важно:

- shell использует собственную bottom nav разметку, а не `VBottomNavigation`
- detached audio call header резервирует верхнее пространство shell через data-state, а не через отдельный route

## Текущий набор section components

- `MessengerChatSection`
- `MessengerChatsSection`
- `MessengerContactsSection`
- `MessengerAgentsSection` (feature-gated)
- `MessengerSettingsSection`

## Navigation contract

Порядок nav items должен совпадать с shell contract:

1. `chat`
2. `chats`
3. `contacts`
4. `agents` (если включен)
5. `settings`

Дополнительные правила:

- `chat` disabled, если нет активного диалога
- section switch не должен ломать state уже смонтированных секций
- shell scroll reset допустим только после section switch и только если нет активного/incoming call state

## Dock and content zones

- `chat` — header + thread + media menu + `MessengerChatComposerDock`
- `chats` — conversation list + нижний search dock
- `contacts` — contacts/invites list + нижний search dock
- `agents` — agent chats, graph/workspace/project-engine flows
- `settings` — account/privacy/device/AI settings; dock/search только если сценарий реально это использует

Bottom dock остается частью shell contract. Не переносить search/composer наверх как substitute page header.

## Запрещено

- ❌ переводить section switches на отдельные file routes без прямой архитектурной задачи
- ❌ возвращать `VBottomNavigation` вместо текущего shell nav
- ❌ убирать feature-gated `agents` из state-модели, если задача не про отключение feature
- ❌ ломать disabled-логику `chat` при отсутствии открытого диалога