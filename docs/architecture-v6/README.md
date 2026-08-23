# Architecture v6 — черновик

Статус: **DRAFT**. Не руководство к действию, а основа для обсуждения.

v6 — целевая архитектура для превращения Daria из одно-продуктовой CRM/ERP в **мультиплатформу**. Охват: studio, messenger, travel, dating, video, mobility (такси/авиа/поезда/аренда), stay (отели/квартиры/дома), purchase (авто/недвижимость/яхты), care (питомцы, wellness), creator economy, education, gaming, marketplace, banking, crypto.

v5.3 остаётся действующей архитектурой до Фазы 2. v6 — куда мы идём.

## Индекс

### Стратегия и стек
- [00-rationale.md](00-rationale.md) — зачем уходить от v5.3
- [01-stack.md](01-stack.md) — целевой стек (polyglot, БД по доменам, фронт на React)
- [02-phases.md](02-phases.md) — фазы миграции v5.3 → v6
- [03-verticals.md](03-verticals.md) — порядок запуска вертикалей, риски
- [04-open-questions.md](04-open-questions.md) — нерешённые вопросы

### UX и модели сущностей
- [05-shell-entity-model.md](05-shell-entity-model.md) — **shell, панели, инверсия instance⇄type** (ключевой UX-принцип)
- [06-card-types-matrix.md](06-card-types-matrix.md) — каталог card-types (mobility, rental, purchase, care, creator…)
- [16-search-and-navigation.md](16-search-and-navigation.md) — universal search, profile-switch, deep-links
- [17-fractal-ux.md](17-fractal-ux.md) — **самоподобная грамматика** всех уровней интерфейса (shell → card → panel → section → item → field)

### Архитектура платформы
- [07-layered-architecture.md](07-layered-architecture.md) — 6 слоёв + каталог 35 сервисов
- [08-repository-structure.md](08-repository-structure.md) — дерево монорепо v6
- [09-invariants.md](09-invariants.md) — архитектурные инварианты, включая Claim Graph и projection kernel
- [14-data-architecture.md](14-data-architecture.md) — где что хранится, ownership БД, consistency
- [15-integration-patterns.md](15-integration-patterns.md) — sync/async/saga, events, idempotency

### Доменные движки
- [10-timeline-engine.md](10-timeline-engine.md) — универсальный timeline для любого действия (Temporal-based)
- [11-creator-economy.md](11-creator-economy.md) — authorship, recursive royalty, licenses, subscription-as-NFT
- [12-pattern-composition.md](12-pattern-composition.md) — Pattern-Card, вложенность, templates, forks

### Governance и ops
- [13-governance-policy.md](13-governance-policy.md) — policy-engine, allow/distill/deny, law-profiles, KYC-градиент
- [18-observability-ops.md](18-observability-ops.md) — OpenTelemetry + SigNoz, SLOs, alerts, runbooks
- [19-security-model.md](19-security-model.md) — threat-model, encryption, PII, secrets, supply-chain

### Клиент и коммуникации
- [20-mobile-offline-first.md](20-mobile-offline-first.md) — local-first, sync protocol, CRDT, optimistic UI
- [22-messaging-model.md](22-messaging-model.md) — fractal comms: чат per-entity, communities, 4 kind conversation
- [25-internationalization.md](25-internationalization.md) — i18n/l10n, RTL, tz/currency discipline

### AI
- [23-ai-assistance.md](23-ai-assistance.md) — AI как горизонтальный примитив: generate/rank/moderate/explain

### Dev и валидация
- [21-acid-tests.md](21-acid-tests.md) — 16 acid-сценариев для phase-gate'ов
- [24-dev-experience.md](24-dev-experience.md) — scaffolding, golden path, CI, onboarding

### Команда и экономика
- [26-team-topology.md](26-team-topology.md) — Conway's law: 4 типа команд, маппинг на слои, CODEOWNERS, PR-flow
- [27-cost-model.md](27-cost-model.md) — per-MAU cost-check per-фаза, unit economics, optimization levers
- [28-migration-from-v5.md](28-migration-from-v5.md) — план переноса 12 studio-доменов в v6 как spec-first redesign

### Глубокие спеки
- [29-shell-state-model.md](29-shell-state-model.md) — state-machine shell'а, focus-switch lifecycle, deep-links
- [30-permissions-model.md](30-permissions-model.md) — permissions как данные, presets, role-based, per-field
- [31-subscription-lifecycle.md](31-subscription-lifecycle.md) — полный LC подписки (trial → active → renew → cancel → expire + gift + resale)
- [32-authorship-algorithms.md](32-authorship-algorithms.md) — конкретные алгоритмы split + lineage distribution с pseudocode и edge-cases
- [33-content-moderation.md](33-content-moderation.md) — таксономия, 3-tier pipeline, appeal flow, community moderation
- [34-notifications-matrix.md](34-notifications-matrix.md) — channel × severity matrix, user prefs, quiet hours, dedup
- [35-disaster-recovery.md](35-disaster-recovery.md) — RPO/RTO per-сервис, 7 DR сценариев с playbook'ами
- [36-template-marketplace.md](36-template-marketplace.md) — discovery / ranking / curation / quality-signals / anti-abuse
- [37-legal-terms.md](37-legal-terms.md) — ToS / PP / disclaimers / acceptance / retention
- [38-event-schema-governance.md](38-event-schema-governance.md) — versioning, deprecation, consumer-discipline
- [39-analytics-metrics.md](39-analytics-metrics.md) — product-metrics, A/B, cohorts, funnels
- [40-accessibility.md](40-accessibility.md) — WCAG 2.1 AA, screen-readers, keyboard nav
- [41-children-safety.md](41-children-safety.md) — age-gates, parent controls, COPPA / GDPR-K / 436-ФЗ
- [42-search-deep-dive.md](42-search-deep-dive.md) — retrieval pipeline, ranking signals, voice/visual
- [43-payments-providers.md](43-payments-providers.md) — PSP routing per-region, 3DS, chargebacks, reconciliation
- [44-identity-flows.md](44-identity-flows.md) — OIDC, passkey, WS-tickets, device-binding, step-up, KYC
- [45-cold-starts.md](45-cold-starts.md) — user / vertical / region bootstrap, seed content, zero-state design
- [46-public-api.md](46-public-api.md) — External API, OAuth, quotas, webhooks, SDKs
- [55-world-model-claim-graph.md](55-world-model-claim-graph.md) — **policy-aware Claim Graph**, provenance, summaries, identity links, invalidation
- [56-generative-surface-engine.md](56-generative-surface-engine.md) — **автокомпозиция widgets/surfaces** по intent, budget и constraints
- [57-editorial-projection-engine.md](57-editorial-projection-engine.md) — семантическая типографика, reflow, motion и Android/Web parity
- [58-command-safety-runtime.md](58-command-safety-runtime.md) — commands, idempotency, confirmation, offline rebase, events
- [59-type-profiles-and-instruments.md](59-type-profiles-and-instruments.md) — модель типов мира, документы, автомобили, instrument registry
- [60-conformance-and-property-tests.md](60-conformance-and-property-tests.md) — security, property, renderer и cross-platform tests
- [61-development-intelligence-and-provider-balancer.md](61-development-intelligence-and-provider-balancer.md) — mother/daughter контур, Graphify/Entire, индексация, patterns и multi-account AI balancing
- [62-nl-only-development-runtime.md](62-nl-only-development-runtime.md) — исполняемая NL-only граница для Serena, Graphify, indexers, dashboards и server-side browsing
- [schemas/](schemas/) — draft machine-readable contracts проекционного ядра
- [reviews/](reviews/) — сохранённые критические аудиты и принятые решения

### Процессы
- [47-feature-flags-policy.md](47-feature-flags-policy.md) — flag lifecycle, naming, cleanup, CI
- [48-tech-debt-policy.md](48-tech-debt-policy.md) — категории, discovery, budget 20%, strategies
- [49-open-source-strategy.md](49-open-source-strategy.md) — что OSS, licensing, governance, roadmap
- [50-release-management.md](50-release-management.md) — cadence, versioning, canary, hotfix, DORA
- [51-incident-response.md](51-incident-response.md) — severity, on-call, IC role, blameless post-mortem
- [52-knowledge-management.md](52-knowledge-management.md) — docs-as-code, RFC, onboarding, anti-silo
- [53-community-support.md](53-community-support.md) — support tiers, community mgmt, trust-building
- [54-innovation-track.md](54-innovation-track.md) — experiments / prototypes / incubator / moonshots, sunset

### Справочник
- [99-glossary.md](99-glossary.md) — консолидированная терминология v6
- [../adr/](../adr/) — Architecture Decision Records (исторические выборы)
- [../playbooks/](../playbooks/) — Golden-path руководства для типовых задач
- [../runbooks/](../runbooks/) — Alert response procedures
- [../rfcs/](../rfcs/) — Requests for Comments (proposals before big changes)
- [../domain/](../domain/) — Domain specs (v5→v6 mapping, vertical specifics)
- [../incidents/](../incidents/) — Post-mortems (blameless) + template

## TL;DR

- **Главный принцип UX (структурный)**: **фрактальная грамматика** — одни и те же правила на всех уровнях (shell → card → panel → section → item → field). Пользователь, освоивший интерфейс машины, автоматически умеет пользоваться интерфейсом кроссовок, беременности, модуля кода. Разница только в данных. См. `17`.
- **Главный принцип UX (эргономика)**: persistent mobile shell с 4 свайп-панелями + центральной карточкой. Любая сущность имеет **instance-вид** («моё») и **type-вид** («модель/бренд/продукт»). Кнопка инверсии переключает всё сразу. См. `05`.
- **Главный принцип архитектуры**: вертикали — это **type-plugins** (`packages/card-types/*`), не сервисы. Сервисы — только горизонтальные примитивы. См. `06`, `07`, `09 I1`.
- **Стек**: React (Next.js) + Expo + Tauri на фронте; TypeScript / Go / Rust / Python на бэке по таблице доменов.
- **Инфра**: Zitadel, Traefik, NATS JetStream, Temporal, PostgreSQL + TigerBeetle + ScyllaDB + ClickHouse + S3, SigNoz, Argo CD.
- **Creator economy** — первоклассная: `authorship-registry` + `ownership-registry` + recursive royalty + subscription-engine. См. `09 I10`.
- **Governance** — runtime: `policy-engine` решает allow/distill/deny по geo/age/jurisdiction. Никаких форков кода под локации.
- **World Model** — policy-aware graph утверждений с provenance и valid-time; UI — детерминированная проекция, а не source-of-truth.
- **Adaptive surfaces** — TypeProfile + InstrumentManifest + constraint solver создают один semantic SurfacePlan для Shell, Messenger, Android и Web.
- **Мобильный-first и offline-first** везде, начиная с shell'а.
- **Фаза 0** начинается уже сейчас и полезна даже без v6 (Turborepo, contracts-package, OpenAPI, SigNoz).

## Статус доков

| Док | Статус |
|---|---|
| 00-rationale | ✅ первый проход |
| 01-stack | ✅ требует ре-синка с 07 (мелкое) |
| 02-phases | ✅ обновлён под layered-архитектуру |
| 03-verticals | ✅ обновлён, слит с 06 |
| 04-open-questions | 🔄 требует дополнения под новые движки |
| 05-shell-entity-model | ✅ ключевой |
| 06-card-types-matrix | ✅ |
| 07-layered-architecture | ✅ |
| 08-repository-structure | ✅ |
| 09-invariants | ✅ 40 правил, I24–I40 — projection kernel target |
| 10-timeline-engine | ✅ Temporal-based, 5 типов шагов, gate'ы |
| 11-creator-economy | ✅ authorship + ownership + recursive royalty + license taxonomy |
| 12-pattern-composition | ✅ atomic/compound/template, binding, travel-пример целиком |
| 13-governance-policy | ✅ policy-engine, law-profiles, KYC-градиент, distill |
| 14-data-architecture | ✅ карта хранилищ, ownership, consistency |
| 15-integration-patterns | ✅ sync/async/saga, idempotency, timeouts |
| 16-search-and-navigation | ✅ universal search + profile-switch |
| 17-fractal-ux | ✅ **структурный закон**: 5 уровней × 7 ролей × 6 жестов × 2 переключателя |
| 18-observability-ops | ✅ SLOs, alerts, runbooks, SigNoz dashboards |
| 19-security-model | ✅ STRIDE, encryption, PII, secrets, supply-chain |
| 20-mobile-offline-first | ✅ sync protocol, CRDT, optimistic UI |
| 21-acid-tests | ✅ 12+ phase-gate сценариев (добавятся i18n T13–T16) |
| 22-messaging-model | ✅ per-entity чаты, 4 kinds conversation, entity-thread / community |
| 23-ai-assistance | ✅ Generate/Rank/Moderate/Explain, 3 сервиса, privacy rules |
| 24-dev-experience | ✅ scaffolding, golden path, CI < 10 мин, onboarding чеклист |
| 25-internationalization | ✅ 5 измерений (lang/region/tz/currency/dir), RTL, Intl API |
| 26-team-topology | ✅ Team Topologies × v6 layers, hiring по фазам, CODEOWNERS |
| 27-cost-model | ✅ инфра-cost per-фаза, per-MAU, optimization levers |
| 28-migration-from-v5 | ✅ spec-first redesign studio-доменов |
| 29-shell-state-model | ✅ runtime state-machine, focus lifecycle, deep-links |
| 30-permissions-model | ✅ permissions как данные, presets, audit |
| 31-subscription-lifecycle | ✅ 7 state'ов, gift, resale, family, compliance |
| 32-authorship-algorithms | ✅ pseudocode + edge-cases, currency, dust, refund |
| 33-content-moderation | ✅ таксономия (4 tiers), 3-tier pipeline, appeals |
| 34-notifications-matrix | ✅ channel matrix, YAML rules, dedup, quiet hours |
| 35-disaster-recovery | ✅ RPO/RTO таблица, 7 DR сценариев |
| 36-template-marketplace | ✅ ranking signals, curation, fair exposure |
| 37-legal-terms | ✅ ToS/PP/disclaimers, acceptance flow, retention |
| 38-event-schema-governance | ✅ versioning, deprecation, 12-мес cycle |
| 39-analytics-metrics | ✅ product metrics, A/B, cohorts, funnels |
| 40-accessibility | ✅ WCAG AA, screen-readers, fractal integration |
| 41-children-safety | ✅ age gates, parent controls, COPPA/GDPR-K/436-ФЗ |
| 42-search-deep-dive | ✅ retrieval pipeline, ranking, voice/visual |
| 43-payments-providers | ✅ PSP routing, methods, refunds, reconciliation |
| 44-identity-flows | ✅ registration/login/passkey/WS-ticket/device-binding/KYC |
| 45-cold-starts | ✅ user/vertical/region bootstrap |
| 46-public-api | ✅ OAuth, quotas, webhooks, SDKs |
| 47-feature-flags-policy | ✅ 4 типа, lifecycle, naming, CI-enforcement |
| 48-tech-debt-policy | ✅ 4 категории, 20% budget, strategies |
| 49-open-source-strategy | ✅ что OSS, licenses, governance, phased roadmap |
| 50-release-management | ✅ cadence, hotfix, canary, DORA metrics |
| 51-incident-response | ✅ SEV taxonomy, IC, war-room, blameless PM |
| 52-knowledge-management | ✅ docs-as-code, RFC, onboarding paths, anti-silo |
| 53-community-support | ✅ 6 tiers, self-service 80%+, creator/partner tiers |
| 54-innovation-track | ✅ 4 tracks, sunset policy, 70/20/10 budget |
| 55-world-model-claim-graph | 🆕 draft canonical target |
| 56-generative-surface-engine | 🆕 draft canonical target |
| 57-editorial-projection-engine | 🆕 draft canonical target |
| 58-command-safety-runtime | 🆕 draft canonical target |
| 59-type-profiles-and-instruments | 🆕 draft canonical target |
| 60-conformance-and-property-tests | 🆕 draft merge-gate target |
| 61-development-intelligence-and-provider-balancer | 🆕 draft canonical target |
| 99-glossary | ✅ единая терминология |
| ADR | ✅ два первых (Turborepo, Temporal) + README + процесс |
