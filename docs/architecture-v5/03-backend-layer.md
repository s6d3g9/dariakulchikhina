# 3. Слой Бэкенда (server/ - Domain-Driven Design)

## 3.1. Архитектура Базы Данных (Схема хранения)
Для поддержки E2EE, ChatOps, оффлайн-режима (OCC) и MinIO, схема БД спроектирована следующим образом (псевдокод Drizzle ORM):

### Ядро и Авторизация (E2EE support)
- `users`: id, email, role, password_hash.
- **Поля для E2EE**: `public_key` (открытый ключ пользователя для зашифровки), `encrypted_private_key` (закрытый ключ, зашифрованный через KEK), `master_key_salt` (соль для PBKDF2).

### Сущности и Оффлайн (OCC & Soft Delete)
- `projects`: id, slug, status, details (JSONB).
- **Поля для оффлайна**: `version` (INT, инкрементится при каждом UPDATE для OCC), `deleted_at` (Soft Delete: оффлайн клиент должен знать, что проект удален, а не просто пропал).
- `work_status_items` (Задачи): id, project_id, status, version, deleted_at.

### Мессенджер и ChatOps
- `chats`: id, project_id (nullable), type (direct | group | project_room), is_e2ee (BOOLEAN).
- `chat_members`: chat_id, user_id, role.
- `messages`: id, chat_id, sender_id.
- **Контент**: `text` (открытый текст ИЛИ Base64 криптограмма, если чат E2EE).
- **ChatOps**: `type` (string, напр. 'widget_approval'), `payload` (JSONB для виджетов).
- **Пагинация**: `created_at` (B-Tree Индекс для курсорной пагинации).

### Хранение файлов (MinIO)
- `attachments`: id, entity_type ('message' | 'project' | 'document'), entity_id.
- **Хранение**: `s3_object_key` (ключ в MinIO), size, mime_type.
- **Для E2EE файлов**: `encryption_iv` (вектор инициализации), `encrypted_aes_key` (если прикреплено не к сообщению, а к сущности).

## 3.2. Структура директорий

> **Статус:** целевая раскладка. Фактический прогресс см. в `15-target-alignment-audit.md` и `14-refactor-roadmap.md`.

```text
server/
├── api/                        # КОНТРОЛЛЕРЫ (Тонкий слой, thin-controller)
│   ├── projects/               # Zod/readValidatedBody + вызов modules/projects/*.service.ts
│   ├── chat/
│   ├── gallery/
│   ├── documents/
│   └── uploads/
│       └── presigned-url.get.ts# Выдает ссылку S3 для прямой загрузки
│
├── modules/                    # БИЗНЕС-ЛОГИКА (DDD-lite bounded domains)
│   ├── auth/                   # auth.service.ts, session.service.ts, recovery.service.ts
│   ├── projects/               # projects.service.ts, project-work-status.service.ts, ...
│   ├── communications/         # communications-bootstrap + project-communications-relay
│   │   └── communications-publisher.ts  # Отправка событий в Redis (интеграция с messenger)
│   ├── chat/
│   ├── gallery/
│   ├── documents/
│   ├── uploads/
│   ├── admin/                  # admin-search, admin-notifications
│   ├── admin-settings/
│   ├── agent-registry/
│   └── ai/                     # rag.service.ts, gemma.service.ts, document-stream.service.ts
│
├── db/                         # СЛОЙ ДАННЫХ
│   ├── index.ts                # Клиент Drizzle (через PgBouncer)
│   ├── schema/                 # Таблицы, разбитые по доменам (см. 3.1 и 11)
│   └── relations/              # Drizzle-relations, изолированные от определений таблиц
│
├── middleware/                 # requireAdmin*, CSRF, security headers
├── plugins/                    # Nitro-плагины (Redis pub/sub subscribers и т.п.)
└── utils/                      # Только инфраструктурные хелперы:
                                # auth, body, query, messenger-cors, gemma (доменные utils
                                # перенесены в modules/**)
```

**Правило владения:**

- `server/api/**` — HTTP/validation/auth, никакой прямой работы с БД или MinIO.
- `server/modules/**` — единственное место, где живут Drizzle-запросы, транзакции, бизнес-правила и публикация событий.
- `server/utils/**` — только platform-agnostic инфраструктурные хелперы, которые нужны контроллерам (парсинг тела, query, auth-guards).
- `server/db/**` — только определения таблиц, relations и клиент Drizzle.

Интеграция с Redis Pub/Sub и MinIO всегда оформляется как сервис внутри профильного модуля (`communications-publisher.ts`, `upload-storage.service.ts`), а не как глобальный `event-bus/`.