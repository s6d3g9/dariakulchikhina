# Implementation Guides

Пошаговые руководства по реализации v6 **по дням**. Каждый документ содержит конкретные команды, файлы, код.

## Структура

```
docs/implementation/
├── README.md                    — этот файл
├── phase-0-foundation/          — Phase 0 (2-3 weeks) day-by-day
│   ├── 00-week-overview.md
│   ├── 01-monorepo-setup.md
│   ├── 02-docker-compose-full.md
│   ├── 03-packages-bootstrap.md
│   ├── 04-scaffolding-plop.md
│   ├── 05-ci-pipelines.md
│   ├── 06-observability-signoz.md
│   └── 07-phase-exit.md
├── phase-1-platform-core/       — Phase 1 (4-6 weeks)
│   └── ...
├── phase-2-domain-primitives/   — Phase 2 (6-8 weeks)
│   └── ...
├── schemas/                     — Real Drizzle schemas per-service
├── api-specs/                   — OpenAPI specs
├── code-samples/                — Real code snippets
├── k8s-manifests/               — K8s YAML
└── ci-workflows/                — GitHub Actions YAML
```

## Принцип

Каждый guide отвечает на вопрос: **«что я должен запустить/создать/проверить сегодня?»**. Никаких абстракций. Шаги в порядке зависимостей.

## Как использовать

1. Начать с `phase-0-foundation/00-week-overview.md`.
2. Каждый день работать из текущего guide.
3. Checklist в конце каждого guide — перед переходом к следующему.
4. Проверка после Phase — `phase-N/XX-phase-exit.md`.

## Текущее состояние

- Phase 0: документируется.
- Phase 1-9: TBD по мере завершения предыдущих.
