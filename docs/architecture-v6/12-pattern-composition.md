# 12. Pattern-Card: композиция и вложенность

Pattern-Card — универсальный примитив v6. Всё, что имеет смысл «сделать/заказать/прожить», — это Pattern-Card. Travel, бронь столика, подготовка к собеседованию, ремонт квартиры, план беременности, покупка машины. Pattern-Card'ы **компонуются** друг в друга.

## 1. Три вида карточек

| Вид | Что это | Пример |
|---|---|---|
| **Atomic** | Неделимая единица действия, привязанная к одному card-type | `flight-ticket`, `taxi-ride`, `medical-appointment` |
| **Compound** | Композиция нескольких Pattern-Card одного или разных card-types | `trip-compound` (flight + transfer + hotel + restaurant + activities) |
| **Template** | Сохранённая версия Atomic или Compound, которую можно форкать и применять как рецепт | «Стамбул-3дня», «Home-setup SaaS», «Bootcamp для разработчика» |

Template — это Pattern-Card в «замороженной» форме с чётким автором и split-policy (см. `11-creator-economy.md`).

## 2. Модель композиции

```
PatternCard
  id
  kind                 // 'atomic' | 'compound' | 'template'
  cardType             // 'flight-ticket', 'trip-compound', 'pattern-template', ...
  entities             // ownership/authorship links (если есть)
  timeline             // TimelineRef (см. 10-timeline-engine)
  children: {
    ref:     PatternCardRef,      // ссылка на вложенную card
    binding: PatternBinding,      // как связана (parallel, sequential, conditional)
    slot:    string,              // слот в мастер-timeline'е (например 'accommodation')
  }[]
  params               // параметры экземпляра (даты, места, количества)
  lineage?             // ссылка на template, если был fork
  createdAt, createdBy, version
```

**Правило**: `children[]` — это **ссылки**, не embed. Вложенная карточка — самостоятельная сущность с собственным timeline.

## 3. Binding — как компоненты связаны

```ts
type PatternBinding =
  | { type: 'sequential', after?: ChildId[] }           // строго после других
  | { type: 'parallel' }                                // параллельно
  | { type: 'conditional', when: PolicyExpr }           // только если condition выполнен
  | { type: 'optional' }                                // можно отключить
  | { type: 'replicated', count: number }               // N экземпляров (например 3 ресторана)
```

## 4. Travel-пример (целиком)

```
trip-compound "Стамбул 3 дня"
├─ params: { from: 'MOW', city: 'IST', start: 2026-06-01, nights: 3, party: [u_1, u_2] }
├─ children:
│  ├─ flight-ticket ‹MOW → IST›             slot=outbound          binding=sequential
│  ├─ airport-transfer ‹IST airport → hotel› slot=arrival           binding=sequential, after=[outbound]
│  ├─ hotel-room ‹Four Seasons›              slot=accommodation     binding=parallel
│  ├─ restaurant-booking ‹Mikla›             slot=dinner-d1         binding=parallel
│  ├─ restaurant-booking ‹Çiya›              slot=dinner-d2         binding=parallel, optional=true
│  ├─ event-ticket ‹Whirling Dervishes›      slot=experience-d1     binding=optional
│  ├─ car-rental-short ‹Economy›             slot=transport-d2-d3   binding=conditional, when='user.licence.category=B'
│  ├─ airport-transfer ‹hotel → IST airport› slot=departure         binding=sequential, after=[accommodation]
│  └─ flight-ticket ‹IST → MOW›              slot=inbound           binding=sequential, after=[departure]
└─ timeline: сводится из children-timelines, master-progress ∈ [0..1]
```

На центральной карточке trip-compound:
- **Верхний блок** — master-timeline (9 вехок).
- **Средний блок** — grid/список children-cards с их мини-timelines.
- **Тап на child** — открывает его карточку в полном виде (breadcrumb возврат к trip).

Открытие child-карточки **перерисовывает shell-панели** контекстно: left = shop-сервисы поставщика, right = чат с ним, top = его stories, bottom = его feed (инвариант инверсии из `05-shell-entity-model.md`).

## 5. Создание compound-карточки

Три пути:

1. **Ручной collection** — пользователь из центра/switcher'а добавляет Pattern-Card'ы одну за другой, система предлагает связывания (sequential/parallel).
2. **Fork template** — взять чей-то template «Стамбул-3дня» → он создаёт compound с предзаполненными children. Royalty автору template — автоматически (см. `11-creator-economy.md`).
3. **AI-assist** — pattern-engine + recommendations предлагает композицию «хочу в Стамбул на 3 дня» → generates compound-black, пользователь подтверждает/правит.

Каждый путь записывается в `lineage` compound'а: откуда собран (scratch / fork / AI-suggestion).

## 6. Ре-публикация compound как template

Пользователь, собравший удачную поездку, может:

1. Нажать «опубликовать как template» → compound → Pattern-Card с `cardType: pattern-template`.
2. Выбрать license + split-policy.
3. Template попадает в `authorship-registry` + появляется в marketplace.
4. Теперь другие могут форкать и использовать; автор получает royalty.

При публикации template **параметры деперсонализируются** (даты → «3 дня», конкретные рестораны → «рестораны той же категории» или остаются с пометкой «рекомендация автора»).

## 7. Provider-mode compound

Компания (турагент) может построить compound и опубликовать как **продукт**:

- `cardType: pattern-template`, `author: company:op_42`.
- Покупатель форкает → система автоматически подставляет параметры (даты покупателя, паспорта).
- Timeline мастер-compound'а запускается, children-карточки создаются атомарно.
- Компания видит всех, кто взял template — в своём **provider-view instance-карточки** этого template'а.

Это обобщает travel-пример: **любой provider** (турагент, стилист, ремонт-бригада, автошкола, клиника) продаёт свои compound'ы как templates.

## 8. Timeline compound'а

Master-timeline compound'а — **производная** из children-timelines:

- Активные шаги children → активные вехы master.
- Заблокированные children (gate не пройден) → pending вехы.
- Compensating action child → propagates в compound.
- Completion compound'а — когда все non-optional children завершены.

Progress compound'а = взвешенная сумма progress children (weights декларируются в children[].binding).

## 9. Сериализация и версионирование

Template versioning:

- `template.version` bumps при каждой публикации.
- Fork фиксирует **конкретную версию** родителя. Новые версии не ретроактивны.
- Migration-mode: автор template может предложить существующим форкам апгрейд, но форки сами решают.

Сериализация:

```json
{
  "id": "tpl_istanbul_3d",
  "cardType": "pattern-template",
  "author": "u_123",
  "version": 3,
  "license": "Royalty-Fork",
  "splitPolicy": { "...": "..." },
  "graph": {
    "nodes": [
      { "id": "flight_out", "cardType": "flight-ticket",      "params": { "...": "..." } },
      { "id": "hotel",      "cardType": "hotel-room",          "params": { "nights": 3 } },
      { "id": "dinner_1",   "cardType": "restaurant-booking",  "params": { "recommendation": "mikla" } }
    ],
    "edges": [
      { "from": "flight_out", "to": "hotel", "binding": "sequential" }
    ]
  }
}
```

Хранится в `pattern-engine`, доступно через API для форка и рендеринга.

## 10. Безопасность и policy-gates в composition

- Каждый child-card при материализации (fork → instance) проходит **policy-engine** проверку независимо.
- Compound может задекларировать **compound-level gates**: «если age < X — пропустить child Y», «если страна — Z — удалить children группы alcohol-related».
- Результат: один template «Европейский тур» в разных юрисдикциях разворачивается в разные compound'ы — без разветвления кода.

## 11. Binding semantics — формальные правила

Каждое binding-правило имеет чёткую семантику для timeline-engine:

### `sequential` (строгий порядок)

```ts
{ type: 'sequential', after: ['outbound'] }
```

- Child не стартует пока все `after[]` не завершились (status=done).
- При cancel одного after[] → child переходит в `cancelled`.
- Timeline линейный, progress монотонный.

**Пример**: `inbound-flight` после `outbound-flight` (невозможно лететь назад раньше чем туда).

### `parallel` (независимый)

```ts
{ type: 'parallel' }
```

- Child стартует сразу при materialize compound.
- Completion compound зависит от всех parallel children.
- Failure одного → другие продолжают.

**Пример**: `hotel-room` и `restaurant-booking` можно бронировать параллельно.

### `conditional` (с политикой)

```ts
{ type: 'conditional', when: 'user.kyc.level >= 2 AND region.allowsActivity' }
```

- Evaluates `when` through policy-engine.
- Если `allow` → child materializes.
- Если `deny` → child skipped (не error, timeline продолжается).
- Если `distill` → child materializes, но с field-masks.

**Пример**: `car-rental-short` — только для регионов где разрешено и user has driving license.

### `optional` (user-choice)

```ts
{ type: 'optional' }
```

- Child не materializes автоматически.
- User явно добавляет/убирает из compound.
- UI: toggle в CardView secondary-actions.

**Пример**: `event-ticket` к Whirling Dervishes в trip-compound Istanbul — user может выбрать ли.

### `replicated` (N экземпляров)

```ts
{ type: 'replicated', count: 3 }
```

- Materializes N instances of child.
- Каждый — независимый (может быть разные parameters).
- Useful для повторяющихся actions.

**Пример**: 3 разных ужина в 3 вечера (`restaurant-booking` × 3).

## 12. Compound progress calculation

Progress compound'а = weighted sum children progress.

```typescript
function compoundProgress(compound) {
  let totalWeight = 0
  let weightedProgress = 0
  
  for (const child of compound.children) {
    const weight = child.binding.weight ?? 1
    totalWeight += weight
    
    if (child.binding.type === 'optional' && !child.enabled) {
      continue  // skip disabled optionals
    }
    
    weightedProgress += weight * childProgress(child)
  }
  
  return weightedProgress / totalWeight  // [0..1]
}
```

По умолчанию все дети имеют weight=1. Можно override в binding:

```ts
{ type: 'sequential', weight: 3 }  // этот child "весит" 3x больше чем остальные
```

## 13. Materializing template → instance

Пошагово, с substitution параметров:

```typescript
function materialize(template, userParams) {
  // 1. Create root compound Pattern-Card
  const compound = db.insert('patterns', {
    cardType: template.cardType,
    kind: 'compound',
    lineage: { parentId: template.id, relation: 'fork' },
    params: { ...template.defaults, ...userParams },
    owner: userParams.userId,
  })
  
  // 2. Для каждого child в template.graph
  for (const childSpec of template.graph.nodes) {
    const child = db.insert('patterns', {
      cardType: childSpec.cardType,
      kind: 'atomic',
      params: substituteParams(childSpec.params, userParams),
      owner: userParams.userId,
    })
    
    db.insert('pattern_children', {
      parent_id: compound.id,
      child_id: child.id,
      binding: childSpec.binding,
      slot: childSpec.slot,
    })
  }
  
  // 3. Emit событие
  publishEvent('app.daria.pattern.materialized.v1', { 
    templateId: template.id, compoundId: compound.id 
  })
  
  // 4. Royalty payment (если commercial license)
  if (template.license.requiresPayment) {
    services.payments.charge(userParams.userId, template.price)
    // → triggers authorship.distribute via event chain
  }
  
  // 5. Start timeline
  await timelineEngine.start(compound.id, template.timeline)
  
  return compound
}
```

## 14. Fork vs materialize

| Операция | Результат | Use case |
|---|---|---|
| **Fork** | Новый template с lineage-link на parent | Creator хочет опубликовать adaptation |
| **Materialize** | Compound instance (не re-publishable) | User хочет использовать template для себя |

Разница:
- **Fork** → `kind: 'template'`, может быть опубликован в marketplace, accepts further forks.
- **Materialize** → `kind: 'compound'`, личный экземпляр user'a, не в marketplace.

User может потом «promote» свой materialized compound → publish-as-template (если он его сильно доработал).

## 15. Антипаттерны

- ❌ Хранить данные children внутри compound (embed). Всегда ссылка.
- ❌ Менять граф forked template — только форкать свою версию.
- ❌ Создавать compound из «копий» children, чтобы избежать royalty. Detection — через fingerprint similarity + disputes.
- ❌ Смешивать provider-mode и consumer-mode в одной Pattern-Card. Это два разных instance одного template'а.
- ❌ Использовать compound как «группу» чатов или «папку». Для этого есть `community`.
- ❌ Вводить уникальный layout под compound-карточку (нарушение I19/I20). Compound — это тот же `CardView`, у которого секция `SECTIONS` содержит children grid. См. `17-fractal-ux.md`.

## 12. Фрактальность compound'ов

Compound-карточка использует **ту же грамматику**, что и atomic:

- HEADER — identity composite (название поездки/проекта), ⇄ доступна (instance ⇄ type, где type = template).
- TIMELINE — master-timeline, сводный из children.
- SUMMARY — ключевые факты (даты, кол-во участников, бюджет).
- ACTIONS — primary CTA («запустить», «поставить на паузу», «опубликовать как template»).
- SECTIONS — содержит `children-grid` секцию, каждый child — тот же `Item` компонент.
- FOOTER — lineage, автор, версия.

Тап по child → полноценная карточка ребёнка (со всеми 6 секциями), shell-панели перерисовываются в контекст поставщика. Возврат — через навигационный стек. Пользователь не «меняет режим» — он продолжает работать в той же грамматике, просто с другой entity в фокусе.
