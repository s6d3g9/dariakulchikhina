CREATE TABLE "messenger_cli_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"run_id" uuid,
	"slug" text NOT NULL,
	"workroom" text,
	"model" text,
	"status" text DEFAULT 'starting' NOT NULL,
	"prompt" text,
	"tmux_window" text,
	"started_at" timestamp with time zone,
	"stopped_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "messenger_cli_sessions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "messenger_agent_runs" ADD COLUMN "parent_run_id" uuid;--> statement-breakpoint
ALTER TABLE "messenger_agent_runs" ADD COLUMN "root_run_id" uuid;--> statement-breakpoint
ALTER TABLE "messenger_agent_runs" ADD COLUMN "spawned_by_agent_id" uuid;--> statement-breakpoint
ALTER TABLE "messenger_agent_runs" ADD COLUMN "cost_usd" numeric(10, 4) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "messenger_agent_runs" ADD COLUMN "token_in_total" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "messenger_agent_runs" ADD COLUMN "token_out_total" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "messenger_agent_runs" ADD COLUMN "attachment_ids" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "messenger_cli_sessions" ADD CONSTRAINT "messenger_cli_sessions_agent_id_messenger_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."messenger_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messenger_cli_sessions" ADD CONSTRAINT "messenger_cli_sessions_run_id_messenger_agent_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."messenger_agent_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "messenger_cli_sessions_agent_status_idx" ON "messenger_cli_sessions" USING btree ("agent_id","status");--> statement-breakpoint
ALTER TABLE "messenger_agent_runs" ADD CONSTRAINT "messenger_agent_runs_spawned_by_agent_id_messenger_agents_id_fk" FOREIGN KEY ("spawned_by_agent_id") REFERENCES "public"."messenger_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messenger_agent_runs" ADD CONSTRAINT "messenger_agent_runs_parent_run_id_messenger_agent_runs_id_fk" FOREIGN KEY ("parent_run_id") REFERENCES "public"."messenger_agent_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messenger_agent_runs" ADD CONSTRAINT "messenger_agent_runs_root_run_id_messenger_agent_runs_id_fk" FOREIGN KEY ("root_run_id") REFERENCES "public"."messenger_agent_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "messenger_agent_runs_parent_run_idx" ON "messenger_agent_runs" USING btree ("parent_run_id");--> statement-breakpoint
CREATE INDEX "messenger_agent_runs_root_run_cursor_idx" ON "messenger_agent_runs" USING btree ("root_run_id","created_at" DESC NULLS LAST);