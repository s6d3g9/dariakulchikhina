# 35. Disaster Recovery & Backup

Что делаем, если отказывает всё. Фиксирует: RPO/RTO per-сервис, backup-политики, восстановительные playbook'и, DR-тесты.

Принцип: **DR не «если», а «когда»**. Тестируется раз в полгода на проде (staging копия).

## 1. RPO / RTO targets per-layer

| Слой / Сервис | RPO | RTO | Обоснование |
|---|---|---|---|
| **Audit-log (WORM)** | 0 | 4h | Регуляторный must-have |
| **Wallet / TigerBeetle** | 0 | 1h | Деньги, strong SLA |
| **Identity (Zitadel)** | 5 min | 30 min | Без identity ничего не работает |
| **Payments** | 5 min | 1h | Финансы |
| **Authorship / Ownership registries** | 15 min | 4h | Royalty-распределения |
| **Pattern-engine / Timeline-engine** | 30 min | 4h | Active workflows |
| **Booking** | 30 min | 4h | Бронирования |
| **Messenger** | 15 min | 2h | Users чувствуют отсутствие сильно |
| **Feed** | 1h | 8h | Можно deg-restore |
| **Recommendations** | 24h | — | Пересчитывается, не критично |
| **Search indexes** | 24h | — | Реиндексируется из источников |
| **Media-pipeline (S3)** | 0 | 8h | Redundancy native |
| **ClickHouse (analytics)** | 1h | 24h | Recomputable из events |
| **SigNoz (observability)** | 4h | 24h | Можно жить на local temporarily |

**RPO** = Recovery Point Objective (сколько данных можем потерять).
**RTO** = Recovery Time Objective (сколько времени восстанавливаемся).

## 2. Backup strategy per-storage

### Postgres per-service

- **Continuous archiving** через WAL streaming в separate storage.
- **Point-in-time recovery (PITR)** возможен до последних 14 дней.
- **Daily snapshots** хранятся 30 дней.
- **Weekly** — 12 недель.
- **Monthly** — 12 месяцев.
- **Cross-region replica** — для Фазы 6+ (managed k8s).

### TigerBeetle (Wallet — Фаза 6+)

- Native replication (Raft-based, 3-replica cluster minimum).
- Continuous backup через LSM snapshot каждые 5 мин.
- Audit-reconciliation job ежедневно (сверка с Postgres-journal).

### ClickHouse (Audit + Analytics)

- Replication между 2+ replicas.
- Cold-tier в S3 с object-lock (WORM).
- Backup через `clickhouse-backup` daily.
- Cross-region copy для audit WORM обязательна (compliance).

### ScyllaDB (Social — Фаза 7)

- Repair + backup встроенный.
- Snapshots daily → S3.
- 3-region replication.

### Redis

- **Не backup'им как source of truth** (это cache).
- Sessions / presence — восстанавливаются по событиям / re-auth.
- Если критичные данные в Redis — это архитектурный bug (I6).

### S3-compat (media)

- Cross-region replication включена.
- Versioning enabled — 90 дней history.
- Object-lock для private/regulated (medical, banking docs).

### NATS JetStream (events)

- 3-node replication.
- File-based storage, snapshots каждые N сек.
- Durable streams не теряются at node failure.
- Cross-region replication для `financial-audit` stream (compliance).

## 3. Backup validation

**Правило**: backup без проверенного restore — не backup.

- **Monthly restore-test** на staging: pick random service → restore latest backup → run smoke-tests.
- **Quarterly full-DR-drill**: полный regional outage simulation → failover → timing.
- **Audit**: результаты + времена — в `docs/incidents/dr-drill-<date>.md`.

## 4. DR сценарии

### DR-1: Single Postgres corruption

Impact: один сервис деградирован.

Playbook:
1. Alert → on-call.
2. Identify affected service.
3. Stop writes (feature-flag read-only mode).
4. Restore from latest PITR backup.
5. Validate integrity (count rows, sum wallets).
6. Re-enable writes.
7. Reconcile events from JetStream since last known good timestamp.

RTO: 1–4h depending on size.

### DR-2: Availability zone outage

Impact: ~1/3 сервисов down.

Playbook:
1. PagerDuty auto-escalation.
2. Traefik автоматически переводит на другой AZ (health-checks).
3. Postgres managed: automatic failover на replica.
4. TigerBeetle: Raft-election (60s).
5. Status-page update.

RTO: 5–30 min (automatic) + manual verification.

### DR-3: Full region outage

Impact: всё down в одной регионе.

Playbook:
1. Incident commander назначается.
2. DNS переключается на DR-region (manual decision, ±15 min).
3. PostgreSQL cross-region replica promoted to primary.
4. TigerBeetle secondary cluster activated.
5. Event-consumers восстанавливают projection catch-up (eventual consistency).
6. Status-page updates continuously.
7. Customer communication (email + social).

RTO: 2–4h. Часть low-priority servicer запустятся позже (recommendations, analytics).

### DR-4: Ransomware / data-corrupt active attack

Impact: potential data loss.

Playbook:
1. Isolation: отключить затронутый cluster от сети.
2. Snapshot current state for forensics.
3. Notify security / legal / external forensics consultant.
4. Restore from backup (prior to infection time).
5. Replay events from JetStream since known-good timestamp (если JetStream untouched).
6. Re-apply data-migrations if needed.
7. Secure review перед go-back-online.

RTO: 8–24h depending on infection scope.

### DR-5: Accidental data deletion (human error)

Impact: variable.

Playbook:
1. Stop writes немедленно.
2. Point-in-time recovery до T-deletion.
3. Replay events from that time.
4. Compare: identify unrecoverable data.
5. Communicate users if data affected.
6. Post-mortem (mandatory, human-error category).

RTO: 1–4h.

### DR-6: Key compromise

Specific to security; see `19-security-model.md` §15.

- Immediate key rotation (JWT, DB creds, KMS).
- Mass session revoke.
- User re-auth required.
- Access audit extended.

### DR-7: Malformed event poisoning

Impact: consumer crashes.

Playbook:
1. Identify poisoned event ID.
2. Move to DLQ (вручную).
3. Fix consumer logic or event schema.
4. Replay skipping poisoned event.

RTO: 1h (для consumer only; upstream unaffected).

## 5. Runbook ownership

| DR сценарий | Primary | Secondary |
|---|---|---|
| DR-1 (DB corruption) | DB-ops / platform | SRE |
| DR-2 (AZ outage) | SRE | platform |
| DR-3 (region outage) | incident commander | все |
| DR-4 (ransomware) | security | SRE + legal |
| DR-5 (human error) | SRE | platform |
| DR-6 (key compromise) | security | identity team |
| DR-7 (poisoned event) | platform (event bus) | domain-team |

## 6. Communication during incident

- **Status page**: auto-updates на базе SLO-burn, manual override для чётких статусов.
- **Customer email**: для affected users, ≥ 1h downtime.
- **In-app banner**: предупреждение о degraded operation.
- **Slack channel #incidents**: live stream для команды.
- **Twitter/socials**: для widespread outages.

SLA-коммуникация:
- T+5min от detection: Slack alert.
- T+15min: status-page.
- T+1h (если не resolve): customer-email.
- T+4h: executive escalation.

## 7. Post-incident

- Blameless post-mortem обязательно для SEV-1/SEV-2.
- Format: `docs/incidents/YYYY-MM-DD-<slug>.md`.
- Sections: Timeline / Impact / Root cause / What went well / What didn't / Action items / Prevention.
- Action items — в tracker, дедлайн 2 недели.
- Quarterly review: pattern analysis (same kind повторяется → systemic issue).

## 8. Banking / crypto — отдельный DR

Для isolated cluster'ов (Фаза 8+):

- **Отдельный DR-plan** и отдельные playbook'и.
- **Separate runbook repository** (restricted access).
- **More frequent drills**: quarterly vs semi-annual.
- **Regulator notification SLA**: per-jurisdiction (24–72h typical).
- **Insurance**: coverage verified annually.

## 9. DR maturity roadmap

| Фаза | DR level |
|---|---|
| 0–1 | Manual backup, no formal DR |
| 2 | Automated daily backup, manual restore tested |
| 3 | Multi-AZ, monthly restore-test |
| 4 | Cross-region replication для critical (audit, wallet) |
| 5 | RTO < 4h для SEV-1 services |
| 6 | Full DR-drill completed; automated failover for most |
| 7 | Chaos-Mesh in prod (controlled) |
| 8 | Bank-level DR: isolated plan, separate drills |
| 9 | Crypto-level DR: key-ceremony procedures, cold-storage playbook |

## 10. Metrics

- `dr.backup.success_rate{service}`
- `dr.backup.age_hours{service}` (должен быть < RPO target)
- `dr.restore-test.last_run{service}` (должен быть < 30 days ago)
- `dr.drill.last_completed{scope}`
- `incidents.count{severity}` monthly

Alert: если `dr.backup.age_hours > RPO target` — SEV-2.

## 11. Антипаттерны

- ❌ Backup без restore-test.
- ❌ Backup в тот же regionm что и prod.
- ❌ Без versioning на S3 — accidental delete невосстановим.
- ❌ Failover только manual (для common failures).
- ❌ DR plan в head одного SRE.
- ❌ Post-mortems blame-focused.
- ❌ Action items post-incident не в tracker.
- ❌ DR drills на production (кроме chaos-controlled).
- ❌ Same credentials prod и DR-region (compromise один раз = compromise обоих).
