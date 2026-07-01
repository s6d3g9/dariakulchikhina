# Playbook: rotate-jwt-key

Регулярная ротация JWT signing key в Zitadel. 180 дней default cycle.

## Prereq

- [ ] Текущий key срок подходит к концу (или compromise suspected).
- [ ] Zitadel admin access.
- [ ] Infisical access.

## Шаги

### 1. Generate new key

В Zitadel admin UI:
1. Navigate to signing-keys.
2. Generate new key (type: RS256 or ES256).
3. **Не** make it primary yet. 

### 2. Rotate to dual-key state

- **Old key**: continues to sign existing JWTs (clients still validating against JWKS).
- **New key**: available in JWKS but not primary.

### 3. Verify JWKS endpoint

```bash
curl https://identity.daria.app/.well-known/jwks.json | jq
```

Должен показать оба keys.

### 4. Flip primary

В Zitadel admin:
- Set new key as primary.
- Old key becomes «secondary» (still valid для existing JWTs).

### 5. Wait expiry

- New JWTs signed с new key.
- Existing JWTs (up to 15 min TTL) still validate via old key.
- **Wait**: max JWT TTL + buffer = 30 min.

### 6. Remove old key

- После 30+ min, old key можно remove.
- **Verify**: нет active sessions с old-key'd JWTs.
- Remove from Zitadel.

### 7. Update all services (sanity)

- Services получают JWKS через public endpoint.
- No manual distribution.
- JWKS cached 10 min default; auto-refreshes.

### 8. Audit

- Check `audit-log` для key-rotation event.
- Confirm timeline.

## Emergency rotation (compromise)

1. Immediately generate new key в Zitadel.
2. Flip primary.
3. **Revoke all existing sessions** (broadcast через events).
4. All users re-login.
5. Old key removed immediately.

## Common mistakes

- ❌ Skip dual-key state → existing users get 401s.
- ❌ Forget to update old-key removal timer.
- ❌ Rotate key without informing users (if emergency).
- ❌ Signed с compromised key after known compromise.
