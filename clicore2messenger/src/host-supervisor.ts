#!/usr/bin/env -S node --experimental-strip-types
/**
 * host-supervisor v2 — multi-child session bridge supervisor.
 *
 * Scans all project directories under TRANSCRIPT_ROOT, maintains one tail-child
 * per active .jsonl, and provisions project-agents via the host-session API.
 *
 * Each unique cwd gets its own project-agent (agentId). Multiple Claude Code
 * sessions from the same cwd share one agentId but get distinct runIds.
 *
 * Env (required, fail-fast):
 *   HOST_BRIDGE_URL   e.g. http://localhost:4300
 *   HOST_BRIDGE_TOKEN bearer token for provisioning API
 *
 * Env (optional):
 *   HOST_NAME              override os.hostname()
 *   TRANSCRIPT_ROOT        default: ~/.claude/projects
 *   STATE_DIR              default: ~/state/claude-bridge
 *   MESSENGER_URL          default: http://localhost:4300
 *   POLL_SECS              default: 30
 *   HOST_SESSION_IDLE_MIN  default: 30  (minutes)
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`[host-supervisor] fatal: ${name} is required`);
    process.exit(1);
  }
  return v;
}

const HOST_BRIDGE_URL = requireEnv("HOST_BRIDGE_URL");
const HOST_BRIDGE_TOKEN = requireEnv("HOST_BRIDGE_TOKEN");
const HOST_NAME = process.env.HOST_NAME ?? os.hostname();
const TRANSCRIPT_ROOT =
  process.env.TRANSCRIPT_ROOT ?? path.join(os.homedir(), ".claude", "projects");
const STATE_DIR =
  process.env.STATE_DIR ?? path.join(os.homedir(), "state", "claude-bridge");
const MESSENGER_URL = process.env.MESSENGER_URL ?? "http://localhost:4300";
const POLL_SECS = Number(process.env.POLL_SECS ?? "30");
const HOST_SESSION_IDLE_MIN = Number(process.env.HOST_SESSION_IDLE_MIN ?? "30");
const HOST_SESSION_IDLE_MIN_MS = HOST_SESSION_IDLE_MIN * 60 * 1000;

const SESSIONS_FILE = path.join(STATE_DIR, "sessions.json");
const SESSIONS_LOCK = SESSIONS_FILE + ".lock";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Resolve compiled CLI binary relative to this file's location in dist/ or src/
const CLI_BIN = path.resolve(__dirname, "../dist/cli.js");

// UUID v4 pattern — used to identify parentSessionId directories
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SessionEntry {
  sessionId: string;
  filePath: string;
  cwd: string;
  hostname: string;
  gitBranch?: string;
  sessionVersion?: string;
  sessionStartedAt?: string;
  agentId: string;
  conversationId: string;
  runId: string;
  ingestToken: string;
  runStatus: "running" | "completed";
  completedAt?: string;
  pid?: number;
  /** Set for subagent runs — the runId of the parent session's run */
  parentRunId?: string;
  /** true when this entry tracks a subagent JSONL (isSidechain:true envelope) */
  isSubagent?: boolean;
}

interface SessionsStore {
  sessions: Record<string, SessionEntry>;
}

interface ProvisionResponse {
  agentId: string;
  conversationId: string;
  runId: string;
  ingestToken: string;
}

interface EnvelopeInfo {
  cwd: string;
  gitBranch?: string;
  version?: string;
}

// ---------------------------------------------------------------------------
// In-memory child registry
// ---------------------------------------------------------------------------

const children = new Map<string, { proc: ChildProcess; runId: string }>();

// ---------------------------------------------------------------------------
// File lock (O_EXCL — atomic, equivalent to proper-lockfile)
// ---------------------------------------------------------------------------

function acquireLock(): boolean {
  try {
    const fd = fs.openSync(SESSIONS_LOCK, "wx");
    fs.closeSync(fd);
    return true;
  } catch {
    return false;
  }
}

function releaseLock(): void {
  try {
    fs.unlinkSync(SESSIONS_LOCK);
  } catch {
    // ignore
  }
}

async function withLock<T>(fn: () => T | Promise<T>): Promise<T> {
  const TIMEOUT_MS = 5000;
  const RETRY_MS = 50;
  const deadline = Date.now() + TIMEOUT_MS;
  while (!acquireLock()) {
    if (Date.now() > deadline) {
      // Stale lock (process died without cleanup) — remove and retry once.
      releaseLock();
      if (!acquireLock()) throw new Error("sessions.json lock timeout");
    }
    await sleep(RETRY_MS);
  }
  try {
    return await fn();
  } finally {
    releaseLock();
  }
}

// ---------------------------------------------------------------------------
// sessions.json persistence
// ---------------------------------------------------------------------------

function loadSessions(): Record<string, SessionEntry> {
  try {
    const raw = fs.readFileSync(SESSIONS_FILE, "utf8");
    const parsed = JSON.parse(raw) as SessionsStore;
    return parsed.sessions ?? {};
  } catch {
    return {};
  }
}

function saveSessions(sessions: Record<string, SessionEntry>): void {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  const tmp = `${SESSIONS_FILE}.tmp.${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify({ sessions }, null, 2));
  fs.renameSync(tmp, SESSIONS_FILE);
}

// ---------------------------------------------------------------------------
// Envelope parsing — reads first 16 KB of a .jsonl to find cwd/gitBranch/version
// ---------------------------------------------------------------------------

async function readEnvelopeInfo(filePath: string): Promise<EnvelopeInfo | null> {
  const MAX_BYTES = 16 * 1024;
  let buf: Buffer;
  try {
    const fh = await fs.promises.open(filePath, "r");
    try {
      const raw = Buffer.alloc(MAX_BYTES);
      const { bytesRead } = await fh.read(raw, 0, MAX_BYTES, 0);
      buf = raw.subarray(0, bytesRead);
    } finally {
      await fh.close();
    }
  } catch {
    return null;
  }

  for (const line of buf.toString("utf8").split("\n")) {
    const t = line.trim();
    if (!t) continue;
    let obj: unknown;
    try {
      obj = JSON.parse(t);
    } catch {
      continue;
    }
    if (typeof obj !== "object" || obj === null) continue;
    const ev = obj as Record<string, unknown>;
    const evType = ev.type;
    if (evType !== "user" && evType !== "assistant") continue;
    const cwd = typeof ev.cwd === "string" ? ev.cwd : undefined;
    if (!cwd) continue;
    return {
      cwd,
      gitBranch: typeof ev.gitBranch === "string" ? ev.gitBranch : undefined,
      version: typeof ev.version === "string" ? ev.version : undefined,
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Provisioning API
// ---------------------------------------------------------------------------

async function provision(
  sessionId: string,
  cwd: string,
  gitBranch: string | undefined,
  sessionVersion: string | undefined,
  sessionStartedAt: string | undefined,
  parentRunId?: string,
  isSubagent?: boolean,
): Promise<ProvisionResponse> {
  const res = await fetch(`${HOST_BRIDGE_URL}/agents/host-session/provision`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${HOST_BRIDGE_TOKEN}`,
    },
    body: JSON.stringify({
      sessionId,
      cwd,
      hostname: HOST_NAME,
      gitBranch,
      sessionVersion,
      sessionStartedAt,
      ...(parentRunId !== undefined ? { parentRunId } : {}),
      ...(isSubagent !== undefined ? { isSubagent } : {}),
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`provision ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<ProvisionResponse>;
}

async function patchRunComplete(runId: string, reason: string): Promise<void> {
  try {
    const res = await fetch(
      `${HOST_BRIDGE_URL}/agents/host-session/runs/${runId}/complete`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${HOST_BRIDGE_TOKEN}`,
        },
        body: JSON.stringify({ reason }),
      },
    );
    if (!res.ok) {
      console.warn(
        `[host-supervisor] PATCH complete runId=${runId} status=${res.status}`,
      );
    }
  } catch (err) {
    console.warn(`[host-supervisor] PATCH complete error: ${err}`);
  }
}

// ---------------------------------------------------------------------------
// Child process management
// ---------------------------------------------------------------------------

function spawnChild(entry: SessionEntry): ChildProcess {
  const args = [
    CLI_BIN,
    "--tail-file",
    entry.filePath,
    "--adapter",
    "claude-transcript",
    "--agent-id",
    entry.agentId,
    "--run-id",
    entry.runId,
    "--conversation-id",
    entry.conversationId,
    "--ingest-token",
    entry.ingestToken,
    "--state-dir",
    STATE_DIR,
    "--messenger-core-url",
    MESSENGER_URL,
  ];

  const proc = spawn("node", args, {
    stdio: ["ignore", "pipe", "pipe"],
    detached: false,
  });

  const tag = entry.sessionId.slice(0, 8);
  proc.stdout?.on("data", (chunk: Buffer) => {
    process.stdout.write(`[child:${tag}] ${chunk}`);
  });
  proc.stderr?.on("data", (chunk: Buffer) => {
    process.stderr.write(`[child:${tag}] ${chunk}`);
  });
  proc.on("exit", (code, signal) => {
    console.log(
      `[host-supervisor] child ${tag} exited code=${code} signal=${signal}`,
    );
    children.delete(entry.sessionId);
  });

  console.log(
    `[host-supervisor] spawned child pid=${proc.pid} session=${tag} cwd=${entry.cwd}`,
  );
  return proc;
}

async function killChild(sessionId: string): Promise<void> {
  const ch = children.get(sessionId);
  if (!ch) return;

  await patchRunComplete(ch.runId, "idle");
  ch.proc.kill("SIGTERM");

  const graceful = await new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => {
      ch.proc.kill("SIGKILL");
      resolve(false);
    }, 5000);
    ch.proc.on("exit", () => {
      clearTimeout(timer);
      resolve(true);
    });
  });

  console.log(
    `[host-supervisor] child ${sessionId.slice(0, 8)} ${graceful ? "terminated" : "killed"}`,
  );
  children.delete(sessionId);
}

// ---------------------------------------------------------------------------
// Scan
// ---------------------------------------------------------------------------

interface ActiveFile {
  sessionId: string;
  filePath: string;
  mtimeMs: number;
  /** Set for subagent files — the UUID of the parent session directory */
  parentSessionId?: string;
  isSubagent?: boolean;
}

function scanActiveFiles(): ActiveFile[] {
  const now = Date.now();
  const result: ActiveFile[] = [];

  let projectDirs: fs.Dirent[];
  try {
    projectDirs = fs
      .readdirSync(TRANSCRIPT_ROOT, { withFileTypes: true })
      .filter((d) => d.isDirectory());
  } catch {
    return result;
  }

  for (const dir of projectDirs) {
    const dirPath = path.join(TRANSCRIPT_ROOT, dir.name);
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch {
      continue;
    }

    // Top-level session JSOLs: <projectDir>/<sessionId>.jsonl
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".jsonl")) continue;
      const filePath = path.join(dirPath, entry.name);
      try {
        const stat = fs.statSync(filePath);
        if (now - stat.mtimeMs <= HOST_SESSION_IDLE_MIN_MS) {
          result.push({
            sessionId: entry.name.slice(0, -".jsonl".length),
            filePath,
            mtimeMs: stat.mtimeMs,
          });
        }
      } catch {
        continue;
      }
    }

    // Subagent JSONLs: <projectDir>/<parentSessionUUID>/subagents/agent-*.jsonl
    for (const entry of entries) {
      if (!entry.isDirectory() || !UUID_RE.test(entry.name)) continue;
      const subagentsPath = path.join(dirPath, entry.name, "subagents");
      let agentFiles: fs.Dirent[];
      try {
        agentFiles = fs
          .readdirSync(subagentsPath, { withFileTypes: true })
          .filter((f) => f.isFile() && f.name.endsWith(".jsonl"));
      } catch {
        continue;
      }

      for (const file of agentFiles) {
        const filePath = path.join(subagentsPath, file.name);
        const stem = file.name.slice(0, -".jsonl".length);
        // Accept "agent-<uuid>" or plain "<uuid>"
        const sessionId = stem.startsWith("agent-") ? stem.slice("agent-".length) : stem;
        if (!UUID_RE.test(sessionId)) continue;

        try {
          const stat = fs.statSync(filePath);
          if (now - stat.mtimeMs <= HOST_SESSION_IDLE_MIN_MS) {
            result.push({
              sessionId,
              filePath,
              mtimeMs: stat.mtimeMs,
              parentSessionId: entry.name,
              isSubagent: true,
            });
          }
        } catch {
          continue;
        }
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main tick
// ---------------------------------------------------------------------------

async function tick(): Promise<void> {
  const activeFiles = scanActiveFiles();
  const now = Date.now();

  await withLock(async () => {
    const sessions = loadSessions();

    // 1. Process active files — provision + spawn
    for (const { sessionId, filePath, mtimeMs, isSubagent, parentSessionId } of activeFiles) {
      const existing = sessions[sessionId];

      if (!existing) {
        // New session — provision then spawn
        const info = await readEnvelopeInfo(filePath);

        // For subagents, fall back to parent session's cwd if not in envelope
        const parentEntry =
          isSubagent && parentSessionId ? sessions[parentSessionId] : undefined;
        const cwd = info?.cwd ?? parentEntry?.cwd;

        if (!cwd) {
          console.warn(
            `[host-supervisor] skip ${sessionId.slice(0, 8)}: no cwd in envelope`,
          );
          continue;
        }

        // Resolve parentRunId from the sessions store (only if parent is running)
        const parentRunId =
          isSubagent && parentSessionId && parentEntry?.runStatus === "running"
            ? parentEntry.runId
            : undefined;

        if (isSubagent && !parentRunId) {
          console.log(
            `[host-supervisor] subagent ${sessionId.slice(0, 8)}: parent run not active — provisioning as standalone`,
          );
        }

        let prov: ProvisionResponse;
        try {
          prov = await provision(
            sessionId,
            cwd,
            info?.gitBranch ?? parentEntry?.gitBranch,
            info?.version ?? parentEntry?.sessionVersion,
            new Date(mtimeMs).toISOString(),
            parentRunId,
            isSubagent,
          );
        } catch (err) {
          console.error(
            `[host-supervisor] provision failed ${sessionId.slice(0, 8)}: ${err}`,
          );
          continue;
        }

        const entry: SessionEntry = {
          sessionId,
          filePath,
          cwd,
          hostname: HOST_NAME,
          gitBranch: info?.gitBranch ?? parentEntry?.gitBranch,
          sessionVersion: info?.version ?? parentEntry?.sessionVersion,
          sessionStartedAt: new Date(mtimeMs).toISOString(),
          agentId: prov.agentId,
          conversationId: prov.conversationId,
          runId: prov.runId,
          ingestToken: prov.ingestToken,
          runStatus: "running",
          ...(isSubagent ? { isSubagent: true, parentRunId } : {}),
        };

        const proc = spawnChild(entry);
        entry.pid = proc.pid;
        children.set(sessionId, { proc, runId: prov.runId });
        sessions[sessionId] = entry;
        continue;
      }

      if (existing.runStatus === "completed") {
        // Re-activation: file is active but run was marked complete.
        // Only re-activate if the file was written after completedAt.
        const completedAt = existing.completedAt
          ? new Date(existing.completedAt).getTime()
          : 0;
        if (mtimeMs <= completedAt) continue;

        // For re-activated subagent runs, re-resolve parentRunId from live sessions
        const reactivatedParentRunId =
          existing.isSubagent && parentSessionId
            ? (sessions[parentSessionId]?.runStatus === "running"
                ? sessions[parentSessionId].runId
                : undefined)
            : undefined;

        let prov: ProvisionResponse;
        try {
          prov = await provision(
            sessionId,
            existing.cwd,
            existing.gitBranch,
            existing.sessionVersion,
            new Date(mtimeMs).toISOString(),
            reactivatedParentRunId,
            existing.isSubagent,
          );
        } catch (err) {
          console.error(
            `[host-supervisor] re-provision failed ${sessionId.slice(0, 8)}: ${err}`,
          );
          continue;
        }

        const entry: SessionEntry = {
          ...existing,
          runId: prov.runId,
          conversationId: prov.conversationId,
          ingestToken: prov.ingestToken,
          runStatus: "running",
          completedAt: undefined,
          ...(existing.isSubagent ? { parentRunId: reactivatedParentRunId } : {}),
        };

        const proc = spawnChild(entry);
        entry.pid = proc.pid;
        children.set(sessionId, { proc, runId: prov.runId });
        sessions[sessionId] = entry;
        continue;
      }

      // Running session — ensure child is alive (crash/restart recovery)
      if (!children.has(sessionId)) {
        const proc = spawnChild(existing);
        existing.pid = proc.pid;
        children.set(sessionId, { proc, runId: existing.runId });
        sessions[sessionId] = existing;
      }
    }

    // 2. Idle reaping — running sessions whose file has gone quiet
    const activeIds = new Set(activeFiles.map((f) => f.sessionId));
    for (const [sessionId, entry] of Object.entries(sessions)) {
      if (entry.runStatus !== "running") continue;
      if (activeIds.has(sessionId)) continue;

      // Double-check file mtime (file may have been missed by scan)
      let isIdle = true;
      try {
        const stat = fs.statSync(entry.filePath);
        if (now - stat.mtimeMs <= HOST_SESSION_IDLE_MIN_MS) isIdle = false;
      } catch {
        // File gone — treat as idle
      }

      if (!isIdle) continue;

      console.log(
        `[host-supervisor] idle reaping ${sessionId.slice(0, 8)} cwd=${entry.cwd}`,
      );
      await killChild(sessionId);
      sessions[sessionId] = {
        ...entry,
        runStatus: "completed",
        completedAt: new Date().toISOString(),
      };
    }

    saveSessions(sessions);
  });
}

// ---------------------------------------------------------------------------
// Crash recovery — called once at startup
// ---------------------------------------------------------------------------

async function crashRecovery(): Promise<void> {
  const now = Date.now();
  const sessions = loadSessions();
  let dirty = false;

  for (const [sessionId, entry] of Object.entries(sessions)) {
    if (entry.runStatus !== "running") continue;

    let active = false;
    try {
      const stat = fs.statSync(entry.filePath);
      active = now - stat.mtimeMs <= HOST_SESSION_IDLE_MIN_MS;
    } catch {
      // File gone
    }

    if (active) {
      console.log(
        `[host-supervisor] crash recovery: relaunching ${sessionId.slice(0, 8)}`,
      );
      const proc = spawnChild(entry);
      entry.pid = proc.pid;
      children.set(sessionId, { proc, runId: entry.runId });
      sessions[sessionId] = entry;
    } else {
      console.log(
        `[host-supervisor] crash recovery: marking idle ${sessionId.slice(0, 8)}`,
      );
      await patchRunComplete(entry.runId, "idle");
      sessions[sessionId] = {
        ...entry,
        runStatus: "completed",
        completedAt: new Date().toISOString(),
      };
    }
    dirty = true;
  }

  if (dirty) saveSessions(sessions);
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

let shuttingDown = false;

async function shutdown(): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log("[host-supervisor] graceful shutdown");

  const exitPromises: Promise<void>[] = [];

  await withLock(async () => {
    const sessions = loadSessions();

    for (const [sessionId, ch] of children) {
      const entry = sessions[sessionId];
      await patchRunComplete(ch.runId, "shutdown");
      ch.proc.kill("SIGTERM");

      exitPromises.push(
        new Promise<void>((resolve) => {
          const timer = setTimeout(() => {
            ch.proc.kill("SIGKILL");
            resolve();
          }, 5000);
          ch.proc.on("exit", () => {
            clearTimeout(timer);
            resolve();
          });
        }),
      );

      if (entry) {
        sessions[sessionId] = {
          ...entry,
          runStatus: "completed",
          completedAt: new Date().toISOString(),
        };
      }
    }

    saveSessions(sessions);
  });

  await Promise.all(exitPromises);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  fs.mkdirSync(STATE_DIR, { recursive: true });

  console.log("[host-supervisor] starting v2");
  console.log(`[host-supervisor] TRANSCRIPT_ROOT=${TRANSCRIPT_ROOT}`);
  console.log(`[host-supervisor] STATE_DIR=${STATE_DIR}`);
  console.log(`[host-supervisor] CLI_BIN=${CLI_BIN}`);
  console.log(`[host-supervisor] POLL_SECS=${POLL_SECS}`);
  console.log(
    `[host-supervisor] HOST_SESSION_IDLE_MIN=${HOST_SESSION_IDLE_MIN}m`,
  );

  if (!fs.existsSync(CLI_BIN)) {
    console.error(
      `[host-supervisor] fatal: CLI binary not found: ${CLI_BIN}`,
    );
    console.error(
      `[host-supervisor] run: cd clicore2messenger && pnpm build`,
    );
    process.exit(1);
  }

  process.on("SIGTERM", () => {
    void shutdown();
  });
  process.on("SIGINT", () => {
    void shutdown();
  });

  await crashRecovery();

  while (!shuttingDown) {
    try {
      await tick();
    } catch (err) {
      console.error(`[host-supervisor] tick error: ${err}`);
    }
    await sleep(POLL_SECS * 1000);
  }
}

main().catch((err) => {
  console.error("[host-supervisor] fatal:", err);
  process.exit(1);
});
