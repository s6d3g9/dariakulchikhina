---
description: Walk through a safe Drizzle migration for a schema change
argument-hint: [short-description of change]
---

Plan and execute a Drizzle migration for: $ARGUMENTS

Follow this sequence — do not skip steps.

1. **Understand the change.** Restate in one sentence what schema change $ARGUMENTS implies. If ambiguous, ask the user.
2. **Locate the schema file(s)** under `server/db/schema/` affected by the change. Read them.
3. **Check invariants:** any new mutable business table needs `version`, `deleted_at`, `created_at`, `updated_at`. Flag if the change violates this.
4. **Assess safety:**
   - Is this destructive (drop/rename)? Warn the user and get approval before continuing.
   - Will a NOT NULL column be added to a populated table? Propose the three-step pattern (nullable → backfill → set NOT NULL) and stop for approval.
   - Does the change require a corresponding `shared/types/**` update? Note it.
5. **Edit the schema** to reflect the change.
6. **Generate the migration:** `pnpm db:generate`. Read the generated SQL file and paste the key portion back to the user.
7. **Do not run `db:migrate`** automatically. Ask the user to review the SQL and confirm before applying.
8. **Summary:** list changed schema files, generated migration filename, any required TypeScript type updates, and any backfill plan.

If the task is purely dev-scratch (throwaway local DB), the user can say so — then `db:push` is acceptable and `db:generate` is skipped. Never use `db:push` for a change that will be committed.
