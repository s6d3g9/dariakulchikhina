CREATE TABLE "messenger_project_repositories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'git' NOT NULL,
	"url" text NOT NULL,
	"branch" text,
	"default_ref" text,
	"credentials_ref" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_sync_at" timestamp with time zone,
	"config" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "messenger_project_repositories" ADD CONSTRAINT "messenger_project_repositories_project_id_messenger_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."messenger_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "messenger_project_repositories_project_idx" ON "messenger_project_repositories" USING btree ("project_id");
