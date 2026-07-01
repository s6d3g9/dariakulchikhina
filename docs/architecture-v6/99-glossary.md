# 99. Glossary

Консолидированный справочник терминов v6. Используется в спорных ситуациях «что это значит» — один источник истины.

## Сущности

### Entity
Любой объект, который может быть в фокусе shell'а: человек, машина, квартира, питомец, курс, модуль кода, поездка, сообщество, и т.д. Имеет `kind` и уникальный `id`. Поддерживает два вида (instance / type) и опциональные modes (см. `05-shell-entity-model.md`).

### Instance
Конкретный экземпляр сущности. «**Моя** машина», «**этот** курс, который я веду», «**эта** поездка в Стамбул». Имеет владельца, свою history, timeline, privacy-настройки.

### Type
Класс / модель / бренд / архетип сущности. «Toyota Camry 2023», «курс React Mastery», «порода немецкая овчарка». Публичный, может иметь community. **Не минтабельный** напрямую (инвариант творческой экономики).

### Inversion (⇄)
Переключение между instance-view и type-view одной сущности через кнопку ⇄. Все 4 панели shell'а перерисовываются контекстно (см. `05` §3).

### Mode
Вторичное измерение: `consumer / provider / creator / marketplace / private / public`. Перпендикулярно inversion. Максимум — 2 оси (I19) — больше запрещено.

---

## Карточки

### Pattern-Card
Универсальный примитив действия: «бронь отеля», «обслуживание машины», «план беременности», «покупка дома». Имеет timeline, может быть вложена в другую Pattern-Card (compound). См. `12-pattern-composition.md`.

### Atomic
Pattern-Card, не содержащая вложенных Pattern-Card'ов. Единица действия (например `flight-ticket`).

### Compound
Pattern-Card, состоящая из вложенных детей с binding'ами (sequential / parallel / conditional). Например `trip-compound` = flight + hotel + transfers + dinners.

### Template
Замороженная Pattern-Card, опубликованная автором как «рецепт». Может быть форкнута, имеет license + split-policy, mintable (см. `11-creator-economy.md`).

### Fork
Акт копирования template'а с сохранением lineage-связи. Royalty автору исходного template'а распределяется через split-policy.

### Materialize
Процесс создания instance Pattern-Card из template (с подстановкой параметров пользователя).

### Card-type
Зарегистрированный в `packages/card-types/<name>/` плагин, описывающий один kind сущности. Обязан: `instance.view`, `type.view`, 8 panel-providers, `timeline.ts`, `entity-provider.ts` (инвариант I3, I15, I21).

---

## Архитектурные слои

### Layer 1 — Infrastructure
Физические БД, брокеры, облако, сеть. Постгрес, TigerBeetle, ClickHouse, Redis, NATS, S3, k8s.

### Layer 2 — Platform Services
Горизонтальные сервисы, нужные всему: identity, payments, wallet, gateway, events, observability. 12 штук.

### Layer 3 — Domain Primitives
Универсальные доменные движки: pattern-engine, timeline-engine, booking, authorship-registry, subscription-engine, messenger. 18 штук.

### Layer 4 — Vertical Type-Packs
`packages/card-types/*`. Вертикали как плагины. **Нет сервисов** на этом слое.

### Layer 5 — Experience
`apps/shell-*` + `apps/admin`. UI-слой.

### Layer 6 — Governance
Policy-engine, moderation, disputes, audit-log, trust-safety. Сквозное управление.

---

## Shell и UI

### Shell
Persistent-контейнер клиента: 4 панели + центр + switcher + search. Живёт на всё время сессии, не размонтируется при навигации (I2 + fractal).

### Panel
Одна из 4 периферийных областей shell'а (top / left / right / bottom). Контент параметризован текущим entity + view + mode.

### PanelProvider
Функция card-type, возвращающая содержимое конкретной панели в конкретном view. 8 на card-type: 4 слота × 2 view.

### CardView
Каноничная анатомия центральной карточки: 6 секций (HEADER / TIMELINE / SUMMARY / ACTIONS / SECTIONS / FOOTER) — см. `17-fractal-ux.md` §5.

### EntityProvider
Контракт card-type: `resolveInstance`, `resolveType`, `linkInstanceToType`, panel-providers. Без него сущность не может быть в фокусе (I15).

### Switcher
Центральный модуль-переключатель в shell'е (messenger / travel / dating / ...). Запускает default Pattern-Card конкретного card-type.

---

## Timeline и процессы

### Timeline
Универсальный roadmap действия: initiation → steps → completion. Обязателен для любого card-type (I21). См. `10-timeline-engine.md`.

### TimelineStep
Узел timeline. 5 типов: `auto / human / external / gate / compound`.

### Gate
Условная точка timeline, разблокируется policy-engine. Пример: «KYC L2» → позволяет шаги выше лимита.

### Compensating action (saga)
Rollback-handler для destructive step'а. Выполняется при откате saga в обратном порядке.

### Evidence
Артефакты выполненного step'а: документы, подписи, чеки, on-chain tx. Хранятся в media-pipeline, метаданные в timeline-engine, copies в audit-log (WORM).

---

## Creator economy

### Authorship
Факт создания template или asset'а конкретным пользователем. Регистрируется в `authorship-registry`.

### Ownership
Факт владения instance асет'а (цифрового или физического). Регистрируется в `ownership-registry`. Authorship ⊆ ownership (первый автор = первый владелец).

### Split-policy
Правило, как распределяется доход от use/fork/purchase template'а. Содержит `splits[]`, `forksLineageRule`, `currency`, `dustPolicy`. См. `11` §3.

### Lineage
Граф fork-ссылок template'а. Geometric / linear / equal — варианты распределения royalty по ancestors.

### License
Правовое выражение правил использования: CC0 / CC-BY / MIT / GPL / Commercial-1x / Royalty-Fork / Private (см. `11` §5).

### Subscription-as-NFT
Подписка, моделируемая как владение временным access-ключом, registered в ownership-registry. Resale allowed, royalty при resale автоматически.

---

## Governance

### Policy
Декларативное правило allow / distill / deny, применяемое runtime'ом. YAML/Rego.

### Law-profile
Набор правовых параметров региона: возраст, запрещённые категории, required disclosures. `platform/law-profiles/<region>.yaml`.

### Distill
Частичное allowance: mask — скрыть поля, replace — подменить CTA, require — добавить disclosure.

### KYC-level
Градиент (0–4), не boolean. Gate для action'ов с пороговой suma, sensitive data, regulated verticals.

### Credential
Верифицированный документ в `credentials-vault`: лицензия, сертификат, родословная, прививка. Используется gate-шагами.

---

## Event-driven

### CloudEvent
Базовый envelope события в JetStream. Формат: `app.daria.<domain>.<event-name>.v<N>`. Must include `id`, `time`, `traceparent`.

### Stream (JetStream)
Durable канал: `durable-domain` (30 дней), `financial-audit` (5 лет WORM), `ephemeral-presence` (Redis, не JetStream).

### Consumer group
Durable подписчик с ack-политикой и DLQ.

### Saga
Cross-service transaction через compensating actions. Orchestrator — timeline-engine / Temporal.

### Idempotency-Key
UUID v7, передаваемый в HTTP header / event-id для гарантии idempotent processing.

---

## Data

### Per-service DB
Каждый сервис владеет своей БД. Кросс-сервисное чтение — только через API или event-replicated projection (I6).

### Projection (read-model)
Локальная таблица в сервисе B, обновляемая consumer'ом событий сервиса A. Для частого read-heavy access без cross-service HTTP.

### OCC (Optimistic Concurrency Control)
Каждая mutable строка имеет `version`. Мутация передаёт `expected_version`, mismatch → 409.

### Soft-delete
Пометка `deleted_at` вместо физического удаления. Физическое удаление — только через GDPR-erase (crypto-erase DEK).

### WORM (Write-Once-Read-Many)
Append-only storage, удаление физически невозможно. Audit-log + financial-audit.

---

## Messaging

### Conversation
Объединённая модель для 4 kinds: `dm / group / entity-thread / community`. См. `22-messaging-model.md`.

### Entity-thread
Conversation, привязанная к instance-entity («чат про мою машину»).

### Community
Conversation, привязанная к type-entity («владельцы BMW X5»).

### WS ticket
30-секундный одноразовый токен из Zitadel → Redis, для WebSocket handshake с messenger.

---

## Observability

### Trace
Цепочка span'ов, связанных `traceparent`. Покрывает границы сервисов, events, Temporal workflows.

### Span
Единица трассировки: `<service>.<operation>.<subresource>` + attributes.

### Golden signals
RED (Rate / Errors / Duration) + USE (Utilization / Saturation / Errors).

### SLO
Service Level Objective. Формальная цель + error budget (1 - SLO).

### Runbook
Документ на SEV-1/SEV-2 alert: что значит, куда смотреть, immediate actions, escalation.

---

## Security

### STRIDE
Threat-model классификация: Spoofing / Tampering / Repudiation / Information disclosure / Denial of service / Elevation of privilege.

### DEK / KEK
Data Encryption Key (per-user) / Key Encryption Key (в KMS). Envelope encryption с crypto-erase.

### MFA / WebAuthn / passkey
Multi-factor authentication. Passkey — современный passwordless стандарт (WebAuthn).

### MPC / HSM
Multi-Party Computation / Hardware Security Module. Для crypto custody в Фазе 9.

---

## Mobile / offline

### Outbox (device)
Локальная очередь пользовательских изменений, ожидающих sync.

### CRDT
Conflict-free Replicated Data Type. Для merge offline-изменений без человеческого разрешения конфликтов (лайки, drafts).

### LWW
Last-Write-Wins с HLC (hybrid-logical-clock).

### Optimistic UI
Применить изменение локально до подтверждения сервером; откат при rejection.

---

## AI

### Ai-assist
Сервис для `generate` + `explain` задач. Consumer: любой card-type с `ai:` declaration.

### Recommendations
Сервис для `rank`. Feed, search, matching.

### Moderation-ml
Сервис для `moderate`. NSFW, spam, harmful, fraud.

### Provenance
Маркировка `generatedBy` на AI-content. Обязательна.

### Opt-in training
User-consent на использование его data для fine-tuning моделей. Default off.

---

## Dev

### Scaffolding
`pnpm create card-type / service / event / law-profile` — генерирует скелет по шаблону.

### Fractal-harness
Тестовый пакет `packages/testing/fractal-harness`, проверяющий самоподобие UI card-types (I19).

### Golden path
Документированная последовательность шагов для типовой задачи. См. `24-dev-experience.md` §4.

### ADR
Architecture Decision Record. `docs/adr/NNNN-<slug>.md`.

### CODEOWNERS
GitHub-файл, определяющий обязательных reviewer'ов на PR, затрагивающий конкретные пути.

---

## Инварианты (quick-reference)

См. [09-invariants.md](09-invariants.md) для полного списка. Быстро:

- I1 — horizontal-only services
- I2 — plugin registry for card-types
- I3 — dual view (instance + type) обязательно
- I6 — нет cross-service DB access
- I8 — runtime governance, не code
- I10 — recursive royalty
- I17 — audit = WORM
- I19 — фрактальная грамматика
- I21 — timeline обязателен
- I22 — inversion обязательна
