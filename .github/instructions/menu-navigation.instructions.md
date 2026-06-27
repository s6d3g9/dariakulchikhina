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

## Menu text discipline

- Меню, picker и project-action панели должны быть самодостаточными по структуре: кнопка открывает меню, внутри сразу идут control и список.
- Не дублировать название открытого меню отдельной шапкой, если это не добавляет новой информации.
- Не вставлять под шапкой поясняющий абзац, который описывает уже очевидное действие пользователя.
- Для выбора сущности использовать схему `поиск + прокручиваемый список` в одном окне, без скрытия списка до первого ввода.
- В `MessengerChatComposerDock` левая entry-кнопка project actions является фиксированной точкой навигации по уровням: открыть меню → вернуться на один уровень назад → закрыть только на корневом уровне.
- В admin-сессии entry-кнопка project actions остаётся единственной точкой входа: сначала над dock открывается список ролей, затем список участников выбранной роли, затем мини-кабинет.
- В admin-сессии не выносить роль и выбранного участника в обязательные persistent chips рядом с entry-кнопкой; уровни читаются через верхнюю expansion-панель и back-step от молнии.
- Admin flow для project actions фиксированный: `роль → список участников роли → мини-кабинет`, без промежуточных explanatory screen-ов и без параллельной дублирующей навигации в нижнем rail.
- Внутри admin mini-кабинета первой кнопкой сверху идёт chooser закреплённых проектов участника; если проектов нет, там должен быть видимый плюс, а не текстовая заглушка.
- Кнопка проекта идёт следующей для не-admin flow и для admin после выбора участника; она поддерживает два валидных состояния: конкретный проект или `Все проекты`.
- Если проект не выбран, overview-уровень project actions должен показывать агрегированный список/таймлайн/спринты/субъекты по всем проектам подряд; выбор конкретного проекта сужает данные до него.
- Если chat context уже определяет роль/субъект, picker и subject overview внутри project actions должны приоритетно показывать сущности именно этой роли.

## Запрещено

- ❌ переводить section switches на отдельные file routes без прямой архитектурной задачи
- ❌ возвращать `VBottomNavigation` вместо текущего shell nav
- ❌ убирать feature-gated `agents` из state-модели, если задача не про отключение feature
- ❌ ломать disabled-логику `chat` при отсутствии открытого диалога
- ❌ перегружать menu/picker-панели дублирующими заголовками и поясняющим текстом вместо немедленного показа controls и списка