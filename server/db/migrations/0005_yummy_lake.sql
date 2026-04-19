CREATE TABLE "messenger_cli_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"run_id" uuid,
	"workroom_slug" text,
	"model" text,
	"tmux_window" text,
	"claude_session_uuid" text,
	"log_path" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "messenger_agent_runs" ALTER COLUMN "conversation_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "messenger_agent_runs" ADD COLUMN "parent_run_id" uuid;--> statement-breakpoint
ALTER TABLE "messenger_agent_runs" ADD COLUMN "model" text;--> statement-breakpoint
ALTER TABLE "messenger_cli_sessions" ADD CONSTRAINT "messenger_cli_sessions_agent_id_messenger_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."messenger_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messenger_cli_sessions" ADD CONSTRAINT "messenger_cli_sessions_run_id_messenger_agent_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."messenger_agent_runs"("id") ON DELETE no action ON UPDATE no action;