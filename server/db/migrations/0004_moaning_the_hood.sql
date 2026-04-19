CREATE TABLE "messenger_agent_run_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"substate" text,
	"token_in" integer,
	"token_out" integer,
	"message" text,
	"payload" jsonb
);
--> statement-breakpoint
CREATE TABLE "messenger_agent_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"prompt" text,
	"result" text,
	"error" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "messenger_agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"model" text,
	"ingest_token" text NOT NULL,
	"config" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "messenger_agents_ingest_token_unique" UNIQUE("ingest_token")
);
--> statement-breakpoint
CREATE TABLE "messenger_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"contact_user_id" uuid NOT NULL,
	"alias" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "messenger_contacts_owner_contact_uniq" UNIQUE("owner_user_id","contact_user_id")
);
--> statement-breakpoint
CREATE TABLE "messenger_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"user_a_id" uuid,
	"user_b_id" uuid,
	"policy" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "messenger_device_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"device_id" text NOT NULL,
	"public_key" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "messenger_device_keys_user_device_uniq" UNIQUE("user_id","device_id")
);
--> statement-breakpoint
CREATE TABLE "messenger_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_user_id" uuid,
	"ciphertext" "bytea" NOT NULL,
	"key_id" text,
	"content_type" text DEFAULT 'text' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "messenger_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"login" text NOT NULL,
	"display_name" text,
	"public_key" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "messenger_users_login_unique" UNIQUE("login")
);
--> statement-breakpoint
ALTER TABLE "messenger_agent_run_events" ADD CONSTRAINT "messenger_agent_run_events_run_id_messenger_agent_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."messenger_agent_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messenger_agent_runs" ADD CONSTRAINT "messenger_agent_runs_agent_id_messenger_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."messenger_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messenger_agent_runs" ADD CONSTRAINT "messenger_agent_runs_conversation_id_messenger_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."messenger_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messenger_agents" ADD CONSTRAINT "messenger_agents_owner_user_id_messenger_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."messenger_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messenger_contacts" ADD CONSTRAINT "messenger_contacts_owner_user_id_messenger_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."messenger_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messenger_contacts" ADD CONSTRAINT "messenger_contacts_contact_user_id_messenger_users_id_fk" FOREIGN KEY ("contact_user_id") REFERENCES "public"."messenger_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messenger_conversations" ADD CONSTRAINT "messenger_conversations_user_a_id_messenger_users_id_fk" FOREIGN KEY ("user_a_id") REFERENCES "public"."messenger_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messenger_conversations" ADD CONSTRAINT "messenger_conversations_user_b_id_messenger_users_id_fk" FOREIGN KEY ("user_b_id") REFERENCES "public"."messenger_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messenger_device_keys" ADD CONSTRAINT "messenger_device_keys_user_id_messenger_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."messenger_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messenger_messages" ADD CONSTRAINT "messenger_messages_conversation_id_messenger_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."messenger_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messenger_messages" ADD CONSTRAINT "messenger_messages_sender_user_id_messenger_users_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."messenger_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "messenger_agent_run_events_run_cursor_idx" ON "messenger_agent_run_events" USING btree ("run_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "messenger_messages_conv_cursor_idx" ON "messenger_messages" USING btree ("conversation_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);