# Domain: v5-users

## Purpose

Studio-internal users: designer, admin, manager, intern. HMAC-cookie auth (v5.3). Roles + permissions + sessions.

## Entities (v5.3)

- `User` — login account.
- `UserRole` — admin / designer / manager / intern / client-facing.
- `UserPermission` — granular RBAC.
- `UserSession` — HMAC-cookie-signed.
- `UserActivity` — login-history.
- `PasswordResetToken` — flow state.

## Key operations

- Login / logout (HMAC cookie).
- Password reset.
- Role assignment (admin-only).
- Permission grants.
- Activity log.

## Business rules

- Password hashing (bcrypt).
- Session expiry 24h default.
- Password-reset TTL 15 min.
- Role change auditable.

## Events

- `user.created / updated / deleted`
- `user.logged-in / logged-out`
- `user.role-changed`
- `user.password-reset`

## External dependencies

- `audit-log`.
- `notifications` (password-reset emails).

## v5 → v6 migration

**Full replacement через `services/identity` (Zitadel)**:

| v5 | v6 |
|---|---|
| User | Zitadel user record |
| UserRole | Zitadel role (+ scopes) |
| UserPermission | `services/permissions` grants (resource-specific) + Zitadel scopes |
| UserSession | JWT (15min) + refresh (30d) |
| UserActivity | identity events в audit-log |
| PasswordResetToken | Zitadel native flow OR magic-link (passwordless preferred) |

### Transition

HMAC-cookie → JWT full cutover at Phase 1. **No users live**, так что нет migration-data problem.

### Modern approach

- Prefer **passkeys** (WebAuthn) over passwords (see `44-identity-flows.md`).
- SSO (Google / Apple) available.
- MFA for admin-level.

### Phase

Phase 1 (immediate).

## Open questions

- Multi-org membership: один user в multiple studios → single identity.
- Role templates (`designer-senior`, `designer-junior`) — per-studio customizable или platform-standard.
