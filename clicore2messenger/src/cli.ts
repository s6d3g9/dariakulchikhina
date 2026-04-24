#!/usr/bin/env -S node --experimental-strip-types
import * as fs from "node:fs";
import { randomUUID } from "node:crypto";
import { claudeAdapter } from "./adapters/claude.ts";
import { claudeTranscriptAdapter } from "./adapters/claude-transcript.ts";
import { copilotAdapter } from "./adapters/copilot.ts";
import { runSpawnMode, runPipeMode, runTailMode } from "./core.ts";

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
    "http://localhost:4300";
  const token =
    get("--ingest-token", "--token") ?? process.env.MESSENGER_INGEST_TOKEN ?? "";
  const resume = get("--resume");
  const effort = get("--effort") as "low" | "medium" | "high" | "xhigh" | undefined;
  const runId = get("--run-id") ?? randomUUID();
  const adapterName = get("--adapter") ?? "claude";
  const tailFile = get("--tail-file");
  const stateDir = get("--state-dir");
  const pollMs = get("--poll-ms");

  if (!agentId) die("--agent-id is required");
  if (!token) die("MESSENGER_INGEST_TOKEN / --ingest-token is required");

  let adapter;
  if (adapterName === "claude") {
    adapter = claudeAdapter;
  } else if (adapterName === "claude-transcript") {
    adapter = claudeTranscriptAdapter;
  } else if (adapterName === "copilot") {
    adapter = copilotAdapter;
  } else {
    die(`unknown adapter: ${adapterName}`);
  }

  if (tailFile) {
    // Tail mode runs until aborted (SIGINT/SIGTERM). Wire signals so the
    // supervisor can shut it down cleanly and the offset is persisted.
    const controller = new AbortController();
    const stop = (code: number) => {
      controller.abort();
      setTimeout(() => process.exit(code), 50);
    };
    process.on("SIGINT", () => stop(0));
    process.on("SIGTERM", () => stop(0));
    await runTailMode({
      adapter,
      filePath: tailFile,
      stateDir,
      runId,
      conversationId,
      agentId,
      messengerUrl,
      token,
      pollIntervalMs: pollMs ? Number(pollMs) : undefined,
      signal: controller.signal,
    });
    process.exit(0);
  }

  const pipeMode = !promptArg && !promptFile;

  if (pipeMode) {
    await runPipeMode({ adapter, runId, agentId, messengerUrl, token });
    process.exit(0);
  }

  // Spawn mode
  if (!conversationId) die("--conversation-id is required in spawn mode");

  const prompt = promptArg ?? fs.readFileSync(promptFile!, "utf8");

  const exitCode = await runSpawnMode({
    adapter,
    model,
    resume,
    effort,
    prompt,
    runId,
    conversationId,
    agentId,
    messengerUrl,
    token,
  });

  process.exit(exitCode);
}

// Only auto-run when executed directly (not when imported as a module)
import { fileURLToPath } from "node:url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv).catch((err) => {
    console.error("[bridge] unhandled error:", err);
    process.exit(1);
  });
}
