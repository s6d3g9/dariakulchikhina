# Runbook: messenger-ws-connection-spike

Abnormal WS connection count к messenger.

## Severity
**SEV-2** — degraded messenger responsiveness.

## What it means

`messenger.ws.connections.active > historical_p95 × 2` for 10 min.

Could be:
- Legitimate spike (event, news, marketing push).
- Reconnect storm (upstream issue → mass reconnect).
- Attack (WS flood).
- Our bug causing reconnect loops.

## Immediate actions

1. Check Zitadel WS-ticket issuance rate (matches connections?).
2. Check if recent deploy changed WS logic.
3. Check DDoS signals в Cloudflare / gateway.

## Investigation

```bash
# Active connections
curl messenger.internal/metrics | grep ws_connections

# Ticket issuance rate
curl identity.internal/metrics | grep ws_ticket

# Reconnect-per-client histogram (should be close to 1)
curl messenger.internal/metrics | grep ws_reconnect_count
```

## Common causes

### Legitimate spike
High user-concurrent (event, viral content).
Mitigation: scale messenger pods horizontally, no action on alert.

### Reconnect storm
WS server flapping → clients reconnect в loop.
Mitigation: stabilize server, apply exponential backoff на client.

### Attack (WS flood)
Abuse-pattern connection surges.
Mitigation: rate-limit ticket issuance per-IP (trust-safety), Cloudflare WAF.

### Our bug
Recent deploy makes client reconnect constantly.
Mitigation: rollback deploy.

### Idle connections not closing
WS server not enforcing idle-timeout.
Mitigation: configure idle-timeout (default 5 min), force-close stale.

## Escalation

- Legitimate high load → auto-scale, notify eng-lead.
- Attack confirmed → security on-call.
- Bug → product owner + platform-lead.
