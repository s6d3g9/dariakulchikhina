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
```text
server/
├── api/                        # КОНТРОЛЛЕРЫ (Тонкий слой)
│   ├── projects/
│   ├── chat/
│   ├── theme/                  # Эндпоинты дизайн-системы
│   └── uploads/
│       └── presigned-url.get.ts# Выдает ссылку S3 для прямой загрузки
│
├── services/                   # БИЗНЕС-ЛОГИКА
│   ├── project.service.ts      # Вся логика фаз, проверка версий (OCC)
│   ├── document.service.ts     
│   └── theme.service.ts        
│
├── event-bus/                  # ИНТЕГРАЦИЯ
│   └── publisher.ts            # Отправка событий в Redis
│
├── db/                         # СЛОЙ ДАННЫХ
│   ├── schema/                 # Таблицы (см. пункт 3.1)
│   └── index.ts                # Клиент Drizzle (через PgBouncer)
│
└── utils/
```