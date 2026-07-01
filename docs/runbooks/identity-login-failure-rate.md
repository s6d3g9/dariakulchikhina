# Runbook: identity-login-failure-rate

Rate of login failures above normal baseline.

## Severity
**SEV-2** (typical) → **SEV-1** if > 50% failure (outage).

## What it means

`rate(identity.login.failure_rate) > 0.1` (> 10% of attempts failing).

Could be:
- Legitimate (users forgetting passwords, normal).
- Attack (credential stuffing, brute force).
- Our bug (identity service issue).

## Immediate actions

1. Check Zitadel health.
2. Check JWKS endpoint availability.
3. Look at failure reasons (distributions): bad-password, unknown-user, MFA-fail, locked, infra.
4. If infra-origin → treat as SEV-1.

## Investigation

```bash
# Zitadel logs
kubectl logs -l app=zitadel --since 5m

# Failure reasons breakdown
curl identity.internal/metrics | grep login_failure_reason

# Check за attack patterns
curl trust-safety.internal/anomalies | jq '.login_surges'

# Test direct login
curl -X POST identity.internal/oauth/token \
  -d 'grant_type=password&username=test@daria.app&password=...'
```

## Common causes

### Credential stuffing attack
Many unique emails, low success.
Mitigation: escalate rate-limits, require CAPTCHA, trust-safety evaluation.

### Brute force on specific account
Repeat attempts на one email.
Mitigation: lock account, notify user, increase MFA requirement.

### Zitadel bug / outage
Infra issue.
Mitigation: restart pods, check DB connection.

### JWT signing key rotation issue
Post-rotation, old JWTs invalid.
Mitigation: verify dual-key state (see `rotate-jwt-key.md` playbook).

### Time-skew
Server clock drifted → JWTs rejected.
Mitigation: NTP sync.

## Rate-limit escalation

При confirmed attack:
```bash
# Tighten rate-limits в gateway
kubectl apply -f platform/gateway/rate-limits-emergency.yaml
```

## Escalation

- SEV-2 at 10% failure → platform on-call.
- SEV-1 at 50% → security on-call + platform-lead.
- Suspected breach → IMMEDIATELY security.
