# Phase 1 / Week 3 / Monday: Wallet implementation deep-dive

Цель: wallet service fully functional в prod-ready state. Migrations applied, HTTP endpoints working, transfer saga participates в timeline-engine.

## Prereq

- `services/wallet/README.md` exists (скелет).
- Schema от `docs/implementation/schemas/wallet-db.md` ready.
- Code sample `docs/implementation/code-samples/wallet-service-go.md` ready.

## Шаг 1: Scaffold сервис

```bash
pnpm create service wallet --layer 2 --runtime go
```

Output:
```
services/wallet/
├── Dockerfile
├── go.mod
├── main.go
├── cmd/wallet/
├── internal/
│   ├── config/
│   ├── db/
│   │   └── migrations/
│   ├── handlers/
│   ├── service/
│   └── tracing/
└── .env.example
```

## Шаг 2: Copy реальный код

Из `docs/implementation/code-samples/wallet-service-go.md`:
- `main.go`
- `internal/config/config.go`
- `internal/service/transfer.go` (CORE ExecuteTransfer)
- `internal/handlers/*.go`

## Шаг 3: Migrations — initial schema

`services/wallet/internal/db/migrations/001_initial.sql`:

```sql
-- Copy from docs/implementation/schemas/wallet-db.md §Migration SQL
-- accounts, transfers, holds, journal с constraints
```

Apply:
```bash
DATABASE_URL=postgres://daria:daria@localhost:5432/wallet_db \
  go run ./cmd/wallet migrate up
```

## Шаг 4: Env vars

`.env.development`:
```bash
PORT=8080
SERVICE_NAME=wallet
DATABASE_URL=postgres://daria:daria@localhost:5432/wallet_db?sslmode=disable
NATS_URL=nats://localhost:4222
JWKS_URL=http://identity:8080/.well-known/jwks.json
OTLP_ENDPOINT=otel-collector:4317
LOG_LEVEL=info
```

## Шаг 5: Smoke test — create account, transfer

```bash
# Start service
cd services/wallet
go run . &

WALLET=http://localhost:8080

# Create test user Alice account
ALICE_ACC=$(curl -s -X POST $WALLET/accounts \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -d '{
    "accountType": "user.primary",
    "ownerType": "user",
    "ownerId": "alice",
    "currency": "USD"
  }' | jq -r .id)

# Create Bob
BOB_ACC=$(curl -s -X POST $WALLET/accounts \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -d '{
    "accountType": "user.primary",
    "ownerType": "user",
    "ownerId": "bob",
    "currency": "USD"
  }' | jq -r .id)

# Admin seeds Alice с funds (internal transfer from treasury)
curl -X POST $WALLET/transfers \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -d '{
    "fromAccountId": "'"$TREASURY_ACC"'",
    "toAccountId": "'"$ALICE_ACC"'",
    "amountCents": "10000",
    "currency": "USD",
    "kind": "internal"
  }'

# Alice → Bob
TRANSFER=$(curl -s -X POST $WALLET/transfers \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "fromAccountId": "'"$ALICE_ACC"'",
    "toAccountId": "'"$BOB_ACC"'",
    "amountCents": "500",
    "currency": "USD",
    "kind": "internal"
  }')
echo $TRANSFER | jq

# Verify balances
curl $WALLET/accounts/$ALICE_ACC | jq .balanceCents
# → "9500"
curl $WALLET/accounts/$BOB_ACC | jq .balanceCents
# → "500"
```

## Шаг 6: NATS events verify

```bash
# Subscribe to wallet events
nats sub 'app.daria.wallet.>' --server=nats://localhost:4222

# Make another transfer — see event fire
```

Expected event:
```json
{
  "specversion": "1.0",
  "type": "app.daria.wallet.transfer-completed.v1",
  "source": "/services/wallet",
  "id": "018fabd0-...",
  "time": "2026-04-19T12:00:00Z",
  "data": {
    "transferId": "...",
    "fromAccountId": "...",
    "toAccountId": "...",
    "amountCents": "500",
    "currency": "USD",
    "kind": "internal"
  }
}
```

## Шаг 7: Concurrent-transfer test

Critical: transfers must be atomic. Load-test с concurrent writes на same account:

```bash
cat > /tmp/transfer-load.sh <<'EOF'
#!/bin/bash
FROM=$1
TO=$2
for i in {1..100}; do
  curl -s -X POST $WALLET/transfers \
    -H "Idempotency-Key: $(uuidgen)" \
    -d "{\"fromAccountId\":\"$FROM\",\"toAccountId\":\"$TO\",\"amountCents\":\"10\",\"currency\":\"USD\",\"kind\":\"internal\"}" \
    > /dev/null &
done
wait
EOF
chmod +x /tmp/transfer-load.sh

# Alice has $100, run concurrent $10 transfers to Bob
/tmp/transfer-load.sh $ALICE_ACC $BOB_ACC

# After all complete
FINAL=$(curl -s $WALLET/accounts/$ALICE_ACC | jq -r .balanceCents)
echo "Alice final: $FINAL"
# Expected: exactly 9000 cents (100 transfers × 10 = 1000 deducted)
```

Если incorrectly serialized — получим balance > 9000 (lost transfers) или negative balance.

Thanks to `FOR UPDATE` lock в `ExecuteTransfer` — должно всегда 9000.

## Шаг 8: Reconciliation job

Daily cron via Temporal:

`services/wallet/internal/jobs/reconciliation.go`:

```go
package jobs

import (
    "context"
    "fmt"
    "time"

    "go.temporal.io/sdk/workflow"
    "github.com/jackc/pgx/v5/pgxpool"
)

// Workflow: runs daily 02:00 UTC
func ReconciliationWorkflow(ctx workflow.Context) error {
    ao := workflow.ActivityOptions{
        StartToCloseTimeout: 10 * time.Minute,
    }
    ctx = workflow.WithActivityOptions(ctx, ao)

    var mismatches []AccountMismatch
    err := workflow.ExecuteActivity(ctx, ReconcileBalances, time.Now()).Get(ctx, &mismatches)
    if err != nil {
        return err
    }

    if len(mismatches) > 0 {
        // Emit SEV-1 event
        for _, m := range mismatches {
            workflow.ExecuteActivity(ctx, PublishMismatchEvent, m).Get(ctx, nil)
        }
        return fmt.Errorf("reconciliation found %d mismatches", len(mismatches))
    }

    return nil
}

type AccountMismatch struct {
    AccountID      string
    ExpectedBalance int64
    ActualBalance  int64
    DiffCents      int64
}

func ReconcileBalances(ctx context.Context, asOf time.Time) ([]AccountMismatch, error) {
    pool := getPool(ctx)  // from context
    
    rows, err := pool.Query(ctx, `
        WITH journal_sum AS (
          SELECT
            a.id AS account_id,
            a.balance_cents,
            COALESCE(SUM(
              CASE 
                WHEN t.to_account_id = a.id THEN t.amount_cents::bigint
                WHEN t.from_account_id = a.id THEN -t.amount_cents::bigint
                ELSE 0
              END
            ), 0) AS computed_balance
          FROM accounts a
          LEFT JOIN transfers t ON (t.from_account_id = a.id OR t.to_account_id = a.id)
            AND t.committed_at <= $1
          WHERE a.deleted_at IS NULL
          GROUP BY a.id, a.balance_cents
        )
        SELECT account_id, balance_cents, computed_balance
        FROM journal_sum
        WHERE balance_cents != computed_balance
    `, asOf)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var mismatches []AccountMismatch
    for rows.Next() {
        var m AccountMismatch
        var expected, actual int64
        if err := rows.Scan(&m.AccountID, &actual, &expected); err != nil {
            return nil, err
        }
        m.ExpectedBalance = expected
        m.ActualBalance = actual
        m.DiffCents = actual - expected
        mismatches = append(mismatches, m)
    }

    return mismatches, rows.Err()
}
```

Register workflow при startup + schedule:

```go
// В main.go
w := worker.New(temporalClient, "wallet-jobs", worker.Options{})
w.RegisterWorkflow(jobs.ReconciliationWorkflow)
w.RegisterActivity(jobs.ReconcileBalances)
w.RegisterActivity(jobs.PublishMismatchEvent)

// Schedule daily
_, err := temporalClient.ScheduleClient().Create(ctx, client.ScheduleOptions{
    ID: "wallet-reconciliation-daily",
    Spec: client.ScheduleSpec{
        CronExpressions: []string{"0 2 * * *"},  // 02:00 UTC
    },
    Action: &client.ScheduleWorkflowAction{
        ID:        "wallet-reconciliation",
        Workflow:  jobs.ReconciliationWorkflow,
        TaskQueue: "wallet-jobs",
    },
})

go w.Run(worker.InterruptCh())
```

## Шаг 9: Hold expiration cleanup

```go
// services/wallet/internal/jobs/expire-holds.go
func ExpireHoldsWorkflow(ctx workflow.Context) error {
    // Every minute
    for {
        _, err := workflow.ExecuteActivity(ctx, ExpireHolds).Get(ctx, nil)
        if err != nil {
            workflow.GetLogger(ctx).Error("ExpireHolds failed", "error", err)
        }
        workflow.Sleep(ctx, 1*time.Minute)
    }
}

func ExpireHolds(ctx context.Context) error {
    pool := getPool(ctx)
    
    // Find expired holds
    rows, err := pool.Query(ctx, `
        SELECT id, account_id, amount_cents 
        FROM holds 
        WHERE status = 'active' AND expires_at < NOW()
        FOR UPDATE SKIP LOCKED
        LIMIT 1000
    `)
    // ...
    
    for _, hold := range expiredHolds {
        // Release back to balance
        _, err = tx.Exec(ctx, `
            UPDATE accounts SET hold_cents = hold_cents - $1, version = version + 1
            WHERE id = $2
        `, hold.AmountCents, hold.AccountID)
        
        _, err = tx.Exec(ctx, `
            UPDATE holds SET status = 'expired', resolved_at = NOW()
            WHERE id = $1
        `, hold.ID)
        
        // Publish event
        // ...
    }
    
    return nil
}
```

## Шаг 10: Deploy + health check

```bash
# Build
cd services/wallet
docker build -t daria/wallet:dev .

# Run
docker run --rm \
  --network daria_daria \
  -p 8080:8080 \
  --env-file .env.development \
  daria/wallet:dev

# Health
curl http://localhost:8080/health/live
# → {"status":"ok"}

curl http://localhost:8080/health/ready
# → {"status":"ready"} (после DB + NATS ok)
```

## Checklist

- [ ] `services/wallet` scaffolded
- [ ] Migrations applied successfully
- [ ] POST /accounts creates account
- [ ] POST /transfers атомарно перевозит money
- [ ] Concurrent transfers не создают race (verified by load test)
- [ ] Idempotency-Key deduplicates duplicates
- [ ] FOR UPDATE locks prevent lost updates
- [ ] NATS events published correctly
- [ ] Reconciliation workflow runs daily
- [ ] Hold expiration cleanup работает
- [ ] Traces visible в SigNoz
- [ ] Load test passes baseline

## Next

Tuesday: Payments PSP adapters → `10-payments-psp-adapters.md`.
