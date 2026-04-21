# ADR-005: Soft Delete через поле `deleted_at`

## Контекст

Hard delete (`DELETE FROM ...`) необратим и ломает offline-sync: клиент, работавший офлайн и имеющий ссылку на удалённый объект, получает `404` при следующем запросе без возможности понять — объект удалён или ещё не создан на этой реплике.

Кроме того, FK-зависимости (сообщения → агент, сообщения → проект) требуют либо CASCADE DELETE (теряем данные) либо SET NULL (теряем связь). Оба варианта плохи для аудит-логов и истории.

## Решение

**Soft delete** через поле `deleted_at timestamptz`:

- Все изменяемые таблицы с lifecycle (не lookup-таблицы) имеют `deleted_at timestamptz`.
- `DELETE`-эндпоинты выполняют `UPDATE <table> SET deleted_at = now() WHERE id = $id`.
- Все SELECT-запросы включают фильтр `WHERE deleted_at IS NULL`.
- Уникальные индексы строятся только по активным записям: `WHERE deleted_at IS NULL` в partial index.

Пример из [23 Project-Centric Messenger §2.1](../23-project-centric-messenger.md):
```sql
unique('messenger_projects_owner_slug_unique')
  .on(t.ownerUserId, t.slug)
  .where(sql`deleted_at is null`)
```

Repository: `deleteX(id): Promise<boolean>` — устанавливает `deleted_at`, возвращает `true`/`false`. Никогда не делает физический DELETE.

## Статус

Принято. Зафиксировано как инвариант в [05 Architectural Patterns §5.4](../05-architectural-patterns.md) и [CLAUDE.md](../../../../CLAUDE.md) (правило №8).

## Последствия

- **Offline-sync дружественность**: клиент видит `deleted_at` в следующем sync и знает, что объект нужно убрать из UI.
- **Аудит-лог бесплатно**: история удалений сохраняется в основной таблице.
- **Фильтр везде обязателен**: забытый `WHERE deleted_at IS NULL` — баг с утечкой удалённых данных. ESLint-правило или code review checklist должны ловить это.
- **Рост таблиц**: удалённые строки занимают место. Нужен периодический cleanup job (архивирование записей старше N месяцев в отдельную таблицу или удаление после retention period).
- **Partial unique indexes**: без `WHERE deleted_at IS NULL` нельзя повторно создать объект с тем же slug после удаления.
