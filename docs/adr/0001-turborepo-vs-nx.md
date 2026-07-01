# ADR-0001: Turborepo vs Nx для монорепо v6

- **Статус**: Accepted
- **Дата**: 2026-04-18
- **Решение**: Turborepo
- **Ответственный**: Architecture Office

## Контекст

v6 имеет 4 runtime'а (TS, Go, Rust, Python), 35 сервисов, 60+ packages. Нужен оркестратор монорепо, чтобы:

- Строить только изменённое.
- Кешировать сборки локально и в CI.
- Выполнять задачи параллельно в зависимости от графа.
- Не требовать от разработчиков учить отдельную систему конфигурации.

Рассмотрены: **Turborepo**, **Nx**.

## Альтернативы

### Turborepo

Плюсы:
- Минимальная конфигурация (`turbo.json`), чисто JSON, без своего DSL.
- Remote cache встроен (Vercel-хост бесплатно для open-source / платно для private).
- Быстрый в простых случаях.
- Pipeline-concept понятен за 10 минут новому разработчику.
- Хорошо работает с pnpm workspaces.
- Нет lock-in в Nx-экосистему.

Минусы:
- Меньше возможностей для сложных build-графов (но нам не нужно — стек polyglot, не JS-heavy).
- Нет встроенных генераторов (но у нас `plop.js`).
- Слабее в orchestration Go/Rust/Python задач — требует shell-скриптов.

### Nx

Плюсы:
- Мощнее: плагины, генераторы, analyze-команды.
- Build-graph visualization.
- Interop с Angular/Next/Node плагинами.
- Есть built-in generators (похожи на plop).

Минусы:
- Heavier configuration (`project.json` + `nx.json` + плагины + executors).
- Nx-specific DSL усложняет onboarding.
- Lock-in в Nx-экосистему, миграция с неё сложная.
- Для polyglot (Go/Rust/Python) тоже нужны workarounds.
- Больше lines-of-config для эквивалентной функциональности.

## Решение

**Turborepo**, потому что:

1. Архитектура v6 уже сложная — орchestrator должен быть **простым** по контрасту.
2. Polyglot-стек делает Nx-плагины не особо полезными (Nx silной в JS-ecosystem, у нас BE на Go/Rust).
3. `plop.js` закрывает generator-потребность без Nx.
4. Onboarding новому разработчику легче (JSON vs DSL).
5. Miграция обратно с Turborepo проще, чем с Nx (меньше vendor-specific кода).
6. Remote cache работает сразу (бесплатно для small-team через Vercel).

## Последствия

### Положительные

- Быстрый старт.
- Простота CI-конфигурации.
- Нет lock-in.

### Отрицательные / риски

- Если придёт сложный build-граф (зависимости между Rust→Python ML-моделями с preprocessing) — придётся писать обёртки руками.
- Нет visualizer — надо будет попробовать `turbo run build --graph`.
- Remote cache hosting — зависимость от Vercel; при необходимости self-host'а придётся мигрировать на open-source альтернативу (e.g. `turborepo-remote-cache`).

## Revisit

Пересмотреть решение **в Фазе 6** (когда команда 20+ человек). Если Turborepo перестанет masштабироваться — возможная миграция на Nx или custom Bazel-like orchestrator.
