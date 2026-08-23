# 61. Development Intelligence и Provider Balancer

Статус: **DRAFT / canonical target**. Документ фиксирует общий контур разработки Shell v6: Messenger как человекоцентричная точка взаимодействия, материнское ядро знаний и контрактов, дочерние проекты, гибридные индексы, библиотека паттернов и балансировщик нескольких AI-провайдеров/подписок.

## 1. Материнский и дочерние проекты

```text
Shell v6 Mother Project
  ├─ Messenger Interaction Layer
  ├─ World Model / Knowledge Kernel
  ├─ Contract + Pattern Registry
  ├─ Development Intelligence
  ├─ Provider Balancer
  └─ Daughter Projects
       ├─ Real Estate
       ├─ Trade
       ├─ Body / Health / Coach
       ├─ Mind
       ├─ Flow
       └─ future verticals
```

Материнский проект владеет не всеми данными, а общими contracts, vocabulary, policies, design semantics, decision records и инструментами разработки. Дочерний проект владеет доменной моделью и source-of-truth, но публикует claims/events и использует общие contracts.

Messenger — не монолитный backend для всего. Это универсальная interaction/delivery surface: комментарии, реакции, задания, approvals и interactive surfaces. Domain command исполняет владеющий сервис.

## 2. Project Capsule

Каждый дочерний проект публикует машиночитаемый capsule:

```ts
interface ProjectCapsule {
  projectId: string
  version: string
  owningTeam: string
  domainBoundaries: string[]
  worldTypeProfiles: string[]
  instrumentManifests: string[]
  eventContracts: string[]
  commandContracts: string[]
  policyProfiles: string[]
  designContractVersion: string
  sourceRepositories: string[]
  indexes: string[]
  qualityGates: string[]
  deploymentTargets: string[]
  dependencyCapsules: Array<{
    capsuleId: string
    contractVersionRange: string
    contractHash: string
    sunsetDeadline?: string
  }>
}
```

Capsule не содержит secrets. Любая shared-функция появляется через versioned contract, а не через копирование реализации. Breaking mother-contract публикуется только с migration record и minimum support window; `capsule:verify` проверяет hash/range и conformance дочернего проекта.

## 3. Слои знаний разработки

1. `source` — code, schemas, tests, configs, docs, ADR/RFC, incidents;
2. `structural` — symbols, references, imports, ownership, runtime topology;
3. `semantic` — entities, claims, vocabulary, product capabilities;
4. `decision` — accepted/rejected options, evidence, constraints, revisit criteria;
5. `pattern` — проверенные code/design/workflow templates и anti-patterns;
6. `operational` — deploy state, health, SLO, feature flags, compatibility;
7. `product evidence` — user feedback, experiments, support, authoritative examples.

Derived indexes не заменяют source. Каждый индекс хранит source revision, input policy revisions, extractor version, scope, classification, freshness и invalidation SLA.

## 4. Конвейер индексирования

```text
Repository / Docs / Events / Feedback
  -> connector with scope
  -> classify sensitivity/ownership
  -> normalize + policy-scoped deduplicate
  -> parse symbols/entities/claims
  -> provenance links
  -> lexical index
  -> graph index
  -> vector index
  -> pattern/decision candidates
  -> validation + human acceptance where required
```

Порядок policy сохраняется: permission до retrieval/aggregate/rank. Embedding и summary наследуют наиболее строгую политику inputs.

## 5. Гибридный retrieval

Запрос сначала превращается в `DevelopmentIntent`, затем ограничивается project capsule и правами.

```text
Candidates = union(
  Lexical(query),
  SymbolReferences(query),
  ArchitectureGraph(query),
  SemanticVector(query),
  DecisionIndex(query),
  PatternRegistry(query)
) |> HardFilter(projectScope, actorPolicy, capsule, residency)
```

Вектор качества кандидата:

```text
Q(c) = (
  Authority,
  CorrectnessEvidence,
  RevisionMatch,
  Freshness,
  SemanticRelevance,
  Corroboration,
  -RetrievalCost
)
```

Hard scope/policy filter применяется в каждом источнике до union, включая DecisionIndex и PatternRegistry. Compiler/test/runtime evidence выше AI summary. Старый authoritative документ может быть ниже свежего accepted ADR, если ADR явно его supersede'ит.

## 6. Роли инструментов

- symbol navigator (например Serena-класс) — определения/references и точные локальные edits;
- Graphify-класс — architecture/dependency/impact graph;
- Entire-класс — связность сессий, решений и изменений, если adapter предоставляет такой contract;
- lexical/vector indexers — retrieval по тексту/смыслу;
- linters/formatters/typecheckers — executable local constraints;
- compiler/tests/device/browser probes — correctness evidence;
- AI critics — генерация findings, но не authority.

Конкретный vendor заменяем. Adapter обязан объявить inputs, outputs, revision semantics, freshness, privacy и failure mode.

### 6.1. Execution placement

Development Intelligence физически исполняется только в канонической NL-среде:

```text
platform=linux
hostname=v2202602335514431700
repository=/srv/v6
user=claudecode
```

Каждый launcher сначала выполняет `scripts/nl-tooling-policy.mjs`. Проверяются все четыре признака; любой mismatch завершает запуск кодом `78`. Проверка перемещена до установки/старта tool process, открытия dashboard и индексирования.

Serena закреплена на версии `1.7.0`; её project metadata хранится в `/home/claudecode/.serena/projects`, а не в worktree. Dashboard слушает только `127.0.0.1` NL-host и не открывает browser автоматически. Graphify/Entire и будущие index adapters обязаны подключаться через тот же guard; до появления проверенного adapter прямой запуск запрещён.

Недоступность NL не снижает constraint: работа останавливается с точной причиной. Запрещены local workstation process, локальный browser fallback, локальная модель, копия индекса и несанкционированный SSH tunnel. Web research выполняется серверным browser/search adapter с provenance.

Полный runbook: [62-nl-only-development-runtime.md](62-nl-only-development-runtime.md).

## 7. Decision algorithm

```text
request
  -> resolve product intent
  -> load project capsules
  -> retrieve authoritative context
  -> detect contradictions/open decisions
  -> readiness gate
  -> create bounded work plan
  -> select provider/tool route
  -> execute/propose
  -> run executable quality gates
  -> atomically record decision/evidence/change lineage through outbox
  -> update indexes
```

Readiness gate останавливает автоматическое действие только при недостающем product intent, authority, secret, legal scope, irreversible live action или unresolved high-risk contradiction. Безопасный reversible probe выполняется автоматически и также получает lineage. Mutation fail-closed, если lineage/outbox нельзя зафиксировать атомарно.

## 8. Pattern Library

```ts
interface PatternRecord {
  patternId: string
  version: string
  kind: 'code' | 'design' | 'workflow' | 'test' | 'deployment' | 'incident'
  problemSignature: string[]
  applicability: string[]
  constraints: string[]
  templateRefs: string[]
  evidenceRefs: string[]
  knownFailureModes: string[]
  qualityGates: string[]
  owningProject: string
  promotedToSharedAt?: string
  deprecatedBy?: string
}
```

Promotion `daughter -> mother shared` разрешена, когда минимум две вертикали с разными owning teams и независимыми provenance roots подтвердили одинаковую product role и tests. Сходство внешнего вида недостаточно. `PatternUsageRecord` регистрирует всех consumers; deprecation блокирует новые применения и создаёт revisit task для critical failure каждого существующего usage.

## 9. Provider Balancer

Balancer маршрутизирует задачи по account pools. Он поддерживает несколько разрешённых подписок одного оператора (например, два аккаунта provider A и три provider B), но не обходит ToS, лимиты или ownership credentials.

```ts
interface ProviderAccount {
  accountId: string
  providerId: string
  capabilityProfile: string[]
  modelProfiles: string[]
  concurrencyLimit: number
  rateLimitProfile: string
  budgetPolicy: string
  dataResidency: string[]
  allowedProjectScopes: string[]
  healthState: 'healthy' | 'degraded' | 'cooldown' | 'disabled'
  credentialRef: string
}
```

Secrets остаются в secret manager; `credentialRef` не раскрывается task/log/index.

## 10. Маршрутизация задачи

Сначала eligibility:

```text
EligibleAccounts =
  Capability ∩ ProjectScope ∩ DataPolicy ∩ Residency
  ∩ AccountHealth ∩ TermsPolicy ∩ BudgetPolicy
```

Далее multi-objective route:

```text
RouteScore(a, task) = (
  SafetyFit,
  CapabilityFit,
  ContextAffinity,
  ExpectedQuality,
  DeadlineFit,
  RemainingQuota,
  Reliability,
  -ExpectedLatency,
  -ExpectedCost
)
```

Hard constraints не превращаются в веса. Внутри одинакового priority class используется weighted fair queue:

```text
virtualFinish(task, account) =
  max(account.virtualTime, task.arrivalTime)
  + estimatedCost(task) / effectiveWeight(account)
```

После выполнения `virtualTime` корректируется на `actualCost - estimatedCost`; bias хранится per task class. `effectiveWeight` имеет positive floor, hysteresis и jitter; recovery проверяется дешёвым canary traffic. Sticky affinity сохраняет контекст проекта до fairness-debt threshold, deadline/health/policy; переход между project scopes всегда создаёт новую provider session.

## 11. Failure handling

- transient error -> bounded retry на том же account;
- rate limit/quota -> cooldown + route к совместимому account;
- context-sensitive continuation -> transfer только после повторной полной eligibility-проверки и валидации `ContextTransferPackage`;
- provider/model incompatibility -> explicit fallback or human choice;
- partial external side effect -> не retry без idempotency/operation state;
- все accounts ineligible -> blocked result с точной причиной.

Нельзя запускать две модели на одной irreversible задаче и принимать «победивший» side effect. Parallel critique разрешена только read-only/proposal стадии.

`ContextTransferPackage` содержит projectScope, residencyRequirements, classification labels, source revisions и redacted context. Secrets, credential refs и raw PII запрещены. Target должен поддерживать superset разрешённых labels/scopes/residency; иначе transfer deny. Каждая передача получает audit record.

## 11.1. Model-role profiles

Модель выбирается по versioned task profile и capabilities. Активная operational mapping Shell v6 разделяет bounded implementation и независимый review между двумя явно разрешёнными providers:

| Профиль | Route | Effort | Работа |
|---|---|---|---|
| `fast-independent-critic` | `alibaba-maas/qwen3.8-max` | `high` | independent structural review, edge cases, test matrix |
| `bounded-implementer` | `zai-coding-plan/glm-5.3` | `max` | bounded implementation/test slice |
| `architecture-synthesizer` | `zai-coding-plan/glm-5.3` | `max` | distributed/data/security synthesis |
| `adversarial-falsifier` | `alibaba-maas/qwen3.8-max` | `max` | independent invariants, privacy, policy и TOCTOU falsification |
| `multimodal-ui-critic` | `zai/glm-5v-turbo` | `max` | screenshots, video, GUI/layout drift, visual code review |

`glm-5.3` и `qwen3.8-max` — text models; image/video input направляется только в V-route. Если у V-route нет eligible account/resource package, задача получает blocked result. Текстовая модель или локальный vision stack не подменяют vision route.

Правила выполнения:

1. Один mutable slice имеет одного write-owner; остальные модели работают read-only и возвращают findings.
2. На одном subscription account базовый concurrency равен `1`; увеличение разрешается только после успешного canary без queue starvation и rate-limit oscillation.
3. Implementation/synthesis используют Z.AI, independent review/falsification — Alibaba MaaS Qwen. Anthropic, OpenAI, Ollama и local-model fallback в active routing запрещены; между разрешёнными providers также нет неявного fallback.
4. Remaining quota увеличивает допустимую глубину falsification/review, но не является целью расхода. Stop condition — закрытые acceptance criteria и executable evidence, а не число токенов.
5. Model output сохраняется как review record: evidence, accepted/modified/rejected decision, resulting invariant/test и unresolved risk.
6. Account email, OAuth token и subscription metadata не попадают в repository, prompt trace или knowledge index; используется только opaque `accountId`/`credentialRef`.
7. Каждая подписка получает отдельный `ProviderAccount`, isolated NL service account, concurrency/health/quota state. Несколько подписок одного оператора не делят credential file или provider session.

Machine-readable source: [`schemas/development-provider-routing.json`](schemas/development-provider-routing.json). Gate: `pnpm tooling:nl:providers:verify`.

Официальная сверка на 2026-08-20: GLM-5.3 доступен через Z.AI Coding Plan; Alibaba MaaS Coding Plan route `qwen3.8-max` подтверждён отдельным NL canary HTTP 200; GLM-5V-Turbo route остаётся blocked без eligible package. Endpoint/account eligibility проверяется отдельно от существования model id.

## 12. Product understanding loop

```text
Observation/feedback
  -> Claim with provenance
  -> cluster by product intent/problem
  -> compare authoritative examples
  -> extract dominant traits
  -> hypothesis + falsification criteria
  -> prototype/pilot
  -> metrics + qualitative evidence
  -> accept/modify/reject decision
  -> Pattern Registry update
```

«Доминирующий признак» не равен популярности. Он принимается только если связан с user outcome, accessibility/safety и наблюдаемым evidence.

## 13. Инварианты

1. Дочерняя vertical не копирует mother contracts как fork.
2. Messenger не становится владельцем доменных данных.
3. Index/Graphify/Entire/AI output не является correctness authority.
4. У каждого derived index есть source revision, policy и invalidation path.
5. Provider account используется только в разрешённом project/data scope.
6. Несколько подписок не используются для обхода contractual/rate constraints.
7. Irreversible actions не speculative и не дублируются между providers.
8. Shared pattern продвигается по evidence двух и более вертикалей.
9. Любое принятое архитектурное решение имеет ADR/RFC и revisit criteria.
10. После изменения обновляются lineage и затронутые индексы.

## 14. Проверки

- account fairness при разной quota/concurrency;
- cooldown/recovery без thundering herd;
- sticky context без privacy leakage;
- provider outage и all-ineligible state;
- stale index invalidation после commit/policy change;
- daughter contract incompatibility;
- pattern promotion/revocation;
- Graphify impact map против compiler/test evidence;
- replay решения по сохранённым revisions;
- secret/PII absence в traces и knowledge indexes.
