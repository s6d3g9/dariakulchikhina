# Identity DB schema

Postgres `identity_db` — **primary** owned by Zitadel (its internal schemas). Dodatkowe **extension tables** owned by `services/identity` wrapper для WebAuthn, parent-consent, role-change-requests.

## Zitadel own tables (readonly reference)

Zitadel manages these; don't touch directly:
- `projections.users`, `projections.user_grants`, `projections.sessions`, `projections.tokens`
- `eventstore.events` — Zitadel's event-sourcing
- Всё в `eventstore` schema.

## Our extension tables — service-managed

Our service adds these в `identity_db` (отдельный schema `daria_identity`):

### `webauthn_credentials`

```typescript
export const webauthnCredentials = pgTable('webauthn_credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 64 }).notNull(),  // Zitadel user id
  
  credentialIdBase64url: varchar('credential_id_base64url', { length: 512 }).notNull(),
  publicKey: customType<{ data: Buffer }>({
    dataType() { return 'bytea' },
  })('public_key').notNull(),
  counter: bigint('counter', { mode: 'bigint' }).notNull().default(0n),
  transports: jsonb('transports').$type<string[]>().default([]),
  
  nickname: varchar('nickname', { length: 64 }),
  deviceName: varchar('device_name', { length: 128 }),  // auto-detected (iPhone 15, MacBook Pro, etc)
  
  aaguid: varchar('aaguid', { length: 64 }),  // authenticator model
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  revokeReason: varchar('revoke_reason', { length: 128 }),
}, (t) => ({
  userIdx: index('webauthn_user_idx').on(t.userId),
  credentialIdx: unique('webauthn_credential_unique').on(t.credentialIdBase64url),
  activeIdx: index('webauthn_active_idx').on(t.userId).where(sql`revoked_at IS NULL`),
}))
```

### `webauthn_challenges`

```typescript
export const webauthnChallenges = pgTable('webauthn_challenges', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 64 }).notNull(),
  challenge: text('challenge').notNull(),
  type: varchar('type', { length: 16 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userTypeIdx: index('webauthn_challenges_user_type_idx').on(t.userId, t.type, t.expiresAt),
}))
```

### `parent_consent_tokens`

```typescript
export const parentConsentTokens = pgTable('parent_consent_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  token: varchar('token', { length: 64 }).notNull().unique(),
  childUserId: varchar('child_user_id', { length: 64 }).notNull(),
  parentEmail: varchar('parent_email', { length: 256 }).notNull(),
  region: varchar('region', { length: 2 }).notNull(),
  
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  consumedBy: varchar('consumed_by', { length: 64 }),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  childIdx: index('parent_consent_child_idx').on(t.childUserId),
  tokenIdx: unique('parent_consent_token_unique').on(t.token),
}))
```

### `role_change_requests`

4-eyes approval flow для privileged roles.

```typescript
export const roleChangeRequests = pgTable('role_change_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  userId: varchar('user_id', { length: 64 }).notNull(),
  targetRole: varchar('target_role', { length: 64 }).notNull(),
  currentRoles: jsonb('current_roles').$type<string[]>().notNull(),
  
  requestedBy: varchar('requested_by', { length: 64 }).notNull(),
  justification: text('justification').notNull(),
  
  status: varchar('status', { length: 16 }).notNull().default('pending'),
  // 'pending' | 'approved' | 'rejected'
  
  approvals: jsonb('approvals').$type<Array<{ approverId: string; at: string }>>().notNull().default([]),
  
  rejectedAt: timestamp('rejected_at', { withTimezone: true }),
  rejectedBy: varchar('rejected_by', { length: 64 }),
  rejectionReason: text('rejection_reason'),
  
  appliedAt: timestamp('applied_at', { withTimezone: true }),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdx: index('role_change_user_idx').on(t.userId, t.status),
  statusIdx: index('role_change_status_idx').on(t.status, t.createdAt),
}))
```

### `session_devices`

Track devices за user для security alerts.

```typescript
export const sessionDevices = pgTable('session_devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  userId: varchar('user_id', { length: 64 }).notNull(),
  
  deviceFingerprint: varchar('device_fingerprint', { length: 64 }).notNull(),
  deviceName: varchar('device_name', { length: 128 }),
  platform: varchar('platform', { length: 32 }),  // 'ios' | 'android' | 'web' | 'desktop'
  browser: varchar('browser', { length: 64 }),
  userAgent: text('user_agent'),
  
  // Geo (approximate — country level only для privacy)
  countryFromIp: varchar('country_from_ip', { length: 2 }),
  
  firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  lastSessionId: varchar('last_session_id', { length: 64 }),
  
  trusted: boolean('trusted').notNull().default(false),
  trustedAt: timestamp('trusted_at', { withTimezone: true }),
  
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
}, (t) => ({
  userIdx: index('session_devices_user_idx').on(t.userId, t.lastSeenAt),
  fingerprintIdx: unique('session_devices_fingerprint_unique').on(t.userId, t.deviceFingerprint),
}))
```

### `login_attempts`

Track logins для anomaly detection + trust-safety signals.

```typescript
export const loginAttempts = pgTable('login_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  userId: varchar('user_id', { length: 64 }),  // null если email не existed
  emailAttempted: varchar('email_attempted', { length: 256 }),
  
  method: varchar('method', { length: 32 }).notNull(),
  // 'password' | 'magic-link' | 'passkey' | 'sso-google' | 'sso-apple'
  
  success: boolean('success').notNull(),
  failureReason: varchar('failure_reason', { length: 64 }),
  // 'USER_NOT_FOUND' | 'INVALID_PASSWORD' | 'INVALID_PASSKEY' | 'EXPIRED_MAGIC_LINK' | ...
  
  ipAddressHash: varchar('ip_address_hash', { length: 64 }),
  countryFromIp: varchar('country_from_ip', { length: 2 }),
  userAgent: text('user_agent'),
  deviceFingerprint: varchar('device_fingerprint', { length: 64 }),
  
  // MFA
  mfaRequired: boolean('mfa_required').notNull().default(false),
  mfaPassed: boolean('mfa_passed'),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdx: index('login_attempts_user_idx').on(t.userId, t.createdAt),
  emailIdx: index('login_attempts_email_idx').on(t.emailAttempted, t.createdAt),
  successIdx: index('login_attempts_success_idx').on(t.success, t.createdAt),
  ipIdx: index('login_attempts_ip_idx').on(t.ipAddressHash, t.createdAt),
  // Retention: 90 days identifiable, then purge
}))
```

### `user_preferences`

Denormalized user settings faster than Zitadel metadata.

```typescript
export const userPreferences = pgTable('user_preferences', {
  userId: varchar('user_id', { length: 64 }).primaryKey(),
  
  locale: varchar('locale', { length: 8 }).notNull().default('en'),
  timezone: varchar('timezone', { length: 64 }).notNull().default('UTC'),
  region: varchar('region', { length: 2 }).notNull(),
  
  theme: varchar('theme', { length: 16 }).notNull().default('auto'),
  displayCurrency: varchar('display_currency', { length: 3 }),
  
  // Notifications per-category per-channel
  notificationPrefs: jsonb('notification_prefs').$type<Record<string, Record<string, boolean | string>>>().default({}),
  
  // Privacy
  visibility: varchar('visibility', { length: 16 }).notNull().default('discoverable'),
  // 'public' | 'discoverable' | 'private' | 'hidden'
  
  analyticsOptIn: boolean('analytics_opt_in').notNull().default(false),
  marketingOptIn: boolean('marketing_opt_in').notNull().default(false),
  recommendationsOptIn: boolean('recommendations_opt_in').notNull().default(true),
  trainingOptIn: boolean('training_opt_in').notNull().default(false),  // AI training opt-in
  
  // Accessibility
  reducedMotion: boolean('reduced_motion'),
  highContrast: boolean('high_contrast'),
  largerText: boolean('larger_text'),
  
  // Language preferences в AI
  aiContentLanguage: varchar('ai_content_language', { length: 8 }),
  
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
```

### `acceptance_records`

Track acceptance of ToS / PP / per-vertical disclaimers (for 37-legal-terms).

```typescript
export const acceptanceRecords = pgTable('acceptance_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  userId: varchar('user_id', { length: 64 }).notNull(),
  documentType: varchar('document_type', { length: 32 }).notNull(),
  // 'tos' | 'privacy-policy' | 'banking-disclaimer' | 'crypto-disclaimer' | ...
  
  documentVersion: varchar('document_version', { length: 16 }).notNull(),
  documentHash: varchar('document_hash', { length: 64 }).notNull(),
  
  acceptedAt: timestamp('accepted_at', { withTimezone: true }).notNull(),
  
  // For revocation (GDPR)
  withdrawnAt: timestamp('withdrawn_at', { withTimezone: true }),
  
  // Context
  ipAddressHash: varchar('ip_address_hash', { length: 64 }),
  userAgent: text('user_agent'),
  region: varchar('region', { length: 2 }),
}, (t) => ({
  userIdx: index('acceptance_user_idx').on(t.userId, t.documentType),
  documentIdx: index('acceptance_document_idx').on(t.documentType, t.documentVersion),
}))
```

## Migration SQL (excerpt)

```sql
CREATE SCHEMA IF NOT EXISTS daria_identity;

-- WebAuthn credentials
CREATE TABLE daria_identity.webauthn_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar(64) NOT NULL,
  credential_id_base64url varchar(512) NOT NULL,
  public_key bytea NOT NULL,
  counter bigint NOT NULL DEFAULT 0,
  transports jsonb DEFAULT '[]'::jsonb,
  nickname varchar(64),
  device_name varchar(128),
  aaguid varchar(64),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  revoke_reason varchar(128)
);
CREATE INDEX webauthn_user_idx ON daria_identity.webauthn_credentials(user_id);
CREATE UNIQUE INDEX webauthn_credential_unique ON daria_identity.webauthn_credentials(credential_id_base64url);
CREATE INDEX webauthn_active_idx ON daria_identity.webauthn_credentials(user_id) WHERE revoked_at IS NULL;

-- Parent consent tokens
CREATE TABLE daria_identity.parent_consent_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token varchar(64) NOT NULL UNIQUE,
  child_user_id varchar(64) NOT NULL,
  parent_email varchar(256) NOT NULL,
  region varchar(2) NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  consumed_by varchar(64),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Role change requests (4-eyes)
CREATE TABLE daria_identity.role_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar(64) NOT NULL,
  target_role varchar(64) NOT NULL,
  current_roles jsonb NOT NULL,
  requested_by varchar(64) NOT NULL,
  justification text NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'pending',
  approvals jsonb NOT NULL DEFAULT '[]'::jsonb,
  rejected_at timestamptz,
  rejected_by varchar(64),
  rejection_reason text,
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX role_change_user_idx ON daria_identity.role_change_requests(user_id, status);
CREATE INDEX role_change_status_idx ON daria_identity.role_change_requests(status, created_at);

-- Session devices
CREATE TABLE daria_identity.session_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar(64) NOT NULL,
  device_fingerprint varchar(64) NOT NULL,
  device_name varchar(128),
  platform varchar(32),
  browser varchar(64),
  user_agent text,
  country_from_ip varchar(2),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_session_id varchar(64),
  trusted boolean NOT NULL DEFAULT false,
  trusted_at timestamptz,
  revoked_at timestamptz
);
CREATE INDEX session_devices_user_idx ON daria_identity.session_devices(user_id, last_seen_at);
CREATE UNIQUE INDEX session_devices_fingerprint_unique ON daria_identity.session_devices(user_id, device_fingerprint);

-- Login attempts
CREATE TABLE daria_identity.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar(64),
  email_attempted varchar(256),
  method varchar(32) NOT NULL,
  success boolean NOT NULL,
  failure_reason varchar(64),
  ip_address_hash varchar(64),
  country_from_ip varchar(2),
  user_agent text,
  device_fingerprint varchar(64),
  mfa_required boolean NOT NULL DEFAULT false,
  mfa_passed boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX login_attempts_user_idx ON daria_identity.login_attempts(user_id, created_at);
CREATE INDEX login_attempts_email_idx ON daria_identity.login_attempts(email_attempted, created_at);
CREATE INDEX login_attempts_ip_idx ON daria_identity.login_attempts(ip_address_hash, created_at);

-- Partition login_attempts by month для easier 90-day retention
-- Using pg_partman расширение
SELECT partman.create_parent(
  p_parent_table => 'daria_identity.login_attempts',
  p_control => 'created_at',
  p_type => 'native',
  p_interval => 'monthly'
);

-- User preferences
CREATE TABLE daria_identity.user_preferences (
  user_id varchar(64) PRIMARY KEY,
  locale varchar(8) NOT NULL DEFAULT 'en',
  timezone varchar(64) NOT NULL DEFAULT 'UTC',
  region varchar(2) NOT NULL,
  theme varchar(16) NOT NULL DEFAULT 'auto',
  display_currency varchar(3),
  notification_prefs jsonb DEFAULT '{}'::jsonb,
  visibility varchar(16) NOT NULL DEFAULT 'discoverable',
  analytics_opt_in boolean NOT NULL DEFAULT false,
  marketing_opt_in boolean NOT NULL DEFAULT false,
  recommendations_opt_in boolean NOT NULL DEFAULT true,
  training_opt_in boolean NOT NULL DEFAULT false,
  reduced_motion boolean,
  high_contrast boolean,
  larger_text boolean,
  ai_content_language varchar(8),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Acceptance records
CREATE TABLE daria_identity.acceptance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar(64) NOT NULL,
  document_type varchar(32) NOT NULL,
  document_version varchar(16) NOT NULL,
  document_hash varchar(64) NOT NULL,
  accepted_at timestamptz NOT NULL,
  withdrawn_at timestamptz,
  ip_address_hash varchar(64),
  user_agent text,
  region varchar(2)
);
CREATE INDEX acceptance_user_idx ON daria_identity.acceptance_records(user_id, document_type);
CREATE INDEX acceptance_document_idx ON daria_identity.acceptance_records(document_type, document_version);
```

## Key queries

### Check if credential valid для auth

```typescript
db.query.webauthnCredentials.findFirst({
  where: and(
    eq(webauthnCredentials.userId, userId),
    eq(webauthnCredentials.credentialIdBase64url, credId),
    isNull(webauthnCredentials.revokedAt),
  ),
})
```

### Recent login attempts для rate-limiting

```typescript
const failureCount = await db.select({ count: sql`count(*)` })
  .from(loginAttempts)
  .where(and(
    eq(loginAttempts.emailAttempted, email),
    eq(loginAttempts.success, false),
    gt(loginAttempts.createdAt, sub(new Date(), { minutes: 10 })),
  ))
  .then(r => Number(r[0].count))

if (failureCount >= 5) {
  throw new Error('TOO_MANY_FAILED_ATTEMPTS')
}
```

### Find trust-safety anomalies

```typescript
// User logged в from new country
const recentDevices = await db.query.sessionDevices.findMany({
  where: eq(sessionDevices.userId, userId),
  orderBy: [desc(sessionDevices.lastSeenAt)],
  limit: 10,
})

const knownCountries = new Set(recentDevices.map(d => d.countryFromIp))
if (!knownCountries.has(currentCountry)) {
  // Alert trust-safety
  await publishEvent('app.daria.trust-safety.new-geo-login.v1', {
    userId, country: currentCountry, knownCountries: [...knownCountries],
  })
}
```

## Partitioning strategy

- `login_attempts` — monthly partitions, 3-month retention identifiable, 2-year pseudonymized aggregates
- `webauthn_challenges` — no partitioning, cleanup cron delete'ит expired every minute

## Access control

- Only `services/identity` писатель.
- `services/trust-safety` reader only на session_devices + login_attempts (через event-projection, не direct DB access — I6).
- Audit-log ingests все identity events.
