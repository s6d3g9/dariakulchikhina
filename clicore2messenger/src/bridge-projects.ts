#!/usr/bin/env -S node --experimental-strip-types
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import * as child_process from "node:child_process";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BridgeProjectsFile {
  version: 1;
  mappings: Record<string, string>;
}

interface ProjectDirInfo {
  cwd: string;
  sessionCount: number;
  lastActiveMs: number;
  mappedTo: string | null;
}

// UUID v4 pattern — used to guard psql args
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// File path resolution
// ---------------------------------------------------------------------------

function resolveFilePath(): string {
  const envPath = process.env.HOST_BRIDGE_PROJECTS_FILE;
  if (envPath) return envPath;
  return path.join(os.homedir(), ".host-bridge-projects.json");
}

// ---------------------------------------------------------------------------
// Read / write helpers
// ---------------------------------------------------------------------------

function readFile(filePath: string): BridgeProjectsFile {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      (parsed as Record<string, unknown>).version !== 1 ||
      typeof (parsed as Record<string, unknown>).mappings !== "object"
    ) {
      console.error(
        "[bridge-projects] malformed file — expected {version:1, mappings:{}}",
      );
      process.exit(1);
    }
    return parsed as BridgeProjectsFile;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return { version: 1, mappings: {} };
    }
    console.error(`[bridge-projects] failed to read ${filePath}: ${err}`);
    process.exit(1);
  }
}

function writeFile(filePath: string, data: BridgeProjectsFile): void {
  const tmp = `${filePath}.tmp.${process.pid}`;
  const json = JSON.stringify(data, null, 2) + "\n";
  try {
    // Mode 644: this file holds non-secret cwd→projectId mappings that the
    // messenger-core daemon (running under a different uid in some setups)
    // must be able to read. Do NOT widen further; the file lives in the
    // operator's home dir.
    fs.writeFileSync(tmp, json, { mode: 0o644 });
    fs.renameSync(tmp, filePath);
    fs.chmodSync(filePath, 0o644);
  } catch (err) {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
    console.error(`[bridge-projects] failed to write ${filePath}: ${err}`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Claude project dir helpers (shared pattern with bridge-cleanup)
// ---------------------------------------------------------------------------

function cwdFromDirName(dirName: string): string {
  const parts = dirName.split("--");
  return parts.map((p) => p.replace(/-/g, "/")).join("-");
}

function cwdFromJsonl(jsonlFile: string): string | null {
  try {
    const fd = fs.openSync(jsonlFile, "r");
    const buf = Buffer.alloc(8192);
    const bytesRead = fs.readSync(fd, buf, 0, buf.length, 0);
    fs.closeSync(fd);
    const chunk = buf.slice(0, bytesRead).toString("utf8");
    for (const line of chunk.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const envelope = JSON.parse(trimmed) as Record<string, unknown>;
        if (typeof envelope.cwd === "string") return envelope.cwd;
      } catch {
        // malformed line — skip
      }
    }
    return null;
  } catch {
    return null;
  }
}

function newestJsonlMtime(dirPath: string): number {
  let newest = 0;
  try {
    for (const entry of fs.readdirSync(dirPath)) {
      if (!entry.endsWith(".jsonl")) continue;
      try {
        const st = fs.statSync(path.join(dirPath, entry));
        if (st.mtimeMs > newest) newest = st.mtimeMs;
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
  return newest;
}

function countJsonlFiles(dirPath: string): number {
  try {
    return fs.readdirSync(dirPath).filter((f) => f.endsWith(".jsonl")).length;
  } catch {
    return 0;
  }
}

function formatDate(ms: number): string {
  if (ms === 0) return "never";
  return new Date(ms).toISOString().slice(0, 16).replace("T", " ");
}

// ---------------------------------------------------------------------------
// Scan claude project dirs → unique-cwd aggregation
// ---------------------------------------------------------------------------

function scanCwdMap(
  projectsDir: string,
  daysThreshold: number,
): ProjectDirInfo[] {
  let entries: string[];
  try {
    entries = fs.readdirSync(projectsDir);
  } catch {
    return [];
  }

  const thresholdMs = Date.now() - daysThreshold * 24 * 60 * 60 * 1000;
  const byCwd = new Map<string, { sessionCount: number; lastActiveMs: number }>();

  for (const dirName of entries) {
    const dirPath = path.join(projectsDir, dirName);
    try {
      if (!fs.statSync(dirPath).isDirectory()) continue;
    } catch {
      continue;
    }

    const lastActiveMs = newestJsonlMtime(dirPath);
    if (lastActiveMs < thresholdMs) continue;

    const sessionCount = countJsonlFiles(dirPath);
    const firstJsonl = fs.readdirSync(dirPath).find((f) => f.endsWith(".jsonl"));
    const cwd = firstJsonl
      ? (cwdFromJsonl(path.join(dirPath, firstJsonl)) ?? cwdFromDirName(dirName))
      : cwdFromDirName(dirName);

    const existing = byCwd.get(cwd);
    if (existing) {
      existing.sessionCount += sessionCount;
      if (lastActiveMs > existing.lastActiveMs) existing.lastActiveMs = lastActiveMs;
    } else {
      byCwd.set(cwd, { sessionCount, lastActiveMs });
    }
  }

  return Array.from(byCwd.entries())
    .map(([cwd, info]) => ({ cwd, ...info, mappedTo: null }))
    .sort((a, b) => b.lastActiveMs - a.lastActiveMs);
}

// ---------------------------------------------------------------------------
// Subcommands
// ---------------------------------------------------------------------------

function cmdList(_args: string[]): void {
  const filePath = resolveFilePath();
  const data = readFile(filePath);
  const entries = Object.entries(data.mappings);

  if (entries.length === 0) {
    console.log("[bridge-projects] No mappings defined.");
    console.log(`File: ${filePath}`);
    return;
  }

  const COL_CWD = 52;
  const COL_PID = 38;

  const header = [
    "cwd".padEnd(COL_CWD),
    "messengerProjectId".padEnd(COL_PID),
  ].join("  ");
  console.log(header);
  console.log("-".repeat(header.length));

  for (const [cwd, projectId] of entries) {
    const row = [
      cwd.slice(0, COL_CWD).padEnd(COL_CWD),
      projectId.padEnd(COL_PID),
    ].join("  ");
    console.log(row);
  }

  console.log(`\nTotal: ${entries.length} mapping(s)  |  File: ${filePath}`);
}

function cmdScan(args: string[]): void {
  const daysIdx = args.indexOf("--days");
  const days = daysIdx !== -1 ? parseInt(args[daysIdx + 1] ?? "30", 10) : 30;
  const projectsDir = path.join(os.homedir(), ".claude", "projects");

  const filePath = resolveFilePath();
  const data = readFile(filePath);

  const results = scanCwdMap(projectsDir, days);

  if (results.length === 0) {
    console.log(
      `[bridge-projects] No active project dirs in the last ${days} days.`,
    );
    return;
  }

  for (const r of results) {
    r.mappedTo = data.mappings[r.cwd] ?? null;
  }

  const COL_CWD = 50;
  const COL_CNT = 9;
  const COL_DATE = 17;

  const header = [
    "  cwd".padEnd(COL_CWD + 2),
    "sessions".padEnd(COL_CNT),
    "last_active".padEnd(COL_DATE),
    "mapped_to",
  ].join("  ");
  console.log(header);
  console.log("-".repeat(header.length));

  for (const r of results) {
    const prefix = r.mappedTo === null ? "* " : "  ";
    const row = [
      (prefix + r.cwd).slice(0, COL_CWD + 2).padEnd(COL_CWD + 2),
      String(r.sessionCount).padEnd(COL_CNT),
      formatDate(r.lastActiveMs).padEnd(COL_DATE),
      r.mappedTo ?? "(unmapped)",
    ].join("  ");
    console.log(row);
  }

  const unmappedCount = results.filter((r) => r.mappedTo === null).length;
  console.log(
    `\nTotal: ${results.length} active cwd(s)  |  ${unmappedCount} unmapped (*)  |  last ${days}d`,
  );
}

function cmdAdd(args: string[], verbName: "add" | "set"): void {
  const [cwd, projectId] = args;
  if (!cwd || !projectId) {
    console.error(
      `[bridge-projects] Usage: bridge-projects ${verbName} <cwd> <messengerProjectId>`,
    );
    process.exit(1);
  }

  if (!cwd.startsWith("/") || cwd.includes("..")) {
    console.error(
      `[bridge-projects] cwd must be an absolute path (got: ${cwd})`,
    );
    process.exit(1);
  }

  if (!UUID_RE.test(projectId)) {
    console.error(
      `[bridge-projects] projectId must be a UUID (got: ${projectId})`,
    );
    process.exit(1);
  }

  if (!fs.existsSync(cwd)) {
    console.error(
      `[bridge-projects] cwd does not exist on disk: ${cwd}\n` +
        "  (host-session provisioning will key on the exact cwd reported by the supervisor;\n" +
        "   if you really want to map a path that hasn't been created yet, pass --force.)",
    );
    if (!args.includes("--force")) process.exit(1);
  }

  const filePath = resolveFilePath();
  const data = readFile(filePath);
  const previous = data.mappings[cwd];
  data.mappings[cwd] = projectId;
  writeFile(filePath, data);
  if (previous && previous !== projectId) {
    console.log(`[bridge-projects] updated ${cwd}: ${previous} → ${projectId}`);
  } else {
    console.log(`[bridge-projects] ${verbName === "add" ? "added" : "set"} ${cwd} → ${projectId}`);
  }
  console.log(`File: ${filePath}`);
}

function cmdRemove(args: string[], verbName: "remove" | "unset"): void {
  const [cwd] = args;
  if (!cwd) {
    console.error(`[bridge-projects] Usage: bridge-projects ${verbName} <cwd>`);
    process.exit(1);
  }

  const filePath = resolveFilePath();
  const data = readFile(filePath);

  if (!(cwd in data.mappings)) {
    console.log(`[bridge-projects] ${cwd} is not mapped — nothing to do.`);
    return;
  }

  delete data.mappings[cwd];
  writeFile(filePath, data);
  console.log(`[bridge-projects] ${verbName === "remove" ? "removed" : "unset"} ${cwd}`);
}

// `verify` (alias `validate`) does two checks per mapping entry:
//   1. cwd still exists on disk (operator may have deleted/renamed the worktree),
//   2. projectId still resolves to a non-deleted row in `messenger_projects`.
//
// The database check is done via psql against `DATABASE_URL`. The spec mentions
// hitting `GET /messenger-projects/:id` over `MESSENGER_URL`, but that endpoint
// requires session-cookie auth and the bridge CLI runs on a headless host —
// going via DATABASE_URL is the same correctness signal without dragging an
// auth cookie into operator workflows. If you want the REST path, set both
// MESSENGER_URL and a session token in the env and we can wire it later.
function cmdVerify(_args: string[]): void {
  const filePath = resolveFilePath();
  const data = readFile(filePath);
  const entries = Object.entries(data.mappings);

  if (entries.length === 0) {
    console.log("[bridge-projects] No mappings to verify.");
    return;
  }

  // 1. cwd-exists-on-disk check (does not require DB).
  const missingCwds = entries.filter(([cwd]) => !fs.existsSync(cwd));
  if (missingCwds.length > 0) {
    console.error("[bridge-projects] cwd no longer exists on disk:");
    for (const [cwd, id] of missingCwds) {
      console.error(`  ${cwd}  →  ${id}`);
    }
    // Continue to the DB check anyway so operators see the full picture.
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error(
      "[bridge-projects] DATABASE_URL is not set — cannot verify project IDs against database.\n" +
        "  Set DATABASE_URL to the Daria Postgres connection string and retry.",
    );
    process.exit(1);
  }

  // Validate all IDs look like UUIDs before sending to psql.
  const nonUuid = entries.filter(([, id]) => !UUID_RE.test(id));
  if (nonUuid.length > 0) {
    console.error("[bridge-projects] Non-UUID project IDs found (broken format):");
    for (const [cwd, id] of nonUuid) {
      console.error(`  ${cwd}  →  ${id}`);
    }
    process.exit(1);
  }

  const ids = entries.map(([, id]) => id);
  // Build a VALUES list safe for SQL — all values are validated UUIDs above.
  const valuesList = ids.map((id) => `'${id}'::uuid`).join(", ");
  const query =
    `SELECT id::text FROM messenger_projects WHERE id IN (${valuesList}) AND deleted_at IS NULL;`;

  const result = child_process.spawnSync("psql", [dbUrl, "--tuples-only", "--no-align", "--command", query], {
    encoding: "utf8",
    timeout: 10_000,
  });

  if (result.error || result.status !== 0) {
    const msg = result.error?.message ?? result.stderr ?? "non-zero exit";
    console.error(`[bridge-projects] psql failed: ${msg}`);
    process.exit(1);
  }

  const foundIds = new Set(
    (result.stdout ?? "")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0),
  );

  const brokenIds = entries.filter(([, id]) => !foundIds.has(id));

  if (brokenIds.length === 0 && missingCwds.length === 0) {
    console.log(`[bridge-projects] All ${entries.length} mapping(s) are valid.`);
    return;
  }

  if (brokenIds.length > 0) {
    console.error(`[bridge-projects] ${brokenIds.length} broken project reference(s):`);
    for (const [cwd, id] of brokenIds) {
      console.error(`  ${cwd}  →  ${id}  (not found / soft-deleted in messenger_projects)`);
    }
  }
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function printUsage(): void {
  console.error(
    [
      "Usage:",
      "  clicore2messenger bridge-projects list",
      "  clicore2messenger bridge-projects scan [--days N]",
      "  clicore2messenger bridge-projects add <cwd> <messengerProjectId> [--force]",
      "  clicore2messenger bridge-projects remove <cwd>",
      "  clicore2messenger bridge-projects verify",
      "",
      "Aliases: set=add, unset=remove, validate=verify",
    ].join("\n"),
  );
}

export function runBridgeProjects(args: string[]): void {
  const subcommand = args[0];

  if (subcommand === "list") {
    cmdList(args.slice(1));
  } else if (subcommand === "scan") {
    cmdScan(args.slice(1));
  } else if (subcommand === "add") {
    cmdAdd(args.slice(1), "add");
  } else if (subcommand === "set") {
    cmdAdd(args.slice(1), "set");
  } else if (subcommand === "remove") {
    cmdRemove(args.slice(1), "remove");
  } else if (subcommand === "unset") {
    cmdRemove(args.slice(1), "unset");
  } else if (subcommand === "verify" || subcommand === "validate") {
    cmdVerify(args.slice(1));
  } else {
    printUsage();
    process.exit(1);
  }
}
