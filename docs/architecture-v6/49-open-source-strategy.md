# 49. Open Source Strategy

v6 — proprietary платформа, но с **селективным** open-sourcing компонентов. Этот документ фиксирует: что делаем OSS, под какими licenses, community governance, contribution flow.

Принцип: **Open source — стратегия, не идеология**. OSS там, где это даёт technical / community / hiring / market-position преимущество.

## 1. Что OSS / что proprietary

### Обязательно proprietary

- Core business-logic (pattern-engine algorithms, authorship-registry, marketplace-ranking).
- Customer data handling.
- Banking / crypto / ledger-related.
- Moderation models (training data).
- Security-sensitive (identity, secrets handling).

### Кандидаты на OSS

- **Fractal UI kit** (`packages/ui-react`) — subset без business-specific.
- **CloudEvents schemas base** (уже publicly-useful).
- **Developer tools / codegen** (scaffolding, `plop.js` templates).
- **Testing harnesses** (fractal-harness, contract-harness — generically useful).
- **Timeline-engine wrapper** над Temporal (если достаточно generic).
- **Event-schema-governance tool** (CI check для breaking changes).

### OSS — хорошо для репутации

- Small utility libraries (design-tokens runtime, i18n helpers).
- Документация patterns (`docs/playbooks/`).

## 2. Licensing

| License | Для чего |
|---|---|
| **MIT** | Default для utility libraries, dev tools |
| **Apache 2.0** | Для frameworks с patent-protection concerns (UI kit) |
| **AGPL v3** | Core platform components если хотим protection против SaaS clones |
| **Source-Available (BSL / Elastic)** | Временная protection: 2-3 года, потом MIT / Apache |
| **Proprietary / closed** | Business logic, models, customer data |

**Rule**: one-repo-one-license. Mixed-license репо complex для community.

## 3. Governance modes

### Internal-first OSS

- Репо на GitHub, public.
- PRs welcomed, но merge — только Daria team.
- No SLA for external contributions.
- Typical для utility libraries.

### Community-driven

- Governance model documented (RFCs, maintainer nomination).
- External maintainers когда proven track-record.
- SLA для PRs (first-response 1 week).
- Transparent roadmap.
- Подходит для успешных проектов, которые мы захотели «отпустить».

### Fully-community

- Foundation (Apache / Linux) handover — когда проект превысил нас.
- Rare case.

Начинаем с internal-first. Переход к community-driven — по мере роста проекта.

## 4. Contribution flow

```
External PR
  │
  ▼
CLA (Contributor License Agreement) signed
  │
  ▼
Automated checks (CI, lint, tests)
  │
  ▼
Code-owner review (Daria team)
  │
  ▼
Merge или feedback
```

CLA — чтобы защититься от future license changes. Standard text через `cla-assistant.io`.

## 5. Public repos strategy

- **One repo per project** (не monorepo для OSS). Monorepo внутри нас, но OSS packages — extract'ить.
- **Separate org** (`github.com/daria-oss/*`) от main.
- **Documentation on every public repo**: README, CONTRIBUTING, CODE_OF_CONDUCT, LICENSE, SECURITY.
- **Discussions enabled**, не только Issues.

## 6. Security vulnerabilities

- Public repo → responsible disclosure policy.
- `SECURITY.md`: как report (security@daria.app, encrypted channel).
- SLA: acknowledge 72h, fix / public 90 days.
- CVE assignment для significant issues.

## 7. Transparency

Что публичное помимо code:

- **Security transparency reports** — quarterly (moderation actions, gov requests).
- **Uptime metrics** — public status page.
- **Architecture docs** — большая часть `docs/architecture-v6/` могут быть public (вопрос решаемый).
- **Post-mortems** — anonymized.

## 8. Brand strategy

- Logo + name owned by platform.
- OSS projects используют separate branding или clear distinction.
- `daria-oss` brand отличается от `daria.app` (консумерский).

## 9. Ecosystem

- **Plugins / extensions** — community-built поверх нашего public API (`46-public-api.md`).
- **Card-types 3rd-party** — если community build'ит — marketplace для distribution (далекое будущее).
- **Playing community games** — Hackathons, bounties для specific issues.

## 10. Tracking

- Stars / forks / contributors — vanity, но useful.
- Downloads (npm / cargo / pypi).
- Active contributors (MAU).
- Issues-response time.
- PR-merge time.

## 11. What OSS не решает

OSS — **не** замена:

- Marketing / user growth.
- Revenue model.
- Compliance / legal.
- Support team.

## 12. Риски

- **Maintainer burnout** — если один человек тащит всё.
- **License compliance** — кто-то использует GPL-code в proprietary.
- **Drive-by contributions** — low-quality PRs.
- **Forks diverging** — потеря unity.
- **Protocol capture** — кто-то становится dominant implementer.

Mitigations: documented governance, rotation, CLA, style-guide, CI.

## 13. Phased roadmap

- **Phase 0-4**: OSS никаких priority. Всё internal.
- **Phase 5-6**: первые utility packages OSS (design-tokens helpers, CLI tools).
- **Phase 7+**: UI kit + scaffolding tools.
- **Phase 10+** (если достигнем): возможно платформенные primitives (timeline-engine wrapper).

## 14. Инварианты

- I19 / I20 (fractal UI) — если OSS UI kit, он остаётся fractal-conforming (полезно для community).
- I1 — OSS кандидаты — horizontal primitives, не vertical-logic.
- I6 — данные никогда не в OSS.

## 15. Антипаттерны

- ❌ OSS core business-logic → конкурент копирует.
- ❌ OSS без CLA → future license change blocked.
- ❌ Claim «open» но повышают gatekeeping → community не доверяет.
- ❌ Promise support → fail → reputation hit.
- ❌ Monorepo публичный c everything → slow, scary for contributors.
- ❌ OSS без documentation → not useful.
- ❌ Competing with own paid product — boundaries нужно чётко.
