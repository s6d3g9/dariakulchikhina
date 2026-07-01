# 26. Team Topology

Conway's law: системы повторяют структуру команд, их построивших. Архитектура v6 — слоистая и горизонтальная; команда должна быть такой же. Этот документ фиксирует: кто владеет чем, как устроены потоки работы, как команды общаются, как расти от 5 до 50 человек.

Источник: модель Team Topologies (Skelton & Pais) — Stream-aligned / Enabling / Complicated-subsystem / Platform. Применена к слоям v6.

## 1. Четыре типа команд (Team Topologies)

| Тип | Роль | Примеры в v6 |
|---|---|---|
| **Stream-aligned** | Владеет end-to-end потоком ценности | card-type squad (travel, creator, mobility) |
| **Platform** | Предоставляет самообслуживаемые примитивы | platform-services, DX team |
| **Complicated-subsystem** | Глубокая экспертиза в сложной области | wallet-ledger, matching-engine, crypto-custody |
| **Enabling** | Временно помогает stream-aligned | security, SRE, architecture |

## 2. Маппинг на слои v6

```
Layer 6 (Governance)        ← Security + Compliance (Enabling + Platform)
Layer 5 (Experience)        ← Shell team + Design-system team (Platform)
Layer 4 (Card-types)        ← Card-type squads (Stream-aligned)
Layer 3 (Domain primitives) ← Domain-platform team (Platform)
                              + Complicated subsystem teams (ledger, matching)
Layer 2 (Platform services) ← Infra-platform team (Platform)
Layer 1 (Infrastructure)    ← SRE / Ops (Platform + Enabling)
```

## 3. Роли по фазам

### Фаза 0 — Foundation (2–3 чел)

| Роль | Что делает |
|---|---|
| Architect / Tech-Lead | Доки v6, ревью PR, инварианты |
| Full-stack #1 | Monorepo, Turborepo, packages скелеты |
| DevOps | docker-compose, SigNoz, обсервируемость |

### Фаза 1–2 — Platform Core (5–8 чел)

| Роль | Focus |
|---|---|
| Architect | По-прежнему owner инвариантов |
| Backend #1 (Go) | identity (Zitadel wrapper), gateway |
| Backend #2 (TS) | payments, wallet, notifications |
| Backend #3 (TS) | pattern-engine, timeline-engine, booking |
| Backend #4 (TS) | authorship-registry, ownership, policy-engine |
| DevOps / SRE | Argo CD, k8s prep, observability |
| Security | Threat-model review, secrets setup |
| QA / Automation | contract-harness + fractal-harness + acid-tests |

### Фаза 3–4 — First Verticals (10–15 чел)

Появляются **stream-aligned squads**:

| Squad | Размер | Состав |
|---|---|---|
| Shell team | 3 | 1 designer, 2 FE (React + RN) |
| Travel squad | 2–3 | 1 FE, 1 BE, 0.5 PM |
| Creator squad | 2–3 | 1 FE, 1 BE, 0.5 PM |
| Care squad (pets/wellness) | 2 | 1 FE, 1 BE |
| Domain-platform team | 3 | BE x3, owner'ы primitives |
| Infra-platform | 2 | DevOps + SRE |
| DX team | 1–2 | codegen, playbooks |
| Security (enabling) | 1 | part-time → full-time к Фазе 7 |

### Фаза 5+ — Scaling (20–35 чел)

- Каждая вертикаль — отдельный squad (mobility, dating, video).
- Platform team разделяется: identity-platform, ledger-platform, event-platform.
- Отдельная DX team с ответственностью за developer productivity metrics.
- Compliance team появляется (готовимся к банку).
- Moderation operations — отдельная группа (не инженеры).

### Фаза 7–8 — Full Platform (35–60 чел)

- Банк — **изолированный сабтрек**: 8–12 человек в отдельной команде с отдельной организационной иерархией и security-clearance.
- Crypto — следующий изолированный сабтрек.
- Central Architecture Office (3 человека) — координация между всеми squad'ами.

## 4. Правила владения

### CODEOWNERS

`.github/CODEOWNERS` — строгий маппинг:

```
# Platform / Infrastructure
/services/identity/            @platform-identity
/services/wallet/              @platform-ledger
/services/gateway/             @platform-infra
/platform/                     @infra-platform
/packages/events/              @platform-event-bus

# Domain primitives
/services/pattern-engine/      @domain-platform
/services/timeline-engine/     @domain-platform
/services/booking/             @domain-platform
/services/authorship-registry/ @domain-platform
/services/ownership-registry/  @domain-platform

# Governance
/services/policy-engine/       @security @compliance
/services/audit-log/           @security @compliance
/platform/law-profiles/        @compliance

# Verticals (Stream-aligned)
/packages/card-types/flight-ticket/      @travel-squad
/packages/card-types/hotel-room/          @travel-squad
/packages/card-types/trip-compound/       @travel-squad
/packages/card-types/photo-asset/         @creator-squad
/packages/card-types/pattern-template/    @creator-squad
/packages/card-types/pet/                 @care-squad
/packages/card-types/chronic-care-plan/   @care-squad

# Shell
/apps/shell-web/               @shell-team
/apps/shell-mobile/            @shell-team
/packages/shell-*/             @shell-team
/packages/ui-react/            @shell-team @design-system

# DX
/scripts/codegen/              @dx-team
/docs/playbooks/               @dx-team @architecture

# Architecture / docs
/docs/architecture-v6/         @architecture
/docs/adr/                     @architecture
```

Эффект: любой PR — автоматически добавляет нужных reviewer'ов. Без approve — merge заблокирован.

## 5. Cognitive load — контроль

Правило Team Topologies: одна команда управляет ограниченным cognitive load'ом. На практике:

- **Stream-aligned squad** ≤ 7 человек, владеет ≤ 5 card-types ИЛИ одной вертикалью.
- **Platform team** ≤ 7 человек, владеет ≤ 5 связанных сервисов.
- **Complicated-subsystem** — 3–5 человек, глубокая экспертиза в одном (wallet-ledger, matching-engine).

Если команда «перегружена» (CL > 7 concerns) → **split**. Новые squad-ы образуются из существующих, не «с нуля».

## 6. Interaction modes (Team Topologies)

Три паттерна общения между командами:

### Collaboration (временный тесный contact)

- Shell team × первая card-type squad при bootstrapping нового card-type'а (Фаза 3).
- Security × любая vertical squad при онбординге нового типа чувствительных данных.

### X-as-a-Service (платформа → потребитель)

- Domain-platform → все vertical squads (через API + SDK + примеры).
- Infra-platform → все команды (через self-service порталы, Argo CD).
- DX team → все (через scaffolding, playbooks).

### Facilitating (enabling)

- Architecture Office ведёт 2-недельные office hours для squad'ов.
- Security facilitates threat-modeling на новых vertical'ях.

## 7. PR-flow

### Small PR (< 200 lines, один слой)

1. Автор открывает PR.
2. CI зелёный.
3. CODEOWNERS — 1 reviewer автоматически.
4. Merge.

**Time to merge**: часы.

### Medium PR (one card-type, < 800 lines)

1. CODEOWNERS: squad-lead + 1 сокомандник.
2. Если затрагивает primitives — domain-platform review (signing-off).
3. Fractal-harness + contract-harness green.
4. Merge.

**Time to merge**: день.

### Large PR (новый сервис, cross-layer, > 800 lines)

1. RFC doc в `docs/adr/` — сначала.
2. Architecture Office review.
3. Предварительный PoC в feature-branch.
4. Split на меньшие PR'ы.
5. Каждый — стандартный flow.

**Never merge gigantic PR** — инвариант DX.

## 8. Standups и ритуалы

Частота настраивается по размеру:

| Событие | Кто | Частота |
|---|---|---|
| Squad standup | squad (≤ 7) | daily 10 мин |
| Platform standup | platform-team | daily 10 мин |
| Architecture sync | tech leads всех squad + arch office | weekly 30 мин |
| Governance review | security + compliance + arch | weekly 30 мин |
| All-hands tech | все инженеры | monthly 60 мин |
| Quarterly planning | все leads + arch office | quarterly day |
| Post-mortem review | incident attendees | per-incident |

Больше ритуалов = меньше кода. Если встречаются > 10 часов в неделю — что-то не так.

## 9. Documentation ownership

Каждая команда владеет документами, относящимися к её слою:

- Shell team: `17-fractal-ux`, `20-mobile-offline-first`, `22-messaging-model` (UX part).
- Platform team: `14-data-architecture`, `15-integration-patterns`.
- Domain-platform: `10-timeline-engine`, `11-creator-economy`, `12-pattern-composition`.
- Security: `19-security-model`, `13-governance-policy` (security part).
- Architecture Office: `07-layered-architecture`, `09-invariants`, `26-team-topology`.
- DX team: `24-dev-experience`.

Каждое изменение — owner-review обязателен.

## 10. Hiring model

### Фаза 1–3: T-shaped

Ищем людей с широкой spectrum'ом (FE+BE comfort) и одной глубокой специализацией (React, PostgreSQL, Go, ...).

### Фаза 5+: I-shaped (специалисты)

- Rust engineer (matching-engine, crypto-signer).
- ML engineer (recommendations, moderation).
- SRE с distributed-systems backgrund (k8s, Temporal).
- Security engineer с audit / compliance опытом.
- Mobile specialist (RN + native integration).

### Фаза 7+: компетенция в изолированных сабтреках

- Банк: engineers с банковским домен-опытом (BaaS integration, AML).
- Crypto: engineers с блокчейн-опытом (Rust, EVM/non-EVM).

## 11. Culture & invariants

1. **Invariants не нарушаются** даже под прессом дедлайна. Нарушение → tech-debt-PR в течение спринта.
2. **Fractal-harness — контракт** между shell team и card-type squad'ами. Без его зелёного статуса card-type не идёт в прод.
3. **Blameless post-mortems** — безусловно.
4. **Doc-first** для больших решений. ADR → обсуждение → код.
5. **Squad-autonomy**: vertical squad решает, что делать внутри card-type, но не может менять инварианты / layout-компоненты / policies (это cross-cutting).

## 12. Признаки проблемы структуры

- **Squad чинит чужой код** чаще раза в неделю → неправильные boundaries.
- **Один человек becomes SPOF** для PR-review — обратная сторона хорошего владения, но нужна rotation.
- **Card-type squad хочет собственный сервис** → нарушение I1, попытка вертикализировать. Поправить — ведь новый сервис должен быть horizontal primitive.
- **Architecture Office стал Change Approval Board** — команды блокируются из-за формальных ревью. Разгрузить через documented invariants + ESLint/CI.

## 13. Antipatterns

- ❌ «Full-stack team на все слои» — приводит к unbounded context.
- ❌ Разделение по frontend/backend вместо по domain — Conway → архитектура frontend-heavy.
- ❌ Security / compliance только в конце фазы — должны быть enabling от Фазы 1.
- ❌ Platform team без ADR-правил — становится bottleneck'ом.
- ❌ «Матричная» структура с двойным подчинением в инженерии — дублирование ответственности.
- ❌ Команда > 8 человек — предел эффективного standup'а.
- ❌ Squad, который «пришёл с улицы» и сразу пишет код без ревью инвариантов.
