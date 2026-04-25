#!/usr/bin/env -S node --experimental-strip-types
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import * as readline from "node:readline";
import type { IngestEvent } from "./types.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SessionMeta {
  runId: string;
  agentId: string;
  ingestToken: string;
  messengerUrl: string;
  startedAt: string;
}

interface DlqFileInfo {
  runId: string;
  filePath: string;
  eventCount: number;
  oldestEventAt: Date;
  newestEventAt: Date;
  totalSizeBytes: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultStateDir(): string {
  return path.join(os.homedir(), "state", "claude-bridge");
}

function dlqFilePath(stateDir: string, runId: string): string {
  return path.join(stateDir, `${runId}.dlq.ndjson`);
}

function scanDlqFiles(stateDir: string): DlqFileInfo[] {
  let entries: string[];
  try {
    entries = fs.readdirSync(stateDir);
  } catch {
    return [];
  }

  const results: DlqFileInfo[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".dlq.ndjson")) continue;
    const runId = entry.slice(0, -".dlq.ndjson".length);
    const filePath = path.join(stateDir, entry);

    let stat: fs.Stats;
    try {
      stat = fs.statSync(filePath);
    } catch {
      continue;
    }

    let raw = "";
    try {
      raw = fs.readFileSync(filePath, "utf8");
    } catch {
      continue;
    }
    const eventCount = raw.split("\n").filter((l) => l.trim()).length;

    results.push({
      runId,
      filePath,
      eventCount,
      oldestEventAt: stat.birthtime,
      newestEventAt: stat.mtime,
      totalSizeBytes: stat.size,
    });
  }

  // Sort by newest desc
  return results.sort((a, b) => b.newestEventAt.getTime() - a.newestEventAt.getTime());
}

function readSessionMeta(stateDir: string, runId: string): SessionMeta | null {
  const metaPath = path.join(stateDir, `${runId}.session.json`);
  try {
    const raw = fs.readFileSync(metaPath, "utf8");
    return JSON.parse(raw) as SessionMeta;
  } catch {
    return null;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
  return `${(bytes / 1024 / 1024).toFixed(1)}M`;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 16).replace("T", " ");
}

function getFlag(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  if (i !== -1 && i + 1 < args.length) return args[i + 1];
  return undefined;
}

async function fetchOnce(url: string, opts: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Subcommands
// ---------------------------------------------------------------------------

function cmdList(args: string[]): void {
  const stateDir = getFlag(args, "--state-dir") ?? defaultStateDir();
  const files = scanDlqFiles(stateDir);

  if (files.length === 0) {
    console.log("no DLQ entries");
    return;
  }

  const COL_RUN = 36;
  const COL_COUNT = 11;
  const COL_OLDEST = 17;
  const COL_NEWEST = 17;

  const header = [
    "run_id".padEnd(COL_RUN),
    "event_count".padEnd(COL_COUNT),
    "oldest_event_at".padEnd(COL_OLDEST),
    "newest_event_at".padEnd(COL_NEWEST),
    "total_size",
  ].join("  ");
  console.log(header);
  console.log("-".repeat(header.length));

  for (const info of files) {
    const row = [
      info.runId.slice(0, COL_RUN).padEnd(COL_RUN),
      String(info.eventCount).padEnd(COL_COUNT),
      formatDate(info.oldestEventAt).padEnd(COL_OLDEST),
      formatDate(info.newestEventAt).padEnd(COL_NEWEST),
      formatBytes(info.totalSizeBytes),
    ].join("  ");
    console.log(row);
  }

  console.log(`\nTotal: ${files.length} DLQ file(s)`);
}

function cmdInspect(args: string[]): void {
  const runId = args[0];
  if (!runId || runId.startsWith("--")) {
    console.error("[dlq] inspect requires <runId>");
    process.exit(1);
  }

  const stateDir = getFlag(args, "--state-dir") ?? defaultStateDir();
  const limitStr = getFlag(args, "--limit");
  const limit = limitStr !== undefined ? parseInt(limitStr, 10) : undefined;
  const useTail = args.includes("--tail");

  const filePath = dlqFilePath(stateDir, runId);
  if (!fs.existsSync(filePath)) {
    console.error(`[dlq] no DLQ file for run ${runId}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, "utf8");
  let lines = raw.split("\n").filter((l) => l.trim());

  if (limit !== undefined) {
    lines = useTail ? lines.slice(-limit) : lines.slice(0, limit);
  }

  for (const line of lines) {
    try {
      const event = JSON.parse(line) as IngestEvent;
      console.log(JSON.stringify(event, null, 2));
    } catch {
      console.log(line);
    }
  }
}

async function cmdRetry(args: string[]): Promise<void> {
  const runId = args[0];
  if (!runId || runId.startsWith("--")) {
    console.error("[dlq] retry requires <runId>");
    process.exit(1);
  }

  const stateDir = getFlag(args, "--state-dir") ?? defaultStateDir();

  // Session meta lookup first; flags / env override
  const meta = readSessionMeta(stateDir, runId);
  const token =
    getFlag(args, "--ingest-token") ??
    meta?.ingestToken ??
    process.env.MESSENGER_INGEST_TOKEN ??
    "";
  const agentId = getFlag(args, "--agent-id") ?? meta?.agentId ?? "";
  const messengerUrl =
    getFlag(args, "--messenger-url") ??
    meta?.messengerUrl ??
    process.env.MESSENGER_INGEST_URL ??
    "http://localhost:4300";

  if (!token) {
    console.error("[dlq] --ingest-token or MESSENGER_INGEST_TOKEN required");
    process.exit(1);
  }
  if (!agentId) {
    console.error("[dlq] --agent-id required (or saved session meta)");
    process.exit(1);
  }

  const filePath = dlqFilePath(stateDir, runId);
  if (!fs.existsSync(filePath)) {
    console.error(`[dlq] no DLQ file for run ${runId}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split("\n").filter((l) => l.trim());

  if (lines.length === 0) {
    console.log("[dlq] DLQ file is empty");
    return;
  }

  console.log(`[dlq] retrying ${lines.length} event(s) for run ${runId}`);

  const remaining: string[] = [];
  let success = 0;
  let tempFailed = 0;
  let permFailed = 0;

  for (let i = 0; i < lines.length; i++) {
    const pct = Math.floor((i / lines.length) * 100);
    process.stdout.write(
      `\r  [${pct.toString().padStart(3)}%] ${i}/${lines.length}  ok=${success} perm=${permFailed} temp=${tempFailed}  `,
    );

    let event: IngestEvent;
    try {
      event = JSON.parse(lines[i]!) as IngestEvent;
      // Strip retry bookkeeping field before re-sending
      delete (event as Record<string, unknown>)["permanently_failed"];
    } catch {
      console.error(`\n[dlq] skipping malformed line ${i + 1}`);
      remaining.push(lines[i]!);
      tempFailed++;
      continue;
    }

    let sent = false;
    let permanent = false;

    try {
      const res = await fetchOnce(`${messengerUrl}/agents/${agentId}/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(event),
      });

      if (res.ok || res.status === 202) {
        sent = true;
        success++;
      } else if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        permanent = true;
        permFailed++;
      } else {
        tempFailed++;
      }
    } catch {
      tempFailed++;
    }

    if (!sent) {
      const kept = permanent
        ? JSON.stringify({ ...(event as object), permanently_failed: true })
        : lines[i]!;
      remaining.push(kept);
    }
  }

  process.stdout.write(
    `\r  [100%] ${lines.length}/${lines.length}  ok=${success} perm=${permFailed} temp=${tempFailed}  \n`,
  );

  if (remaining.length === 0) {
    fs.unlinkSync(filePath);
    console.log(`[dlq] all events delivered — DLQ file removed`);
  } else {
    fs.writeFileSync(filePath, remaining.join("\n") + "\n");
    console.log(
      `[dlq] ${remaining.length} event(s) remain in DLQ (${permFailed} permanently failed, ${tempFailed} temp)`,
    );
  }
}

async function cmdPurge(args: string[]): Promise<void> {
  const runId = args[0];
  if (!runId || runId.startsWith("--")) {
    console.error("[dlq] purge requires <runId>");
    process.exit(1);
  }

  const stateDir = getFlag(args, "--state-dir") ?? defaultStateDir();
  const force = args.includes("--force");

  const filePath = dlqFilePath(stateDir, runId);
  if (!fs.existsSync(filePath)) {
    console.error(`[dlq] no DLQ file for run ${runId}`);
    process.exit(1);
  }

  const stat = fs.statSync(filePath);
  const raw = fs.readFileSync(filePath, "utf8");
  const eventCount = raw.split("\n").filter((l) => l.trim()).length;

  if (!force) {
    await new Promise<void>((resolve) => {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      rl.question(
        `Purge DLQ for run ${runId} (${eventCount} events, ${formatBytes(stat.size)})? [y/N] `,
        (answer) => {
          rl.close();
          if (answer.toLowerCase() === "y" || answer.toLowerCase() === "yes") {
            fs.unlinkSync(filePath);
            console.log(`[dlq] purged ${filePath}`);
          } else {
            console.log("[dlq] aborted");
          }
          resolve();
        },
      );
    });
    return;
  }

  fs.unlinkSync(filePath);
  console.log(`[dlq] purged ${filePath}`);
}

export function cmdStats(
  args: string[],
): { totalFiles: number; totalEvents: number; totalBytes: number; alert: boolean } {
  const stateDir = getFlag(args, "--state-dir") ?? defaultStateDir();
  const alertEvents = parseInt(process.env.DLQ_ALERT_EVENTS ?? "1000", 10);
  const alertBytes = parseInt(process.env.DLQ_ALERT_BYTES ?? "10485760", 10);

  const files = scanDlqFiles(stateDir);
  const totalFiles = files.length;
  const totalEvents = files.reduce((sum, f) => sum + f.eventCount, 0);
  const totalBytes = files.reduce((sum, f) => sum + f.totalSizeBytes, 0);
  const alert = totalEvents > alertEvents || totalBytes > alertBytes;

  console.log("DLQ summary:");
  console.log(`  files:  ${totalFiles}`);
  console.log(`  events: ${totalEvents} (threshold: ${alertEvents})`);
  console.log(`  size:   ${formatBytes(totalBytes)} (threshold: ${formatBytes(alertBytes)})`);

  if (alert) {
    console.error(
      JSON.stringify({ level: "warn", alert: "dlq_overflow", totalFiles, totalEvents, totalBytes }),
    );
  }

  return { totalFiles, totalEvents, totalBytes, alert };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function printUsage(): void {
  console.error(
    [
      "Usage:",
      "  clicore2messenger dlq list [--state-dir <path>]",
      "  clicore2messenger dlq inspect <runId> [--limit N] [--head|--tail] [--state-dir <path>]",
      "  clicore2messenger dlq retry <runId> [--ingest-token TOKEN] [--agent-id ID] [--messenger-url URL] [--state-dir <path>]",
      "  clicore2messenger dlq purge <runId> [--force] [--state-dir <path>]",
      "  clicore2messenger dlq stats [--state-dir <path>]",
    ].join("\n"),
  );
}

export async function runBridgeDlq(args: string[]): Promise<void> {
  const subcommand = args[0];

  if (subcommand === "list") {
    cmdList(args.slice(1));
  } else if (subcommand === "inspect") {
    cmdInspect(args.slice(1));
  } else if (subcommand === "retry") {
    await cmdRetry(args.slice(1));
  } else if (subcommand === "purge") {
    await cmdPurge(args.slice(1));
  } else if (subcommand === "stats") {
    cmdStats(args.slice(1));
  } else {
    printUsage();
    process.exit(1);
  }
}
