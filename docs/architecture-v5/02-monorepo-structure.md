# 2. Структура Монорепозитория (PNPM Workspaces)

Проект настроен как монорепозиторий для переиспользования типов и утилит без потери контекста.

```text
dariakulchikhina/
├── pnpm-workspace.yaml         # Конфиг: packages: ["app", "server", "messenger", "shared"]
├── package.json                # Глобальные скрипты (build:all, dev:all)
├── docker-compose.yml          # Инфраструктура (Postgres, PgBouncer, Redis, MinIO)
│
├── shared/                     # ОБЩИЙ ПАКЕТ (@daria/shared)
│   ├── constants/              # Разделенные константы: project.ts, roadmap.ts, design-tokens.ts
│   ├── types/                  # Zod схемы и TS интерфейсы
│   └── utils/                  # Общие функции
│
├── server/                     # БЭКЕНД ПАКЕТ (Nuxt Nitro / H3) -> порт 3000
│
├── app/                        # ФРОНТЕНД ПАКЕТ (Nuxt / Vue) -> отдает статику и SSR
│
├── messenger/                  # РЕАЛТАЙМ СЕРВИС (Node.js/Go) -> порт 3001
│   ├── src/
│   │   ├── ws-server.ts        # Управление WebSockets и комнатами
│   │   ├── auth.ts             # Проверка тикетов из Redis (ticket-based auth)
│   │   ├── redis-listener.ts   # Слушает события из backend-а
│   │   └── webrtc.ts           # Signaling (пересылка SDP и ICE кандидатов)
│   └── ecosystem.config.cjs    # PM2 конфиг
│
└── ai-workers/                 # ИИ МИКРОСЕРВИСЫ (Python / Node)
```