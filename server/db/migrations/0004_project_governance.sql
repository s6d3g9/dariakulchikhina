CREATE TABLE IF NOT EXISTS "project_participants" (
  "id" serial PRIMARY KEY NOT NULL,
  "project_id" integer NOT NULL REFERENCES "projects"("id") ON DELETE cascade,
  "source_kind" text DEFAULT 'custom' NOT NULL,
  "source_id" integer,
  "role_key" text DEFAULT 'other' NOT NULL,
  "display_name" text NOT NULL,
  "company_name" text,
  "phone" text,
  "email" text,
  "messenger_nick" text,
  "is_primary" boolean DEFAULT false NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "notes" text,
  "meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "project_participant_source_uniq" UNIQUE("project_id", "source_kind", "source_id")
);

CREATE TABLE IF NOT EXISTS "project_scope_assignments" (
  "id" serial PRIMARY KEY NOT NULL,
  "project_id" integer NOT NULL REFERENCES "projects"("id") ON DELETE cascade,
  "participant_id" integer NOT NULL REFERENCES "project_participants"("id") ON DELETE cascade,
  "scope_type" text NOT NULL,
  "scope_source" text NOT NULL,
  "scope_id" text NOT NULL,
  "responsibility" text DEFAULT 'observer' NOT NULL,
  "allocation_percent" integer,
  "status" text DEFAULT 'active' NOT NULL,
  "due_date" text,
  "notes" text,
  "meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "assigned_by" text,
  "assigned_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "project_scope_assignment_uniq" UNIQUE("project_id", "participant_id", "scope_type", "scope_source", "scope_id", "responsibility")
);

CREATE TABLE IF NOT EXISTS "project_scope_settings" (
  "id" serial PRIMARY KEY NOT NULL,
  "project_id" integer NOT NULL REFERENCES "projects"("id") ON DELETE cascade,
  "scope_type" text NOT NULL,
  "scope_source" text NOT NULL,
  "scope_id" text NOT NULL,
  "settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "project_scope_settings_uniq" UNIQUE("project_id", "scope_type", "scope_source", "scope_id")
);

CREATE INDEX IF NOT EXISTS "project_participants_project_role_idx"
  ON "project_participants" ("project_id", "role_key", "status");

CREATE INDEX IF NOT EXISTS "project_scope_assignments_scope_idx"
  ON "project_scope_assignments" ("project_id", "scope_type", "scope_source", "scope_id");

CREATE INDEX IF NOT EXISTS "project_scope_assignments_participant_idx"
  ON "project_scope_assignments" ("participant_id", "status");

CREATE INDEX IF NOT EXISTS "project_scope_settings_scope_idx"
  ON "project_scope_settings" ("project_id", "scope_type", "scope_source", "scope_id");