# 00. Rationale — зачем v6

## 1. Проблема в одном предложении

v5.3 — хорошо спроектированная архитектура **одного продукта**. v6 — архитектура **платформы, где продукты являются плагинами**. Разница в архитектуре не количественная, а качественная.

## 2. Что не так с v5.3 для мультиплатформы

v5.3 работает для CRM/ERP студии с тремя сателлитами (messenger, comm-service). Для супер-апп она упирается в **6 архитектурных стен**:

### Стена 1: Монорантайм `server/`

`server/` де-факто — «главный» процесс: Nuxt SSR + REST + SSE в одном Nitro.

**Проблема для мультипродукта:**
- Банкинг обязан быть изолирован — PCI DSS, AML, KYC, отдельный аудит-лог, отдельные ключи, отдельная команда на ревью доступов.
- Криптобиржа — ещё строже (custody ключей, on-chain операции, регуляторика per-jurisdiction).
- Медицинские данные — 10-year retention, отдельные RBAC, compliance режим.
- Делить это с дизайн-студией нельзя — не легально (compliance) и не безопасно (blast radius).

**Решение в v6**: каждый сервис — отдельный runtime, отдельный deployable. Банковский cluster — в отдельном VPC (см. `19-security-model.md §11`). Компрометация одного сервиса не компрометирует остальные.

### Стена 2: Один Postgres

Правило «новые сервисы не ходят в main Postgres» хорошее, но всё ещё предполагает main Postgres как центр. Мультипродукт требует **БД по доменам**, потому что нагрузочные профили несовместимы:

| Домен | Профиль | Нужная БД |
|---|---|---|
| Финансы | ACID, append-only ledger, 1M+ TPS | TigerBeetle |
| Social graph (dating, video) | Write-heavy KV, 100M+ edges | ScyllaDB |
| Analytics / audit | OLAP, range-queries, compressions | ClickHouse |
| Media | Immutable blobs, CDN-friendly | S3-compat |
| Vectors (recs, search) | Similarity queries | pgvector → Qdrant |
| Transactional OLTP | Relational, strong consistency | Postgres per-service |
| Cache / presence | In-memory, TTL | Redis |

Одна Postgres для всего = страдают все вертикали. См. `14-data-architecture.md`.

### Стена 3: Auth = HMAC-cookie

Для одного продукта и трёх ролей (admin / designer / client) HMAC-cookie — норм.

**Проблема для мультипродукта:**
- Нет **SSO** между вертикалями (каждый раз логиниться заново).
- Нет **scopes per-product** (`banking:read`, `dating:write`).
- Нет **KYC-градиента** (finance нужен L3, чат нужен L0).
- Нет **MFA / WebAuthn** (регуляторка banking требует).
- Нет **mobile-ready tokens** (JWT + refresh).
- Нет **federation** (Google / Apple SSO).

**Решение в v6**: Zitadel self-hosted как IdP. См. `44-identity-flows.md`. HMAC-cookie становится адаптером на переходный период.

### Стена 4: `shared/` как контракт всего

На 10+ доменах общий `shared/types` превращается в bottleneck:
- Любое изменение типа тянет typecheck всех рантаймов.
- Breaking change — **невозможен** без координации 10 команд.
- Polyglot (Go / Rust) не может использовать TS types.

**Решение в v6**: `packages/contracts-<layer>` + **OpenAPI-generated SDKs** per-language (ADR-0010). Каждый домен — своя версия контрактов, changesets-based releases.

### Стена 5: TS-монокультура

Node/TS хорош для velocity, но:

| Задача | Нужный язык | Почему |
|---|---|---|
| Matching engine (биржа) | Rust | Low-latency, memory safety, no GC pauses |
| Crypto signing / ledger-critical | Rust | Formal verification, safety-critical |
| Gateway / media control-plane | Go | Concurrency, single binary, low memory |
| Wallet core (Phase 6+) | Go | Same — но с TigerBeetle integration |
| Recommendations / ML inference | Python | Экосистема (PyTorch, ONNX) |
| CRUD-heavy сервисы | TypeScript | Velocity, type-inference, shared с фронтом |

Выбирать один язык для всего — значит заведомо брать неподходящий инструмент в финансах, crypto, медиа.

**Решение в v6**: polyglot с жёсткими правилами (см. `01-stack.md §2`). Границы per-language чёткие, взаимодействие через HTTP/gRPC/events.

### Стена 6: Деплой

`deploy-safe.sh` + PM2 на одной VPS — это потолок одного продукта.

**Проблема для мультипродукта:**
- Per-service CI / deploy pipelines независимы.
- Per-vertical environments (banking isolated VPC).
- Blue/green, canary, progressive rollouts.
- Cross-region для DR.
- Managed k8s для auto-scaling.
- GitOps (Argo CD) вместо manual scripts.

**Решение в v6**: phased migration PM2 → Docker Swarm → managed k8s (ADR-0008). См. `02-phases.md` Phase 6.

## 3. Что v6 добавляет сверх обхода стен

Если бы v6 только решал проблемы v5.3 — было бы улучшенное v5.4. Но v6 — это **новая архитектура продукта**, а не только инфраструктуры. Три принципа, которых в v5.3 нет:

### P1. Горизонтальные примитивы вместо vertical services

v5.3 paradigm: если появится «travel-feature» — это новые модули внутри `server/modules/travel/`.

v6 paradigm: **никаких vertical services**. Travel — это пакет `packages/card-types/flight-ticket/ + hotel-room/ + trip-compound/`, использующий ТЕ ЖЕ сервисы что и dating, banking, education. Новая вертикаль = плагин, не сервис (инвариант I1).

Это даёт **фундаментальную** экономию: добавить 10-ю вертикаль стоит столько же, сколько 2-ю, а не 10x. См. `07-layered-architecture.md`, `17-fractal-ux.md`.

### P2. Фрактальный UX

Один и тот же компонент (`CardView`, `PanelView`, `ActionBar`, `InversionButton`) рендерит машину, курс, квартиру, питомца, модуль кода. Пользователь, освоивший один card-type, автоматически умеет пользоваться всеми. См. `17-fractal-ux.md`.

В v5.3 каждая область студии имеет свой UX. В v6 **невозможно** разработать уникальный UX под вертикаль — инварианты I19/I20 блокируют.

### P3. Creator economy как первоклассный слой

В v5.3 студия публикует шаблон договора — это «data». В v6 шаблон — это **asset** с автором, лицензией, split-policy, recursive royalty. Любой пользователь может публиковать templates и получать revenue. См. `11-creator-economy.md`, `32-authorship-algorithms.md`.

Это не «фича». Это отдельное измерение платформы. Без него v6 — просто multi-product. С ним — market.

## 4. Что v5.3 делает правильно и что сохраняется в v6

Не меняем то, что работает:

- **DDD-lite в `server/modules/`** — граница переносится в отдельные сервисы.
- **Ticket-based WS auth** — паттерн правильный, только тикеты теперь выдаёт identity-сервис.
- **Cursor pagination** — остаётся обязательной (инвариант I9).
- **OCC через `version`** — остаётся для всего OLTP (I9).
- **Soft delete** — остаётся (I9).
- **FSD на фронте** — остаётся внутри каждого `apps/*`.
- **ESLint-инварианты** — идеология переносится, правила обновляются под новые границы.
- **`deploy-safe.sh`** — остаётся для studio-monolith до archiving в Phase 4.

## 5. Когда НЕ нужно делать v6

v6 — серьёзная инвестиция (минимум 35 weeks до первой vertical в проде — см. `02-phases.md`). НЕ делаем v6, если:

- Продукт один и останется одним. v5.3 его обслужит десятилетия.
- Team < 3 человек. Не потянет инварианты / polyglot / 35 сервисов.
- Unit economics не окупают platform-costs (см. `27-cost-model.md`). Single-product команда дешевле поддерживает single-product stack.
- Regulatory context не требует isolation (no banking / crypto / medical).

Для простого mobile-first CRM — v5.3 с улучшениями лучше, чем v6.

## 6. Когда начинать v6

**Строгий триггер**: появление **второй продуктовой вертикали** в бэклоге с горизонтом 6+ месяцев.

**До триггера**: только Phase 0 («заморозка долгов») — полезна даже без v6, так как даёт:
- Turborepo + кэш сборок.
- Contracts-packages.
- OpenAPI-generation.
- SigNoz observability.

Фаза 0 занимает 2-3 недели и improves v5.3 developer experience. Перейти от Phase 0 к Phase 1 — отдельное решение на основе появления second vertical.

## 7. Какой ROI от v6 (качественно)

| Измерение | v5.3 | v6 |
|---|---|---|
| Cost of +1 vertical | Рост экспоненциально | Почти константа |
| Blast radius инцидента | Вся платформа | Один сервис |
| Hiring flexibility | Только TS-разработчики | Polyglot, широкий пул |
| Regulatory compliance | Compromised для banking / crypto | Native support per-isolated cluster |
| Creator revenue models | Manual integration | Automatic (pattern-template) |
| Time to migrate к mobile | Full rewrite | Already (Expo) |
| DR capability | Manual snapshots | RPO/RTO per-service |
| Observability | Basic | Full OTel + SigNoz |

## 8. Какие риски при переходе

| Риск | Митигация |
|---|---|
| Scope creep: «пока переписываем, давайте ещё X» | Phase-gates, acid-tests |
| Команда перегружается изучением polyglot | Hiring план `26-team-topology.md`, 1 новый язык per-phase |
| Costs растут без revenue | Phase-gate checks `27-cost-model.md` |
| Timeline overrun | Spec-first reduces rewrite risk; phases sized 4-12 weeks |
| Invariants игнорируются под prod-pressure | ESLint / fractal-harness / ADR-process |
| v5.3 maintenance отвлекает | Feature-freeze v5.3 после Phase 1 |

## 9. Архитектура как code

v6 — не просто docs. Архитектура **enforced**:

- **ESLint rules** на cross-service DB access (I6), vertical-services (I1), cross card-type imports (I2).
- **Fractal-harness** — structural UI snapshot tests (I19).
- **Contract-harness** — Zod/OpenAPI drift detection (I5).
- **`docs:v6:verify`** — doc consistency CI check.
- **Acid-tests** — phase-gate blocking.

Нельзя «забыть» про invariant — CI напомнит.

## 10. Следующий документ

[01-stack.md](01-stack.md) — конкретный технологический стек (языки, БД, сервисы, инфра) per-слой.
