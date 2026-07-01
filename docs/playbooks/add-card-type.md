# Playbook: add-card-type

Пошаговое руководство по добавлению нового `packages/card-types/<name>/`. Target: < 1 рабочий день.

## Prereq

- [ ] Ты прочитал: `05-shell-entity-model.md`, `06-card-types-matrix.md`, `17-fractal-ux.md`, `09-invariants.md`.
- [ ] Name card-type'а определён. Следует kebab-case. Kind не conflictит с existing.
- [ ] Понятно, какие primitives нужны. Все в существующем каталоге (если нет — это primitive, не card-type; открой РFC).

## Шаги

### 1. Scaffold

```bash
pnpm create card-type <your-name>
# → packages/card-types/<your-name>/ с полным скелетом
```

Что создано:
- `package.json`
- `index.ts` с `defineCardType(...)` template
- `instance.view.ts`, `type.view.ts` placeholders
- `panels/top.instance.ts` ... 8 штук
- `entity-provider.ts`
- `timeline.ts`
- `schemas.ts`
- `tests/fractal.snapshot.test.ts`
- `tests/contract.test.ts`
- `README.md` template
- `i18n/en.json`, `i18n/ru.json`

### 2. Заполни schemas

`schemas.ts`:
- `<Name>Instance` Zod schema.
- `<Name>Type` Zod schema (если у kind есть public dimension).
- `PanelPayload_*` для 8 panels.

### 3. EntityProvider

`entity-provider.ts` implement:
- `resolveInstance(id)` — через внутренние сервисы.
- `resolveType(typeId)` — catalog / external API.
- `linkInstanceToType(instanceId)` — derive type-id.

### 4. Views + Panels

Для каждого view (instance / type):
- `view.ts` — центральная карточка (CardView).
- 4 panels (top / left / right / bottom).

**Используй ТОЛЬКО** layout-компоненты из `packages/ui-react` (I20). Никаких custom layouts.

### 5. Timeline

`timeline.ts`:
```ts
export default defineTimeline({
  kind: 'your-kind',
  steps: [
    { id: 'created',   kind: 'auto', title: t('timeline.created') },
    // ... 5 типов: auto / human / external / gate / compound
  ],
  completion: { on: '<final-step>.done' },
})
```

Даже для «статичных» сущностей (минимум `created → active → archived`). I21 требует.

### 6. i18n

`i18n/en.json` + `i18n/ru.json`:
- Все UI strings через `t()`.
- CI проверяет: no hardcoded strings в views/panels.

### 7. Register

```ts
// packages/card-types/_registry.ts
import yourKind from './<your-name>'
export const cardTypeRegistry = { ..., '<your-kind>': yourKind }
```

### 8. Doc

Add row в `docs/architecture-v6/06-card-types-matrix.md`.

### 9. Tests

```bash
pnpm -C packages/card-types/<your-name> test:fractal
pnpm -C packages/card-types/<your-name> test:contract
```

- Fractal-harness snapshot creates on first run. Compare with emerged baseline.
- Contract test validates Zod schemas against sample data.

### 10. PR

Checklist (CI enforces):
- [ ] instance.view + type.view implemented (I3, I22)
- [ ] 8 panel-providers implemented
- [ ] Timeline defined (I21)
- [ ] No новых layout-components (I20)
- [ ] No новых gestures / toggles (I19)
- [ ] i18n complete для en/ru minimum
- [ ] fractal.snapshot.test green
- [ ] contract.test green
- [ ] Registered в _registry.ts
- [ ] Docs updated (06-card-types-matrix)
- [ ] CODEOWNERS has reviewer added

## Common mistakes

- ❌ Custom `<MyCardLayout>` вместо `<CardView>`.
- ❌ Вертикаль-specific action button, не в `<ActionBar>`.
- ❌ Importing другой card-type напрямую (compose через pattern-engine).
- ❌ Importing service from card-type (only SDK).
- ❌ Skipping timeline (I21 fail).
- ❌ Unique color или gesture.

## Если что-то не подходит

Если архитектура «вынуждает» использовать не-generic patterns, это сигнал:
- Либо дизайн-системе не хватает component → создай RFC.
- Либо card-type тащит vertical-logic в shell.
- Либо primitive отсутствует → новый primitive РFC.

**Не обходи** инварианты. Их обходы незамечено превращаются в tech-debt.
