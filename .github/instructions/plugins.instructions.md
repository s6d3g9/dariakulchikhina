---
applyTo: "app/plugins/**,server/plugins/**"
---

# Plugins — клиентские и серверные плагины

## Два типа

| Тип | Папка | Когда запускается |
|---|---|---|
| Клиентский | `app/plugins/*.client.ts` | Только в браузере |
| Серверный (Nitro) | `server/plugins/*.ts` | При каждом запросе на сервере |

## Клиентский плагин — паттерн

```ts
// app/plugins/ui-theme.client.ts
export default defineNuxtPlugin(() => {
  // Запускается только в браузере после монтирования
  const tokens = localStorage.getItem('design-tokens')
  if (tokens) {
    // применить токены...
  }
})
```

Суффикс `.client.ts` — обязателен для кода с `window`, `document`, `localStorage`.

## Серверный Nitro плагин — паттерн

```ts
// server/plugins/ollama-warmup.ts
export default defineNitroPlugin(async (nitroApp) => {
  nitroApp.hooks.hook('request', async (event) => {
    // выполняется на каждый запрос
  })

  nitroApp.hooks.hook('render:html', (html, { event }) => {
    // модификация HTML перед отдачей клиенту
  })
})
```

## Доступные хуки Nitro

| Хук | Когда |
|---|---|
| `request` | Начало каждого запроса |
| `render:html` | После рендера HTML (SSR) |
| `render:response` | Перед отправкой ответа |
| `error` | При ошибке |

## Правила

- `.client.ts` суффикс — для всего что использует browser API
- Не делать тяжёлые операции в плагинах — они блокируют старт
- Серверные плагины — только инициализация и hooks, не бизнес-логика
- Безопасность: нonce, CSP, headers — только в `server/plugins/`

## ЗАПРЕЩЕНО

- ❌ `window.*` / `document.*` / `localStorage.*` без суффикса `.client.ts`
- ❌ Тяжёлые синхронные операции в plugin body
- ❌ Прямые запросы к БД в клиентских плагинах
