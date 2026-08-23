# С6 · EntityCard: карточка 6 секций с аккордеоном и инверсией (архитектор → Codex)

Файлы пакета: `apps/shell-web/app/components/EntityCard.vue`, правка `app/pages/e/[id].vue` (вставить карточку в центр ShellLayout), тесты `tests/entityCard.spec.ts`. Вне пакета не трогать.

## Контракт компонента

```ts
props: { entity: Entity }            // из @daria/shell-panels/entity
emits: ['toggle-view']               // кнопка ⇄ живёт в header-секции карточки
```

## Рендер (строго по UX-контракту)

1. Порядок секций — как в `entity.sections` (провайдер гарантирует header→timeline→summary→actions→sections→footer). Компонент НЕ сортирует и НЕ фильтрует секции — рендерит как есть (самоподобие: логика в данных).
2. **header** (role identity): title + subtitle из полей секции; бейдж `entity.view` (instance→зелёный тон, type→фиолетовый тон); круглая кнопка ⇄ (emit 'toggle-view').
3. **timeline**: поля секции как горизонтальный ряд «точка+подпись»; без прогресс-логики (значения строками из fields).
4. **summary**: поля как метрики-плитки (label сверху 12px muted, value 14px).
5. **actions**: поля как ряд кнопок-чипов (value = подпись), disabled-вид (реальных действий в С6 нет).
6. **sections**: АККОРДЕОН — каждое поле = строка-заголовок с шевроном; открыта максимум одна (тап по открытой закрывает); содержимое раскрытия: value поля (строкой) + заглушка «данные раздела появятся с World Model API».
7. **footer**: поля как маленькие серые чипы (id, class, владелец).
8. Поля с `value === null` показывать «—» (не скрывать: честность данных).

## Стили
Scoped CSS, без внешних зависимостей: карточка border 1px + radius 12, секции разделены линиями, font-size ≥12px, тонам бейджей — свои классы (никаких дизайн-токенов извне).

## Тесты (vitest + @vue/test-utils; @vue/test-utils добавить dev-зависимостью ТОЛЬКО в apps/shell-web)
На фикстуре fx-agent-1 (schema.data.json → через agentToEntity из провайдера, как в тесте С4):
1. Рендерятся ровно 6 секций в порядке схемы.
2. Клик по ⇄ эмитит 'toggle-view'.
3. Аккордеон: после клика по второй строке sections открыта только она; повторный клик закрывает.
4. null-поле рендерит «—».

## VERIFY
`cd apps/shell-web && pnpm typecheck && pnpm vitest run && pnpm generate && ls .output/public/index.html`; `git status --short` — только файлы пакета.
