# ADR-0006: mTLS internal mesh timing

- **Статус**: Accepted
- **Дата**: 2026-04-18
- **Решение**: mTLS только с Фазы 6 (managed k8s)
- **Ответственный**: Security + SRE

## Контекст

mTLS между internal services даёт defense-in-depth: даже при network-breach, attacker не может просто делать service-to-service calls.

## Альтернативы

### mTLS сразу (Phase 2)

Плюсы: максимальная security from Day 1.

Минусы: cert-management ops overhead, development friction, slower debugging, инфраструктура не готова (docker-compose manual cert rotation).

### mTLS позже (Phase 6)

Плюсы: когда managed k8s + Argo CD + proper cert-manager → автоматика.

Минусы: интернально «trust zone» вместо explicit auth до тех пор.

### Никогда

Плюсы: simplicity forever.

Минусы: compromise internal network = compromise всех services.

## Решение

- **Phase 0–5**: network-level isolation (private subnet, Gateway auth, service-to-service JWT).
- **Phase 6** (managed k8s): rollout mTLS через Istio / Linkerd / native cert-manager.
- **Phase 8** (banking cluster): mTLS strictly enforced from day 1 в isolated cluster.

## Revisit

Phase 5 — feasibility check на mTLS-introduction для Phase 6.
