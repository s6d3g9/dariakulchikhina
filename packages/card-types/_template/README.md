# _template — шаблон нового card-type

Копируется в `packages/card-types/<your-name>/` при добавлении новой вертикали-плагина.

## Обязательная структура

```
<card-type>/
  package.json
  index.ts                      # экспорт defineCardType({...})
  instance.view.ts              # центральная карточка — instance
  type.view.ts                  # центральная карточка — type
  panels/
    top.instance.ts             # верхняя панель — instance-контекст
    top.type.ts                 # верхняя панель — type-контекст
    left.instance.ts
    left.type.ts
    right.instance.ts
    right.type.ts
    bottom.instance.ts
    bottom.type.ts
  entity-provider.ts            # resolveInstance / resolveType / linkInstanceToType
  timeline.ts                   # defineTimeline({ steps, completion })
  schemas.ts                    # Zod schemas для instance и type
  tests/
    fractal.snapshot.test.ts    # fractal-harness (обязательно)
    contract.test.ts            # Zod contract проверка
  README.md                     # какие примитивы используются, кто автор, статус
```

## Обязательства контракта

1. **Оба вида реализованы** (`instance.view` и `type.view`). Без этого — CI-fail (I3, I22).
2. **Все 8 panel-providers реализованы** даже если для type некоторые панели — заглушка «пока нет данных» (лучше заглушка, чем undefined).
3. **`primitives`** перечислены явно — валидируется при load-time реестра.
4. **Timeline определён** — даже если тривиальный (`created → active → archived`). Без этого — CI-fail (I21).
5. **Не импортирует** другие card-types. Композиция — только через `pattern-engine`.
6. **Не импортирует** `services/*`. Только `packages/contracts-*` и `packages/sdk-*`.

## Фрактальные обязательства (I19 / I20 / I23)

Все view и panel реализуются **только через layout-компоненты** из `packages/ui-react`:

| Уровень | Обязательный компонент |
|---|---|
| Center | `<CardView>` + `<CardHeader> <CardTimeline> <CardSummary> <CardActions> <CardSectionStack> <CardFooter>` |
| Panel | `<PanelHeader> <PanelStream> <PanelFooter>` |
| Внутри секций | `<Section> <Item> <Field>` |
| Переключатели | `<InversionButton>` (View), `<ModeToggle>` (Mode) |

**Запрещено** в реализации card-type:

- ❌ Импорт своего layout-компонента вместо `<CardView>`.
- ❌ Свои жесты вне списка из 6 (swipe ×2 / tap / long-press / pinch / inversion).
- ❌ Свои переключатели помимо `InversionButton` и `ModeToggle`.
- ❌ Хардкод цвета — только семантические токены из `design-tokens`.
- ❌ Своя навигация, open-modal для действий, доступных из ActionBar.

Тест `tests/fractal.snapshot.test.ts` прогоняется CI через `packages/testing/fractal-harness` и сравнивает структурные snapshot'ы с эталоном. Несоответствие — merge-blocker.

## Чеклист PR (I19–I23)

- [ ] Instance-view + Type-view работают
- [ ] 8 panel-providers реализованы
- [ ] Timeline определён (даже минимальный)
- [ ] Все 6 секций CardView присутствуют в каноничном порядке
- [ ] Все 3 секции PanelView присутствуют для всех 4 панелей × 2 view
- [ ] Не введено новых жестов
- [ ] Не введено новых layout-компонентов
- [ ] Не введено новых переключателей помимо ⇄ и Mode
- [ ] CTA-тексты в форме «глагол + объект»
- [ ] Ошибки содержат trace-id
- [ ] `fractal.snapshot.test.ts` проходит
- [ ] `contract.test.ts` проходит
- [ ] Зарегистрирован в `_registry.ts`
- [ ] Строка добавлена в `docs/architecture-v6/06-card-types-matrix.md`
- [ ] ESLint — 0 ошибок
- [ ] Не потребовались изменения в `apps/shell-*` и `packages/ui-*`
