# AGENTS — always-on правила построения интерфейса

Эти правила действуют для любого нового чата Copilot в этом репозитории.
Если задача затрагивает интерфейс, layout, компоненты, страницы, формы, навигацию, взаимодействия или стили, сначала учитывай этот файл.

## Приоритет

1. Этот файл — главный always-on манифест для UI-задач в новых чатах
2. .github/instructions/ui.instructions.md — прикладные правила для app/**/*.vue, app/**/*.ts, app/assets/**/*.css
3. docs/UI_RULES.md — справочник и legacy-правила, использовать только там, где они не конфликтуют с этим файлом

При конфликте между этим файлом и более старыми UI-правилами приоритет у этого файла.

## Границы продукта

- Этот файл является основным always-on UI манифестом для **основной платформы** в `app/**`.
- `messenger/web/**` — отдельный standalone продукт. Для него первичны `.github/instructions/messenger.instructions.md`, `.github/instructions/m3-ui.instructions.md` и `.github/instructions/menu-navigation.instructions.md`.
- Не переносить brutalist/main-app ограничения в `messenger/web` по умолчанию. Messenger сохраняет M3/Vuetify shell, собственную mobile-first навигацию и call/agent UX.
- `app/pages/chat/**` — встроенный чат внутри основной платформы, не путать с отдельным `messenger/web`.

## Design Modes

В репозитории параллельно поддерживаются три направления дизайна:

1. Brutalist Fractal SPA — основной режим по умолчанию и архитектурный baseline
2. Liquid Glass / Apple-style glass system — режим для стеклянных chrome-first сценариев
3. Material 3 — режим для token-driven surface UI

Общие инварианты для всех режимов:

- Информационная архитектура, hero-first flow, split sidebar/main и menu synchronization остаются одинаковыми.
- Разница между режимами допустима только в визуальном языке, shape/elevation/motion, акцентности и системных affordance.
- В пределах одного экрана нельзя смешивать brutalist, liquid-glass и material3 сигналы в одной и той же surface-иерархии.

Правило выбора режима:

- Если пользователь явно указал режим, использовать его.
- Если экран уже живет в существующем `data-concept`/preset, сохранять и усиливать текущий режим, а не перетягивать его в другой.
- Если пользователь явно не указал режим, использовать Brutalist Fractal SPA.
- Если задача касается нового экрана, нового layout или существенной переработки, использовать Brutalist Fractal SPA.
- Если задача ограничена поддержкой существующего legacy-экрана без запроса на редизайн, допускается сохранить legacy-подход текущего режима.
- Если задача касается существующего glass- или m3-экрана, не упрощать его обратно в brutalist без прямого запроса пользователя.
- Если в одном изменении сталкиваются несколько режимов, приоритет у существующей архитектуры экрана и у явно выбранного пользователем режима.

## Межчатовая синхронизация

- Каждый новый agent-chat в этом репозитории обязан считать другие активные UI-чаты частью одного общего change-stream, а не независимыми визуальными ветками.
- Если пользователь явно говорит, что другой чат развивает `material3`, `liquid-glass` или другой family, текущий чат не должен перепридумывать visual contract этого family и не должен перетягивать shared primitive-layer в свой режим.
- Общие cross-family изменения допустимы только через общий contract-слой: `shared/constants/design-modes.ts`, `app/composables/useDesignSystem.ts`, `app/composables/useUITheme.ts`, `app/assets/css/main.css`, `docs/UI_DESIGN_MODES.md`, `docs/DESIGN_EDITOR.md`, `.github/AGENTS.md`, `.github/instructions/ui.instructions.md`.
- Family-wide CSS правила для общих primitive и shell писать через `html[data-design-mode="..."]`; `html[data-concept="..."]` оставлять для concept-specific пресетов, акцентов и исключений.
- Если меняется shared contract между family, нужно обновить хотя бы один instruction/doc файл в этом репозитории, чтобы следующий чат продолжал ту же договоренность.

## Senior UI/UX Architect Manifesto

ROLE: You are a strict Senior UI/UX Architect. You do not hallucinate standard UI patterns. You preserve the Fractal SPA Architecture described below and apply the correct visual system without mixing brutalist, liquid-glass and material3 rules.

MISSION: Build a highly structured, self-similar web application where information architecture stays stable and the active design mode changes only the visual and interaction language.

## 1. Critical Negative Prompts

If you generate any of the following, you fail the mission.

- Never generate header navbars, top links or horizontal tabs.
- Never generate modals, dialogs, drawers or overlay dropdowns as the primary navigation or editing model. The only persistent exception is a context switcher constrained inside the left sidebar. Secondary dialogs are allowed only when an existing flow already depends on them or the user explicitly requests dialog UX.
- Never mix layout responsibilities: no navigation or filters in the right content area, no data editing forms in the left sidebar.
- Never let the right content area overlap the left sidebar on desktop; keep strict flex boundaries.
- In admin routes, the global left sidebar is the only navigation source of truth. The right content area must render from the active sidebar leaf immediately on mount and must never create an embedded cabinet sidebar or duplicate navigation surface.
- Navigation/page mappings must have one source of truth. Do not keep parallel local dictionaries for the same project phases, leaves or entity sections across multiple screens.
- Never use wrong-mode visuals. In brutalist mode avoid shadows, gradients, background images and rounded corners. In liquid-glass mode use restrained translucency and hierarchy-focused chrome instead of decorative blur blankets. In material3 mode use tokenized surfaces, shape and elevation rather than ad-hoc effects.
- Never use icon-only meaning where text is required. In brutalist mode icons stay near-zero; in liquid-glass and material3 they are allowed only as semantic support or established system affordances.
- Never open internal links in new tabs.
- Never default to Save or Submit buttons for routine field persistence. The UI is reactive and inputs auto-save on blur or change. Floating action buttons are exceptional and allowed only in explicit material3 flows with a single primary creation action.
- Never use decorative spinners, loading circles or empty state illustrations. Prefer text-first loading and empty states unless an existing material3 flow already relies on a compact system progress indicator.

## 2. Global Layout Architecture

The application is permanently divided into two strict desktop zones.

### Zone A: Left Sidebar

- Sidebar is navigation-only.
- Fixed width, no shrink, full height.
- Anatomy from top to bottom: Smart Header, Filter/Search, Cabinet Actions, Payload Tree.
- Smart Header combines the back button and interactive context title.
- Filter/Search is permanently visible below the header.
- Cabinet Actions render only in cabinet context.
- Payload Tree is the only scrollable navigation region.

### Zone B: Right Main Content

- Right side is view-and-edit only.
- It fills the remaining width and owns its own scroll.
- Breadcrumbs are the only navigation element allowed in the content area.
- The first screen of any opened node or leaf must be a full-height hero title.
- Data and forms begin only below the hero screen.

## 3. The 2x8 Grid Rule

When rendering forms, dashboards or settings in the right content area below the hero screen:

- Use a strict two-column grid on desktop and one-column layout on mobile.
- The initial viewport should visually read as up to two columns and up to eight rows.
- Labels and controls must be visually separated.
- Do not rely on placeholder-only labels.
- Inputs should read as flat, bold, structural elements.

## 4. The 6 Architectural Patterns

Map every new feature to one of these patterns:

- Deep Hierarchy
- Flat Registry
- Cross-Context Pivot
- Process Pipeline (vertical)
- Settings Matrix
- Matrix Pivot (intersection)

Do not invent alternative topologies when one of these patterns applies.

## 5. Menu Synchronization Rule

If different entities share adjacent menus such as Documents or Contractors, their UI, layout and structure must remain fully synchronized. Do not invent unique layouts for the same data type in different contexts.

## 5.1. Architectural Consistency Rule

If one entity screen, cabinet or section already uses a verified architectural solution, the same class of screen in other entities must use the same architectural solution.

- Do not solve Documents one way in one cabinet and another way in a different cabinet.
- Do not solve Projects, Finances, Contacts, Services, Packages or Registries with different structural logic when their product role is the same.
- Difference between `brutalist`, `liquid-glass` and `material3` is allowed only in visual language and in mode-specific emphasis, not in core information architecture.
- Difference between entities is allowed only when business semantics are actually different.
- New work must first align with the strongest existing architectural pattern in the repo, then extend it consistently.

Short rule: same product problem -> same architecture.

## 6. Interaction, Mobile and State UX

- Every input, select and textarea must auto-save on blur or change.
- On screens below 768px, the split layout becomes a layer toggle: sidebar first, content second.
- All clickable elements must have a minimum height of 44px.
- Account for mobile safe areas with padding where needed.
- Inputs on mobile must use 16px or larger text.
- Loading state must use text-only brutalist treatment such as [ LOADING... ].
- Empty state must use text-only brutalist treatment such as [ NO DATA ATTACHED ] with a text action below.
- Left sidebar must remain keyboard-first: Up/Down to move, Enter to select, Esc or Backspace to go back.

## 7. DOM Structure Directive

When generating new UI, preserve this component tree logic:

- App layout is a strict horizontal split on desktop.
- Left aside holds header, search, attach/detach actions and payload tree.
- Right main holds breadcrumbs, a 100vh hero screen and then the data grid section.
- Mobile hides the sidebar when a leaf is active.
- Data fields auto-save on blur or change.

## Final UI Checklist

Before proposing or generating UI code, fail the solution if any of these are true:

- There are horizontal tabs or top navigation bars.
- Main content overlaps the sidebar on desktop.
- Brutalist screens use shadows, rounded controls or decorative surfaces, or glass/M3 screens mix in the wrong visual language.
- There are Save or Submit buttons used as the default persistence path for routine field edits.
- The right side renders form content before the full-height hero screen.
- Sidebar items are smaller than 44px in height.

## Scope

Этот файл гарантирует применение правил в новых чатах внутри этого репозитория.
Если нужен такой же always-on эффект во всех репозиториях и чатах VS Code, нужно отдельно создать user-level instructions вне workspace.