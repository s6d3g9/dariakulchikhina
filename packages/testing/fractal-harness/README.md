# packages/testing/fractal-harness

Node-only CLI для структурной проверки `schema.data.json` card-type'ов. Не требует npm-зависимостей.

## Запуск

```bash
node packages/testing/fractal-harness/harness.mjs packages/card-types/person-profile/schema.data.json
```

Формат:

```bash
node harness.mjs <schema.json>
```

Каждое правило печатает отдельную строку `PASS ...` или `FAIL ...`. Если есть хотя бы один `FAIL`, процесс завершается с кодом `1`.

## Проверки

- `sectionsSchema.instance` и `sectionsSchema.type` содержат ровно 6 секций.
- Ключи секций в `instance` и `type` совпадают и идут в одинаковом порядке.
- `role` каждой секции входит в 7 допустимых ролей: `identity`, `status`, `timeline`, `stream`, `actions`, `evidence`, `inversion`.
- `panels` содержит ровно `top`, `left`, `right`, `bottom`, а каждый slot содержит ровно `instance` и `type`.
- У каждой панели есть непустые `title_ru` и `content_kind`.
- `modes.instance` и `modes.type` непустые.
- `fixtures` содержит минимум один fixture.
- Каждый ключ в `fixture.values` существует среди `field.key` соответствующего view.
