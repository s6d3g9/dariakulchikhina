CREATE TABLE "messenger_secrets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" text NOT NULL,
	"scope_ref_id" uuid,
	"key" text NOT NULL,
	"value_encrypted" text NOT NULL,
	"iv" text NOT NULL,
	"auth_tag" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tender_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tender_id" uuid NOT NULL,
	"type" text NOT NULL,
	"actor_id" uuid,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" text NOT NULL,
	"external_guid" text NOT NULL,
	"law" text NOT NULL,
	"procedure_type" text NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"customer_inn" text NOT NULL,
	"customer_kpp" text,
	"customer_name" text NOT NULL,
	"customer_region" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"okpd2" text[] DEFAULT '{}'::text[] NOT NULL,
	"start_price" numeric(18, 2),
	"currency" text DEFAULT 'RUB' NOT NULL,
	"deadline_at" timestamp with time zone,
	"application_start" timestamp with time zone,
	"application_end" timestamp with time zone,
	"documents_urls" text[] DEFAULT '{}'::text[] NOT NULL,
	"raw_payload_hash" text NOT NULL,
	"raw_payload" jsonb NOT NULL,
	"relevance_score" numeric(5, 2),
	"margin_score" numeric(5, 2),
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
-- Drizzle-kit re-emits this column because the older hand-written migration
-- 0011_agent_runs_session_metadata.sql is not tracked in the meta journal.
-- Guard with IF NOT EXISTS so a clean DB and a partially-migrated dev DB
-- both succeed.
ALTER TABLE "messenger_agent_runs" ADD COLUMN IF NOT EXISTS "session_metadata" jsonb DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "tender_events" ADD CONSTRAINT "tender_events_tender_id_tenders_id_fk" FOREIGN KEY ("tender_id") REFERENCES "public"."tenders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "messenger_secrets_scope_key_unique" ON "messenger_secrets" USING btree ("scope","scope_ref_id","key") WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "tender_events_tender_idx" ON "tender_events" USING btree ("tender_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tenders_source_guid_unique" ON "tenders" USING btree ("source_id","external_guid") WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "tenders_published_idx" ON "tenders" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "tenders_region_idx" ON "tenders" USING btree ("customer_region");--> statement-breakpoint
CREATE INDEX "tenders_status_idx" ON "tenders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tenders_okpd_gin" ON "tenders" USING gin ("okpd2");