# 51. Incident Response

Специфика handling incidents: severity levels, on-call rotation, incident commander role, war room, post-mortem process. Дополняет `18-observability-ops.md §9` и `35-disaster-recovery.md`.

## 1. Severity taxonomy

| Level | Criterion | Response time | Channel |
|---|---|---|---|
| **SEV-1** | Full outage, financial impact, security breach, data-loss | < 5 min | PagerDuty + phone + exec-page |
| **SEV-2** | Major degradation, single-service down, SLO burn 2x | < 15 min | PagerDuty + Slack |
| **SEV-3** | Minor degradation, workaround exists | < 1h | Slack + ticket |
| **SEV-4** | Cosmetic bug, no user impact | next business day | Ticket |
| **SEV-5** | Informational, investigate later | at discretion | Ticket |

## 2. On-call structure

### Primary rotation

- **Platform on-call**: 24/7 rotation среди SRE / platform engineers. 1 week shifts.
- **Security on-call**: для security-specific incidents. Separate rotation.
- **Secondary**: fallback if primary unreachable в 5 мин.
- **Engineering manager**: escalation path.

### Compensation

- Paid per-week on-call.
- Extra compensation per page invoked.
- Shift limit: max 1 week / month (prevents burn).

### Rotation tooling

- PagerDuty / Opsgenie / internal pager.
- Schedule public в team calendar.
- Hand-off checklist at week-end.

## 3. Incident commander role

Assigned per-incident (SEV-1 / SEV-2):

- **Single person in charge** of coordination.
- Not necessarily technical expert — focused on communication.
- Decision-making authority: что обновить в status-page, когда escalate, когда stop mitigation.
- Rotates: IC хорошо, когда разные люди привыкают — distributes experience.

Playbook для IC:
1. Acknowledge page.
2. Create incident channel (`#incident-YYYY-MM-DD-<slug>`).
3. Assign roles: communicator, technical lead, scribe.
4. Coordinate mitigation.
5. Update status-page каждые 15 мин.
6. Declare resolved when confirmed.
7. Schedule post-mortem.

## 4. War room (SEV-1)

For critical incidents:

- **Virtual meeting** (Zoom / Meet) — on-going.
- **Incident channel** — text log.
- **Status-page** — public communication.
- **Exec bridge** — C-level updated hourly.

Rule: **one source of truth** — the incident channel. All else references it.

## 5. Communication templates

### Initial acknowledgment (SEV-1 / SEV-2)

```
🚨 Incident detected at HH:MM UTC
Scope: [affected services / users]
Impact: [brief user-facing]
Status: Investigating
Next update: HH:MM
```

### Update (every 15-30 min)

```
🔶 Update HH:MM
Found: [root cause if known]
Doing: [mitigation in progress]
ETA resolve: [if known]
Next update: HH:MM
```

### Resolution

```
✅ Resolved HH:MM
Duration: N min
Impact: [final]
Root cause: [short]
Post-mortem: [link, will be attached]
```

## 6. Mitigation priority

Mitigate > fix. Order:

1. **Stop the bleeding** — rollback, circuit-break, feature-flag off.
2. **Restore service** — even if temporary.
3. **Investigate** — after users restored.
4. **Fix properly** — after incident resolved.

Don't try to «find root cause» during incident — fix after.

## 7. Communication с users

### In-app banner

```
⚠️ Some features may be unavailable. Working on it. [link]
```

### Status-page

Auto-updated from SLO burn + manual IC overrides.

### Email / push

- SEV-1 с > 1h downtime — email all affected.
- SEV-2 — status-page update sufficient.

### Social

Twitter / official social для widespread outages.

## 8. Post-mortem (blameless)

### Required

- Every SEV-1 / SEV-2.
- Within 1 week of resolution.
- Blameless: focus on system failures, not individual mistakes.

### Template (`docs/incidents/YYYY-MM-DD-<slug>.md`)

```markdown
# Incident: [title]

## Severity: SEV-X
## Duration: HH:MM → HH:MM (N min)
## Impact
[Users affected, actions unable to complete]

## Timeline
- HH:MM — первое detection
- HH:MM — IC assigned
- HH:MM — mitigation started
- HH:MM — resolved

## What happened
[Technical narrative]

## Root cause
[5-whys analysis]

## What went well
[Positive actions during incident]

## What went wrong
[System / process failures]

## Action items
[Concrete, deadlined, owned tasks]

## Lessons learned
[Broader patterns, policy changes]
```

### Review

- Published в open channel (company-wide).
- Quarterly review: patterns across post-mortems.

## 9. Blameless culture

- **No finger-pointing** в post-mortem.
- Focus: «what system allowed this mistake?».
- Human errors — symptom, not cause.
- Reward honest reporting, not hiding.

## 10. Learning feedback loop

- Action items → tracker → completed in 2 weeks.
- Significant patterns → RFC для systemic change.
- Policy updates incorporated into runbooks.
- Training integrated если knowledge-gap identified.

## 11. Drills

Regular practice:
- **Quarterly game-days** — simulated incidents.
- **Chaos-Mesh experiments** (Phase 6+).
- **Secondary on-call** gets more drills.
- **New on-call** shadows for 2 weeks.

## 12. Special incidents

### Security breach

Additional steps:
- External forensics consultant на retainer.
- Legal team notified.
- Compliance team notified.
- User notification within 72h (GDPR).
- No social-media discussion без legal approval.

### Data loss

- Immediate DR playbook execution (35-disaster-recovery).
- Affected users notification.
- Regulator notification per-jurisdiction.
- Backup-integrity verified.

### Child safety (grooming / CSAM)

- Immediate moderation override.
- Law enforcement notification (NCMEC US, equivalent).
- External non-disclosure until investigation.

## 13. Incident metrics

- `incidents.count{severity,month}`
- `incidents.mttr{severity}` — mean time to resolve.
- `incidents.mttd` — mean time to detect.
- `incidents.on-call.pages{shift}`.
- `incidents.false-positive-rate` — paged но не real.

Target: SEV-1 MTTR < 1h, SEV-2 < 4h.

## 14. Антипаттерны

- ❌ Blame-focused post-mortems.
- ❌ No IC — everyone scrambling.
- ❌ Silent incidents — users не уведомлены.
- ❌ Action-items без deadline или owner.
- ❌ On-call без reasonable compensation → burnout.
- ❌ Skip post-mortem «because it's obvious».
- ❌ Fix-before-mitigate — dragging users through pain.
- ❌ Multiple «incident channels» — confusion.
