# 53. Community & Support

Как v6 поддерживает пользователей: tiers, community management, trust-building, self-service.

## 1. Support tiers

| Tier | Who | Response-time SLA | Channel |
|---|---|---|---|
| **Self-service** | All users | Immediate | Help center, FAQ, in-app help |
| **Community** | All users | Best-effort | Forum, Discord, subreddit |
| **Standard** | Registered users | 24h | In-app ticket, email |
| **Priority** | Paid / premium | 4h | Email + chat |
| **Enterprise** | B2B, Partners | 1h + SLA | Dedicated AM + Slack channel |
| **Critical-ops** | Banking, Crypto | 30 min | 24/7 phone + escalation |

## 2. Self-service first

Large-scale platform — большинство запросов закрывается self-service:

- **Help center** (`help.daria.app`): articles per-feature, searchable.
- **In-app contextual help**: question-icon → relevant article.
- **AI-assisted**: smart-search для user queries (`services/ai-assist` task `help-search`).
- **Video tutorials**: short, task-focused.
- **Community Q&A**: searchable forum.

Goal: 80%+ support queries deflected before reaching human.

## 3. Ticketing flow

```
User issue
  │
  ▼
Self-help tried (ai suggestion, FAQ match)?
  │
  ▼
Ticket created (in-app или email → service)
  │
  ▼
Auto-triage (category, priority via ML)
  │
  ▼
Tier-1 support (general)
  │
  ├── Resolved → close + satisfaction rating
  ├── Escalated to Tier-2 (specialist)
  └── Escalated to engineering (bug)
  │
  ▼
Resolution + post-solve feedback
```

## 4. Community platforms

- **Forum** (Discourse / similar): searchable, categorized, SEO-useful.
- **Discord / similar**: chat-based, faster, но ephemeral.
- **Reddit**: organic discussions, semi-managed.
- **Twitter / социал**: announcements + responsive to complaints.

**Rule**: важные answers репостить из Discord в forum (searchable).

## 5. Community management

- **Moderators** — paid (contractors) + volunteers.
- **Code of conduct** — clear, enforced.
- **Sentiment tracking** — monthly to catch issues.
- **Ambassador program** (Phase 7+): power-users get badges + early access.

## 6. Creator / partner support

Дополнительно к user-support:

### Creator tier

- Dashboard с analytics / support-queries.
- Monthly office hours с platform team.
- Success manager (for top creators).
- Revenue / payout issues — priority ticket.

### Partner / integrator tier

- Dedicated tech-support.
- Dedicated Slack channel.
- Quarterly business review.
- SLA per contract.

### Banking / crypto customers

- 24/7 phone support (regulatory).
- Specialized fraud / security line.
- Customer success reps.

## 7. Knowledge base management

- **Owner**: support team + product team.
- **Updates**: после new features / common ticket patterns.
- **Quality**: A/B tested article wordings.
- **Searchability**: semantic search + synonym handling.
- **Multilingual**: top 5 languages supported.

## 8. Empathy & tone

Support communication:
- Acknowledge problem first.
- Apologize if our fault.
- Explain what happened (within bounds).
- Resolve or escalate.
- Follow-up to confirm resolution.

Don't:
- Blame user unless obvious misuse.
- Copy-paste canned responses without reading ticket.
- Close tickets without confirmation.
- Use overly corporate/legal language.

## 9. Trust-building

Beyond individual support:

- **Status page** always accurate.
- **Transparency reports** (yearly).
- **Engineering blog** — what we built, why.
- **Open source contributions** — where appropriate.
- **Public post-mortems** — honest about failures.
- **Active listening** — feedback forms, surveys, qualitative research.

## 10. Escalation paths

### User → Engineering

```
User ticket → Tier-1 support
  ↓ (if technical)
  Tier-2 (specialist)
  ↓ (if bug confirmed)
  Engineering (JIRA ticket)
  ↓ (if outage)
  Incident (SEV-X)
```

### VIP / enterprise

- Bypasses Tier-1 for certain case types.
- Named account manager initial contact.

## 11. Metrics

- `support.tickets.count{tier, category}`
- `support.tickets.first-response-time` per tier
- `support.tickets.resolution-time`
- `support.tickets.csat` (customer satisfaction)
- `support.self-service.deflection-rate`
- `support.tickets.reopen-rate`
- `support.community.active-users`

Target:
- CSAT > 4.5 / 5.
- Self-service deflection > 70%.
- Tier-1 first-response < 4h (Standard).

## 12. Incident-support coordination

During SEV incidents:
- Support team notified by IC.
- Canned responses prepared for common user questions.
- Status-page updates drive support talking-points.
- Post-incident follow-up с affected users.

## 13. Feedback loops

- Quarterly user surveys (NPS).
- Post-interaction rating.
- Feature-request tracker (public).
- Beta-program users — direct feedback channel.

Feedback → product roadmap inputs.

## 14. International support

- **Top 5 languages** native support (EN, RU, ES, AR, ZH).
- **Auto-translation** для other languages (with human review for quality).
- **Time-zone coverage** — 24/7 weighted for user distribution.
- **Cultural sensitivity** training для moderators.

## 15. Abuse / harassment of support

- Support people are humans.
- Abusive tickets → flag → management review.
- Block abusive users via trust-safety.
- Well-being for support team (counselling, limits).

## 16. Антипаттерны

- ❌ Support как phone-tree torture.
- ❌ Canned replies без personalization.
- ❌ Slow first-response → user escalates publicly (Twitter).
- ❌ Ticket closed не разрешена.
- ❌ No community management → toxic culture.
- ❌ Status page lagging / inaccurate.
- ❌ No SLA for paid tiers → customer churn.
- ❌ Support = engineering afterthought — dedicated team required at scale.
