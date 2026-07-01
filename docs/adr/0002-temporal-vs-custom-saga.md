# ADR-0002: Temporal vs custom saga-orchestrator

- **Статус**: Accepted
- **Дата**: 2026-04-18
- **Решение**: Temporal (self-hosted)
- **Ответственный**: Architecture Office, Platform team

## Контекст

`timeline-engine` — core сервис v6: исполняет long-running workflows для всех Pattern-Card'ов (travel-compound 7 дней, pregnancy 40 недель, mortgage 20+ лет, subscription months). Нужен движок, который:

- Гарантирует **durable execution** (переживает рестарты сервиса и БД).
- Поддерживает compensating sagas (rollback-chain).
- Интегрирует human-steps (ждать N часов на подпись).
- Переигрывает history для аудита.
- Имеет UI для operations (видеть running/stuck workflows).

Рассмотрены: **Temporal**, **custom-on-JetStream**, **BPMN engine**, **AWS Step Functions**.

## Альтернативы

### Temporal

Плюсы:
- Production-proven (Uber, Snap, Netflix) на огромных объёмах.
- Durable execution с replay из коробки.
- Отлично подходит для long-running (годы).
- SDK для TS/Go/Rust/Python/Java — совпадает с нашим polyglot-стеком.
- Web UI для ops.
- Активное community, хорошие доки.
- Temporal Cloud доступен, если self-host окажется тяжёлым.

Минусы:
- Ops-нагрузка: Temporal нуждается в своём Postgres/ES + 3+ сервисов.
- Learning curve (concepts: workflows, activities, signals, queries).
- Over-engineering для simple workflow'ов.

### Custom-on-JetStream

Плюсы:
- Уже есть JetStream (event backbone).
- Минимум новых зависимостей.
- Полный контроль.

Минусы:
- Переизобретение durable execution, history, retry-logic — ОГРОМНЫЙ объём работы.
- Нет battle-tested гарантий.
- Нет UI.
- Нам придётся поддерживать это 10+ лет.
- Вероятность bug'ов в core logic.

### BPMN engine (Camunda / Zeebe)

Плюсы:
- Графический editor для workflow'ов.
- Хорошо для business analysts.

Минусы:
- Java-heavy ecosystem.
- BPMN — слишком enterprise для нашего use-case.
- UI-ориентированный workflow не подходит для code-first команды.
- Тяжёлая ops.

### AWS Step Functions

Плюсы:
- Managed, zero-ops.
- Простой pricing.

Минусы:
- AWS lock-in (мы не на AWS).
- Не подходит для long-running (1 year max duration).
- Нет human-steps native.
- JSON-based workflow definition — слабее кода.

## Решение

**Temporal (self-hosted)** — с возможным переходом на Temporal Cloud в Фазе 6, если ops-нагрузка окажется слишком большой.

Почему:

1. **Durable execution — must-have** для timeline-engine. Переизобретать = 6+ человеко-месяцев работы с высоким риском bug'ов в financial / medical flow'ах.
2. **Long-running** (pregnancy-tracker, mortgages) — Temporal native, AWS Step Functions и другие managed не подходят.
3. **Polyglot SDKs** — совпадает с TS/Go/Rust/Python стеком v6.
4. **Replay для аудита** — legal requirement в banking/regulatory.
5. **Production-proven** — снижает риск архитектурной ошибки.
6. Self-hosted на старте — reasonable cost (~€100/мес в Фазе 2), Temporal Cloud при масштабе.

## Последствия

### Положительные

- Core primitive для v6 — решён выбором proven-технологии.
- Polyglot support позволяет запускать workflow'ы в любом сервисе.
- UI для ops из коробки.
- Audit-trail (workflow history) соответствует требованиям.

### Отрицательные / риски

- Дополнительные 3 сервиса в platform (frontend, history, matching) — ops-нагрузка.
- Команде нужно изучить Temporal concepts.
- Возможная миграция на Temporal Cloud при масштабе — cost implication.
- Temporal → Postgres — дополнительный DB cluster.

### Mitigations

- DX team делает wrapping-helpers (`defineTimeline(...)`) чтобы скрыть Temporal-специфичность.
- Playbook в `docs/playbooks/` для типовых паттернов.
- Monthly ops review Temporal performance.

## Revisit

Пересмотреть **в Фазе 6** (managed k8s). Возможные варианты:
- Остаёмся на self-hosted (если ops налажены).
- Переходим на Temporal Cloud (если проще ops < X экономия).
- Переходим на конкурента (Restate, DBOS — новые) если они станут зрелее.
