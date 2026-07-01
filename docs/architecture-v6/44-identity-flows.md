# 44. Identity Flows

Детализация flows `services/identity` (Zitadel): OIDC login, WebAuthn, WS-tickets, device-binding, consent, step-up, session lifecycle, account-recovery.

См. также: `19-security-model.md` (threat-model), `22-messaging-model.md` (WS usage), `37-legal-terms.md` (acceptance).

## 1. Authentication methods — matrix

| Method | Primary | MFA | Passwordless | Комментарий |
|---|---|---|---|---|
| **Password** | ✅ | no | no | deprecated на старте — only если user insists |
| **Email magic-link** | ✅ | no | yes | Default для low-sec |
| **SMS OTP** | ✅ | yes (as 2FA) | yes | PSTN fallback |
| **TOTP (authenticator app)** | no | yes | no | Standard 2FA |
| **WebAuthn / Passkey** | ✅ | yes | yes | **Preferred** в Фазе 3+ |
| **SSO (Google / Apple)** | ✅ | inherited | yes | Opt-in; we mint our own JWT |
| **Device-bound key** | no | yes | yes | Mobile secure-enclave |

## 2. Registration flow

```
User → Sign-up form (email + age + region)
  ▼
identity.registerUser()
  ├── age-gate check (policy-engine) → if minor → parent-email flow (41-children-safety)
  ├── email verification (magic-link)
  ├── create Zitadel user + primary scope `shell:read`
  ├── emit app.daria.identity.user-registered.v1
  ▼
Onboarding:
  ├── Passkey setup (WebAuthn) — strongly recommended
  ├── Language / region / timezone preferences
  ├── ToS + Privacy Policy acceptance
  ├── Optional: profile info (name, avatar)
  ▼
First login → JWT issued (15min TTL) + refresh token (30 days)
```

## 3. Login flow (standard)

```
User → email / identifier
  ▼
identity.startLogin()
  ├── available auth methods for this user
  ▼
User → selects method (e.g. passkey)
  ▼
identity.authenticate()
  ├── verify challenge
  ├── risk-check (trust-safety fingerprint)
  │   ├── low-risk → direct success
  │   ├── medium-risk → MFA step-up
  │   └── high-risk → additional verification (photo / email-link)
  ▼
Issue JWT (15min) + refresh (30d)
Emit app.daria.identity.user-logged-in.v1
```

## 4. Passkey / WebAuthn flow

### Registration

```
User → Settings → Add Passkey
  ▼
identity.webauthn.beginRegistration() → challenge
  ▼
Browser / device prompts (TouchID / FaceID / security key)
  ▼
identity.webauthn.finishRegistration({credentialId, publicKey})
  ▼
Credential stored с Zitadel. User теперь может login без пароля.
```

### Authentication

```
User → "Sign in with passkey"
  ▼
identity.webauthn.beginAuth() → challenge
  ▼
Browser prompts biometric
  ▼
identity.webauthn.finishAuth({signature})
  ├── verify с stored public-key
  └── Issue tokens
```

Supports: macOS Safari, iOS Safari (16.4+), Chrome (Windows Hello / Android), hardware keys (YubiKey).

## 5. SSO (Google / Apple)

- OIDC federation с Zitadel.
- User clicks «Sign in with Google» → redirect → consent → callback.
- If new user → auto-create с email verified.
- Если existing user → link as additional auth method.

SSO primary identity = Google/Apple email. Users can add our passkey later.

## 6. Session lifecycle

### JWT structure

```json
{
  "iss": "https://identity.daria.app",
  "sub": "u_abc123",
  "aud": "daria-shell",
  "iat": 1715000000,
  "exp": 1715000900,           // 15 min
  "scopes": ["shell:*", "domain:booking:book", "domain:wallet:read"],
  "role": "user",
  "kyc_level": 1,
  "region": "EU",
  "sid": "session_xyz"
}
```

### Refresh

- Refresh-token → 30 days.
- Rotating (new refresh at each refresh, old invalidated).
- If detected reuse → session invalidated + alert.

### Session revocation

- User can revoke any session (Settings → Sessions).
- Admin / security team can revoke.
- Password change → all sessions revoked.
- Critical event → cascade revoke.

## 7. WS-ticket flow (детально)

Для messenger / live updates через WebSocket:

```
1. Authenticated client → HTTP GET /identity/ws-ticket
   Returns: { ticket: "uuid_xyz", expiresIn: 30 }

2. Client opens WS connection:
   ws://.../connect?ticket=uuid_xyz

3. WS server (messenger) → 
   redis.getdel("ws_ticket:uuid_xyz") 
   → { userId, scopes }
   
   If missing/expired → close WS with 401
   Else → upgrade с user context

4. Connection maintained.
   User JWT expires → WS auth remains valid (ticket already consumed).
   When JWT expires → ticket re-generation needed for next WS connection.
```

**Invariant**: ticket — одноразовый, 30-sec TTL, GETDEL атомарен (single-consumer).

## 8. Device binding (mobile, Phase 7+)

### Registration

```
App first start:
  ├── Generate Ed25519 keypair in secure-enclave (iOS Secure Enclave / Android Keystore)
  ├── Send public key to identity.bindDevice()
  ├── Identity stores { userId, deviceId, publicKey, deviceFingerprint }
  └── Returns device-JWT (long-lived, device-scope)
```

### Authentication на device

```
Every API request:
  ├── Short-lived JWT (15 min) — usual
  └── Device-JWT signature verify (proof of device)

If device-JWT invalid → suspicious → require re-auth + new device registration
```

### Benefits

- Stronger than password (private key never leaves secure-enclave).
- Device-loss = user can revoke old device from another.
- Phishing-resistant (не работает на другом устройстве).

## 9. Step-up auth (elevated actions)

Некоторые actions требуют fresh authentication:

```
Action: change-password / add-payment-method / high-value-transfer
  ▼
Check JWT.auth_time < 5 min ago?
  ├── Yes → proceed
  └── No → prompt re-authentication (passkey / TOTP / SMS)
     ▼
     New JWT with elevated=true claim, 5 min TTL
     ▼
     Action proceeds
```

Elevation — **не замена MFA**, а дополнительная свежая проверка для sensitive actions.

## 10. KYC flows

Per KYC-level (см. `13-governance-policy.md §7`):

### L1: Email + phone + name + DoB + country

Collected at registration / first-action requiring.

### L2: ID document + selfie + liveness

- Через Sumsub / Onfido SDK.
- Takes 2-5 min.
- Result async webhook → update user.kyc_level.

### L3: Address + income + source-of-funds

- Form + uploaded docs (utility bill / bank statement).
- Manual review SLA 1-3 days.

### L4: Enhanced / on-site

- For banking / large operations.
- Video-call + in-person if required.
- Handled by compliance team.

## 11. Consent flows

### Data-processing consent (GDPR)

- На регистрации: Essential (required for contract).
- Post-registration settings: granular opt-in для Analytics / Marketing / Personalization.
- Withdrawable anytime.

### Third-party integrations

- "Connect Google Calendar" → OAuth → user explicit approves.
- Scoped tokens stored encrypted.
- User can disconnect anytime.

### Age-related

- Minor → parent-consent flow (see `41-children-safety.md`).
- Age-gated features → policy-engine blocks till verified age.

## 12. Account recovery

Multi-channel recovery:

1. **Email recovery** — magic-link to registered email.
2. **SMS recovery** — code to registered phone.
3. **Backup codes** — generated at passkey-setup, user prints/stores.
4. **Trusted contacts** (Phase 7+) — user nominates 2-3 people who can vouch.
5. **ID-verified recovery** (last resort) — submit ID, wait 72h, manual review.

Recovery **always** triggers:
- All sessions invalidated.
- Notification to known contacts.
- 24h delay for critical operations after recovery.

## 13. Multi-tenancy

Single user pool, multi-scope:
- One user_id global.
- Scopes grant per-vertical access.
- No separate accounts per product.
- «User has opted in to banking vertical» = granted scope `banking:*`.

Opt-out: scope revoked; vertical disappears from shell.

## 14. Audit

Каждая identity-операция в `audit-log`:
- registered, logged-in, logged-out, session-revoked, device-bound, kyc-approved, consent-granted/withdrawn, recovery-triggered, password-changed.

## 15. Metrics

- `identity.login.success_rate{method}`
- `identity.passkey.adoption_rate`
- `identity.mfa.usage_rate`
- `identity.session.average_duration`
- `identity.recovery.success_rate`
- `identity.suspicious-activity.count`

## 16. Антипаттерны

- ❌ Storing passwords в plain или non-Argon2id hash.
- ❌ Password-only без MFA for sensitive actions.
- ❌ JWT без expiry / >24h expiry.
- ❌ JWT в localStorage (only httpOnly cookie with BFF pattern).
- ❌ Session не invalidated при password-change.
- ❌ WS ticket без TTL / reusable.
- ❌ Self-hosted password reset без rate-limit.
- ❌ Recovery via single-channel (vulnerable к SIM-swap).
- ❌ Device-bound key outside secure-enclave.
- ❌ Kyc-data в general user-profile table (should be separate encrypted).
