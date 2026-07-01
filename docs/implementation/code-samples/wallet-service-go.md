# Wallet Service — Go implementation (concrete)

Реальный код для `services/wallet` на Go. Phase 1 baseline (Postgres-backed), Phase 6+ migration → TigerBeetle.

## Structure

```
services/wallet/
├── Dockerfile
├── go.mod
├── go.sum
├── main.go                  — entry point
├── cmd/
│   └── wallet/
│       └── main.go          — alternate entry
├── internal/
│   ├── config/
│   │   └── config.go        — env loading
│   ├── db/
│   │   ├── schema.go        — sqlc-generated
│   │   ├── migrations/      — SQL files
│   │   └── queries.sql      — sqlc source
│   ├── handlers/
│   │   ├── accounts.go
│   │   ├── transfers.go
│   │   └── holds.go
│   ├── service/
│   │   ├── wallet.go        — core business logic
│   │   ├── transfer.go
│   │   └── reconciliation.go
│   ├── events/
│   │   ├── publisher.go     — NATS JetStream
│   │   └── schemas.go
│   ├── tracing/
│   │   └── otel.go          — OpenTelemetry setup
│   └── middleware/
│       ├── auth.go          — JWT verification
│       ├── logging.go
│       └── idempotency.go
└── api/
    └── wallet.openapi.yaml  — link к canonical
```

## go.mod

```go
module github.com/daria/services/wallet

go 1.22

require (
    github.com/go-chi/chi/v5 v5.0.12
    github.com/jackc/pgx/v5 v5.5.5
    github.com/nats-io/nats.go v1.34.0
    github.com/rs/zerolog v1.32.0
    go.opentelemetry.io/otel v1.24.0
    go.opentelemetry.io/otel/sdk v1.24.0
    go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc v1.24.0
    go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc v1.24.0
    go.opentelemetry.io/contrib/instrumentation/github.com/go-chi/chi/otelchi v0.49.0
    github.com/golang-jwt/jwt/v5 v5.2.1
    github.com/google/uuid v1.6.0
    github.com/caarlos0/env/v10 v10.0.0
)
```

## main.go

```go
package main

import (
	"context"
	"errors"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/daria/services/wallet/internal/config"
	"github.com/daria/services/wallet/internal/db"
	"github.com/daria/services/wallet/internal/events"
	"github.com/daria/services/wallet/internal/handlers"
	"github.com/daria/services/wallet/internal/middleware"
	"github.com/daria/services/wallet/internal/service"
	"github.com/daria/services/wallet/internal/tracing"
	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

func main() {
	// Logger setup
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	log.Logger = log.Output(os.Stdout).With().Timestamp().Logger()

	// Config
	cfg, err := config.Load()
	if err != nil {
		log.Fatal().Err(err).Msg("failed to load config")
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Tracing
	tp, err := tracing.Init(ctx, cfg.ServiceName, cfg.OTLPEndpoint)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to init tracing")
	}
	defer func() {
		shutdownCtx, c := context.WithTimeout(context.Background(), 5*time.Second)
		defer c()
		if err := tp.Shutdown(shutdownCtx); err != nil {
			log.Error().Err(err).Msg("failed to shutdown tracer")
		}
	}()

	// DB
	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to connect to db")
	}
	defer pool.Close()

	if err := db.RunMigrations(ctx, pool); err != nil {
		log.Fatal().Err(err).Msg("failed to run migrations")
	}

	// Event publisher
	publisher, err := events.NewPublisher(cfg.NATSUrl)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to connect to NATS")
	}
	defer publisher.Close()

	// Service
	walletService := service.NewWallet(pool, publisher)

	// Background jobs
	go service.RunExpirationJob(ctx, walletService)
	go service.RunReconciliationJob(ctx, walletService)

	// Router
	r := chi.NewRouter()
	r.Use(middleware.Logging)
	r.Use(middleware.Tracing(tp))
	r.Use(middleware.Auth(cfg.JWKSUrl))

	// Register handlers
	handlers.RegisterAccounts(r, walletService)
	handlers.RegisterTransfers(r, walletService)
	handlers.RegisterHolds(r, walletService)

	// Health
	r.Get("/health/live", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	r.Get("/health/ready", func(w http.ResponseWriter, r *http.Request) {
		if err := pool.Ping(r.Context()); err != nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusOK)
	})

	// HTTP server
	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
		WriteTimeout:      30 * time.Second,
	}

	// Graceful shutdown
	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		<-sigCh
		log.Info().Msg("shutting down")
		
		shutdownCtx, c := context.WithTimeout(context.Background(), 30*time.Second)
		defer c()
		if err := srv.Shutdown(shutdownCtx); err != nil {
			log.Error().Err(err).Msg("failed to shutdown server")
		}
		cancel()
	}()

	log.Info().Str("port", cfg.Port).Msg("wallet service starting")
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal().Err(err).Msg("server failed")
	}
	log.Info().Msg("shutdown complete")
}
```

## internal/config/config.go

```go
package config

import (
	"github.com/caarlos0/env/v10"
)

type Config struct {
	ServiceName   string `env:"SERVICE_NAME" envDefault:"wallet"`
	Port          string `env:"PORT" envDefault:"8080"`
	DatabaseURL   string `env:"DATABASE_URL,required"`
	NATSUrl       string `env:"NATS_URL,required"`
	JWKSUrl       string `env:"JWKS_URL,required"`
	OTLPEndpoint  string `env:"OTLP_ENDPOINT" envDefault:"otel-collector:4317"`
	LogLevel      string `env:"LOG_LEVEL" envDefault:"info"`
}

func Load() (*Config, error) {
	cfg := &Config{}
	if err := env.Parse(cfg); err != nil {
		return nil, err
	}
	return cfg, nil
}
```

## internal/service/transfer.go

```go
package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/daria/services/wallet/internal/db"
	"github.com/daria/services/wallet/internal/events"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
)

var tracer = otel.Tracer("wallet")

type TransferParams struct {
	FromAccountID   uuid.UUID
	ToAccountID     uuid.UUID
	AmountCents     int64
	Currency        string
	IdempotencyKey  string
	Kind            string
	ReferenceType   *string
	ReferenceID     *string
	Description     *string
	Metadata        map[string]any
	TraceID         string
}

type TransferResult struct {
	TransferID    uuid.UUID
	FromBalance   int64
	ToBalance     int64
	Committed     bool
}

var (
	ErrAccountNotFound    = errors.New("ACCOUNT_NOT_FOUND")
	ErrInsufficientFunds  = errors.New("INSUFFICIENT_FUNDS")
	ErrCurrencyMismatch   = errors.New("CURRENCY_MISMATCH")
	ErrSelfTransfer       = errors.New("SELF_TRANSFER")
	ErrIdempotencyMatch   = errors.New("IDEMPOTENCY_MATCH_DIFFERENT_BODY")
)

func (s *Wallet) ExecuteTransfer(ctx context.Context, params TransferParams) (*TransferResult, error) {
	ctx, span := tracer.Start(ctx, "wallet.transfer.execute",
		trace.WithAttributes(
			attribute.String("idempotency_key", params.IdempotencyKey),
			attribute.String("currency", params.Currency),
			attribute.Int64("amount_cents", params.AmountCents),
		),
	)
	defer span.End()

	if params.AmountCents <= 0 {
		return nil, fmt.Errorf("amount must be positive")
	}
	if params.FromAccountID == params.ToAccountID {
		return nil, ErrSelfTransfer
	}

	var result *TransferResult
	err := pgx.BeginTxFunc(ctx, s.pool, pgx.TxOptions{IsoLevel: pgx.Serializable}, 
		func(tx pgx.Tx) error {
			// 1. Idempotency check
			var existingID uuid.UUID
			err := tx.QueryRow(ctx,
				`SELECT id FROM transfers WHERE idempotency_key = $1`,
				params.IdempotencyKey,
			).Scan(&existingID)
			if err == nil {
				// Already exists, return cached
				result, err = s.getTransferSnapshot(ctx, tx, existingID)
				return err
			}
			if !errors.Is(err, pgx.ErrNoRows) {
				return fmt.Errorf("idempotency check: %w", err)
			}

			// 2. Lock accounts FOR UPDATE
			var fromAcc, toAcc db.Account
			err = tx.QueryRow(ctx,
				`SELECT id, currency, balance_cents, hold_cents, version
				 FROM accounts WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
				params.FromAccountID,
			).Scan(&fromAcc.ID, &fromAcc.Currency, &fromAcc.BalanceCents, 
				&fromAcc.HoldCents, &fromAcc.Version)
			if errors.Is(err, pgx.ErrNoRows) {
				return ErrAccountNotFound
			}
			if err != nil {
				return fmt.Errorf("lock from: %w", err)
			}

			err = tx.QueryRow(ctx,
				`SELECT id, currency, balance_cents, hold_cents, version
				 FROM accounts WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
				params.ToAccountID,
			).Scan(&toAcc.ID, &toAcc.Currency, &toAcc.BalanceCents, 
				&toAcc.HoldCents, &toAcc.Version)
			if errors.Is(err, pgx.ErrNoRows) {
				return ErrAccountNotFound
			}
			if err != nil {
				return fmt.Errorf("lock to: %w", err)
			}

			// 3. Validate
			if fromAcc.Currency != params.Currency || toAcc.Currency != params.Currency {
				return ErrCurrencyMismatch
			}
			available := fromAcc.BalanceCents - fromAcc.HoldCents
			if available < params.AmountCents {
				return ErrInsufficientFunds
			}

			// 4. Create transfer record
			transferID := uuid.Must(uuid.NewV7())
			now := time.Now()
			
			_, err = tx.Exec(ctx,
				`INSERT INTO transfers (
					id, from_account_id, to_account_id, amount_cents, currency,
					idempotency_key, kind, reference_type, reference_id,
					description, metadata, status, trace_id, committed_at
				) VALUES (
					$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, 'committed', $12, $13
				)`,
				transferID, params.FromAccountID, params.ToAccountID, params.AmountCents, 
				params.Currency, params.IdempotencyKey, params.Kind, 
				params.ReferenceType, params.ReferenceID,
				params.Description, toJSON(params.Metadata), params.TraceID, now,
			)
			if err != nil {
				return fmt.Errorf("insert transfer: %w", err)
			}

			// 5. Update balances
			newFromBalance := fromAcc.BalanceCents - params.AmountCents
			newToBalance := toAcc.BalanceCents + params.AmountCents

			_, err = tx.Exec(ctx,
				`UPDATE accounts SET balance_cents = $1, version = version + 1, updated_at = $2
				 WHERE id = $3 AND version = $4`,
				newFromBalance, now, params.FromAccountID, fromAcc.Version,
			)
			if err != nil {
				return fmt.Errorf("update from balance: %w", err)
			}

			_, err = tx.Exec(ctx,
				`UPDATE accounts SET balance_cents = $1, version = version + 1, updated_at = $2
				 WHERE id = $3 AND version = $4`,
				newToBalance, now, params.ToAccountID, toAcc.Version,
			)
			if err != nil {
				return fmt.Errorf("update to balance: %w", err)
			}

			// 6. Journal entry
			journalPayload := map[string]any{
				"transfer_id":      transferID,
				"from_account_id":  params.FromAccountID,
				"to_account_id":    params.ToAccountID,
				"amount_cents":     params.AmountCents,
				"currency":         params.Currency,
				"kind":             params.Kind,
			}
			_, err = tx.Exec(ctx,
				`INSERT INTO journal (event_type, payload, trace_id, user_id) 
				 VALUES ('transfer-committed', $1::jsonb, $2, $3)`,
				toJSON(journalPayload), params.TraceID, "",
			)
			if err != nil {
				return fmt.Errorf("journal: %w", err)
			}

			result = &TransferResult{
				TransferID:  transferID,
				FromBalance: newFromBalance,
				ToBalance:   newToBalance,
				Committed:   true,
			}
			return nil
		})

	if err != nil {
		span.RecordError(err)
		return nil, err
	}

	// 7. Publish event (outside transaction)
	eventErr := s.publisher.Publish(ctx, events.TransferCompleted{
		TransferID:    result.TransferID.String(),
		FromAccountID: params.FromAccountID.String(),
		ToAccountID:   params.ToAccountID.String(),
		AmountCents:   params.AmountCents,
		Currency:      params.Currency,
		Kind:          params.Kind,
		TraceID:       params.TraceID,
	})
	if eventErr != nil {
		// Log but не fail — transaction already committed
		// Idempotent re-publish will catch up
		span.RecordError(eventErr)
	}

	return result, nil
}
```

## internal/handlers/transfers.go

```go
package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/daria/services/wallet/internal/service"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

func RegisterTransfers(r chi.Router, svc *service.Wallet) {
	r.Route("/transfers", func(r chi.Router) {
		r.Post("/", createTransfer(svc))
		r.Get("/{id}", getTransfer(svc))
		r.Post("/{id}/reverse", reverseTransfer(svc))
	})
}

type createTransferRequest struct {
	FromAccountID string  `json:"fromAccountId"`
	ToAccountID   string  `json:"toAccountId"`
	AmountCents   string  `json:"amountCents"`   // string для JSON-safe bigint
	Currency      string  `json:"currency"`
	Kind          string  `json:"kind"`
	ReferenceType *string `json:"referenceType,omitempty"`
	ReferenceID   *string `json:"referenceId,omitempty"`
	Description   *string `json:"description,omitempty"`
	Metadata      map[string]any `json:"metadata,omitempty"`
}

func createTransfer(svc *service.Wallet) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idempotencyKey := r.Header.Get("Idempotency-Key")
		if idempotencyKey == "" {
			writeError(w, http.StatusBadRequest, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key header is required")
			return
		}

		var req createTransferRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
			return
		}

		fromID, err := uuid.Parse(req.FromAccountID)
		if err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_FROM_ACCOUNT_ID", "")
			return
		}
		toID, err := uuid.Parse(req.ToAccountID)
		if err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_TO_ACCOUNT_ID", "")
			return
		}
		amount, err := strconv.ParseInt(req.AmountCents, 10, 64)
		if err != nil || amount <= 0 {
			writeError(w, http.StatusBadRequest, "INVALID_AMOUNT", "")
			return
		}

		params := service.TransferParams{
			FromAccountID:  fromID,
			ToAccountID:    toID,
			AmountCents:    amount,
			Currency:       req.Currency,
			IdempotencyKey: idempotencyKey,
			Kind:           req.Kind,
			ReferenceType:  req.ReferenceType,
			ReferenceID:    req.ReferenceID,
			Description:    req.Description,
			Metadata:       req.Metadata,
			TraceID:        r.Header.Get("traceparent"),
		}

		result, err := svc.ExecuteTransfer(r.Context(), params)
		if err != nil {
			switch {
			case errors.Is(err, service.ErrAccountNotFound):
				writeError(w, http.StatusNotFound, "ACCOUNT_NOT_FOUND", err.Error())
			case errors.Is(err, service.ErrInsufficientFunds):
				writeError(w, http.StatusConflict, "INSUFFICIENT_FUNDS", err.Error())
			case errors.Is(err, service.ErrCurrencyMismatch):
				writeError(w, http.StatusConflict, "CURRENCY_MISMATCH", err.Error())
			case errors.Is(err, service.ErrSelfTransfer):
				writeError(w, http.StatusBadRequest, "SELF_TRANSFER", err.Error())
			default:
				writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
			}
			return
		}

		writeJSON(w, http.StatusCreated, map[string]any{
			"transferId":  result.TransferID.String(),
			"fromBalance": strconv.FormatInt(result.FromBalance, 10),
			"toBalance":   strconv.FormatInt(result.ToBalance, 10),
		})
	}
}
```

## Dockerfile

```dockerfile
FROM golang:1.22-alpine AS builder

WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags='-s -w' -o wallet .

FROM alpine:3.19
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app
COPY --from=builder /build/wallet .
COPY --from=builder /build/internal/db/migrations ./internal/db/migrations

USER 10001:10001

EXPOSE 8080

ENTRYPOINT ["./wallet"]
```

## Local dev

```bash
# Install deps
cd services/wallet
go mod download

# Run migrations
DATABASE_URL=postgres://daria:daria@localhost:5432/wallet_db \
  go run ./cmd/wallet migrate

# Start server
DATABASE_URL=postgres://daria:daria@localhost:5432/wallet_db \
NATS_URL=nats://localhost:4222 \
JWKS_URL=http://localhost:8081/.well-known/jwks.json \
OTLP_ENDPOINT=localhost:4317 \
go run .

# Test endpoint
curl -H "Idempotency-Key: $(uuidgen)" \
     -H "Authorization: Bearer $JWT" \
     -X POST http://localhost:8080/transfers \
     -d '{"fromAccountId":"...","toAccountId":"...","amountCents":"1000","currency":"USD","kind":"internal"}'
```

## Tests

```go
// internal/service/transfer_test.go
func TestExecuteTransfer_Success(t *testing.T) {
	ctx := context.Background()
	pool := setupTestDB(t)
	svc := service.NewWallet(pool, &events.MockPublisher{})

	from := createAccount(t, pool, "user", "alice", "USD", 10000)
	to := createAccount(t, pool, "user", "bob", "USD", 0)

	result, err := svc.ExecuteTransfer(ctx, service.TransferParams{
		FromAccountID:  from,
		ToAccountID:    to,
		AmountCents:    500,
		Currency:       "USD",
		IdempotencyKey: uuid.NewString(),
		Kind:           "internal",
	})

	require.NoError(t, err)
	require.Equal(t, int64(9500), result.FromBalance)
	require.Equal(t, int64(500), result.ToBalance)
}

func TestExecuteTransfer_InsufficientFunds(t *testing.T) {
	// ...
	_, err := svc.ExecuteTransfer(ctx, params)
	require.ErrorIs(t, err, service.ErrInsufficientFunds)
}

func TestExecuteTransfer_Idempotent(t *testing.T) {
	// Second call с same idempotency key returns first result
}
```

## Connected to architecture

- **I4** (event-first): transfer-completed event published.
- **I6** (no cross-service DB): only wallet touches wallet_db.
- **I9** (OCC): `version` column incremented atomically.
- **I16** (idempotency): Idempotency-Key enforced.
- **I17** (audit): journal table + JetStream → audit-log.

## Metrics emitted

- `wallet.transfer.total{kind,status}` counter
- `wallet.transfer.duration{kind}` histogram
- `wallet.transfer.amount_cents{kind,currency}` histogram
- `wallet.account.balance{account_type,currency}` gauge
- `wallet.errors{code}` counter

## Runbook link

SEV-1 alert `wallet-transfer-failure-rate` → `docs/runbooks/wallet-transfer-failure-rate.md`.
