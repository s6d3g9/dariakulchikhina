import { test } from "node:test";
import assert from "node:assert/strict";
import { post } from "./core.ts";

test("post() calls fetch with /agents/:agentId/stream URL", async () => {
  const calls: { url: string; init: RequestInit }[] = [];

  globalThis.fetch = async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: url.toString(), init: init ?? {} });
    return new Response(null, { status: 202 });
  };

  await post("http://ex.test", "agent-42", "tok", { type: "delta", runId: "r1", delta: "hi" });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://ex.test/agents/agent-42/stream");
  const headers = calls[0].init.headers as Record<string, string>;
  assert.equal(headers["Authorization"], "Bearer tok");
  assert.equal(headers["Content-Type"], "application/json");
});
