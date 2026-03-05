# RAG-05: API и данные

## Аутентификация

| Эндпоинт | Метод | Назначение |
|---------|------|-----------|
| `/api/auth/login` | POST | Вход дизайнера (email + password) → cookie сессии |
| `/api/auth/logout` | POST | Выход дизайнера → удаление cookie |
| `/api/auth/me` | GET | Текущий пользователь (из cookie) |
| `/api/auth/client-login` | POST | Вход клиента (slug проекта) → cookie |
| `/api/auth/client-open` | GET | Проверка клиентской сессии |
| `/api/auth/client-id-logout` | POST | Выход клиента |
| `/api/auth/contractor-login` | POST | Вход подрядчика (id + slug) → cookie |
| `/api/auth/contractor-logout` | POST | Выход подрядчика |

## Проекты

| Эндпоинт | Метод | Назначение |
|---------|------|-----------|
| `/api/projects` | GET | Список всех проектов |
| `/api/projects` | POST | Создание проекта |
| `/api/projects/:slug` | GET | Детали проекта |
| `/api/projects/:slug` | PUT | Обновление проекта |
| `/api/projects/:slug` | DELETE | Удаление проекта |
| `/api/projects/:slug/page-content` | GET | Содержимое страниц |
| `/api/projects/:slug/page-content` | PUT | Сохранение содержимого |
| `/api/projects/:slug/page-answers` | GET | Ответы на вопросы страниц |
| `/api/projects/:slug/page-answers` | PUT | Сохранение ответов |
| `/api/projects/:slug/status` | PUT | Обновление статуса |
| `/api/projects/:slug/client-profile` | PUT | Профиль клиента проекта |
| `/api/projects/:slug/work-status` | GET | Статусы работ |
| `/api/projects/:slug/work-status` | PUT | Обновление статусов |
| `/api/projects/:slug/work-status/:itemId/comments` | GET/POST | Комментарии к задаче |
| `/api/projects/:slug/work-status/:itemId/photos` | GET | Фото задачи |
| `/api/projects/:slug/contractors` | GET/POST/DELETE | Подрядчики проекта |
| `/api/projects/:slug/contractors/:id` | DELETE | Отвязать подрядчика |
| `/api/projects/:slug/designers` | GET/POST/DELETE | Дизайнеры проекта |

## Клиенты

| Эндпоинт | Метод | Назначение |
|---------|------|-----------|
| `/api/clients` | GET | Список клиентов |
| `/api/clients` | POST | Создание клиента |
| `/api/clients/:id` | PUT | Обновление |
| `/api/clients/:id` | DELETE | Удаление |
| `/api/clients/:id/documents` | GET/POST | Документы клиента |
| `/api/clients/:id/documents/:docId` | DELETE | Удаление документа |
| `/api/clients/:id/link-project` | POST | Привязка к проекту |
| `/api/clients/:id/unlink-project` | POST | Отвязка от проекта |

## Подрядчики

| Эндпоинт | Метод | Назначение |
|---------|------|-----------|
| `/api/contractors` | GET | Список |
| `/api/contractors` | POST | Создание |
| `/api/contractors/:id` | GET/PUT/DELETE | CRUD |
| `/api/contractors/:id/documents` | GET/POST | Документы |
| `/api/contractors/:id/documents/:docId` | DELETE | Удаление документа |
| `/api/contractors/:id/projects` | GET | Проекты подрядчика |
| `/api/contractors/:id/staff` | GET | Сотрудники |
| `/api/contractors/:id/work-items` | GET/POST | Задачи подрядчика |
| `/api/contractors/:id/work-items/:itemId` | PUT | Обновление задачи |
| `/api/contractors/:id/work-items/:itemId/comments` | GET/POST | Комментарии |
| `/api/contractors/:id/work-items/:itemId/photos` | GET/POST | Фото |
| `/api/contractors/:id/work-items/:itemId/photos/:photoId` | DELETE | Удаление фото |
| `/api/contractors/:id/self` | PUT | Самообновление подрядчика |

## Дизайнеры

| Эндпоинт | Метод | Назначение |
|---------|------|-----------|
| `/api/designers` | GET | Список |
| `/api/designers` | POST | Создание |
| `/api/designers/:id` | GET/PUT/DELETE | CRUD |
| `/api/designers/:id/create-project` | POST | Создать проект |
| `/api/designers/:id/add-client` | POST | Добавить клиента |
| `/api/designers/:id/add-contractor` | POST | Добавить подрядчика |
| `/api/designers/:id/project` | PUT | Обновить проект дизайнера |
| `/api/designers/:id/remove-link` | POST | Удалить связь |
| `/api/designers/:id/documents` | GET/POST | Документы |

## Документы

| Эндпоинт | Метод | Назначение |
|---------|------|-----------|
| `/api/documents` | GET | Все документы |
| `/api/documents` | POST | Создание |
| `/api/documents/:id` | PUT | Обновление |
| `/api/documents/:id` | DELETE | Удаление |
| `/api/documents/context` | GET | Контекст для AI |

## Галерея

| Эндпоинт | Метод | Назначение |
|---------|------|-----------|
| `/api/gallery` | GET | Список (с фильтром по category) |
| `/api/gallery` | POST | Добавить элемент |
| `/api/gallery/:id` | PUT | Обновить |
| `/api/gallery/:id` | DELETE | Удалить |
| `/api/gallery/reorder` | PATCH | Изменить порядок |

## Настройки страниц

| Эндпоинт | Метод | Назначение |
|---------|------|-----------|
| `/api/page-configs` | GET | Список конфигов страниц |
| `/api/page-configs` | PUT | Обновление конфига |

## Прочие

| Эндпоинт | Метод | Назначение |
|---------|------|-----------|
| `/api/upload` | POST | Загрузка файла → `/public/uploads/` |
| `/api/suggestions` | GET | Подсказки (JSON-справочник) |
| `/api/suggest/address` | GET | Автодополнение адреса (Yandex) |
| `/api/geocode/address` | GET | Геокодирование (Yandex) |
| `/api/admin/search` | GET | Глобальный поиск по всем сущностям |
| `/api/admin/stats` | GET | Сводная статистика |
| `/api/ai/document` | POST | AI-генерация документа |
| `/api/ai/document-stream` | POST | AI-генерация (stream) |
| `/api/ai/legal-status` | GET | Правовой статус (AI) |
| `/api/public/projects` | GET | Публичный список проектов |

## Структура данных: Project

```typescript
{
  id: number
  slug: string          // уникальный идентификатор
  title: string
  status: string        // 'active' | 'paused' | 'completed' | 'archive'
  pages: PageConfig[]   // список страниц проекта
  profile: object       // метаданные (адрес, площадь, стиль и т.д.)
  taskTotal: number
  taskDone: number
  taskOverdue: number
}
```

## Структура данных: WorkStatusItem

```typescript
{
  id: number
  projectId: number
  contractorId: number | null
  title: string
  status: 'pending' | 'in_progress' | 'done' | 'overdue'
  workType: string
  roadmapStageId: number | null
  photos: Photo[]
  comments: Comment[]
}
```

## Загрузка файлов

- Эндпоинт: `POST /api/upload`
- Формат: `multipart/form-data`
- Сохраняется в: `public/uploads/`
- Возвращает: `{ url: '/uploads/filename.ext' }`
- Лимит: 10MB (server body-limit middleware)
