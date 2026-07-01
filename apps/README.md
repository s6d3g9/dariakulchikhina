# apps/ — клиентские приложения (Layer 5)

Экспериенс-слой v6. Каждое приложение — это канал доставки shell'а: web, mobile, desktop.

## Подпапки (скелет)

| Путь | Стек | Назначение |
|---|---|---|
| `shell-web/` | Next.js (React + SSR) | Основной shell, desktop-web и mobile-web |
| `shell-mobile/` | Expo (React Native) | iOS / Android |
| `shell-desktop/` | Tauri + React | Desktop клиент (банк, ops) |
| `admin/` | Next.js | Админка студий и платформы |
| `landing/` | Next.js (static) | Публичный маркетинговый сайт |

## Правила

- Приложения импортируют **только** `packages/shell-*`, `packages/card-types/*`, `packages/ui-*`, `packages/sdk-*`, `packages/design-tokens`.
- Приложения **не** импортируют `services/**` напрямую — только через SDK (HTTP клиент из OpenAPI).
- Shell-логика живёт в `packages/shell-core`; конкретное приложение — тонкая обёртка.

## Статус

Скелет директории зафиксирован. Реальные приложения создаются в Фазе 3 (см. `docs/architecture-v6/02-phases.md`).
