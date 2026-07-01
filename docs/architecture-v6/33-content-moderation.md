# 33. Content Moderation

Модерация в v6 — сквозная, применяется ко **всему** пользовательскому контенту: messages, posts, assets, Pattern-Card'ы, профили, комментарии, reviews, stream-title. Один pipeline, один набор классификаторов, один набор человеческих review-flow.

См. также: `13-governance-policy.md` (как applyment), `19-security-model.md` (trust-safety), `22-messaging-model.md` (per-conversation-kind moderation level), `23-ai-assistance.md` (ML model).

## 1. Принципы

- **Один pipeline на всё**. Никаких vertical-specific «travel-moderation» vs «dating-moderation».
- **Three-tier**: ML-only (fast) → ML+human (uncertain) → human-only (high-stakes). Градиент.
- **Policy-driven**: какой tier применяется — решает `policy-engine` (per-region, per-action, per-conversation-kind).
- **Transparent**: пользователь видит причину любого removal'а.
- **Appealable**: всегда есть dispute-path.
- **Provable**: всё — в `audit-log` (WORM).

## 2. Таксономия нарушений

Единая категоризация, используется моделями, людьми, audit-reports, регуляторами:

### Critical — always removed, always reviewed

| Code | Название | Реакция |
|---|---|---|
| `csam` | Child sexual abuse material | auto-block, report authorities, ban user |
| `terror` | Violence / terror content | auto-block, review, legal-notify |
| `doxxing` | Exposing private info w/o consent | auto-block, review |
| `non-consensual-intimate` | Revenge porn, etc | auto-block, review, takedown |
| `trafficking` | Human trafficking | auto-block, legal-notify |

### High — block + review

| Code | Название | Реакция |
|---|---|---|
| `harassment-severe` | Targeted, sustained harassment | review → warn/ban/block |
| `csam-risk` | ML unsure but high-risk | human review SLA < 1h |
| `harm-incitement` | Inciting violence / self-harm | block, review, crisis-resources |
| `sanctioned-party` | Interaction with sanctioned entity | block, compliance-notify |
| `fraud-severe` | Scam patterns | block, trust-safety notify |

### Medium — distill / warn

| Code | Название | Реакция |
|---|---|---|
| `nsfw-general` | Adult content (context-dependent) | gate behind opt-in + region-check |
| `spam` | Unsolicited promotion | distill (reduce visibility) |
| `misinformation` | Factually incorrect (important topics) | label, reduce visibility |
| `minor-harassment` | Low-grade rudeness | warning to user, no block |
| `copyright-claim` | DMCA-style | takedown + counter-claim flow |
| `fake-account` | Bot / impersonation | identity-verify challenge |

### Low — inform / monitor

| Code | Название | Реакция |
|---|---|---|
| `profanity` | Swear words (culture-dependent) | per-policy mask/hide |
| `commercial-undisclosed` | Promotion without ad-label | require disclosure, policy-distill |
| `ai-generated-unlabeled` | AI content без provenance | add label, no removal |
| `low-quality` | Spam-adjacent (duplicate, nonsense) | down-rank |

## 3. Three-tier pipeline

```
Content created
      ▼
[Pre-classifier]   ← fast heuristics (regex, hash-match, length, rate-limit)
      ▼
   critical?     ──yes──> Block immediately + human review queue (SLA < 30 min)
      │
      no
      ▼
[ML classifiers]   ← CLIP (images), text-LLM, audio-class, video-frame-class
      ▼
   score decision:
     - clear-allow (< threshold_low)   → publish
     - uncertain (threshold_low..high) → shadow-publish + human review SLA < 6h
     - clear-block (> threshold_high)  → block + human review SLA < 1h
      ▼
[Human review]     ← moderation-review queue
      ▼
    decision → final action + audit + notification
```

## 4. Human-in-loop: moderation-review service

`services/moderation-review` (Layer 6):

- Case queue per-category + per-SLA.
- Assignment rules: random / rotating / skill-based (CSAM specialists).
- Decision options: `allow`, `label`, `distill`, `block`, `escalate-to-senior`, `escalate-to-legal`.
- Time-per-case tracked.
- Reviewer well-being: CSAM reviewers limited to X hrs/day, have counselling support.
- Quality control: shadow-review (10% cases reviewed twice, inter-rater agreement tracked).

## 5. Appeal flow

User видит action на своём контенте → CTA «Appeal» → создаётся case в `services/disputes`:

1. User пишет explanation (text / evidence).
2. Case routed на senior reviewer (не тот же, что принимал initial decision).
3. SLA: 48 часов.
4. Decision: upheld / overturned.
5. Audit: полный trail.
6. Второй appeal (final) — escalation в compliance-team.

## 6. Community-level moderation

Community (см. `22-messaging-model.md`) имеет **собственных** модераторов:

- Author / owner community — автоматически modератор.
- Назначенные role='community-moderator' — могут remove posts, mute users, но не ban (ban — platform-level).
- Community-level decisions apart от platform-level. Platform override всегда выигрывает.

## 7. Reporting flow (user-initiated)

Любой пользователь может report контент:

```
Report button на item
  ▼
Dialog: category + explanation
  ▼
services/disputes.openCase(reporter, target, category)
  ▼
Rate-limit: N reports/day per-user (anti-abuse)
  ▼
Routed в moderation-review queue:
  - Critical → immediate (SLA 30m)
  - High → 1h
  - Medium → 6h
  - Low → 24h
  ▼
Reporter получает update when resolved
```

## 8. Моделирование в UI

Moderation — фрактально. Нет отдельного «moderation-app».

- **Admin/moderator** открывает свой профиль с mode='moderator' → right-panel показывает queue (тот же Conversation-list).
- **Appeal** — отдельный kind Pattern-Card (`dispute-case`) с timeline'ом (submitted → reviewing → decision → closed).
- **User warning** — message в conversation «platform-notifications» (entity-thread).

## 9. Policy per-region

Law-profiles (`13-governance-policy.md`) override defaults:

```yaml
# platform/law-profiles/DE.yaml
moderation:
  nsfw: strict                 # Германия — строже дефолта
  hate-speech: legal-threshold # NetzDG compliance
  insults-politician:
    tier: 'medium'
    auto-report: true          # специфично для DE
```

```yaml
# platform/law-profiles/TH.yaml
moderation:
  lese-majeste: critical       # Таиланд
  gambling-promotion: distill
```

## 10. Trust & safety vs moderation

Два связанных, но разных сервиса:

- `services/moderation-ml` + `services/moderation-review` — про **контент**.
- `services/trust-safety` — про **actors** (люди, аккаунты, devices).

Trust-safety fingerprint ищет:
- Bot-patterns (velocity, similar behaviors).
- Sybil attacks (много аккаунтов на одном device).
- Account-takeover (отличное поведение от нормы).
- Coordinated abuse (groups, пишущие одни и те же things).

Reaction: challenge (MFA / photo-verify) → restrict (distill actions) → ban.

## 11. GDPR и moderation

- User-GDPR-erase удаляет user-content, но moderation-audit записи сохраняются (anonymized user-id, transaction-signature остаётся).
- Right to be forgotten не отменяет regulatory logging.
- Moderators имеют access к user-data только в рамках конкретного case (case-scoped data access).

## 12. Metrics и observability

- `moderation.classify.latency_ms{classifier,tier}`
- `moderation.decision.rate{category,outcome}`
- `moderation.appeal.rate{result}`
- `moderation.reviewer.time-per-case`
- `moderation.inter-rater-agreement{category}` (quality)
- `moderation.user-appeals.overturn-rate` (fairness proxy)

Alerts:
- Surge в critical-category → incident.
- Reviewer burn-out (too many cases per hour for too long) → auto-redistribute.
- Inter-rater < 0.7 → require calibration-training.

## 13. Audit fields

Каждое decision:

```json
{
  "caseId": "mc_abc",
  "contentRef": { "kind": "message", "id": "m_123" },
  "reportedBy": "u_456" | "system",
  "category": "harassment-severe",
  "tier": "high",
  "mlScore": 0.87,
  "reviewerIds": ["r_789"],
  "decision": "block",
  "reason": "sustained harassment of u_xyz",
  "appealable": true,
  "processingTimeMs": 3240000,
  "regionContext": "DE"
}
```

## 14. Антипаттерны

- ❌ Автоматический ban без human review в critical cases.
- ❌ Moderation decisions не в audit-log.
- ❌ Reviewer CSAM без специальной подготовки и counselling.
- ❌ Отсутствие appeal-flow — регуляторский риск.
- ❌ Vertical-specific moderation (dating-moderation, video-moderation) вместо общей системы.
- ❌ Transparency-отчёты раз в год при регулятор-требовании квартала.
- ❌ Отсутствие user-notification при action на его content.
- ❌ ML-only для critical categories.
