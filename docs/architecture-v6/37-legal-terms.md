# 37. Legal, Terms & Acceptance

Чёткое разделение: **ToS** vs **Privacy Policy** vs **law-profiles** vs **per-vertical disclaimers**. Все четыре — разные документы с разными жизненными циклами, разной acceptance-семантикой, разной аудиторией.

## 1. Четыре слоя «юридических» данных

| Слой | Что это | Меняется | Acceptance |
|---|---|---|---|
| **Terms of Service** | Контракт user ↔ platform | quarterly? | Explicit opt-in + versioned |
| **Privacy Policy** | Как обрабатываем PII | quarterly? | Explicit opt-in |
| **Per-vertical disclaimers** | Specific conditions (banking, crypto, medical) | per-launch | Pre-action (опция отказаться от vertical'и) |
| **Law-profiles** (`13-governance-policy.md`) | Внешние законы per-region | compliance-team | Automatic, user not aware |

**Первые три** — user-facing и требуют acceptance. **Четвёртый** — автоматический runtime enforcement.

## 2. Terms of Service (ToS)

### Структура

Single document, versioned, per-language. Одна ToS на всё (не per-vertical).

Sections:
1. **Scope** — что включено.
2. **User obligations** — что user обязан.
3. **Platform rights / liabilities** — наши права + limitations.
4. **Content ownership** — как интересы пересекаются (user owns his content, platform gets license to display).
5. **Governing law** — jurisdiction для disputes.
6. **Acceptance / termination** — как принимается / как разрывается.
7. **Changes** — как уведомляем о изменениях.

### Lifecycle

- Version bump → `terms.v{N}`.
- User на login видит «ToS updated» если acceptance ещё не подписан.
- Breaking changes: 30-day grace period, старую версию параллельно support'им.
- Acceptance stored в `services/identity` с timestamp + версией + текст-hash.

### Per-region wording

Подмены через template в ToS (место рассмотрения споров, applicable law). Но **структура одна**.

## 3. Privacy Policy (PP)

### Структура

1. **What we collect** — PII, behavior, device.
2. **Why** — product, analytics, recommendations, moderation, legal.
3. **Legal basis** (GDPR) — consent / contract / legitimate interest.
4. **Who we share with** — processors, third-party integrations.
5. **How long we keep** — retention-matrix.
6. **User rights** — access / delete / portability / correction.
7. **Cookies / tracking** — что используется.
8. **Children** — про age-gates и COPPA/RU-equivalents.

### GDPR / CCPA / 152-ФЗ compliance

- **Explicit consent** для processing beyond contract-execution.
- **Granular toggles**: analytics-consent, recommendations-consent, third-party-share-consent.
- **Withdraw anytime** → data-deletion job или exclusion.
- **Data export** request → machine-readable export (JSON + media).
- **Delete request** → crypto-erase DEK + cascading through events (см. `20-mobile-offline-first.md` §4 для offline-consistency).

## 4. Per-vertical disclaimers

Special conditions для high-risk категорий:

### Banking

- Pre-activation disclaimer: «Banking service provided by <BaaS-partner>. Platform не банк, средства защищены через <partner> license».
- User declines → banking features просто не доступны.
- Accept → banking scope добавляется в identity.

### Crypto

- Pre-activation: «Риски колебаний, self-custody vs custodial trade-off, no FDIC/АСВ insurance».
- Mandatory в каждой юрисдикции где regulator требует.

### Medical / wellness

- «Platform не оказывает медицинских услуг. Timelines — informational».
- Специфические disclaimers per-kind (pregnancy не medical advice).

### AI-generated content

- «Output AI может содержать ошибки».
- Opt-in consent на использование AI-assist.

### Travel

- «Platform — посредник. Поставщик услуг ответственен за исполнение».

Все disclaimers — в `platform/legal-disclaimers/<vertical>/<lang>.md`.

## 5. Acceptance UI flow

Единый компонент `<AcceptanceFlow>` в `packages/ui-react`:

1. User opens app / or action that requires acceptance.
2. `identity.acceptance.check(user, requiredSet)` → returns missing.
3. Modal показывается **прежде чем** действие завершается.
4. User видит `<AcceptanceDocument>` (scroll all through — required for legal).
5. Explicit checkbox «I accept».
6. POST `/identity/acceptance` → stored.
7. Modal closes → action proceeds.

**Dark patterns запрещены**:
- No «Accept by continuing» — explicit checkbox.
- No pre-checked checkboxes для consent (GDPR violation).
- Decline-option всегда present, с explanation consequences.

## 6. Data retention matrix

Формализованный в `platform/law-profiles/<region>.yaml`:

```yaml
dataRetention:
  user-profile:        { active-period: indefinite, post-deletion: 30d }
  messages:            { default: 5y, private: user-discretion }
  financial-records:   5y      # regulator-required
  medical-records:     10y
  audit-log:           5y      # WORM
  device-fingerprints: 90d
  analytics-events:    2y (pseudonymized), 90d (identifiable)
  crypto-wallet-transactions: 7y
```

Automated deletion jobs per-record-type, scheduled через Temporal.

## 7. Cookies consent

Web-specific (mobile uses native permissions):

- Essential (session, CSRF) — always on (legally ok).
- Functional (language pref, theme) — opt-out via settings.
- Analytics (usage) — opt-in in some regions (EU).
- Marketing (third-party tracking) — opt-in always.

Cookies banner shown on first visit / after consent change / quarterly re-ask для EU.

## 8. Regulator reporting

- **SAR** (Suspicious Activity Reports) — automated from trust-safety + manual review.
- **Transparency reports** — annual, public (number of content-removals, government requests, account actions).
- **Tax reports** для creators (1099-K US, 2-НДФЛ РФ) — из wallet.
- **Bank regulatory** — per-jurisdiction via BaaS partner (we help, partner files).

Generation — через `audit-log` queries + `services/compliance-reports` (новый сервис при Фазе 8 banking).

## 9. Terms violations consequences

Tiered enforcement:

1. **Warning** — user notified, no action.
2. **Restriction** — specific actions disabled (reduced distill).
3. **Suspension** — account temp-freeze, timed.
4. **Ban** — permanent, anti-evasion flagged.

Violations documented в `audit-log`, appealable через `disputes`.

## 10. Transparent changes

- ToS / PP changes — **public changelog** (`docs/legal/CHANGELOG.md`).
- Notice to users 30 days before major changes.
- Old versions accessible `/terms/v{N}` always.
- Summary of changes предоставляется non-legal language.

## 11. Legal-tech integration

- **Termly / Iubenda** (SaaS) — optional generator для PP templates, но не authority.
- Legal-counsel review обязателен для:
  - Major ToS changes.
  - Launch в новой юрисдикции.
  - Banking / crypto launches.
  - Children's products.

## 12. Metrics

- `legal.acceptance.pending-count{version}` — сколько не подписали.
- `legal.acceptance.rate-over-time` — скорость acceptance.
- `legal.decline-rate{document,action}` — сколько отказались.
- `legal.consent-withdrawal-rate{category}` — сколько отзывают consent.

## 13. Антипаттерны

- ❌ One giant ToS, смешивающий ToS + PP + disclaimers.
- ❌ Pre-checked consent checkboxes.
- ❌ Accept-by-continuing (no explicit action).
- ❌ Не сохраняем version-hash, на которой user подписал.
- ❌ Retroactive ToS changes без notification.
- ❌ Disclaimers в 6pt-тексте — bad faith.
- ❌ Нет decline-option при acceptance.
- ❌ Language mismatch (английский ToS для русскоязычного user'а).
- ❌ Consent withdrawal flow harder, чем consent flow — dark pattern.
