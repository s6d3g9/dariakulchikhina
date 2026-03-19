ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "recovery_phrase_hash" text;