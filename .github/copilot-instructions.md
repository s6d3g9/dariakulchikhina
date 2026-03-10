# GitHub Copilot Instructions — dariakulchikhina

## Проект
Платформа управления дизайн-проектами интерьера. Три роли: дизайнер (admin), клиент, подрядчик.

## Стек
- **Nuxt 4** + **Vue 3** SFC (Composition API, `<script setup>`)
- **TypeScript** везде
- **Tailwind 4** + **Nuxt UI 3** (`UApp`, `UButton`, etc.)
- **Pinia** — стейт (`app/stores/`)
- **Drizzle ORM** — PostgreSQL (`server/db/schema.ts`, `server/db/index.ts`)
- **H3** — API endpoints (`server/api/**`)
- **Zod** — валидация на сервере
- **ioredis** — кэш, rate-limit, сессии
- **Ollama / Gemma** — локальная LLM (`server/utils/gemma.ts`)
- **PM2** — production процесс (`ecosystem.config.cjs`)

## Роли → маршруты
| Роль | Login | Кабинет | Layout | Middleware |
|---|---|---|---|---|
| Дизайнер | `/admin/login` | `/admin`, `/admin/projects/[slug]` | `admin.vue` | `admin.ts` |
| Клиент | `/project/login` | `/project/[slug]` | встроен | `project.ts` |
| Подрядчик | `/contractor/login` | `/contractor/[id]` | `contractor.vue` | `contractor.ts` |

## Структура папок
```
app/
  components/     — Vue компоненты (Admin*, Client*, UI*)
  composables/    — useDesignSystem, useAdminNav, useGallery…
  layouts/        — admin.vue, contractor.vue, default.vue
  pages/          — admin/, client/, contractor/
  assets/css/     — main.css (все глобальные стили + page transitions)
server/
  api/            — REST endpoints (H3 + Zod)
  db/             — schema.ts, index.ts (Drizzle)
  utils/          — auth.ts, gemma.ts, rag.ts, storage.ts…
shared/
  types/          — общие TypeScript типы
  constants/      — pages.ts, profile-fields.ts
docs/
  rag/            — RAG-документация (читай INDEX.md как навигатор)
  UI_RULES.md     — правила UI (читай перед правкой компонентов)
  DESIGN_EDITOR.md — UIDesignPanel
```

## CSS примитивы (используй ТОЛЬКО эти)
| Элемент | Класс |
|---|---|
| Поверхность | `.glass-surface` / `.glass-card` |
| Инпут | `.glass-input` / `.glass-input--inline` |
| Кнопка основная | `.a-btn-save` |
| Кнопка малая | `.a-btn-sm` |
| Кнопка danger | `.a-btn-sm.a-btn-danger` |
| Кнопка AI | `.a-btn-ai` |
| Навигация admin | `.ent-nav-item` |
| Навигация cabinet | `.cab-nav-item` |
| Статус | `.ws-status--{state}` |
| Dropdown | `.glass-dropdown` |
| Пустое состояние | `.u-empty` / `.cab-empty` |
| Форма — секция | `.u-form-section` |
| Форма — поле | `.u-field` + `.u-field__label` |

## Admin layout
```
adm-util-bar  — фиксированная полоска сверху справа (поиск, тема, выйти)
ent-sidebar   — фиксированный сайдбар, заполняется через <Teleport to="#admin-sidebar-portal">
adm-main      — <slot /> контент
```

## Дизайн-система (`useDesignSystem`)
- Все токены в `app/composables/useDesignSystem.ts` (типы `DesignTokens`)
- Редактор дизайна — `app/components/UIDesignPanel.vue`
- Применяется через CSS custom properties (`--glass-*`, `--ds-*`)
- Переходы страниц: `app/app.vue` читает `tokens.archPageEnter` + `tokens.pageTransitDuration`, CSS классы `pt-*` в `main.css`

## Навигация (AdminNestedNav)
- Единый компонент `app/components/AdminNestedNav.vue`
- Используется только в `app/layouts/admin.vue`
- Структура навигации: `app/composables/useAdminNav.ts`

## API паттерн (H3 + Drizzle)
```ts
// server/api/resource/index.get.ts
export default defineEventHandler(async (event) => {
  const { limit, offset } = safeGetQuery(event, schema)
  const db = useDb()
  return await db.select().from(table).limit(limit).offset(offset)
})
```

## Deploy
- Сервер: `152.53.176.165`, пользователь `admin2`, SSH алиас `daria-deploy`
- SSH ключ: `~/.ssh/admin2_id_ed25519`
- Путь на сервере: `/opt/daria-nuxt`
- PM2 app: `daria-nuxt`
- Команда: `pnpm deploy:safe:prod` или `bash scripts/deploy-safe.sh`

## ПРАВИЛО ДЕПЛОЯ (обязательно, без исключений)

> **Перед любым деплоем Copilot ОБЯЗАН:**
> 1. `git add -A` — сохранить все изменения
> 2. `git commit -m "..."` — закоммитить локально
> 3. `git push origin main` — отправить на GitHub
> 4. Только после этого — `bash scripts/deploy-safe.sh`

Это правило нельзя обойти. `deploy-safe.sh` завершится с ошибкой если есть незакоммиченные или непушенные изменения.

## Правила кода
- Не добавлять `console.log` в production код
- Валидировать входные данные на сервере через Zod
- Не использовать `getQuery` напрямую — использовать `safeGetQuery` из `server/utils/query.ts`
- CSS: не использовать Tailwind-классы напрямую в компонентах — использовать глобальные CSS примитивы
- Темная тема: `html.dark .class { }` — не использовать `@media (prefers-color-scheme: dark)`
- Все строки в рус. интерфейсе — на русском

## Документация (docs/rag/)
Перед правкой читай:
- `docs/rag/INDEX.md` — навигатор по всей документации
- `docs/UI_RULES.md` — правила UI
- `docs/rag/BACKEND_GUIDE.md` — API паттерны
- `docs/rag/DRIZZLE_PATTERNS.md` — работа с БД

## Always-on правила интерфейса
- Для любого нового чата в этом репозитории учитывать `.github/AGENTS.md` как always-on набор правил по построению интерфейса.
- При любых UI-изменениях сначала опираться на `.github/AGENTS.md`; при конфликте этот файл важнее `docs/UI_RULES.md` и `.github/instructions/ui.instructions.md`.
