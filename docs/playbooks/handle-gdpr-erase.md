# Playbook: handle-gdpr-erase

Пользователь запрашивает GDPR erase. Полный flow.

## Prereq

- [ ] Request пришёл через legitimate channel (legally valid).
- [ ] User identity verified (не impostor).
- [ ] Legal review complete (можем ли удалить — иногда нет из-за regulatory retention).

## Шаги

### 1. Validate request

- [ ] Email from registered address?
- [ ] If via form → identity-verification step.
- [ ] Compliance review (financial / medical retention trumps erase).

### 2. Notify user

- Acknowledgment email с timeline (30 days max per GDPR).
- Explanation что будет удалено vs сохранено.

### 3. Freeze account

```
identity.freezeAccount(userId) → 
  Sessions revoked.
  New logins blocked.
  Service-access stops.
```

### 4. Trigger cascade

```
Publish app.daria.identity.user-erased.v1 { userId }
  ▼
Consumers (каждый сервис) применяют свою стратегию:
  ├── authorship-registry: анонимизирует author_id, keeps authorship-proofs (WORM)
  ├── wallet: financial records retained 7y (RU) / 5y (EU), но user-link anonymized
  ├── media-pipeline: crypto-erase DEK → user photos/videos unreadable
  ├── feed: posts cascade-deleted
  ├── messenger: messages user-sent — cascade-deleted, incoming сохраняются для other participants
  ├── bookings: past completed — anonymized; future — cancelled + refunded
  ├── subscriptions: cancelled + refunded (if within cooling-off)
  ├── search: indexed results removed
  ├── recommendations: embeddings deleted, features pseudonymized
  ├── audit-log: WORM, не удаляется; user_id → hashed anonymous
  └── trust-safety: device fingerprints erased after 90d retention
```

### 5. Verify cascade

Job checks каждый service has processed:
- API check: get-user → 404 или anonymized.
- ClickHouse check: no identifiable rows.
- S3 check: private objects purged.
- Dangling references scanned.

### 6. Confirmation to user

Email: «Your data has been erased. Financial records retained per law [link] для X years anonymously.»

### 7. Audit-log

`app.daria.governance.user-erased.v1` — permanent record of the erase action (с anonymous user_id).

## Edge cases

### Banking / active loans

Can't erase user with active financial obligations. Response: «Erase request declined due to active [loan/contract]. Retry after [date].»

### Medical data

Retention часто mandatory 10+ years. User informed; anonymization apply но data persists.

### Creator with active royalty

Pending payouts completed → wallet anonymized → future royalty → platform.orphan-royalty.

### Active subscriptions (gifts / family)

Gift-recipient unaffected (gift remains active). Family members handled individually.

## Compliance

- Timeline ≤ 30 days (GDPR Art 17).
- Proof of completion exported для regulator requests.
- If ≥ 30d delay → notify user, document reason.

## Common mistakes

- ❌ Hard-delete audit-log (violates I17).
- ❌ Skip compliance pre-check (violates financial retention).
- ❌ Delete instead of anonymize — loss of integrity.
- ❌ Public-facing info (displayed name in public posts) not removed.
- ❌ Missing data verification — «ghosts» remain.
