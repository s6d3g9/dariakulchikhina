# 62. NL-only Development Runtime

Статус: **canonical / enforced**. Этот документ определяет единственную разрешённую среду выполнения Development Intelligence для Shell v6.

## 1. Цель

Исключить расхождение индексов, версий инструментов, provider routing и исходного кода между NL-сервером и рабочими станциями. Ноутбук остаётся интерфейсом доступа, но не выполняет Serena, Graphify, Entire, indexers, provider CLI, web research или dashboard.

## 2. Каноническая identity среды

```json
{
  "platform": "linux",
  "hostname": "v2202602335514431700",
  "repositoryRoot": "/srv/v6",
  "runAsUser": "claudecode",
  "dashboardAddress": "127.0.0.1"
}
```

`runAsUser=claudecode` относится к coordinator и code-intelligence tools. AI provider workers исполняются под отдельными non-login NL service accounts, объявленными в `schemas/development-provider-routing.json`; это не local fallback и не ослабление host/path boundary.

Все поля — hard constraints. Environment variable не может переопределить их. Миграция на новый host требует явного изменения policy, ADR и тестов.

## 3. Алгоритм запуска

```text
tool request
  -> classify as Development Intelligence?
  -> yes: resolve platform + hostname + repo realpath + OS user
  -> compare with canonical identity
  -> mismatch: deny(78), no install/start/index/browser
  -> match: verify pinned binary + secure config
  -> spawn tool from /srv/v6
  -> bind dashboard to NL loopback
  -> collect tool evidence with source revision
```

Сетевой или SSH failure не ведёт к local fallback. Результат — `blocked` с причиной и ожидаемым способом восстановления server access.

## 4. Serena

- pinned release: `1.7.0`;
- executable: `/home/claudecode/.local/bin/serena`;
- project: `/srv/v6`, имя `shell-v6`;
- language servers: Vue + TypeScript;
- metadata/cache: `/home/claudecode/.serena/projects/v6`, вне Git worktree;
- dashboard: enabled, `127.0.0.1` на NL, browser auto-open disabled;
- MCP transport: stdio, process принадлежит конкретной server-side client session.

Разрешённые команды:

```bash
pnpm tooling:nl:verify
pnpm tooling:nl:serena:claude
pnpm tooling:nl:serena:codex
```

Прямые `serena`, `uvx serena` и скопированные MCP commands запрещены, потому что обходят version/config/host verification.

## 5. Graphify, Entire и индексаторы

Для каждого adapter требуется manifest со следующими полями:

```ts
interface DevelopmentToolAdapter {
  id: string
  version: string
  executable: string
  inputScopes: string[]
  outputIndex: string
  sourceRevisionStrategy: string
  invalidationSla: string
  privacyPolicy: string
  failureMode: 'closed'
}
```

Adapter запускается только после NL guard. Пока конкретный Graphify/Entire adapter и его версия не проверены, он имеет состояние `unavailable`, а не заменяется локальным или похожим инструментом.

Provider routing дополнительно проверяется командой `pnpm tooling:nl:providers:verify`. Активная матрица использует `glm-5.3` для bounded implementation/synthesis, `qwen3.8-max` для независимого review/falsification и `glm-5v-turbo` для image/video. Каждый provider имеет отдельный non-login service account; неявный fallback и локальные модели запрещены.

## 6. Browser и dashboard

- browsing/search выполняется только процессом на NL;
- `127.0.0.1:2428x` означает loopback NL, не MacBook;
- bind `0.0.0.0` запрещён;
- workstation browser и Chrome session не используются как fallback;
- локальный port-forward/tunnel создаётся только по отдельному прямому разрешению пользователя;
- результаты research получают URL, timestamp, source revision/hash и scope classification.

## 7. Enforcement

`scripts/nl-tooling-policy.mjs`:

1. сравнивает runtime с canonical identity;
2. проверяет executable и pinned Serena version;
3. проверяет loopback dashboard, выключенный browser auto-open, server metadata path и trusted project;
4. только после этого запускает MCP process.

`scripts/nl-tooling-policy.test.mjs` доказывает отказ для macOS path, другого Linux host и другого пользователя. Проверки запускаются командой `pnpm test:nl-tooling-policy`.

## 8. Operational checklist

Перед session:

1. Подключиться к NL.
2. Перейти в `/srv/v6` под `claudecode`.
3. Сохранить существующий dirty worktree.
4. Выполнить `pnpm tooling:nl:verify`.
5. Запустить требуемый server-side client; MCP поднимается через guarded command.

При failure:

1. Не запускать инструмент локально.
2. Зафиксировать failing constraint и exit code.
3. Восстановить NL access/config/version.
4. Повторить verify и только затем продолжить.

## 9. Correctness boundary

Serena/Graphify/index output ускоряет navigation и impact analysis, но не является доказательством корректности. Authority остаются compiler, lint, tests, schema/contract checks, runtime probes и production-safe verification.
