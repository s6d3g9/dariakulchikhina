# Domain: v5-admin-settings

## Purpose

Studio-level configuration: дизайн-токены (colors, fonts, spacing), brand, defaults, policies per-studio (timeout, commission, cancellation rules), feature-toggles.

## Entities (v5.3)

- `StudioSettings` — singleton.
- `DesignTokens` — colors / typography / spacing.
- `BrandAssets` — logo / imagery.
- `DefaultTerms` — agreement templates.
- `FeatureToggles` — studio-level flag state.
- `NotificationPreferences` — studio-level defaults.

## Key operations

- Admin UI for editing settings.
- Apply design-tokens runtime → client CSSOM.
- Apply feature-toggles runtime → gate UI.
- Inherit defaults в new projects / contracts.

## Business rules

- Only `admin` role can edit.
- Changes audit-logged.
- Token changes take effect immediately (no rebuild).
- History of changes для rollback.

## Events

- `studio-settings.updated`
- `design-tokens.changed`
- `feature-toggle.flipped`

## External dependencies

- `audit-log`.
- UI — design-system runtime.

## v5 → v6 migration

| v5 | v6 |
|---|---|
| StudioSettings | distributed across services:<br/>— design-tokens → `packages/design-tokens`<br/>— feature-toggles → `services/feature-flags`<br/>— policies → `services/policy-engine`<br/>— brand → `company-profile` type-view |
| DesignTokens | `packages/design-tokens/<tenant-or-brand>/` overlay |
| FeatureToggles | GrowthBook with tenant-targeting |
| DefaultTerms | `pattern-template`s (reusable) |

### Multi-tenancy

v5 = single studio. v6 — **multiple studios** могут co-exist:
- Per-tenant design-tokens overlay.
- Per-tenant feature-flag targeting.
- Per-tenant policies.
- Tenant-isolation через identity scopes.

### Phase

Phase 3-4. Multi-tenancy — Phase 5+ (when several studios онboard).

## Open questions

- Token inheritance: studio → parent-organization → platform default.
- White-label mode (full brand takeover) — pricing tier.
