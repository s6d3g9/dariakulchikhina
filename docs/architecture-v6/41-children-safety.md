# 41. Children Safety

v6 — мультирегиональная платформа с широкой audience. Дети и подростки могут получать доступ к features, даже если не target audience. Этот документ фиксирует: age-verification, parental controls, content-gates per-age, regulatory compliance (COPPA / GDPR-K / РФ 436-ФЗ).

**Позиция**: на момент разработки ограничения declared через `policy-engine` (см. `13-governance-policy.md`); code-wise features не разделяются по возрасту, runtime применяет gates.

## 1. Terminology

- **Minor** — пользователь младше local «digital age» (EU 16, US 13 COPPA, RU 14 рекомендовано).
- **Parent / guardian** — account с подтверждённой связью.
- **Verified age** — подтверждение через identity-document / credit-card / other.
- **Declared age** — user ввёл, но не verified.
- **Age-gate** — policy-engine check до конкретного action'а.

## 2. Регуляторика — базовый набор

| Регион | Минимальный возраст (без родительского consent) | Максимальный для child-protection |
|---|---|---|
| EU (GDPR-K) | 16 (per member-state — от 13) | 18 |
| US (COPPA) | 13 | 18 |
| UK | 13 | 18 |
| RU (152-ФЗ / 436-ФЗ) | 14 (рекомендация) | 18 |
| Вьетнам | 13 | 16 |
| Китай | 14 | 18 |

Все это encoded в `platform/law-profiles/<region>.yaml` → `legalAges.digital-consent`, `legalAges.adult`.

## 3. Age verification levels (separate from KYC)

**Важно**: age-verification ≠ KYC-level (см. `13-governance-policy.md §7` + `44-identity-flows.md §10` для KYC). Here мы оцениваем **age** отдельно.

Gradient (не boolean):

| Age-VerLevel | Verified | Use-case |
|---|---|---|
| AV0 | Nothing | Registration, read-only browsing |
| AV1 | Self-declared age | Content-filtered (no NSFW); basic interactions |
| AV2 | Parent-confirmed (for minors) | Under-legal-age with parent consent linked |
| AV3 | ID-verified age (also gives KYC-L2) | 18+ features (dating, adult-content, gambling where legal) |

Progressive: user stays at AV1 till action requires AV2+. **AV3 автоматически достигается при прохождении KYC L2+** (ID-doc contains DoB).

Различие:
- **Age-verification** — про «сколько тебе лет» (для age-gates, children-safety, 18+).
- **KYC** — про «кто ты и financial identity» (для money-related actions).
- Single ID-document can satisfy обе: passes age через DoB + identity через photo/name.

## 4. Child account flow

### Under digital-consent age

1. User declares age at signup.
2. If below — **parent-email required**.
3. Parent receives email с link.
4. Parent creates parent-account (или links existing).
5. Parent confirms child-account creation.
6. Child-account gets `role: minor` + `parent: <parent-id>`.
7. Parent-controls dashboard activated.

### 13+ but under adult age

Similar but lighter restrictions. Parent-linking optional в некоторых юрисдикциях.

### Adult (18+ or equivalent)

Normal signup flow. No special restrictions от возраста.

## 5. Parent controls

В parent-account dashboard:

- **Activity overview** — child's recent activities (summary, not detailed content).
- **Communication limits** — whom child can message (whitelist / contacts-only / public).
- **Content restrictions** — strict NSFW block, moderation-tier override.
- **Spending limits** — max monthly spending on subscriptions / purchases.
- **Time-limits** — daily usage cap (iOS / Android native screentime integration preferred).
- **Block specific card-types** — dating, crypto, etc., even before policy would.
- **Full account suspension** — temporary lockdown.
- **Data export / deletion** — parent has rights under GDPR-K / COPPA.

All changes → audit + push notification to child.

## 6. Content gates

`policy-engine` applies age-gates:

```yaml
# platform/policies/age-gates.yaml
- action: card-type.access
  when: card-type in ['dating', 'crypto-exchange', 'banking']
  require: user.age >= region.legalAges.adult
  effect: deny
  reason: AGE_RESTRICTED

- action: content.view
  when: content.tags contains 'nsfw'
  require: user.age >= region.legalAges.adult AND user.verifiedAge.level >= 3
  effect: deny

- action: content.view
  when: content.tags contains 'alcohol-imagery'
  require: user.age >= region.legalAges.alcohol
  effect: distill
  mask: ['alcohol-items']

- action: subscription.purchase
  when: user.age < region.legalAges.adult
  require: user.parentConsent OR amount <= region.minorDailyLimit
  effect: deny
```

## 7. Communication restrictions для minors

- **No DMs** от unknown adults (adult = верифицированный 18+).
- **Group chats** — only в communities, moderated.
- **Content filter**: all incoming messages pass moderation-ml даже для low-severity.
- **Friend requests** требуют parent-approval (below age X).
- **No location sharing** (off by default, parent can enable).
- **No profile public visibility** (discoverable=false by default).

## 8. Monetization constraints

- **No direct purchases** under legal adult age (unless parent-approved).
- **No receiving royalty** directly (goes to parent-linked wallet до adult).
- **No tipping / receiving tips**.
- **Spending limit** daily/monthly configurable by parent.
- **Gift-sending / receiving** — limited; subject to parent review.

## 9. Dating / adult verticals

**Hard-blocked** для accounts где verifiedAge < 18 regardless declaration. Tap на dating switcher → «This feature is only available to verified adults».

## 10. Photo / video safety

- **Auto-moderation** для all uploads from minor-accounts (100%, not sampled).
- **Metadata scrubbing** (EXIF location removed by default для all, reinforced для minors).
- **Stricter moderation** thresholds (lower for CSAM / grooming signals).
- **No «promo» / brand collaborations** для minor accounts без parent-consent.

## 11. Grooming / predator detection

`services/trust-safety`:

- Pattern detection: adult → minor messaging with escalation signals.
- ML classifier для grooming-specific language.
- Immediate action на high-confidence signal (block, review, legal-notify).
- Appeal flow — ускоренный (часы, не дни) для falseпозитивов.

## 12. COPPA / regulatory compliance

### US COPPA (for < 13)

- **Parental consent verification** — credit card micro-charge / signed form / video-call.
- **Limited data collection** — only what's necessary.
- **No behavioral advertising**.
- **Parent rights**: access, delete, refuse further collection.
- **Data retention** — minimal; purge upon parent request.

### GDPR-K (EU <16)

- Similar to COPPA, но более strict consent requirements.
- Age-verification mechanisms documented.
- Per-state variations (some EU member states 13, others 16).

### РФ 436-ФЗ (info-protection for minors)

- Age-appropriate labels (6+, 12+, 16+, 18+).
- Restricted content categories (gambling, violence).
- Reporting mechanisms для inappropriate content.

## 13. Account graduation

When minor-account reaches adult age:

1. Auto-notification 30 days before.
2. Option to remove parent-controls at age.
3. Identity re-verification prompt (from L2 → L3 для some features).
4. Historical data treatment — user can decide:
   - Keep history.
   - Archive (invisible but retrievable).
   - Erase non-required.

## 14. Transparency reports

- Annual public report: how many minor-accounts, how many parent-linked, how many suspended, how many removals.
- No individual case details (privacy).

## 15. Design принципы для minor UI

- **Brighter signals** на safety warnings.
- **Clearer denials** — «This is not available at your age. Ask a parent if you think that's a mistake.»
- **No dark patterns** to prolong usage (health regulators increasingly require).
- **Educational prompts**: «You shared a phone number — are you sure?» for minors.

## 16. Integration c law-profiles

`platform/law-profiles/<region>.yaml`:

```yaml
legalAges:
  digital-consent: 16          # GDPR-K (конкретно для EU country)
  adult:            18
  alcohol:          18
  gambling:         18
  driving-category-A: 18
  driving-category-B: 18

minors:
  requireParentConsent: true
  parentVerificationMethod: 'email-link'      # or 'id-document'
  maxDailySpendingLimit:
    currency: EUR
    amount: 10
  strictModeration: true
  communicationRestrictions: true
```

## 17. Metrics

- `safety.minor-accounts.count{region}` — общее число.
- `safety.parent-consent-rate` — conversion rate на parent-confirm.
- `safety.minor-grooming-reports{confirmed,false-positive}`.
- `safety.moderation-action-rate{minor-content}`.
- `safety.age-graduation-retention` — какой % стайers после graduation.

## 18. Антипаттерны

- ❌ Only self-declared age без mechanism для verification.
- ❌ Same onboarding для all ages.
- ❌ Adult features (monetization, dating) accessible через «ошибку declared age».
- ❌ Parent-controls, которые можно обойти logout'ом и re-signup'ом (device-fingerprint помогает).
- ❌ No age-graduation plan — user навсегда остаётся в minor-mode.
- ❌ Moderation тех же thresholds для minor и adult accounts.
- ❌ Marketing / advertising targeted to verified minors.
- ❌ Gamification patterns, усугубляющие screen-time (no «streak» rewards на minor accounts).
