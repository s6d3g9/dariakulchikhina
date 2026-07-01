# 54. Innovation Track

Как v6 делает R&D без дестабилизации стабильной платформы. Отдельный process для experimental features, sunset policy для failing ideas.

## 1. Парадигма

Two tracks:
- **Production** — strict invariants (I1-I23), thorough testing, long-term commitments.
- **Innovation** — relaxed constraints for exploration, time-boxed, opt-in user base.

Innovation track **питается** в production когда достаточно зрелости.

## 2. Innovation lab

`apps/lab/` (отдельный subdomain `lab.daria.app`):
- Isolated environment, не production.
- Same identity, but separate data (if testing costs).
- Feature flags permanently for lab features.
- Separate observability.

## 3. Feature categorization

| Category | Description | Process |
|---|---|---|
| **Experiment** | Hypothesis test | A/B framework, 4-8 weeks |
| **Prototype** | Proof-of-concept UX | Lab environment, opt-in |
| **Incubator** | Multi-quarter exploration | Dedicated team, isolated scope |
| **Moonshot** | Long-shot bet, high risk | Executive sponsored, year+ |

## 4. Experiment track

Standard A/B / multi-variant via `services/feature-flags`. См. `39-analytics-metrics.md §6`.

- Short-term (4-8 weeks).
- Production code behind flag.
- Pre-registered metrics plan.
- Clear success / failure criteria.
- Kill on failure, scale on success.

## 5. Prototype track

Exploratory UX / feature concepts в `apps/lab/`:

### Setup

- Separate app, subdomain.
- Opt-in user pool (beta testers, typically early-adopters).
- Reduced testing / polish requirements.
- Usage tracked intensely.

### Exit criteria

- **Scale**: prototype → production (with full hardening + invariants).
- **Iterate**: keep in lab, evolve based on user feedback.
- **Kill**: findings documented, removed.

Max 6 months in lab before decision.

## 6. Incubator track

Multi-quarter projects, larger scope:

### Setup

- Dedicated small team (2-5 people).
- Clear scope (RFC-level writeup).
- Protected from feature-factory pressure.
- Quarterly checkpoint.
- Separate repo / branch until ready.

### Exit criteria

- Integrate into platform (with full architecture treatment).
- Spin out as adjacent product.
- Kill (with public retro).

Example candidates (hypothetically):
- On-device ML inference (late Phase 7+).
- Decentralized identity.
- New content-format (e.g. spatial).

## 7. Moonshot track

Long-shot strategic bets:

- **Executive sponsor** required.
- **Dedicated budget** outside normal planning.
- **Year+ timeline**.
- **Quarterly public-to-company progress**.
- **Low expected success rate** — by design.

Examples:
- Own banking license (vs BaaS).
- Own crypto custody (vs Fireblocks).
- Full-scale on-device AI.

Only 1-2 concurrent moonshots at a time — сlippage costly.

## 8. Sunset policy

Features die. Process for killing gracefully:

### Criteria

- Usage < threshold (e.g. < 1% DAU for 3 months).
- Maintenance cost > value.
- Better alternative launched.
- Regulatory / legal forced.
- Strategic pivot.

### Process

1. **Deprecate announcement** — 90 days notice минимум.
2. **Migration path** — help users to alternative (other feature / different product).
3. **Data export** — let users leave cleanly (GDPR anyway).
4. **Read-only period** — feature still viewable but no new action.
5. **Removal** — code deleted, docs archived.
6. **Retro** — what worked / didn't, share learnings.

## 9. Failed-bet handling

- **Public retros** — don't hide failures.
- **Blame-free** — systemic lessons, not individual.
- **Team re-assignment** — former moonshot team reabsorbed.
- **Learning preservation** — what we tried, why failed, what we learned.

Platform культура: failed bets — badge of exploration, not embarrassment.

## 10. Innovation budget

Rule-of-thumb:
- 70% — current quarter committed features.
- 20% — next-quarter / experiments.
- 10% — exploration / moonshots.

Engineer-level: «20% time» for exploration (opt-in).

## 11. Relationship с invariants (I1-I23)

- Experiments / prototypes **могут временно** нарушать invariants — explicit waiver in RFC.
- **Never**: security, safety, financial invariants (I7, I10, I17, I19 violations blocked).
- Waivers audit-logged + expire.
- Exit from innovation → invariants enforced.

## 12. Ideation → implementation

```
Idea (anywhere — customer feedback, engineer insight, market opportunity)
  │
  ▼
RFC draft (52-knowledge-management)
  │
  ▼
Review + discussion
  │
  ├── rejected → archived
  ├── experimental → feature-flag A/B
  ├── prototype → lab environment
  └── incubator → dedicated team
  │
  ▼
Exit criteria met
  │
  ├── production → full architecture integration
  ├── iterate → stay in track
  └── kill → sunset
```

## 13. Customer involvement

- **Beta program** — opt-in users for prototypes.
- **Design-partner program** — close-loop with enterprise users on incubators.
- **Open feedback** — public roadmap + voting.
- **User research** — quarterly interviews.

## 14. Metrics

- `innovation.experiments.running{quarter}`
- `innovation.experiments.success-rate` (shipped vs killed).
- `innovation.time-in-lab` (prototypes).
- `innovation.graduation-rate` (lab → production).
- `innovation.sunset-announcements` per year.

Target: 30% success rate for experiments, 50% for prototypes. Low success rate для moonshots ожидаем.

## 15. Антипаттерны

- ❌ Experiments без kill criteria — зомби.
- ❌ All features go through same gate — no room for exploration.
- ❌ No sunset process — feature accumulation.
- ❌ Innovation divorced от platform — «not invented here» when integrating.
- ❌ Executive vetoes for political reasons.
- ❌ Moonshots без budget protection → cannibalized by feature work.
- ❌ Failure as taboo → defensive culture, slow learning.
- ❌ No public retros for kills — lessons lost.
