# Phase 1 / Week 2 / Monday: Gateway (Traefik)

Цель: Traefik v3 ingress с TLS + dynamic routing + rate-limiting + JWT validation plugin.

## Шаг 1: docker-compose entry

Добавить в `platform/docker-compose/docker-compose.yml`:

```yaml
  gateway:
    image: traefik:v3.1
    container_name: daria-gateway
    command:
      - "--configFile=/etc/traefik/traefik.yaml"
    ports:
      - "80:80"
      - "443:443"
      - "8082:8082"   # Dashboard (dev only)
    volumes:
      - ./gateway/traefik.yaml:/etc/traefik/traefik.yaml:ro
      - ./gateway/dynamic:/etc/traefik/dynamic:ro
      - gateway-acme:/letsencrypt
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - daria

volumes:
  gateway-acme:

networks:
  daria:
    external: true
```

## Шаг 2: Static config

`platform/docker-compose/gateway/traefik.yaml`:

```yaml
api:
  dashboard: true
  insecure: true  # dev only, disable in prod

log:
  level: INFO
  format: json

accessLog:
  format: json
  fields:
    headers:
      names:
        Authorization: drop       # hide tokens от logs
        Cookie: drop
        X-Forwarded-For: keep

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"
    http:
      tls:
        certResolver: letsencrypt

certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@daria.app
      storage: /letsencrypt/acme.json
      httpChallenge:
        entryPoint: web

providers:
  docker:
    exposedByDefault: false
    network: daria
  file:
    directory: /etc/traefik/dynamic
    watch: true   # reload on file change

metrics:
  prometheus:
    entryPoint: metrics

tracing:
  otlp:
    grpc:
      endpoint: otel-collector:4317
      insecure: true
```

## Шаг 3: Dynamic routing

`platform/docker-compose/gateway/dynamic/services.yaml`:

```yaml
http:
  # === Routers ===
  routers:
    # Identity (Zitadel)
    identity:
      rule: "Host(`identity.daria.local`) || Host(`auth.daria.app`)"
      service: identity
      entryPoints: [websecure]
      middlewares: [rate-limit-global, compress, trace-headers]
      tls:
        certResolver: letsencrypt

    # Wallet API
    wallet-api:
      rule: "Host(`wallet.daria.local`) && PathPrefix(`/v1`)"
      service: wallet
      entryPoints: [websecure]
      middlewares:
        - jwt-auth              # validate JWT
        - rate-limit-user       # per-user rate limit
        - trace-headers
        - compress
      tls:
        certResolver: letsencrypt

    # Payments webhook (NO JWT — PSP callbacks)
    payments-webhook:
      rule: "Host(`payments.daria.local`) && PathPrefix(`/webhook`)"
      service: payments
      entryPoints: [websecure]
      middlewares: [rate-limit-webhook, trace-headers]

    # Messenger WS
    messenger-ws:
      rule: "Host(`ws.daria.local`) && PathPrefix(`/connect`)"
      service: messenger
      entryPoints: [websecure]
      middlewares: [rate-limit-ws]
      # NO JWT middleware — WS uses ticket auth

    # Shell SPA
    shell-web:
      rule: "Host(`daria.local`) || Host(`daria.app`)"
      service: shell-web
      entryPoints: [websecure]
      middlewares: [csp-headers, compress]

    # Admin (separate subdomain + stricter rules)
    admin:
      rule: "Host(`admin.daria.local`)"
      service: admin-web
      entryPoints: [websecure]
      middlewares: [admin-ip-allowlist, jwt-auth, jwt-admin-scope, rate-limit-strict]

  # === Services ===
  services:
    identity:
      loadBalancer:
        servers:
          - url: "http://identity:8080"
        healthCheck:
          path: /health/live
          interval: 10s
    wallet:
      loadBalancer:
        servers:
          - url: "http://wallet:8080"
        healthCheck:
          path: /health/live
    payments:
      loadBalancer:
        servers:
          - url: "http://payments:8080"
        healthCheck:
          path: /health/live
    messenger:
      loadBalancer:
        servers:
          - url: "http://messenger:8080"
    shell-web:
      loadBalancer:
        servers:
          - url: "http://shell-web:3000"
    admin-web:
      loadBalancer:
        servers:
          - url: "http://admin-web:3000"

  # === Middlewares ===
  middlewares:
    rate-limit-global:
      rateLimit:
        average: 100     # 100 rps per-IP
        burst: 200
        period: 1s

    rate-limit-user:
      rateLimit:
        average: 60
        burst: 120
        period: 1s
        sourceCriterion:
          requestHeaderName: X-User-Id

    rate-limit-webhook:
      rateLimit:
        average: 500
        burst: 1000
        period: 1s

    rate-limit-ws:
      rateLimit:
        average: 10
        burst: 20
        period: 1s

    rate-limit-strict:
      rateLimit:
        average: 10
        burst: 20

    admin-ip-allowlist:
      ipAllowList:
        sourceRange:
          - "10.0.0.0/8"     # internal
          - "192.168.0.0/16"

    compress:
      compress: {}

    csp-headers:
      headers:
        contentSecurityPolicy: >
          default-src 'self';
          script-src 'self' 'unsafe-inline';
          style-src 'self' 'unsafe-inline';
          img-src 'self' data: https:;
          connect-src 'self' wss: https:;
        referrerPolicy: "strict-origin-when-cross-origin"
        xFrameOptions: DENY
        xContentTypeOptions: nosniff
        strictTransportSecurity:
          maxAge: 31536000
          includeSubDomains: true
          preload: true

    trace-headers:
      headers:
        customRequestHeaders:
          X-Trace-Context: "{{ .TraceId }}"

    # JWT validation middleware — defined в next step
    jwt-auth:
      plugin:
        jwt:
          jwksUrl: "http://identity:8080/.well-known/jwks.json"
          cacheTtl: 300
          issuer: "http://identity:8080"
          audience: "daria-shell"
          requiredClaims:
            - sub
            - exp
          forwardedHeaders:
            sub: X-User-Id
            email: X-User-Email
            kyc_level: X-Kyc-Level
            roles: X-User-Roles

    jwt-admin-scope:
      plugin:
        jwtScope:
          requiredScopes:
            - "governance:admin"
```

## Шаг 4: JWT plugin

Traefik supports plugins. Use `github.com/traefik/plugin-jwt-validator` или custom.

`platform/docker-compose/gateway/plugins/jwt/` — simple Traefik Middleware plugin:

```go
// plugin.go
package jwt

import (
	"context"
	"crypto/rsa"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Config struct {
	JWKSUrl          string            `json:"jwksUrl"`
	CacheTTL         int               `json:"cacheTtl"`
	Issuer           string            `json:"issuer"`
	Audience         string            `json:"audience"`
	RequiredClaims   []string          `json:"requiredClaims"`
	ForwardedHeaders map[string]string `json:"forwardedHeaders"`
}

func CreateConfig() *Config {
	return &Config{
		CacheTTL:       300,
		RequiredClaims: []string{"sub", "exp"},
	}
}

type JWT struct {
	next     http.Handler
	name     string
	config   *Config
	jwksCache *jwksCache
}

func New(ctx context.Context, next http.Handler, config *Config, name string) (http.Handler, error) {
	return &JWT{
		next:      next,
		name:      name,
		config:    config,
		jwksCache: &jwksCache{ttl: time.Duration(config.CacheTTL) * time.Second},
	}, nil
}

func (j *JWT) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	authHeader := req.Header.Get("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		http.Error(rw, `{"error":{"code":"UNAUTHORIZED"}}`, http.StatusUnauthorized)
		return
	}
	tokenString := strings.TrimPrefix(authHeader, "Bearer ")

	// Fetch JWKS (cached)
	keys, err := j.jwksCache.get(j.config.JWKSUrl)
	if err != nil {
		http.Error(rw, `{"error":{"code":"JWKS_FETCH_FAILED"}}`, http.StatusServiceUnavailable)
		return
	}

	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
		kid, _ := t.Header["kid"].(string)
		key, ok := keys[kid]
		if !ok {
			return nil, errors.New("unknown kid")
		}
		return key, nil
	}, jwt.WithValidMethods([]string{"RS256", "ES256"}), jwt.WithIssuer(j.config.Issuer), jwt.WithAudience(j.config.Audience))

	if err != nil || !token.Valid {
		http.Error(rw, fmt.Sprintf(`{"error":{"code":"INVALID_TOKEN","message":"%s"}}`, err.Error()), http.StatusUnauthorized)
		return
	}

	claims, _ := token.Claims.(jwt.MapClaims)

	// Forward claims as headers
	for claim, headerName := range j.config.ForwardedHeaders {
		if v, ok := claims[claim]; ok {
			switch val := v.(type) {
			case string:
				req.Header.Set(headerName, val)
			case float64:
				req.Header.Set(headerName, fmt.Sprintf("%v", val))
			case []interface{}:
				strs := make([]string, len(val))
				for i, item := range val {
					strs[i] = fmt.Sprintf("%v", item)
				}
				req.Header.Set(headerName, strings.Join(strs, ","))
			}
		}
	}

	// Strip Authorization header downstream (not needed, headers set)
	req.Header.Del("Authorization")

	j.next.ServeHTTP(rw, req)
}

// === JWKS cache ===

type jwksCache struct {
	mu      sync.RWMutex
	cached  map[string]map[string]*rsa.PublicKey
	fetched map[string]time.Time
	ttl     time.Duration
}

func (c *jwksCache) get(url string) (map[string]*rsa.PublicKey, error) {
	c.mu.RLock()
	if keys, ok := c.cached[url]; ok {
		if time.Since(c.fetched[url]) < c.ttl {
			c.mu.RUnlock()
			return keys, nil
		}
	}
	c.mu.RUnlock()

	// Fetch
	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var jwks struct {
		Keys []map[string]interface{} `json:"keys"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		return nil, err
	}

	keys := make(map[string]*rsa.PublicKey)
	for _, k := range jwks.Keys {
		kid, _ := k["kid"].(string)
		pubKey, err := parseJWK(k)
		if err != nil {
			continue
		}
		keys[kid] = pubKey
	}

	c.mu.Lock()
	if c.cached == nil {
		c.cached = map[string]map[string]*rsa.PublicKey{}
		c.fetched = map[string]time.Time{}
	}
	c.cached[url] = keys
	c.fetched[url] = time.Now()
	c.mu.Unlock()

	return keys, nil
}

func parseJWK(jwk map[string]interface{}) (*rsa.PublicKey, error) {
	// Parse RSA or EC public key из JWK format
	// Implementation omitted — standard JWK → RSA/EC key conversion
	return nil, errors.New("implement JWK parsing")
}
```

Register в Traefik:

```yaml
# traefik.yaml
experimental:
  localPlugins:
    jwt:
      moduleName: "github.com/daria/traefik-plugin-jwt"
```

## Шаг 5: Hosts entries (dev)

`/etc/hosts`:

```
127.0.0.1 daria.local
127.0.0.1 auth.daria.local identity.daria.local
127.0.0.1 wallet.daria.local
127.0.0.1 payments.daria.local
127.0.0.1 ws.daria.local
127.0.0.1 admin.daria.local
```

## Шаг 6: Test

```bash
# Start gateway
docker compose up -d gateway

# Health
curl -k https://daria.local/
# → Forwarded to shell-web

# JWT protected route — without token
curl -k https://wallet.daria.local/v1/accounts
# → 401 UNAUTHORIZED

# With token
eval $(pnpm tsx scripts/dev/zitadel-login.ts alice@test.com)
curl -k -H "Authorization: Bearer $JWT" https://wallet.daria.local/v1/accounts
# → 200 OK + JSON

# Dashboard
open http://localhost:8082/dashboard/
```

## Шаг 7: Rate-limit test

```bash
# Flood
for i in {1..200}; do
  curl -k -H "Authorization: Bearer $JWT" https://wallet.daria.local/v1/accounts -o /dev/null -w "%{http_code}\n" -s
done | sort | uniq -c
# Expected: some 200s, rest 429 Too Many Requests
```

## Checklist

- [ ] Traefik running
- [ ] TLS termination works (https://daria.local/)
- [ ] HTTP → HTTPS redirect
- [ ] Dynamic routing resolves хостов
- [ ] JWT plugin validates tokens (verify JWKS)
- [ ] Forwarded headers (`X-User-Id`, `X-Kyc-Level`) downstream
- [ ] Rate-limit per-user работает (429 after threshold)
- [ ] Webhook route НЕ требует JWT (PSP callbacks pass)
- [ ] Admin route требует IP-allowlist + admin-scope
- [ ] CSP headers set для shell routes
- [ ] Metrics endpoint exposed

## Next

Tuesday: Rate-limiting fine-tuning + CORS + integration tests → `07-gateway-hardening.md`.
