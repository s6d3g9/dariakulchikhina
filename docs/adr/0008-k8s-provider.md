# ADR-0008: Managed k8s provider (Hetzner vs Yandex Cloud vs другой)

- **Статус**: Accepted (provisional)
- **Дата**: 2026-04-18
- **Решение**: Hetzner Cloud MK8s primary, Yandex Cloud MK8s secondary для RU-compliance workloads
- **Ответственный**: SRE / Platform / Compliance team

## Контекст

Phase 6 — переход с PM2/Swarm на managed k8s. Нужен провайдер.

## Альтернативы

### Hetzner Cloud (Hetzner Cloud k8s)

Плюсы:
- **Cheap** (~€30/mo control-plane, дешёвые workers).
- EU-based (Germany), GDPR-friendly.
- Good performance / price ratio.
- Simple, well-documented.

Минусы:
- No RF data-residency.
- Limited regions vs AWS/GCP.
- Smaller ecosystem.

### Yandex Cloud (Managed K8s)

Плюсы:
- **RU compliance** — обязательно для banking в РФ.
- Data stays в РФ.
- Integration с СБП / НСПК / Sumsub RU.
- Russian support.

Минусы:
- Geopolitical risk (возможны ограничения).
- Smaller global presence.
- Ecosystem менее developed.

### AWS EKS

Плюсы:
- Largest ecosystem.
- Proven at scale.
- Many regions.

Минусы:
- Expensive (3-5× Hetzner для comparable compute).
- US-based company → regulatory concerns в некоторых регионах.
- Vendor lock-in опасение.

### GCP GKE

Плюсы:
- Best k8s expertise (Google).
- Strong network / data-tier.

Минусы:
- Similar pricing to AWS.
- US-based.

### Self-hosted (k3s / kubeadm)

Плюсы:
- Max control, min cost per-node.
- No vendor dependency.

Минусы:
- Ops-heavy — control-plane HA, etcd, upgrades, networking.
- Too early для команды пока.

## Решение

**Multi-provider strategy:**

- **Primary** (Phase 6+): **Hetzner Cloud** для non-RF workloads.
  - EU users, creator economy, travel, general platform.
- **Secondary** (Phase 8 banking): **Yandex Cloud** для RU-compliance.
  - Banking-cluster изолированный.
  - Integration с СБП / НСПК.
  - Data-residency RU.
- **Cross-cloud DR** (Phase 9+): backup-region на другом provider.

**Abstraction**: Terraform + Helm charts cloud-agnostic. Switch provider — конфиг change, не code rewrite.

## Последствия

### Положительные
- Cost-efficient primary (Hetzner).
- Compliance coverage (Yandex для RF).
- No vendor lock-in.

### Отрицательные
- Two providers = double ops.
- Cross-region сomplexity.
- Potential skill split в команде.

## Revisit

Phase 8 banking launch — confirm Yandex choice based on actual regulatory requirements.
Phase 9+ — evaluate AWS / GCP для global expansion.
