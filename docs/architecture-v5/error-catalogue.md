# Error Catalogue — Domain Error Codes

Справочник доменных кодов ошибок с HTTP-маппингом. Источник истины: [19 Error Handling](./19-error-handling.md).

Wire-format всех domain-ошибок:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "...context fields"
  }
}
```

---

## Auth / Session

| Code | HTTP | Класс | Описание | Context fields |
|---|---|---|---|---|
| `UNAUTHORIZED` | 401 | `UnauthorizedError` | Пользователь не аутентифицирован: сессия отсутствует, истекла или HMAC-подпись не совпадает | — |
| `FORBIDDEN` | 403 | `ForbiddenError` | Пользователь аутентифицирован, но не имеет доступа к ресурсу или действию | `reason`, опционально `resourceId` |
| `RATE_LIMITED` | 429 | `RateLimitError` | Превышен лимит запросов | `retryAfterSeconds` |

**Примеры:**
```json
{ "error": { "code": "UNAUTHORIZED", "message": "Not authenticated" } }
{ "error": { "code": "FORBIDDEN", "message": "Only project owner can delete connectors", "reason": "not_owner" } }
{ "error": { "code": "RATE_LIMITED", "message": "Too many requests", "retryAfterSeconds": 30 } }
```

---

## Concurrency (OCC)

| Code | HTTP | Класс | Описание | Context fields |
|---|---|---|---|---|
| `CONFLICT` | 409 | `ConflictError` | Version mismatch (OCC): клиент прислал устаревший `version`, запись изменена другим процессом | `reason`, опционально `currentVersion`, `entity` |

**Примеры:**
```json
{ "error": { "code": "CONFLICT", "message": "Version mismatch — re-fetch and retry", "currentVersion": 5 } }
{ "error": { "code": "CONFLICT", "message": "Duplicate key", "table": "clients" } }
```

Клиент на 409: показать diff / предложить re-fetch. Не ретраить автоматически без показа пользователю.

---

## Validation

| Code | HTTP | Класс | Описание | Context fields |
|---|---|---|---|---|
| `VALIDATION_FAILED` | 400 | `ValidationError` | Тело запроса не прошло Zod-валидацию | `issues: Array<{ path: string[], message: string }>` |

**Пример:**
```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Validation failed",
    "issues": [
      { "path": ["email"], "message": "Invalid email address" },
      { "path": ["name"], "message": "String must contain at least 1 character(s)" }
    ]
  }
}
```

Frontend: показать inline-ошибки рядом с полями по `path`.

---

## Not Found

| Code | HTTP | Класс | Описание | Context fields |
|---|---|---|---|---|
| `NOT_FOUND` | 404 | `NotFoundError` | Сущность не найдена по переданному id/slug | `entity`, `id` |

**Примеры:**
```json
{ "error": { "code": "NOT_FOUND", "message": "Project not found", "entity": "Project", "id": "nonexistent-slug" } }
{ "error": { "code": "NOT_FOUND", "message": "Agent not found", "entity": "Agent", "id": "uuid-xxx" } }
```

---

## Messenger / WebSocket

| Code | HTTP / WS | Источник | Описание | Context fields |
|---|---|---|---|---|
| `UNAUTHORIZED` | WS close 1008 | messenger/core auth | WS ticket отсутствует в Redis, истёк (TTL 30s) или уже использован | — |
| `NOT_FOUND` | 404 | messenger/core | Агент, run, или conversation не найдены | `entity`, `id` |
| `CONFLICT` | 409 | messenger/core | OCC conflict при PATCH run или agent config | `currentVersion` |
| `VALIDATION_FAILED` | 400 | messenger/core | Невалидный body для REST endpoint (projects, connectors, bootstrap) | `issues` |
| `FORBIDDEN` | 403 | messenger/core | Попытка изменить объект другого пользователя | `reason` |

**WS-специфика:** при истечении или отсутствии ticket WS-сервер закрывает соединение с кодом `1008 (Policy Violation)`. Клиент должен запросить новый ticket через `POST /api/chat/ws-ticket` и переоткрыть соединение.

---

## Как обрабатывать на Frontend

```ts
// Универсальный обработчик API-ошибок
async function apiCall<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn()
  } catch (e: any) {
    const code = e?.data?.code ?? e?.body?.error?.code
    switch (code) {
      case 'UNAUTHORIZED':
        router.push('/login')
        break
      case 'CONFLICT':
        showConflictDialog(e.data)
        break
      case 'VALIDATION_FAILED':
        setFieldErrors(e.data.issues)
        break
      case 'NOT_FOUND':
        showNotFound()
        break
      default:
        showGenericError(e.message)
    }
    return null
  }
}
```

Полная спецификация error middleware и Zod-интеграции: [19 Error Handling](./19-error-handling.md).
