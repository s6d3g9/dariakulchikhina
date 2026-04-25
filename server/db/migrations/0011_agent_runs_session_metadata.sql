ALTER TABLE "messenger_agent_runs" ADD COLUMN "session_metadata" jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX "idx_agent_runs_session_metadata_session_id" ON "messenger_agent_runs" (("session_metadata"->>'sessionId')) WHERE "session_metadata"->>'sessionId' IS NOT NULL;
