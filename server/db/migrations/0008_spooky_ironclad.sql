CREATE TABLE "messenger_agent_model_routing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"subscription_id" uuid,
	"model" text,
	"effort" text DEFAULT 'medium',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "messenger_agent_model_routing_agent_uniq" UNIQUE("agent_id")
);
--> statement-breakpoint
CREATE TABLE "messenger_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"label" text NOT NULL,
	"account" text DEFAULT '' NOT NULL,
	"api_key" text,
	"default_model" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"config" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "messenger_agent_model_routing" ADD CONSTRAINT "messenger_agent_model_routing_agent_id_messenger_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."messenger_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messenger_agent_model_routing" ADD CONSTRAINT "messenger_agent_model_routing_subscription_id_messenger_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."messenger_subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messenger_subscriptions" ADD CONSTRAINT "messenger_subscriptions_owner_user_id_messenger_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."messenger_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "messenger_agent_model_routing_agent_idx" ON "messenger_agent_model_routing" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "messenger_agent_model_routing_sub_idx" ON "messenger_agent_model_routing" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "messenger_subscriptions_owner_idx" ON "messenger_subscriptions" USING btree ("owner_user_id") WHERE deleted_at is null;