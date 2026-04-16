# 2. Структура Монорепозитория

Проект — это **полирантаймовый монорепозиторий**, в котором сосуществуют:

1. Главный Nuxt-моно-app (`app/` + `server/` + `shared/`) — основной CRM/ERP контур.
2. Standalone Messenger (`messenger/core` + `messenger/web`) — отдельный realtime-контур.
3. Communications Service (`services/communications-service`) — выделенный микросервис коммуникаций.
4. Дополнительные публичные сайты в каталоге верхнего уровня (например, `cityfarm/web`).
5. Слот для AI/фоновых воркеров (`services/*-worker` или будущий `ai-workers/`).

Главное правило: **новый микросервис или новое приложение всегда добавляется как новый верхнеуровневый каталог** с собственным `package.json`, собственным PM2-конфигом и собственным портом. Главный Nuxt-app никогда не «впитывает» новые рантаймы.

См. также: [09. Полный целевой каркас](./09-target-repository-tree.md), [16. Playbook расширения](./16-extensibility-playbook.md).

## Корневое дерево

```text
dariakulchikhina/
├── package.json                # Корневые скрипты (dev, build, deploy, refactor waves)
├── pnpm-workspace.yaml         # PNPM workspaces: app + cityfarm/* + messenger/* + services/*
├── nuxt.config.ts              # Главный Nuxt-app (app/ + server/ + shared/)
├── drizzle.config.ts           # Drizzle для основной БД
├── docker-compose.yml          # Postgres, PgBouncer, Redis, MinIO, Coturn
├── ecosystem.config.cjs        # PM2 prod
├── ecosystem.refactor.config.cjs # PM2 refactor fork
│
├── app/                        # FRONTEND главного Nuxt-app (FSD: см. 04 и 09)
├── server/                     # BACKEND главного Nuxt-app (DDD-lite: см. 03 и 09)
├── shared/                     # ОБЩИЕ контракты для app + server + messenger (см. 06)
│
├── messenger/                  # STANDALONE мессенджер
│   ├── core/                   # Realtime backend (Node) — bounded contexts, см. 12
│   ├── web/                    # Consumer-style чат-клиент (Nuxt 4 + Vuetify, M3 UI)
│   ├── ecosystem.config.cjs
│   └── ecosystem.standalone.config.cjs
│
├── services/                   # ОТДЕЛЬНЫЕ микросервисы
│   └── communications-service/ # E2EE-реле звонков и аутентификация, см. 12
│
├── cityfarm/                   # ОТДЕЛЬНЫЙ публичный сайт (не входит в FSD-рефакторинг v5)
│   ├── web/                    # Nuxt-сайт калькуляторов и конфигуратора
│   └── ecosystem.config.cjs
│
├── public/                     # Статика главного Nuxt-app (uploads/, furniture-generator/)
├── scripts/                    # Деплой, миграции данных, refactor-waves (см. 08)
└── docs/                       # Документация (architecture-v5, messenger, rag)
```

## Зачем такое разделение

- **`app/` + `server/` живут в одном Nuxt-app** — это намеренный выбор: Nitro обслуживает и SSR, и REST, и SSE из одного процесса. При этом `server/` уже структурирован по DDD-lite (`api/` + `modules/` + `db/` + `utils/`), а `app/` — по FSD.
- **`messenger/` вынесен** потому, что постоянные WebSocket/WebRTC соединения нельзя держать в Event Loop SSR-процесса.
- **`services/communications-service` вынесен** потому, что E2EE-маршрутизация криптограмм и метаданных звонков — это отдельный security-домен, который должен иметь право не знать схему основной БД.
- **`cityfarm/` вынесен** потому, что это публичный продуктовый сайт с собственным жизненным циклом, не подчиняющийся правилам CRM (другая UI-система, другие зависимости, отдельный домен).
- **`services/` — слот расширения**: любой следующий микросервис (`services/ai-worker/`, `services/billing-service/`, `services/notification-service/`) добавляется сюда по единому шаблону из [16. Playbook расширения](./16-extensibility-playbook.md).

## Правила добавления нового рантайма

1. **Изоляция процесса**: собственный `package.json`, собственный entrypoint, собственный PM2-блок, собственный порт.
2. **Изоляция данных**: новый сервис **не подключается напрямую к Postgres основного app**. Он либо ходит через REST/HTTP API в `server/api/`, либо обменивается событиями через Redis Pub/Sub.
3. **Контракты только через `shared/`**: любой DTO, который пересекает границу процесса, объявляется в `shared/types/**` и `shared/constants/**`.
4. **Auth только через тикеты**: новый сервис не имеет права читать сессионные cookies главного app — только `ws_ticket:*` / эквивалентный токен из Redis.
5. **Документация**: для каждого нового рантайма обязательны запись в этом файле, короткий блок в `01-infrastructure.md`, секция в `12-messenger-services-refactor-map.md` (или эквивалентном файле для не-realtime сервисов), и инструкция в `.github/instructions/`.

Соблюдение этих пяти правил гарантирует, что монорепо может расти горизонтально без архитектурных регрессий.