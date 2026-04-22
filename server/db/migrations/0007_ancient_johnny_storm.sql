CREATE TABLE "messenger_project_knowledge_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"source_uri" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"chunk_text" text NOT NULL,
	"embedding" vector(768) NOT NULL,
	"token_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messenger_project_knowledge_chunks" ADD CONSTRAINT "messenger_project_knowledge_chunks_project_id_messenger_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."messenger_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "messenger_project_knowledge_chunks_project_source_idx" ON "messenger_project_knowledge_chunks" USING btree ("project_id","source_id");
--> statement-breakpoint
CREATE INDEX ON messenger_project_knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);