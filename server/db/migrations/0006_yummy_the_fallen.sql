CREATE TABLE "messenger_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"icon" text,
	"color" text,
	"config" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "messenger_project_connectors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"type" text NOT NULL,
	"label" text NOT NULL,
	"config" jsonb DEFAULT '{}' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "messenger_project_external_apis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"base_url" text NOT NULL,
	"openapi_ref" text,
	"auth_type" text DEFAULT 'none' NOT NULL,
	"config" jsonb DEFAULT '{}' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "messenger_project_mcp" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"transport" text NOT NULL,
	"endpoint" text NOT NULL,
	"config" jsonb DEFAULT '{}' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "messenger_project_plugins" (
	"project_id" uuid NOT NULL,
	"plugin_id" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"config" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "messenger_project_plugins_project_id_plugin_id_pk" PRIMARY KEY("project_id","plugin_id")
);
--> statement-breakpoint
CREATE TABLE "messenger_project_skills" (
	"project_id" uuid NOT NULL,
	"skill_id" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"config" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "messenger_project_skills_project_id_skill_id_pk" PRIMARY KEY("project_id","skill_id")
);
--> statement-breakpoint
ALTER TABLE "messenger_agents" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "messenger_projects" ADD CONSTRAINT "messenger_projects_owner_user_id_messenger_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."messenger_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messenger_project_connectors" ADD CONSTRAINT "messenger_project_connectors_project_id_messenger_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."messenger_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messenger_project_external_apis" ADD CONSTRAINT "messenger_project_external_apis_project_id_messenger_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."messenger_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messenger_project_mcp" ADD CONSTRAINT "messenger_project_mcp_project_id_messenger_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."messenger_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messenger_project_plugins" ADD CONSTRAINT "messenger_project_plugins_project_id_messenger_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."messenger_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messenger_project_skills" ADD CONSTRAINT "messenger_project_skills_project_id_messenger_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."messenger_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "messenger_projects_owner_slug_unique" ON "messenger_projects" USING btree ("owner_user_id","slug") WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "messenger_projects_owner_idx" ON "messenger_projects" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "messenger_project_connectors_project_idx" ON "messenger_project_connectors" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "messenger_project_external_apis_project_idx" ON "messenger_project_external_apis" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "messenger_project_mcp_project_idx" ON "messenger_project_mcp" USING btree ("project_id");--> statement-breakpoint
ALTER TABLE "messenger_agents" ADD CONSTRAINT "messenger_agents_project_id_messenger_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."messenger_projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "messenger_agents_project_idx" ON "messenger_agents" USING btree ("project_id") WHERE deleted_at is null;