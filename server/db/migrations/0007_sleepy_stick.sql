CREATE TABLE "messenger_agent_task_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"commit_sha" text NOT NULL,
	"branch" text NOT NULL,
	"commits_above_base" integer NOT NULL,
	"gates" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messenger_agent_task_completions" ADD CONSTRAINT "messenger_agent_task_completions_agent_id_messenger_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."messenger_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "messenger_agent_task_completions_agent_idx" ON "messenger_agent_task_completions" USING btree ("agent_id");