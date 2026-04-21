# ADR-001: Cursor-Based Pagination для мессенджера

## Контекст

Messenger хранит историю чатов — потенциально тысячи сообщений на conversation. Offset-пагинация (`LIMIT N OFFSET k`) деградирует до O(k) по мере роста смещения: PostgreSQL вынужден просканировать k строк, чтобы вернуть страницу. При больших чатах это создаёт неприемлемые задержки и нагрузку на Postgres.

Кроме того, offset-пагинация нестабильна при concurrent inserts: пока пользователь листает назад, новые сообщения смещают страницы, и часть сообщений теряется или дублируется.

## Решение

Использовать **cursor-based пагинацию** по колонке `created_at`:

```
GET /api/messages?before=<created_at_iso>&limit=50
```

SQL:
```sql
SELECT * FROM messenger_messages
WHERE conversation_id = $1
  AND created_at < $cursor
ORDER BY created_at DESC
LIMIT 50
```

Индекс: `(conversation_id, created_at DESC)` — обеспечивает O(1) time per page по B-tree.

Следующая страница: `cursor = last_message.created_at` из полученного результата.

Применяется ко всем cursor-пагинируемым ресурсам мессенджера: `messenger_agent_runs`, `messenger_agent_run_events`.

## Статус

Принято. Зафиксировано как инвариант в [05 Architectural Patterns §5.6](../05-architectural-patterns.md) и [CLAUDE.md](../../../../CLAUDE.md).

## Последствия

- **Нет total count** — infinite scroll UX, не numbered pages. Фронтенд показывает «загрузить ещё», а не «страница 5 из 12».
- **Стабильность при concurrent inserts** — новые сообщения не ломают страницы назад.
- **Обязательный индекс** — `(conversation_id, created_at DESC)` должен существовать до запуска фичи.
- **Offset-пагинация запрещена** в мессенджере; offset допустим только в admin-таблицах с ограниченным объёмом данных.
