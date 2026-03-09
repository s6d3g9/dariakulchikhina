---
applyTo: "scripts/**"
---

# Scripts — скрипты миграций и деплоя

## Типы скриптов

| Файл | Назначение |
|---|---|
| `deploy-safe.sh` | Деплой на сервер (git sync + build + pm2) |
| `migrate-*.mjs` | Разовые миграции данных |
| `seed-*.mjs` | Наполнение тестовыми данными |

## Деплой — обязательный порядок (правило без исключений)

> **ВСЕГДА перед деплоем — сначала сохранить в git локально и на GitHub.**

```bash
# Шаг 1 — сохранить все изменения локально
git add -A
git commit -m "feat: описание"

# Шаг 2 — отправить на GitHub
git push origin main

# Шаг 3 — только теперь деплоить
bash scripts/deploy-safe.sh
```

`deploy-safe.sh` завершится с ошибкой если есть незакоммиченные изменения или непушенные коммиты.
Этот порядок нельзя пропускать даже если изменения кажутся незначительными.

## Скрипт миграции — паттерн

```js
// scripts/migrate-add-something.mjs
import postgres from 'postgres'
import * as dotenv from 'dotenv'
dotenv.config()

const sql = postgres(process.env.DATABASE_URL)

async function migrate() {
  console.log('[migration] start')
  
  await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS new_field text`
  
  console.log('[migration] done')
  await sql.end()
}

migrate().catch(e => { console.error(e); process.exit(1) })
```

## Правила

- Каждый скрипт миграции — идемпотентный (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`)
- `dotenv.config()` в начале — для доступа к `DATABASE_URL`
- Всегда `sql.end()` в конце — закрывать соединение
- `process.exit(1)` при ошибке — чтобы CI/CD видел сбой
- Не запускать seed скрипты на production

## Переменные окружения

```
DATABASE_URL    — PostgreSQL connection string
DEPLOY_HOST     — SSH алиас (daria-deploy)
DEPLOY_PATH     — /opt/daria-nuxt
APP_NAME        — daria-nuxt (PM2)
```

## ЗАПРЕЩЕНО

- ❌ Хардкодить credentials в скриптах
- ❌ Деплоить без предварительного `git push`
- ❌ Запускать seed на production
- ❌ Необратимые `DROP TABLE` / `DELETE FROM` без бэкапа
