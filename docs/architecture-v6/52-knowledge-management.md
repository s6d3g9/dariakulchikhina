# 52. Knowledge Management

Как создаётся, хранится, передаётся знание в v6. Масштабируемая платформа ломается о «tribal knowledge» (знания только в голове одного). Этот документ — как защищаемся.

## 1. Типы знания

| Тип | Пример | Где живёт |
|---|---|---|
| **Architectural** | Почему выбран Temporal | `docs/adr/` |
| **Structural** | Какие слои, какие invariants | `docs/architecture-v6/` |
| **Operational** | Как развернуть service | `docs/playbooks/` |
| **Incident** | Как реагировать на alert | `docs/runbooks/` |
| **Domain** | Как работает creator economy | `docs/domain/` + code |
| **Historical** | Что было в v5, какие mistakes | `docs/architecture-v5/` (legacy) + post-mortems |
| **Procedural** | Как onboard'итcя, как PR-process | `docs/processes/` |
| **Cultural** | Как мы работаем вместе | onboarding + team wiki |

## 2. Принципы

1. **Docs-as-code** — документация в репо, рядом с кодом. Меняется PR'ом.
2. **Single source of truth** per-topic. Don't fragment.
3. **Discoverable** — любой член команды находит за 2 мин.
4. **Auto-enforced** via CI где возможно (`docs:v6:verify`, link-check).
5. **Ownership** — каждая doc имеет owner (через CODEOWNERS).
6. **Deleteable** — stale docs удаляются, не «копятся» навсегда.

## 3. Structure

```
docs/
  architecture-v6/        — target architecture (frozen draft → canonical)
  architecture-v5/        — legacy reference (read-only after Phase 4)
  adr/                    — decision records
  playbooks/              — golden paths для типовых tasks
  runbooks/               — для incidents / alerts
  incidents/              — post-mortems (blameless)
  domain/                 — domain specs (e.g. v5 features → v6 mapping)
  processes/              — hiring, review, rituals, feedback
  onboarding/             — day-1, week-1, month-1 paths per-role
  releases/               — changelogs, release notes
```

## 4. Документы are code

### CI checks

- `docs:v6:verify` — internal consistency.
- Link-check — no dead links.
- Style-check (Vale / simple rules).
- Spelling in technical terms.

### Fresh enforcement

- Docs с last-modified > 6 months get «STALE» warning in CI.
- Owner gets ping to review.

## 5. Onboarding paths

Per-role structured paths в `docs/onboarding/`:

```
onboarding/
  day-1-generic.md
  day-1-backend.md
  day-1-frontend.md
  day-1-sre.md
  week-1-platform-team.md
  week-1-card-type-squad.md
  month-1-generic.md
  ...
```

Включают:
- Must-read docs.
- First contribution tasks.
- People to meet.
- Tools access.
- Culture explanations.

## 6. RFC process

Для крупных ideas — **RFC before code**:

```
RFC → discussion → feedback → revise → accept/reject → ADR
```

`docs/rfcs/NNNN-<slug>.md` template:
- Problem.
- Proposal.
- Alternatives.
- Trade-offs.
- Consensus-building timeline.

Accepted RFC → implementation PR. Rejected RFC — still in repo (historical reference).

## 7. Living specs

Некоторые docs — **living**: updated continuously.

- `06-card-types-matrix.md` — updated при каждом new card-type.
- `07-layered-architecture.md` — при primitive add/remove.
- `docs/playbooks/*` — improved каждый раз, когда кто-то замечает gap.

Immutable docs (e.g. ADRs, post-mortems) — не меняются, only superseded.

## 8. Architecture reviews

Regular cadence:
- **Monthly arch-review** — что изменилось в архитектуре last month.
- **Quarterly deep-dive** — переосмысление одной области.
- **Phase-gate review** — milestone gate: все acid-tests green? docs consistent?

## 9. Knowledge sharing

- **Brown-bags** — weekly short tech talks.
- **Guild meetings** — TypeScript guild, security guild, UX guild.
- **Inner source** — code-review as learning.
- **Mentor assignments** — новым engineers.
- **Pairing time** — encouraged, not required.

## 10. External knowledge

- **Industry engagement** — conferences, blog posts, OSS.
- **Reading group** — monthly book/paper discussion.
- **Sabbatical time** (Phase 7+) — 2 недели каждые 2 года на learning без project.

## 11. Anti-silo patterns

- **Rotation** — engineer meняet squad once a year (optionally).
- **Pair-programming** на critical changes.
- **Code-owners rotation** — avoid single-SME chokepoints.
- **Docs-as-code reviews** — не только code получает review.

## 12. Communication tools

- **Slack** — sync / urgent.
- **Notion / similar** — team wikis, meetings.
- **GitHub Discussions** — long-form, searchable.
- **Discourse / forum** — community-facing (Phase 7+).
- **Loom / Vimeo** — async video explanations.

Avoid:
- Single-channel free-for-all (no structure).
- Persistent DMs для team-related knowledge (hidden from others).
- Important decisions в Slack без summary in docs.

## 13. Meeting discipline

- Every meeting has agenda + notes.
- Notes stored in docs, searchable.
- «If it can be async, keep it async.»
- Decisions recorded, не just discussed.

## 14. Legacy / code-history

- Archive v5 docs после migration.
- Old post-mortems searchable by category.
- Removed features — note in changelog + reasoning.
- Renamed things — keep redirect / mapping.

## 15. Metrics

- `knowledge.docs.freshness` — % docs updated последние 6 месяцев.
- `knowledge.onboarding.time-to-first-contribution` — дни.
- `knowledge.search.queries` — is the docs system used?
- `knowledge.orphan-docs` — docs без owner / outdated.
- `knowledge.adr-count-per-year`.

## 16. Антипаттерны

- ❌ «Knowledge in head» — crucial context only in one person.
- ❌ Docs separate from code — divergent.
- ❌ Onboarding verbal only — every person re-discovers.
- ❌ Slack как primary knowledge base — ephemeral, unsearchable.
- ❌ Architecture not written down — endless re-litigation.
- ❌ Meetings без notes — decisions forgotten.
- ❌ «Everyone knows» — silent assumption, new hires don't.
- ❌ Stale docs — wrong info is worse than none.
