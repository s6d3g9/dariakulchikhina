#!/usr/bin/env -S node --experimental-strip-types
import * as fs from "node:fs";
import { randomUUID } from "node:crypto";
import { claudeAdapter } from "./adapters/claude.ts";
import { runSpawnMode, runPipeMode } from "./core.ts";

export async function main(argv: string[]): Promise<void> {
  const args = argv.slice(2);

  const get = (flag: string, alias?: string): string | undefined => {
    for (const f of alias ? [flag, alias] : [flag]) {
      const i = args.indexOf(f);
      if (i !== -1 && i + 1 < args.length) return args[i + 1];
    }
    return undefined;
  };

  function die(msg: string): never {
    console.error(`[bridge] fatal: ${msg}`);
    process.exit(1);
  }

  const agentId = get("--agent-id");
  const conversationId = get("--conversation-id");
  const promptArg = get("--prompt");
  const promptFile = get("--prompt-file");
  const model = get("--model") ?? "sonnet";
  const messengerUrl =
    get("--messenger-core-url", "--messenger-url") ??
    process.env.MESSENGER_INGEST_URL ??
    "http://localhost:3033";
  const token =
    get("--ingest-token", "--token") ?? process.env.MESSENGER_INGEST_TOKEN ?? "";
  const resume = get("--resume");
  const runId = get("--run-id") ?? randomUUID();
  const adapterName = get("--adapter") ?? "claude";

  if (!agentId) die("--agent-id is required");
  if (!token) die("MESSENGER_INGEST_TOKEN / --ingest-token is required");

  const adapter = adapterName === "claude" ? claudeAdapter : die(`unknown adapter: ${adapterName}`);

  const pipeMode = !promptArg && !promptFile;

  if (pipeMode) {
    await runPipeMode({ adapter, runId, messengerUrl, token });
    process.exit(0);
  }

  // Spawn mode
  if (!conversationId) die("--conversation-id is required in spawn mode");

  const prompt = promptArg ?? fs.readFileSync(promptFile!, "utf8");

  const exitCode = await runSpawnMode({
    adapter,
    model,
    resume,
    prompt,
    runId,
    conversationId,
    agentId,
    messengerUrl,
    token,
  });

  process.exit(exitCode);
}

main(process.argv).catch((err) => {
  console.error("[bridge] unhandled error:", err);
  process.exit(1);
});
