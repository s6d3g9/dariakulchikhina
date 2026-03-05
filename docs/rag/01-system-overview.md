# RAG-01: Обзор системы Daria Design Studio

## Что это

CRM/ERP-система для дизайн-студии интерьеров.  
Три роли: Admin (дизайнер), Client (клиент), Contractor (подрядчик).

## Стек

- **Frontend**: Nuxt 4 (Vue 3 Composition API), Tailwind CSS 4, @nuxt/ui 3
- **Backend**: Nuxt server (H3), Drizzle ORM, PostgreSQL 16, Redis 7
- **Аутентификация**: HMAC cookie-сессии (SHA-256, 30 дней)
- **Деплой**: PM2 + rsync + deploy-safe.sh

## Структура директорий

```
app/
  components/    60 Vue-компонентов
  pages/         19 маршрутов
  layouts/       admin.vue · default.vue · contractor.vue
  middleware/    admin.ts · client.ts · contractor.ts
  composables/   10 модулей состояния
  assets/css/    main.css (2055 строк)
server/
  api/           95 эндпоинтов
  db/            schema.ts (19 таблиц), index.ts
  middleware/    4 (security, rate-limit, body-limit, CSRF)
shared/
  types/         12 файлов типов + Zod-схем
  constants/     pages.ts · profile-fields.ts
docs/            архитектура, UI-документация, RAG-файлы
```

## База данных (ключевые таблицы)

| Таблица | Назначение |
|---------|-----------|
| `users` | Администраторы/дизайнеры (email + passwordHash) |
| `projects` | Проекты (slug unique, pages[], profile{}) |
| `clients` | Клиенты (name, phone, email, brief{}) |
| `contractors` | Подрядчики (slug, workTypes[], contractorType) |
| `work_status_items` | Задачи/работы проекта |
| `roadmap_stages` | Этапы дорожной карты |
| `gallery_items` | Галерея (category, tags[], properties{}) |
| `documents` | Документы проекта |

## Сессии и безопасность

- Сессии в HMAC-подписанных cookie (SHA-256)
- CSRF-токены на мутирующих запросах
- Rate limiting на API
- CSP nonce через серверный плагин
- Body size limit: 10MB

## Кэш (Redis 7)

- Порт: 6380 (Docker)
- Используется для: кэширования API-ответов, сессионного хранилища (вспомогательно)
- Ключи: `project:*`, `gallery:*`, `contractors:*`
