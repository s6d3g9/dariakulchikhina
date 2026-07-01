# services/trust-safety

Layer 6 — Governance. Anti-fraud, anti-bot, anti-abuse — **про actors**, не про content.

(Content — см. `services/moderation-ml` / `moderation-review`.)

## Что делает

- Device fingerprinting (cross-session stable hash).
- Behavior anomaly detection (ML).
- VPN / proxy detection.
- Velocity checks (N actions per window).
- Cross-account correlation (Sybil detection).
- Photo-verification (liveness).
- Risk scoring — feeds policy-engine.

## Signals collected

- IP + geo (approximate).
- Device fingerprint (canvas, WebGL, fonts, timezone).
- User agent.
- Behavioral (mouse, scroll, typing patterns — privacy-respecting).
- Session patterns (times, lengths).
- Network (VPN detection, proxies).

## Рантайм

- TypeScript + Python (ML part).
- Postgres `trust_safety_db` (scores + fingerprints).
- Redis (fast lookups).

## Actions

```
LOW risk     → allow
MEDIUM risk  → challenge (CAPTCHA / MFA step-up)
HIGH risk    → restrict (policy-engine distill)
CRITICAL     → block + manual review
```

## API

```
POST /evaluate                              # risk score для action
POST /fingerprint                           # register device
POST /challenge/:userId                     # trigger challenge
GET  /users/:id/risk-history                # for moderators
```

## Integrations

- **Publishes**: `risk-elevated`, `suspicious-activity-detected`.
- **Consumed by**: `policy-engine`, `moderation-review`.
- **Calls**: Third-party services (device-fingerprint SaaS, VPN-detection, etc.)

## Privacy

- Никаких invasive tracking.
- Fingerprint — hash-based, not reversible.
- Data retention 90 days (identifiable), дольше pseudonymized.

## Phase

Фаза 4 (MVP) → Фаза 7 (full ML).
