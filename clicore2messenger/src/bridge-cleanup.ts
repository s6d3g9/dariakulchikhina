#!/usr/bin/env -S node --experimental-strip-types
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProjectDirInfo {
  dirName: string;
  dirPath: string;
  cwd: string;
  cwdExists: boolean;
  lastActiveMs: number;
  totalBytes: number;
}

interface SessionEntry {
  runStatus?: string;
  completedAt?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derive cwd from Claude Code's project-dir naming convention.
 * Claude Code encodes the cwd as the dir name with '/' → '-'.
 * Best-effort only — literal hyphens in path segments are ambiguous;
 * JSONL-sourced cwd is authoritative when available.
 */
function cwdFromDirName(dirName: string): string {
  // Split on '--' (literal hyphens in original path), map remaining '-' to '/'
  const parts = dirName.split("--");
  return parts.map((p) => p.replace(/-/g, "/")).join("-");
}

/**
 * Scan the first few lines of a JSONL file for a `cwd` field.
 * Newer Claude Code versions (≥2.1.114) embed `cwd` in every message envelope.
 */
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

/** Newest mtime (ms) among *.jsonl files in a dir, or 0 if none. */
function newestJsonlMtime(dirPath: string): number {
  let newest = 0;
  try {
    for (const entry of fs.readdirSync(dirPath)) {
      if (!entry.endsWith(".jsonl")) continue;
      try {
        const st = fs.statSync(path.join(dirPath, entry));
        if (st.mtimeMs > newest) newest = st.mtimeMs;
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore unreadable dir
  }
  return newest;
}

/** Sum of file sizes (bytes) in a dir — single level only. */
function totalDirBytes(dirPath: string): number {
  let total = 0;
  try {
    for (const entry of fs.readdirSync(dirPath)) {
      try {
        total += fs.statSync(path.join(dirPath, entry)).size;
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
  return total;
}

function pathExists(p: string): boolean {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
  return `${(bytes / 1024 / 1024).toFixed(1)}M`;
}

function formatDate(ms: number): string {
  if (ms === 0) return "never";
  return new Date(ms).toISOString().slice(0, 16).replace("T", " ");
}

// ---------------------------------------------------------------------------
// Core scan
// ---------------------------------------------------------------------------

function scanProjectDirs(projectsDir: string): ProjectDirInfo[] {
  const results: ProjectDirInfo[] = [];

  let entries: string[];
  try {
    entries = fs.readdirSync(projectsDir);
  } catch {
    return results;
  }

  for (const dirName of entries) {
    const dirPath = path.join(projectsDir, dirName);
    try {
      if (!fs.statSync(dirPath).isDirectory()) continue;
    } catch {
      continue;
    }

    const lastActiveMs = newestJsonlMtime(dirPath);
    const totalBytes = totalDirBytes(dirPath);

    // Try JSONL envelope first; fall back to dir-name decoding.
    const firstJsonl = fs
      .readdirSync(dirPath)
      .find((f) => f.endsWith(".jsonl"));
    const cwd = firstJsonl
      ? (cwdFromJsonl(path.join(dirPath, firstJsonl)) ?? cwdFromDirName(dirName))
      : cwdFromDirName(dirName);

    const cwdExists = pathExists(cwd);

    results.push({ dirName, dirPath, cwd, cwdExists, lastActiveMs, totalBytes });
  }

  // Most-recently-active first
  return results.sort((a, b) => b.lastActiveMs - a.lastActiveMs);
}

// ---------------------------------------------------------------------------
// Subcommands
// ---------------------------------------------------------------------------

function cmdScanProjects(args: string[]): void {
  const daysIdx = args.indexOf("--days");
  const days = daysIdx !== -1 ? parseInt(args[daysIdx + 1] ?? "30", 10) : 30;
  const projectsDir = path.join(os.homedir(), ".claude", "projects");
  const thresholdMs = Date.now() - days * 24 * 60 * 60 * 1000;

  const dirs = scanProjectDirs(projectsDir);

  // Column widths
  const COL_DIR = 42;
  const COL_CWD = 52;

  const header = [
    "dir".padEnd(COL_DIR),
    "cwd".padEnd(COL_CWD),
    "cwd_exists".padEnd(10),
    "last_active".padEnd(17),
    "total_size".padEnd(10),
    "status",
  ].join("  ");
  console.log(header);
  console.log("-".repeat(header.length));

  for (const info of dirs) {
    const status = info.lastActiveMs > thresholdMs ? "active" : "stale";
    const row = [
      info.dirName.slice(0, COL_DIR).padEnd(COL_DIR),
      info.cwd.slice(0, COL_CWD).padEnd(COL_CWD),
      (info.cwdExists ? "yes" : "NO").padEnd(10),
      formatDate(info.lastActiveMs).padEnd(17),
      formatBytes(info.totalBytes).padEnd(10),
      status,
    ].join("  ");
    console.log(row);
  }

  console.log(`\nTotal: ${dirs.length} project dirs (stale threshold: ${days}d)`);
}

function cmdArchiveProjects(args: string[], dryRun: boolean): void {
  const daysIdx = args.indexOf("--days");
  if (daysIdx === -1) {
    console.error("[bridge-cleanup] --days is required for archive-projects");
    process.exit(1);
  }
  const days = parseInt(args[daysIdx + 1] ?? "0", 10);

  const destIdx = args.indexOf("--dest");
  if (destIdx === -1) {
    console.error("[bridge-cleanup] --dest is required for archive-projects");
    process.exit(1);
  }
  const dest = args[destIdx + 1];
  if (!dest) {
    console.error("[bridge-cleanup] --dest value is missing");
    process.exit(1);
  }

  const projectsDir = path.join(os.homedir(), ".claude", "projects");
  const nowMs = Date.now();
  const thresholdMs = nowMs - days * 24 * 60 * 60 * 1000;
  // A session active in the last 30 minutes is never archived, regardless of --days.
  const activeWindowMs = 30 * 60 * 1000;

  const dirs = scanProjectDirs(projectsDir);
  const toArchive = dirs.filter(
    (info) =>
      info.lastActiveMs < thresholdMs &&
      !info.cwdExists &&
      nowMs - info.lastActiveMs > activeWindowMs,
  );

  if (toArchive.length === 0) {
    console.log("[bridge-cleanup] Nothing to archive.");
    return;
  }

  if (dryRun) {
    console.log(
      `[bridge-cleanup] DRY-RUN — would archive ${toArchive.length} dir(s) to ${dest}:`,
    );
    for (const info of toArchive) {
      console.log(
        `  ${info.dirName}  (last_active: ${formatDate(info.lastActiveMs)}, cwd: ${info.cwd})`,
      );
    }
    return;
  }

  fs.mkdirSync(dest, { recursive: true });
  let moved = 0;
  for (const info of toArchive) {
    const destPath = path.join(dest, info.dirName);
    try {
      fs.renameSync(info.dirPath, destPath);
      console.log(`[bridge-cleanup] archived: ${info.dirName} → ${destPath}`);
      moved++;
    } catch (err) {
      console.error(`[bridge-cleanup] failed to archive ${info.dirName}: ${err}`);
    }
  }
  console.log(`[bridge-cleanup] Done. Archived ${moved}/${toArchive.length} dir(s).`);
}

function cmdPurgeSessions(args: string[], dryRun: boolean): void {
  const daysIdx = args.indexOf("--days");
  const days = daysIdx !== -1 ? parseInt(args[daysIdx + 1] ?? "90", 10) : 90;

  const fileIdx = args.indexOf("--sessions-file");
  const sessionsFile =
    fileIdx !== -1
      ? args[fileIdx + 1]!
      : path.join(os.homedir(), "state", "claude-sessions", "sessions.json");

  const thresholdDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  let sessions: SessionEntry[];
  try {
    const raw = fs.readFileSync(sessionsFile, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      console.error("[bridge-cleanup] sessions.json must be a JSON array");
      process.exit(1);
    }
    sessions = parsed as SessionEntry[];
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      console.log("[bridge-cleanup] sessions.json not found — nothing to purge.");
      return;
    }
    console.error(`[bridge-cleanup] failed to read sessions.json: ${err}`);
    process.exit(1);
  }

  const toPurge = sessions.filter(
    (s) =>
      s.runStatus === "completed" &&
      typeof s.completedAt === "string" &&
      new Date(s.completedAt) < thresholdDate,
  );
  const toKeep = sessions.filter((s) => !toPurge.includes(s));

  if (toPurge.length === 0) {
    console.log("[bridge-cleanup] No completed sessions older than the threshold — nothing to purge.");
    return;
  }

  if (dryRun) {
    console.log(
      `[bridge-cleanup] DRY-RUN — would purge ${toPurge.length} session(s) from ${sessionsFile}:`,
    );
    for (const s of toPurge) {
      const preview = typeof s.sessionId === "string" ? s.sessionId : JSON.stringify(s).slice(0, 60);
      console.log(`  ${preview}  completedAt=${s.completedAt}`);
    }
    return;
  }

  fs.writeFileSync(sessionsFile, JSON.stringify(toKeep, null, 2) + "\n");
  console.log(
    `[bridge-cleanup] Purged ${toPurge.length} session(s). ${toKeep.length} remaining in ${sessionsFile}.`,
  );
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function printUsage(): void {
  console.error(
    [
      "Usage:",
      "  clicore2messenger bridge-cleanup scan-projects [--days N]",
      "  clicore2messenger bridge-cleanup archive-projects --days N --dest <path> [--dry-run]",
      "  clicore2messenger bridge-cleanup purge-sessions [--days N] [--sessions-file <path>] [--dry-run]",
    ].join("\n"),
  );
}

export function runBridgeCleanup(args: string[]): void {
  const subcommand = args[0];
  const dryRun = args.includes("--dry-run");

  if (subcommand === "scan-projects") {
    cmdScanProjects(args.slice(1));
  } else if (subcommand === "archive-projects") {
    cmdArchiveProjects(args.slice(1), dryRun);
  } else if (subcommand === "purge-sessions") {
    cmdPurgeSessions(args.slice(1), dryRun);
  } else {
    printUsage();
    process.exit(1);
  }
}
