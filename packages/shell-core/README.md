# Shell v6 reference projection kernel

Первый исполняемый слой архитектуры `55–60`:

- pure cross-client contracts в `packages/contracts-domain/shell-v6.ts`;
- semantic validators для derived artifacts, claims и Instrument Registry;
- mandatory closure и feasibility;
- marginal union-cost selection без double count общих dependencies;
- детерминированный versioned admission profile;
- snapshot coherence и monotonic live-plan guards.
- atomic Command Runtime reference semantics: idempotency fencing/tombstones, server canonical hashes,
  consume-once confirmation/two-party approval, offline high-risk reconfirmation и transactional outbox.

Это reference kernel, а не UI renderer. Он не содержит Vue/React/Android-кода, network/DB drivers или vertical-specific business rules.

Проверка:

```bash
pnpm test:shell-v6-kernel
pnpm test:shell-v6-command-runtime
```

`InMemoryCommandRuntimeStore` — deterministic conformance adapter, а не production storage. Production
adapter обязан сохранить одну DB-транзакцию для domain writes, confirmation consume, contiguous events,
outbox append и fenced idempotency completion.

## Unified UI runtime

`packages/contracts-domain/shell-ui.ts` и фасад `src/ui-runtime.ts` задают общий детерминированный
автомат для навигации, постоянных панелей, нижнего toolbar и временных слоёв. Runtime сохраняет
контекст навигации атомарно, закрывает вложенные слои только сверху, восстанавливает focus,
ограничивает размеры стеков и fail-closed обрабатывает повреждённое состояние.

Проверка:

```bash
pnpm run verify:shell-v6-ui
```

Архитектурный контракт и последовательность миграции описаны в
`docs/architecture-v6/63-menu-surface-runtime.md`.
