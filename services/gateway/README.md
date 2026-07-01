# services/gateway

Layer 2 — Platform Service. Единая точка входа, Traefik.

## Что делает

- TLS termination (Let's Encrypt / manual).
- Routing (subdomain + path → service).
- Rate-limiting (per-IP, per-user, per-endpoint).
- JWT introspect (Zitadel JWKS), scope validation.
- CORS handling.
- Request / response logging + tracing.
- Circuit breakers.
- WAF rules (ModSecurity / Cloudflare upstream).

## Config

- `platform/gateway/dynamic/*.yaml` — routing rules.
- `platform/gateway/traefik.yaml` — static config.

## Routing matrix (example)

```
api.daria.app/v1/*           → public-api-gateway (see 46-public-api.md)
daria.app/                    → apps/shell-web
daria.app/admin/              → apps/admin
daria.app/identity/*          → services/identity (Zitadel)
ws.daria.app/                 → services/messenger (WS)
cdn.daria.app/                → S3/CDN direct
```

## Security

- All incoming TLS 1.3+.
- Strict headers (HSTS, X-Frame-Options, CSP).
- Rate-limit defaults: 100 req/min/IP.
- Suspicious IPs → Cloudflare challenge / block.

## Integrations

- **Calls**: `identity` (JWKS), `policy-engine` (batch для high-traffic endpoints).
- **Publishes**: nothing directly (metrics only).

## Phase

Фаза 1.
