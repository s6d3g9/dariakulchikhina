CREATE TABLE IF NOT EXISTS "admin_settings" (
  "id" serial PRIMARY KEY NOT NULL,
  "key" text NOT NULL,
  "value" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "admin_settings_key_unique" UNIQUE("key")
);