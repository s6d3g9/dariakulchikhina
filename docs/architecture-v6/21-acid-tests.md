# 21. Acid Tests — валидационные сценарии

Короткие сценарии, которые архитектура обязана выполнить **без трогания platform-кода**. Если хоть один тест требует правок в `services/*`, `apps/shell-*` или ядре `packages/ui-*` — архитектура не выполняет свои обещания.

Проверяются как часть фазового gate'а: Фаза считается завершённой, когда её acid-тесты зелёные.

## T1. Новая вертикаль за 1 день

**Сценарий**: добавить card-type «аренда самоката» в существующую платформу.

**Шаги** (ожидаемые):

1. `pnpm exec generate-card-type bike-rental` (скелет).
2. Заполнить `schemas.ts` (данные), `instance.view.ts`, `type.view.ts`, 8 panels.
3. Определить `timeline.ts` (search → reserve → unlock → ride → return).
4. Указать `primitives: [booking, location, payments, escrow-service]`.
5. Зарегистрировать в `_registry.ts`.
6. `pnpm test:fractal` проходит.
7. Добавить строку в `06-card-types-matrix.md`.

**Чего не должно быть**:
- ❌ Правки `packages/shell-core`
- ❌ Новые endpoints в `services/booking` или других существующих
- ❌ Новые компоненты в `packages/ui-react`
- ❌ Новые жесты / переключатели
- ❌ Изменения в других card-types

**Валидация**: PR с diff только в `packages/card-types/bike-rental/` + строчка в matrix + ноль ошибок в fractal-harness.

## T2. Смена юрисдикции без релиза

**Сценарий**: Узбекистан поднял минимальный возраст аренды авто с 18 до 21.

**Шаги**:

1. Compliance-команда правит `platform/law-profiles/UZ.yaml`: `legalAges.rental.car: 21`.
2. PR ревьюится compliance + architect.
3. Merge → Argo CD подхватывает → policy-engine перезагружает law-profile.
4. Feature-flag rollout 10% → 50% → 100%.

**Чего не должно быть**:
- ❌ Кодовых изменений в card-types или services
- ❌ Деплоя каких-либо образов
- ❌ Разветвлений `if country === 'UZ'`

**Валидация**: `git log --grep "UZ rental age"` показывает только изменение YAML. Time-to-production < 1 рабочий день.

## T3. Публикация authorship и рекурсивный royalty

**Сценарий** (из `11-creator-economy.md`): Алиса → Боб → Карина → Дима (покупка $20).

**Шаги**:

1. Алиса публикует template (off-chain). License `Royalty-Fork`, split-policy default.
2. Боб форкает + меняет. Template v1.
3. Карина форкает Боба. Template v1.
4. Дима покупает Карину за $20.
5. Timeline покупки: `payment.charge` → `royalty.distribute` → `access.grant`.
6. Wallet фиксирует: Карина $14, Platform $2, Tag $1, Боб $1.50, Алиса $0.75, Fund $0.75.
7. Audit-log WORM content:
   - `app.daria.payments.payment-received.v1`
   - `app.daria.authorship.royalty-distributed.v1` × 5 (один на каждого получателя)

**Валидация**:
- Wallet-balances match ожиданиям (tolerance: none).
- Audit-log events присутствуют (ClickHouse query).
- На UI Алисы и Боба — royalty-поток обновлён в real-time.
- Отменный flow: refund Димы → compensating royalty-reversal на всех пяти.

## T4. Profile-switch без mount

**Сценарий**: пользователь в своём shell'е делает search «Алиса», тапает результат.

**Шаги**:
1. Search-API возвращает результат kind=`person-profile`, id=`u_alisa`.
2. Shell обновляет `focus` в state-store.
3. Panels re-render: панели получают новый context `(kind: person-profile, id: u_alisa, view: instance)`.
4. Центр переключается на карточку Алисы.
5. Navigation stack: `push({prev: u_me})`.

**Валидация**:
- React DevTools / RN Inspector: `<Shell>` не размонтировался.
- Traces: один trace `shell.focusSwitch` с spans на `panel.topRefetch`, `panel.leftRefetch`, etc.
- Жесты навигации работают немедленно.
- Back-button возвращает на `u_me` без reload.

## T5. Offline timeline-step drafted, sync on reconnect

**Сценарий**: пользователь в самолёте добавляет заметку в timeline «мой пёс Рекс» на шаге «ежегодный осмотр».

**Шаги**:
1. Offline: UI применяет изменение optimistically. Outbox записывает событие.
2. Sync-indicator: «1 изменение ждёт».
3. Сеть появляется через 3 часа.
4. Outbox flushes, POST `/sync/push` с idempotent key.
5. Server applies, publishes event `app.daria.timeline.step-note-added.v1`.
6. Другие устройства Pull'ят через SSE.
7. UI: sync-indicator → green. Изменение осталось.

**Валидация**:
- Event в audit-log (`offline: true`, `submitted_at: T+3h`).
- Конфликт с параллельным изменением с другого устройства → CRDT-merge (оба note присутствуют).

## T6. Policy distill в feed

**Сценарий**: пользователь в Индонезии открывает video-feed, где часть контента содержит алкоголь.

**Шаги**:
1. `feed.getUserFeed(user)` возвращает 50 item'ов.
2. Перед возвратом — batch `policy.evaluate` для каждого: user context + item tags.
3. 5 item'ов получают `distill + mask=['alcohol-imagery']`; 2 — `deny`.
4. API возвращает 48 item'ов; 5 — с mask (UI скрывает специфические фрагменты).

**Валидация**:
- Audit-log: 50 policy-decisions записаны.
- Клиентский код не содержит условных рендеров для «алкогольных» тегов — он просто применяет mask.
- Смена региона пользователя на Россию → те же 50 item'ов возвращаются без mask.

## T7. Инверсия (machine → model)

**Сценарий**: пользователь открывает свой BMW X5 (instance), нажимает ⇄.

**Шаги**:
1. Shell переключает `view: 'instance' → 'type'`.
2. Center-карточка перерисовывается через `card-types/car/type.view`.
3. 4 панели перерисовываются через `card-types/car/panels/*.type`.
4. Left: каталог сервисов / запчастей для BMW X5.
5. Right: сообщества BMW X5.
6. Top: официальная галерея модели + user-generated.
7. Bottom: feed модели.

**Валидация**:
- Структурный UI-snapshot той же анатомии (6 секций CardView, 3 секции PanelView × 4).
- Один shell, не размонтирован.
- Transition < 300ms.

## T8. Добавление нового примитива (horizontal)

**Сценарий**: нужна `services/booking-instant` (реал-тайм booking без hold-period — для такси).

**Шаги**:
1. Создать `services/booking-instant/` по template.
2. Контракт в `packages/contracts-domain/booking-instant.ts`.
3. Включить card-types, которые его используют: `taxi-ride`, `bike-rental`.
4. Deploy через Argo CD.

**Чего не должно быть**:
- ❌ Изменения в shell / card-types помимо обновления `primitives: []` списка.
- ❌ Cross-service SQL / kompletny DB-access.

**Валидация**: card-types, использующие новый примитив, только меняют список в definition; UI не меняется.

## T9. Fork → publish-as-template → subscribe

**Сценарий**: пользователь форкает «Стамбул-3дня», адаптирует под 5 дней с Каппадокией, публикует. Другой подписывается.

**Шаги**:
1. `pattern.fork(tpl_istanbul_3d) → compound c_1` (все children clonirovany).
2. Пользователь редактирует compound: добавляет Cappadocia-flight, +2 nights hotel.
3. `pattern.publishAsTemplate(c_1)` → `tpl_istanbul_cappadocia_5d` с lineage parent=`tpl_istanbul_3d`.
4. Подписчик subscribes через `subscription-engine`.
5. Royalty распределяется per-subscription-period.

**Валидация**:
- Lineage graph visible в type-view template'а.
- Royalty включает автора исходника (Алиса из T3) через forksLineageRule geometric.
- Подписчик видит template как accessible instance в своей левой панели.

## T10. Fractal-harness сравнение

**Сценарий**: разработчик пишет card-type `sneakers` в Фазе 5.

**Шаги**:
1. Запускает `pnpm -C packages/card-types/sneakers test:fractal`.
2. Harness сравнивает snapshot со всеми существующими card-types.
3. Ожидание: те же 6 секций CardView в том же порядке, те же 3 секции PanelView × 8.

**Валидация**:
- `expect(sneakers.anatomy).toStructurallyEqual(car.anatomy)`.
- Если что-то отличается структурно — merge заблокирован.

## T11. Failed saga → compensation chain

**Сценарий**: пользователь бронирует flight + hotel + wallet charge; hotel.book проваливается.

**Шаги**:
1. Timeline: `flight.book` done.
2. `hotel.book` fails with retriable error → 3 retry → final fail.
3. Compensating chain: `flight.cancel` executed.
4. Wallet: charge ещё не случилась, rollback не нужен.
5. Пользователь видит: timeline в статусе `cancelled`, reason displayed.

**Валидация**:
- Audit-log: `flight.reserved`, `flight.cancelled (compensating)`, `hotel.book-failed`.
- Wallet: no pending holds.
- Пользователь **не видит** исходную ошибку; видит «не удалось собрать поездку, попробуйте другой отель».

## T12. Mobile cold-start с offline

**Сценарий**: пользователь не открывал app 3 дня, открывает в самолёте (offline).

**Шаги**:
1. Shell грузит локальный snapshot (SQLite).
2. Feed последнего sync — доступен.
3. Timeline'ы активных compound'ов — доступны.
4. Сеть пытается sync в background — fails gracefully.
5. Sync-indicator показывает «offline, синхронизируется при подключении».

**Валидация**:
- Time-to-interactive < 2s.
- Нет spinner'ов / loading states выше основного уровня.
- Error banners отсутствуют (только info-banner «offline»).

## T13. Смена языка на лету

**Сценарий**: пользователь меняет язык интерфейса с RU на AR (Arabic) в настройках.

**Шаги**:
1. User Settings → Language: Arabic.
2. Shell publishes `locale-changed` event.
3. Все 4 панели + center перерисовываются через `react-intl` / `i18next`.
4. `dir=rtl` применяется на уровне shell.
5. CSS logical properties автоматически зеркалят layout.
6. Иконки навигации (←/→) заменяются direction-aware версиями.

**Валидация**:
- Никакого reload страницы.
- Fractal-harness snapshot для AR+RTL совпадает со структурой RU+LTR.
- Время переключения < 200ms.

## T14. RTL layout для card-type

**Сценарий**: арабоязычный пользователь открывает `person-profile` и `car`.

**Шаги**:
1. Shell: `dir=rtl`, `lang=ar`.
2. Панели зеркалируются: left-panel → справа, right-panel → слева (логически остаются теми же slot'ами).
3. CardView: HEADER / TIMELINE / SUMMARY / ACTIONS / SECTIONS / FOOTER в том же порядке, но с учётом flow text RTL.
4. Timeline-шкала идёт справа налево (completion → pending).
5. Смешанный контент (ru отзыв в ar UI) — корректно рендерится с `dir=auto` на параграфах.

**Валидация**:
- 0 hardcoded `left/right` CSS.
- Fractal-harness прогоняет card-type в LTR и RTL, structural snapshot одинаков.

## T15. Multi-currency wallet transaction

**Сценарий**: пользователь с display=USD покупает template за 15 EUR.

**Шаги**:
1. Wallet.charge амounts: EUR 15.
2. Split-policy distributes в EUR (автор получает EUR 10.50).
3. Audit-log фиксирует в EUR (native currency of transaction).
4. UI пользователя показывает «15 EUR (~16.35 USD)» в timeline-evidence.
5. Статусная страница финансов — всё в EUR + превью в USD.

**Валидация**:
- Audit хранит EUR, не USD.
- Split-policy вычисляется до conversion.
- UI никогда не показывает сумму без валюты.
- Reconciliation-job сводит балансы per-currency.

## T16. Timezone-correct timeline

**Сценарий**: timeline-шаг с `deadline: departure - 24h`, пользователь в Москве, рейс из Стамбула.

**Шаги**:
1. Timeline сохраняет UTC absolute times.
2. Пользователь видит deadline в Europe/Moscow (MSK).
3. При перелёте в Стамбул TZ меняется на Europe/Istanbul (TRT) — deadline показывается в TRT.
4. Push-нотификация «напоминание check-in» — в пользовательской локальной TZ.

**Валидация**:
- Postgres хранит `timestamptz`.
- Log/audit — UTC.
- UI — `user.timezone` (из identity preferences).
- Нет «наивных» timestamp'ов в системе.

## T17. Subscription full lifecycle

**Сценарий**: user subscribes на template с 7-day trial.

**Шаги**:
1. Subscribe → `trial` state → activeUntil = now + 7d.
2. Day 3: notification «trial ending».
3. Day 7: trial-end → PSP charge → `active`.
4. Month 1 renewal → PSP fail → `past_due`, retry +1d, +3d.
5. Retry success → `active`.
6. User cancels at month 2 → `cancelled`, активно до activeUntil.
7. activeUntil reached → `expired`.

**Валидация** (`31-subscription-lifecycle.md`):
- Все state-переходы в audit-log.
- Royalty distributions — на каждом charge.
- Refund в trial period → `refunded` + royalty reversal.
- Gift flow: user A дарит B → B accepts → subscription holder=B.

## T18. Permissions share-flow

**Сценарий**: user расшаривает свою Pattern-Card другу через UI.

**Шаги**:
1. Open Pattern-Card → ActionBar → Share.
2. Bottom-sheet: add user, preset='editable-by-collaborators'.
3. Permission создаётся: `subject: {kind:'user', id:'friend'}, action: 'read+write'`.
4. Friend получает notification → opens shared card.
5. Friend редактирует → OCC-check → commit.
6. Original user видит изменения с attribution.

**Валидация** (`30-permissions-model.md`):
- Audit: `permissions.granted.v1` event.
- Revoke: owner отзывает → friend теряет access немедленно (WS revoke).
- Policy-engine applies: если friend в санкционной стране → denied despite permission.

## T19. Event schema non-breaking change

**Сценарий**: producer добавляет новое optional поле в `app.daria.booking.slot-reserved.v1`.

**Шаги** (см. `38-event-schema-governance.md`):
1. Schema PR — add optional field with default.
2. CI detects: not breaking.
3. Merge + deploy producer.
4. Existing consumers продолжают работать (ignore unknown fields).
5. New consumer может use новое field.

**Валидация**:
- No version bump.
- Consumer-replay test passes.
- Forward-compat harness green.

Opposite: breaking change → должен быть rejected CI без `breaking-change` label + ADR reference.

## T20. Minor-account activation flow

**Сценарий**: 14-летний пользователь в EU пытается создать account.

**Шаги** (`41-children-safety.md`):
1. Declare age 14 at signup.
2. EU GDPR-K applies (digital-consent age 16).
3. Require parent-email.
4. Parent receives link, creates (или links) account.
5. Parent confirms.
6. Child account active с `role: minor`, parent-controls dashboard available.
7. Child tries dating card-type → policy-engine denies.
8. Child tries subscription > €10 → denies (parent-review required).
9. Child turns 16 → graduation notification sent.

**Валидация**:
- No dating access regardless of attempts.
- Parent sees all child actions в dashboard.
- Policy-engine decisions in audit.
- Moderation applied 100% (not sampled) for minor-uploads.

## Как использовать

1. Каждая Фаза имеет подмножество применимых acid-тестов.
2. **Фаза 3** (первая вертикаль): T4, T7, T10, T12, T13, T14, T16.
3. **Фаза 4** (creator economy): T3, T9, T11, T15.
4. **Фаза 5** (mobility/purchase): T1, T8.
5. **Фаза 6** (инфра-зрелость): T2, T6.
6. Acid-тесты автоматизируются постепенно; старт — в `packages/testing/acid/T<N>.test.ts`.
7. Фаза NOT gone live без зелёных acid-тестов фазы.
