ALTER TABLE "projects"
  ADD COLUMN IF NOT EXISTS "client_login" varchar(100),
  ADD COLUMN IF NOT EXISTS "client_password_hash" text,
  ADD COLUMN IF NOT EXISTS "client_recovery_phrase_hash" text;

ALTER TABLE "contractors"
  ADD COLUMN IF NOT EXISTS "login" varchar(100),
  ADD COLUMN IF NOT EXISTS "password_hash" text,
  ADD COLUMN IF NOT EXISTS "recovery_phrase_hash" text;

CREATE UNIQUE INDEX IF NOT EXISTS "projects_client_login_unique" ON "projects" ("client_login");
CREATE UNIQUE INDEX IF NOT EXISTS "contractors_login_unique" ON "contractors" ("login");