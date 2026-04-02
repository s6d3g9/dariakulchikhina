---
applyTo: "scripts/**"
---

# Scripts — deploy, snapshots, export, migrations

## Типы скриптов

| Паттерн | Назначение |
|---|---|
| `deploy-safe.sh` | Root deploy на прод-сервер с git/preflight checks |
| `restore-last-snapshot.sh` | Откат к последнему pre-deploy snapshot |
| `export-messenger-standalone.sh` | Выгрузка standalone messenger contour |
| `migrate-*.mjs` | Разовые data/schema migrations |
| `seed-*.mjs` | Локальные demo/dev данные |

## Deploy — обязательный порядок

Перед любым deploy этого репозитория порядок один и тот же:

```bash
git add -A
git commit -m "feat: описание"
git push origin main
bash scripts/deploy-safe.sh
```

- `deploy-safe.sh` специально падает, если изменения не закоммичены или не запушены.
- Для preflight/fast/dry-run использовать root npm scripts, а не копировать shell вручную.

## Скрипты миграций

Базовый паттерн:

```js
import * as dotenv from 'dotenv'
import postgres from 'postgres'

dotenv.config()

const sql = postgres(process.env.DATABASE_URL)

async function migrate() {
  await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS new_field text`
}

migrate()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await sql.end()
  })
```

## Правила

- Скрипты миграций делать идемпотентными, где это возможно.
- `dotenv.config()` поднимать в начале, если нужен доступ к env.
- Соединения и дескрипторы всегда закрывать (`sql.end()`, cleanup временных файлов и т.д.).
- Для long-running/export/deploy shell scripts явно проверять cwd, env и fallback paths.
- Messenger standalone задачи решать через `scripts/export-messenger-standalone.sh` и `messenger/ecosystem*.config.cjs`, а не ad-hoc копированием папок.
- Seed-скрипты считать dev-only.

## Важные env / runtime контракты

```text
DATABASE_URL
DEPLOY_HOST
DEPLOY_PATH
APP_NAME
HEALTHCHECK_URL
MESSENGER_DEPLOY_ROOT
MESSENGER_PROJECT_ROOT
MESSENGER_CORE_DATA_DIR
```

## Запрещено

- ❌ хардкодить credentials и secrets в скриптах
- ❌ деплоить без `git push`
- ❌ запускать seed-данные на production
- ❌ делать необратимые `DROP` / массовые `DELETE` без явного rollback/snapshot плана
