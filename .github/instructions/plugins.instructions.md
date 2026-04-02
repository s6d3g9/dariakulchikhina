---
applyTo: "app/plugins/**,server/plugins/**"
---

# Plugins — main app client и Nitro plugins

## Scope

- Этот файл покрывает `app/plugins/**` и `server/plugins/**` основной платформы.
- `messenger/web/app/plugins/**` — отдельный контур, он живет по messenger-specific правилам.

## Типы плагинов

| Тип | Папка | Когда реально выполняется |
|---|---|---|
| Клиентский Nuxt plugin | `app/plugins/*.client.ts` | Только в браузере |
| Универсальный Nuxt plugin | `app/plugins/*.ts` | На клиенте и/или SSR по контракту Nuxt |
| Nitro plugin | `server/plugins/*.ts` | Body плагина выполняется при инициализации Nitro; hooks внутри могут срабатывать на каждом запросе |

## Текущие Nitro plugins

- `cache-policy.ts`
- `csp-nonce.ts`
- `error-sanitizer.ts`
- `ollama-warmup.ts`

Безопасность request pipeline при этом частично живет в `server/middleware/**`, а не только в plugins.

## Клиентский плагин — паттерн

```ts
export default defineNuxtPlugin(() => {
  const raw = localStorage.getItem('design-tokens')
  if (!raw) {
    return
  }

  // hydrate runtime-only state
})
```

- Суффикс `.client.ts` обязателен для `window`, `document`, `localStorage`, `matchMedia`.

## Nitro plugin — паттерн

```ts
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html, { event }) => {
    // per-request HTML transform
  })

  nitroApp.hooks.hook('render:response', (response, { event }) => {
    // per-request response headers / sanitizing
  })
})
```

## Правила

- В plugin body регистрируй hooks и lightweight bootstrap-логику.
- Тяжелые синхронные операции в plugin body нежелательны: они тормозят старт сервера/клиента.
- Nitro plugins не должны заменять endpoint/business logic.
- Security/CSP/cache hooks держать централизованно в `server/plugins/**` и `server/middleware/**`, а не раскидывать по компонентам.

## Запрещено

- ❌ утверждать, что Nitro plugin body запускается на каждом запросе; per-request работают hooks, а не весь файл
- ❌ `window.*` / `document.*` / `localStorage.*` без `.client.ts`
- ❌ тяжелые блокирующие операции в plugin body
- ❌ прямые DB/API вызовы из клиентских plugins
