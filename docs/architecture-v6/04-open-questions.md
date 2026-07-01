# 04. Открытые вопросы

Список нерешённого. Каждый пункт нужно закрыть до начала соответствующей фазы. Вопросы сгруппированы по слоям архитектуры.

## Стратегия и стек (до Фазы 0)

- [ ] Монорепо-оркестратор: Turborepo vs Nx — в драфте Turborepo.
- [ ] Формат контрактов: OpenAPI from Zod vs spec-first OpenAPI. Влияет на кросс-язычные SDK.
- [ ] Версионирование `packages/contracts-*`: semver + changesets vs монолитная версия репо.
- [ ] Code-ген TS из JSON Schema events: в `packages/events/dist/` или вручную.

## Shell / UX (до Фазы 3)

- [ ] Module Federation vs статическая регистрация card-types в shell (I12 — MVP статика).
- [ ] Desktop приоритет: Tauri-shell на старте или только mobile+web первое время?
- [ ] Точный gesture-vocabulary для RN vs web — где возможны различия.
- [ ] Offline-режим для travel-compound — scope: планирование (да) vs booking (нет).
- [ ] Глубина navigation-stack до auto-prune (сейчас ≤ 20).

## Identity (до Фазы 1)

- [ ] Multi-tenancy: один tenant на продукт vs единый user pool со scopes.
- [ ] SSO между вертикалями: один аккаунт vs опциональная связка (влияет на KYC банк↔social).
- [ ] Миграция существующих HMAC-сессий — план переходного периода, длительность.
- [ ] Device-binding через secure-enclave — iOS/Android specific flow.

## Gateway / инфра (до Фазы 2)

- [ ] Доменная стратегия: `*.daria.app` vs `daria.app/<vertical>/` (субдомены проще для CORS и cookie).
- [ ] BFF per-frontend vs общий gateway без BFF.
- [ ] Traefik EnterpriseEdition vs Open Source (для LuaScript rate-limit).

## Events / data (до Фазы 3)

- [ ] NATS JetStream vs Redpanda vs Kafka — финальный выбор подтверждается load-тестом.
- [ ] Формат событий: CloudEvents+JSON vs Protobuf. JSON проще, Protobuf компактнее.
- [ ] Retention per-тип: audit 5+ лет, domain 30 дней, presence 0 — финальные цифры.
- [ ] Schema registry: самописный vs Apicurio / Buf Schema Registry.

## Timeline-engine (до Фазы 2)

- [ ] Temporal self-hosted vs Temporal Cloud. Cloud дороже, но меньше ops.
- [ ] Альтернатива: own Saga-orchestrator на JetStream (проще, но меньше возможностей).
- [ ] Max нагрузка Temporal — проверить при 10K активных long-running (pregnancy, mortgage).
- [ ] Timeline-visualisation в UI — собственный компонент vs готовая библиотека.

## Creator economy (до Фазы 4)

- [ ] Off-chain по умолчанию — ок. On-chain чейны: Polygon / Base / оба?
- [ ] Royalty payout frequency: real-time vs daily batch (комплаенс с ФНС).
- [ ] Minimum royalty threshold (dust-policy) — технически и экономически.
- [ ] Similar-by-scheme detection — ML-fingerprint или manual dispute only на MVP.
- [ ] License taxonomy — все 10 сразу или подмножество на MVP?
- [ ] Subscription-as-NFT: resale-роадмэп (через ownership-transfer + royalty автору).

## Pattern composition (до Фазы 3)

- [ ] Compound graph storage: нормализованный vs jsonb. Влияет на query performance.
- [ ] AI-assist compound-generation — модель, hosting, latency-budget.
- [ ] Версионирование template при breaking change — migrate-mode vs fork-new.

## Governance / policy (до Фазы 3)

- [ ] OPA Wasm p99 < 5ms — benchmark подтверждает.
- [ ] Law-profile update workflow: compliance PR + Argo → кто ревью, кто подписывает.
- [ ] Distill UX: как объяснить «частично заблокировано» без путаницы.
- [ ] Federated governance для GDPR/CCPA — один engine или наборы правил по законам.

## Data architecture (до Фазы 6)

- [ ] TigerBeetle миграция из Postgres-ledger: стратегия, reconciliation, rollback.
- [ ] ScyllaDB vs ScyllaDB Cloud vs Cassandra self-hosted — dependency и cost.
- [ ] pgvector → Qdrant threshold — при каком volume.
- [ ] ClickHouse cluster size под реальный event-volume — reality check.

## Integration patterns (до Фазы 2)

- [ ] gRPC only между Go/Rust vs discouraged.
- [ ] Internal mesh: mTLS сразу или позже.
- [ ] Saga orchestration: Temporal (выбрано) или BPMN engine.

## Observability (до Фазы 1)

- [ ] SigNoz self-hosted vs SigNoz Cloud vs Grafana Stack.
- [ ] ClickHouse под SigNoz — shared с audit-log или separate.
- [ ] Incident tracking: Linear vs GitHub Issues vs dedicated.

## Security (до Фазы 3)

- [ ] KMS: Infisical встроенный vs AWS KMS / GCP KMS / Vault.
- [ ] mTLS internal — Фаза 2 или позже (сертификат-ops-стоимость).
- [ ] Bug bounty — когда, через HackerOne или Intigriti.
- [ ] SOC 2 / ISO 27001 — нужно ли заранее для банка.

## Mobile / offline-first (до Фазы 3)

- [ ] WatermelonDB vs @op-engineering/op-sqlite для local SQLite.
- [ ] Sync protocol — собственный vs Replicache / ElectricSQL.
- [ ] CRDT-library: Automerge vs Yjs.
- [ ] Push-to-sync — собственный FCM/APNs vs managed (OneSignal).

## Verticals-specific (до Фазы 4+)

- [ ] Travel: GDS/OTA (Amadeus ↔ Travelpayouts ↔ Sabre).
- [ ] Billing-сервис — где появляется, модель (subscriptions / commission / hybrid).
- [ ] "Broker vs reseller" — юридическая позиция.
- [ ] Dating moderation: in-house vs outsourced vs ML-only.
- [ ] Video: SaaS (Mux/Bunny) длительность — до какого MAU/GB.
- [ ] Live vs только VOD в первой версии video.
- [ ] Mobile стратегия: Expo единый vs нативные iOS/Android на масштабе.

## Banking (до Фазы 8)

- [ ] BaaS партнёр vs своя лицензия.
- [ ] Юрисдикция: РФ / EAC / EU / оффшор / комбинация.
- [ ] KYC-провайдер: Sumsub / Onfido / оба.
- [ ] Доля через our ledger vs partner (TigerBeetle vs Postgres).
- [ ] Travel Rule, санкционные списки, SAR — процесс.

## Crypto (до Фазы 9)

- [ ] Биржа vs custodial wallet vs DEX aggregator — стратегия.
- [ ] Fireblocks vs собственная кастоди — начать только с Fireblocks.
- [ ] Listing policy: permissionless невозможен vs строгий review.
- [ ] Market maker партнёрства — без них ликвидности нет.
- [ ] РФ позиция по криптобиржам на момент запуска.

## Решённое / rejected

- ✅ **Frontend стек**: React (Next.js) + React Native (Expo) + Tauri.
- ✅ **Миграция studio с Vue**: spec-first redesign (нет пользователей → strangler не нужен).
- ✅ **Фрактальный UX** — инвариант I19–I23 + fractal-harness.
- ✅ **Instance ⇄ Type inversion** — для всех сущностей.
- ✅ **No service-per-vertical** — вертикали как type-plugins.
- ✅ **Temporal для saga orchestration** — вместо BPMN / custom.
- ✅ **NATS JetStream** — вместо Kafka (ops-стоимость).
- ✅ **Runtime governance через policy-engine** — вместо code-branches.
- ✅ **Off-chain authorship as default** — on-chain optional.
- ✅ **Universal card-type anatomy (6 секций CardView)** — I19 + 17-fractal-ux.
- ❌ **Angular** — Google не использует для новых продуктов.
- ❌ **Flutter (primary)** — web слаб, Dart разделяет команду. Escape hatch для mobile-банка.
- ❌ **NativeScript-Vue / Ionic-Vue** — маргинальная экосистема.
- ❌ **Electron** — Tauri современнее и легче.
- 🔄 **Открыто**: точный момент «maintenance mode» для `packages/ui-vue`. Решить после Фазы 2.

## Нефункциональные (сквозные)

- [ ] Политика данных: что общее между вертикалями (identity, billing), что изолировано (banking, crypto).
- [ ] GDPR erase при финансовой истории — анонимизация после retention.
- [ ] Incident response: одна процедура vs per-vertical (банк отдельно).
- [ ] Сквозная OTel trace-propagation через все runtime'ы и языки.
- [ ] Feature-flags: GrowthBook vs Unleash vs LaunchDarkly.
- [ ] A/B testing инфра — нужна с Фазы 6 (social), критична для recommendations.
- [ ] Стоимость инфры на 2 года при реалистичном MAU — обязательно перед Фазой 6.
