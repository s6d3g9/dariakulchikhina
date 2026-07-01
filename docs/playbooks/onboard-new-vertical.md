# Playbook: onboard-new-vertical

Launching a new vertical (e.g. Travel Phase 3, Dating Phase 7a). Complete checklist.

## Pre-launch (4-8 недель)

### Architecture

- [ ] Identified all card-types needed (minimum viable).
- [ ] Identified required primitives. Все existing? If no — primitive RFC first.
- [ ] Cost-projection reviewed (27-cost-model).
- [ ] Legal disclaimers written if vertical is regulated (37-legal-terms).
- [ ] Policy rules drafted for new content types (13-governance-policy).

### Implementation

- [ ] Card-types implemented (playbook: add-card-type).
- [ ] Primitives updated if needed (only horizontal!).
- [ ] Timelines defined.
- [ ] Permissions presets configured.
- [ ] Moderation-ml trained для content category.
- [ ] Notification rules в platform/notification-rules/.

### Content / partners

- [ ] Seed content 10-100 items.
- [ ] 10-20 anchor creators invited (45-cold-starts).
- [ ] Integration with external APIs tested (GDS, maps, PSPs specific to vertical).

### Testing

- [ ] All acid-tests for relevant phase green (21-acid-tests).
- [ ] Fractal-harness snapshot baseline established.
- [ ] Load test on staging.
- [ ] Security review for new sensitive flows.

## Soft launch (2-4 недели)

### Early adopters

- Invite-only / waitlist.
- Monitor closely: retention, errors, user feedback.
- Iterate rapidly.

### Monitoring

- Dashboard «Vertical: <name>» with metrics (39-analytics-metrics).
- On-call rotation includes new vertical.
- Daily check-in первые 2 недели.

## Public launch

- [ ] Public announcement ready.
- [ ] Status-page update.
- [ ] Customer support ready to handle vertical-specific questions.
- [ ] Moderation team briefed on new content types.
- [ ] PR / marketing campaign if applicable.

## Post-launch (первые 3 месяца)

### Metrics watch

- Retention cohorts.
- Adoption rate (new-signups with vertical engagement).
- Revenue / unit economics.
- User-reports / moderation actions.
- Cost per-MAU.

### Iteration

- Weekly reviews первые 8 недель.
- Adjust ranking signals based on usage.
- Expand content categories based on demand.

## Failure criteria

Если через 3 месяца:
- Retention week-4 < 15% от acquisition week.
- Cost-per-MAU > revenue-per-MAU на 50%+.
- Moderation-burden непропорциональный.

→ ADR «pause / sunset this vertical». Продолжать investment — irrational.

## Common mistakes

- ❌ Launch без seed content → ghost town (45).
- ❌ Missing law-profile (13) → compliance incident.
- ❌ Insufficient moderator capacity → content spirals.
- ❌ Ignore acid-tests «green для phase».
- ❌ Create vertical-specific services → nuclear I1 violation.
- ❌ Rush because «competitors launching too».
- ❌ Not track metrics → can't tell if working.
