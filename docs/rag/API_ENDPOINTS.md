# API_ENDPOINTS — карта API-эндпоинтов

> RAG-файл. Перед написанием нового $fetch — найди здесь нужный эндпоинт.
> Все пути `/api/...`. Формат Nuxt 3 server routes (file-based).

---

## Аутентификация

| Метод | Путь | Описание |
|-------|------|----------|
| `POST` | `/api/auth/login` | Вход дизайнера (role=designer) |
| `POST` | `/api/auth/logout` | Выход дизайнера |
| `GET`  | `/api/auth/me` | Текущий пользователь (role, id) |
| `POST` | `/api/auth/client-login` | Вход клиента по паролю проекта |
| `POST` | `/api/auth/client-id-logout` | Выход клиента |
| `GET`  | `/api/auth/client-open` | Открытый доступ к проекту (по токену) |
| `POST` | `/api/auth/contractor-login` | Вход подрядчика |
| `POST` | `/api/auth/contractor-logout` | Выход подрядчика |

---

## Проекты

| Метод | Путь | Описание |
|-------|------|----------|
| `GET`    | `/api/projects` | Список всех проектов |
| `POST`   | `/api/projects` | Создать проект |
| `GET`    | `/api/projects/[slug]` | Получить проект по slug |
| `PUT`    | `/api/projects/[slug]` | Обновить проект |
| `DELETE` | `/api/projects/[slug]` | Удалить проект |
| `PUT`    | `/api/projects/[slug]/status` | Обновить статус проекта |
| `GET`    | `/api/projects/[slug]/page-content` | Получить контент вкладок |
| `PUT`    | `/api/projects/[slug]/page-content` | Сохранить контент вкладки |
| `GET`    | `/api/projects/[slug]/page-answers` | Ответы на вопросы страниц |
| `PUT`    | `/api/projects/[slug]/page-answers` | Сохранить ответы |
| `PUT`    | `/api/projects/[slug]/client-profile` | Обновить профиль клиента в проекте |
| `GET`    | `/api/projects/[slug]/work-status` | Список задач (ход работ) |
| `PUT`    | `/api/projects/[slug]/work-status` | Обновить задачи |
| `GET`    | `/api/projects/[slug]/work-status/[itemId]/comments` | Комментарии к задаче |
| `POST`   | `/api/projects/[slug]/work-status/[itemId]/comments` | Добавить комментарий |
| `GET`    | `/api/projects/[slug]/work-status/[itemId]/photos` | Фото задачи |
| `GET`    | `/api/projects/[slug]/extra-services` | Доп. услуги проекта |
| `POST`   | `/api/projects/[slug]/extra-services` | Добавить доп. услугу |
| `PUT`    | `/api/projects/[slug]/extra-services/[id]` | Обновить доп. услугу |
| `DELETE` | `/api/projects/[slug]/extra-services/[id]` | Удалить доп. услугу |
| `POST`   | `/api/projects/[slug]/extra-services/[id]/generate-docs` | Генерировать документы по услуге |
| `GET`    | `/api/projects/[slug]/contractors` | Привязанные подрядчики |
| `POST`   | `/api/projects/[slug]/contractors` | Привязать подрядчика |
| `DELETE` | `/api/projects/[slug]/contractors` | Отвязать всех подрядчиков |
| `DELETE` | `/api/projects/[slug]/contractors/[contractorId]` | Отвязать подрядчика по id |
| `GET`    | `/api/projects/[slug]/designers` | Привязанные дизайнеры |
| `POST`   | `/api/projects/[slug]/designers` | Привязать дизайнера |
| `DELETE` | `/api/projects/[slug]/designers` | Отвязать дизайнера |
| `GET`    | `/api/projects/[slug]/sellers` | Привязанные поставщики |
| `POST`   | `/api/projects/[slug]/sellers` | Привязать поставщика |
| `DELETE` | `/api/projects/[slug]/sellers` | Отвязать поставщика |
| `GET`    | `/api/public/projects` | Публичный список проектов (без авторизации) |

---

## Клиенты

| Метод | Путь | Описание |
|-------|------|----------|
| `GET`    | `/api/clients` | Список клиентов |
| `POST`   | `/api/clients` | Создать клиента |
| `PUT`    | `/api/clients/[id]` | Обновить клиента |
| `DELETE` | `/api/clients/[id]` | Удалить клиента |
| `GET`    | `/api/clients/[id]/documents` | Документы клиента |
| `POST`   | `/api/clients/[id]/documents` | Загрузить документ клиента |
| `DELETE` | `/api/clients/[id]/documents/[docId]` | Удалить документ клиента |
| `POST`   | `/api/clients/[id]/link-project` | Привязать клиента к проекту |
| `POST`   | `/api/clients/[id]/unlink-project` | Отвязать клиента от проекта |

---

## Подрядчики

| Метод | Путь | Описание |
|-------|------|----------|
| `GET`    | `/api/contractors` | Список подрядчиков |
| `POST`   | `/api/contractors` | Создать подрядчика |
| `GET`    | `/api/contractors/[id]` | Получить подрядчика |
| `PUT`    | `/api/contractors/[id]` | Обновить подрядчика (дизайнер) |
| `PUT`    | `/api/contractors/[id]/self` | Самостоятельное обновление (подрядчик) |
| `DELETE` | `/api/contractors/[id]` | Удалить подрядчика |
| `GET`    | `/api/contractors/[id]/staff` | Бригада / сотрудники компании |
| `GET`    | `/api/contractors/[id]/projects` | Проекты подрядчика |
| `GET`    | `/api/contractors/[id]/work-items` | Рабочие задачи подрядчика |
| `POST`   | `/api/contractors/[id]/work-items` | Добавить задачу |
| `PUT`    | `/api/contractors/[id]/work-items/[itemId]` | Обновить задачу |
| `GET`    | `/api/contractors/[id]/work-items/[itemId]/comments` | Комментарии |
| `POST`   | `/api/contractors/[id]/work-items/[itemId]/comments` | Добавить комментарий |
| `GET`    | `/api/contractors/[id]/work-items/[itemId]/photos` | Фото задачи |
| `POST`   | `/api/contractors/[id]/work-items/[itemId]/photos` | Загрузить фото |
| `DELETE` | `/api/contractors/[id]/work-items/[itemId]/photos/[photoId]` | Удалить фото |
| `GET`    | `/api/contractors/[id]/documents` | Документы подрядчика |
| `POST`   | `/api/contractors/[id]/documents` | Загрузить документ |
| `DELETE` | `/api/contractors/[id]/documents/[docId]` | Удалить документ |

---

## Дизайнеры

| Метод | Путь | Описание |
|-------|------|----------|
| `GET`    | `/api/designers` | Список дизайнеров |
| `POST`   | `/api/designers` | Создать дизайнера |
| `GET`    | `/api/designers/[id]` | Получить дизайнера |
| `PUT`    | `/api/designers/[id]` | Обновить дизайнера |
| `DELETE` | `/api/designers/[id]` | Удалить дизайнера |
| `PUT`    | `/api/designers/[id]/project` | Обновить параметры проекта дизайнера |
| `POST`   | `/api/designers/[id]/add-client` | Добавить клиента через дизайнера |
| `POST`   | `/api/designers/[id]/add-contractor` | Добавить подрядчика через дизайнера |
| `POST`   | `/api/designers/[id]/create-project` | Создать проект через дизайнера |
| `POST`   | `/api/designers/[id]/remove-link` | Убрать связь |
| `GET`    | `/api/designers/[id]/documents` | Документы дизайнера |
| `POST`   | `/api/designers/[id]/documents` | Загрузить документ дизайнера |
| `DELETE` | `/api/designers/[id]/documents/[docId]` | Удалить документ |

---

## Поставщики

| Метод | Путь | Описание |
|-------|------|----------|
| `GET`    | `/api/sellers` | Список поставщиков |
| `POST`   | `/api/sellers` | Создать поставщика |
| `GET`    | `/api/sellers/[id]` | Получить поставщика |
| `PUT`    | `/api/sellers/[id]` | Обновить поставщика |
| `DELETE` | `/api/sellers/[id]` | Удалить поставщика |
| `GET`    | `/api/sellers/[id]/projects` | Проекты поставщика |

---

## Галерея

| Метод | Путь | Описание |
|-------|------|----------|
| `GET`    | `/api/gallery` | Список изображений (`?category=`) |
| `POST`   | `/api/gallery` | Загрузить изображение |
| `PUT`    | `/api/gallery/[id]` | Обновить метаданные |
| `DELETE` | `/api/gallery/[id]` | Удалить изображение |
| `PATCH`  | `/api/gallery/reorder` | Изменить порядок (массив id[]) |

---

## Документы (редактор)

| Метод | Путь | Описание |
|-------|------|----------|
| `GET`    | `/api/documents` | Список документов (`?category=`, `?projectSlug=`) |
| `POST`   | `/api/documents` | Создать документ |
| `GET`    | `/api/documents/[id]` | Получить документ |
| `PUT`    | `/api/documents/[id]` | Обновить документ |
| `DELETE` | `/api/documents/[id]` | Удалить документ |
| `GET`    | `/api/documents/context` | Контекст проекта для AI (клиент, контрагенты) |
| `POST`   | `/api/documents/export-docx` | Экспорт в .docx |

---

## AI

| Метод | Путь | Описание |
|-------|------|----------|
| `POST` | `/api/ai/document-stream` | Стриминговая генерация/улучшение документов (SSE) |
| `POST` | `/api/ai/document` | Синхронная генерация/рецензирование документа |
| `GET`  | `/api/ai/legal-status` | Статус AI (Ollama/LLM доступность) |

---

## Admin-утилиты

| Метод | Путь | Описание |
|-------|------|----------|
| `GET`  | `/api/admin/notifications` | Кол-во уведомлений |
| `GET`  | `/api/admin/search` | Глобальный поиск (`?q=`) |
| `GET`  | `/api/admin/stats` | Статистика дашборда |
| `GET`  | `/api/admin/users` | Список пользователей |
| `POST` | `/api/admin/users` | Создать пользователя |
| `PATCH`| `/api/admin/users/[id]` | Обновить пользователя |
| `DELETE`| `/api/admin/users/[id]` | Удалить пользователя |

---

## Прочее

| Метод | Путь | Описание |
|-------|------|----------|
| `GET`  | `/api/page-configs` | Конфигурации страниц |
| `PUT`  | `/api/page-configs` | Сохранить конфигурации |
| `POST` | `/api/upload` | Загрузить файл → `{ filename }` → `/uploads/{filename}` |
| `GET`  | `/api/suggestions` | Справочные подсказки (JSON) |
| `GET`  | `/api/suggest/address` | Автодополнение адреса |
| `GET`  | `/api/geocode/address` | Геокодирование адреса |

---

## Правила работы с API

1. **Используй `$fetch`** — автоматически добавляет CSRF-токен и обрабатывает ошибки (Nuxt).
2. **CSRF-токен** — при прямых `fetch()` вызовах (только в useAiDocument) добавляй заголовок `x-csrf-token: getCsrfToken()`.
3. **Авторизация** — сессия в cookie, проверка через `GET /api/auth/me`.
4. **Ошибки** — `createError({ statusCode, message })` на сервере → клиент получает в `catch(e)`.
5. **Загрузка файлов** — используй composable `useUpload()`, он инкапсулирует `POST /api/upload`.
6. **Пагинация** — ещё не реализована (все списки возвращают без ограничений).

---

## Маппинг компонент → API

| Компонент | Основные эндпоинты |
|-----------|-------------------|
| `AdminFirstContact` | `PUT /api/projects/[slug]/page-content` |
| `AdminSmartBrief` | `PUT /api/projects/[slug]/page-content` |
| `AdminSiteSurvey` | `PUT /api/projects/[slug]/page-content` |
| `AdminToRContract` | `PUT /api/projects/[slug]/page-content` |
| `AdminExtraServices` | `/api/projects/[slug]/extra-services` |
| `AdminWorkStatus` | `/api/projects/[slug]/work-status` |
| `AdminWorkLog` | `PUT /api/projects/[slug]/page-content` |
| `AdminPunchList` | `PUT /api/projects/[slug]/page-content` |
| `AdminCommissioningAct` | `PUT /api/projects/[slug]/page-content` |
| `AdminClientSignOff` | `PUT /api/projects/[slug]/page-content` |
| `AdminGallery` | `/api/gallery` |
| `AdminDocumentEditor` | `/api/documents`, `/api/ai/document-stream` |
| `AdminContractorCabinet` | `/api/contractors/[id]`, `/api/contractors/[id]/work-items`, etc. |
| `AdminDesignerCabinet` | `/api/designers/[id]`, etc. |
| `AdminSellerCabinet` | `/api/sellers/[id]`, `/api/sellers/[id]/projects` |
| `ClientOverview` | `GET /api/projects/[slug]` |
| `ClientWorkProgress` | `GET /api/projects/[slug]/work-status` |
| `ClientContracts` | `GET /api/clients/[id]/documents` |
| `ClientContactDetails` | `PUT /api/projects/[slug]/client-profile` |
| `ClientPassport` | `PUT /api/projects/[slug]/client-profile` |
