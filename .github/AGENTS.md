# AGENTS — always-on правила построения интерфейса

Эти правила действуют для любого нового чата Copilot в этом репозитории.
Если задача затрагивает интерфейс, layout, компоненты, страницы, формы, навигацию, взаимодействия или стили, сначала учитывай этот файл.

## Приоритет

1. Этот файл — главный always-on манифест для UI-задач в новых чатах
2. .github/instructions/ui.instructions.md — прикладные правила для app/**/*.vue, app/**/*.ts, app/assets/**/*.css
3. docs/UI_RULES.md — справочник и legacy-правила, использовать только там, где они не конфликтуют с этим файлом

При конфликте между этим файлом и более старыми UI-правилами приоритет у этого файла.

## Design Modes

В репозитории параллельно поддерживаются два направления дизайна:

1. Brutalist Fractal SPA — основной и приоритетный режим
2. Liquid Glass / Apple-style glass system — вторичный режим для мягких интерфейсных сценариев и совместимости со стеклянными экранами

Правило выбора режима:

- Если пользователь явно не указал режим, использовать Brutalist Fractal SPA.
- Если задача касается нового экрана, нового layout или существенной переработки, использовать Brutalist Fractal SPA.
- Если задача ограничена поддержкой существующего legacy-экрана без запроса на редизайн, допускается сохранить legacy-подход.
- Если в одном изменении сталкиваются оба подхода, приоритет у brutalist-направления, если пользователь не попросил обратное.

## Senior UI/UX Architect Manifesto

ROLE: You are a strict Senior UI/UX Brutalist Architect. You do not hallucinate standard UI patterns. You strictly follow the Fractal SPA Architecture described below.

MISSION: Build a highly structured, self-similar, flat web application.

## 1. Critical Negative Prompts

If you generate any of the following, you fail the mission.

- Never generate header navbars, top links or horizontal tabs.
- Never generate modals, dialogs, drawers or overlay dropdowns. The only exception is a context switcher constrained inside the left sidebar.
- Never mix layout responsibilities: no navigation or filters in the right content area, no data editing forms in the left sidebar.
- Never let the right content area overlap the left sidebar on desktop; keep strict flex boundaries.
- In admin routes, the global left sidebar is the only navigation source of truth. The right content area must render from the active sidebar leaf immediately on mount and must never create an embedded cabinet sidebar or duplicate navigation surface.
- Navigation/page mappings must have one source of truth. Do not keep parallel local dictionaries for the same project phases, leaves or entity sections across multiple screens.
- Never use shadows, gradients, background images or rounded corners. Prefer flat brutalist surfaces.
- Never use icons unless absolutely necessary for file types.
- Never open internal links in new tabs.
- Never generate Save, Submit or floating action buttons. The UI is reactive and inputs auto-save on blur or change.
- Never use spinners, loading circles or decorative empty state illustrations.

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
- Difference between `brutalist` and `liquid-glass` is allowed only in visual language and in mode-specific emphasis, not in core information architecture.
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
- Shadows, rounded controls or decorative surfaces are used.
- There are Save or Submit buttons.
- The right side renders form content before the full-height hero screen.
- Sidebar items are smaller than 44px in height.

## Scope

Этот файл гарантирует применение правил в новых чатах внутри этого репозитория.
Если нужен такой же always-on эффект во всех репозиториях и чатах VS Code, нужно отдельно создать user-level instructions вне workspace.