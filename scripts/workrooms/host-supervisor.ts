#!/usr/bin/env -S node --experimental-strip-types
/**
 * host-supervisor — PM2 process that periodically checks DLQ overflow.
 *
 * Env:
 *   DLQ_STATE_DIR      (default: ~/state/claude-bridge)
 *   DLQ_ALERT_EVENTS   event count threshold (default: 1000)
 *   DLQ_ALERT_BYTES    total size threshold in bytes (default: 10485760 = 10 MB)
 *   DLQ_CHECK_INTERVAL_MS  check cadence in ms (default: 300000 = 5 min)
 *
 * Output: structured JSON log lines; PM2 captures these via stdout/stderr.
 * Alert lines go to stderr so PM2 can route them separately if desired.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

const STATE_DIR = process.env.DLQ_STATE_DIR ?? path.join(os.homedir(), "state", "claude-bridge");
const ALERT_EVENTS = parseInt(process.env.DLQ_ALERT_EVENTS ?? "1000", 10);
const ALERT_BYTES = parseInt(process.env.DLQ_ALERT_BYTES ?? "10485760", 10);
const CHECK_INTERVAL_MS = parseInt(process.env.DLQ_CHECK_INTERVAL_MS ?? "300000", 10);

function checkDlq(): void {
  let entries: string[];
  try {
    entries = fs.readdirSync(STATE_DIR);
  } catch {
    return;
  }

  let totalFiles = 0;
  let totalEvents = 0;
  let totalBytes = 0;

  for (const entry of entries) {
    if (!entry.endsWith(".dlq.ndjson")) continue;
    const filePath = path.join(STATE_DIR, entry);
    try {
      const stat = fs.statSync(filePath);
      const raw = fs.readFileSync(filePath, "utf8");
      const events = raw.split("\n").filter((l) => l.trim()).length;
      totalFiles++;
      totalEvents += events;
      totalBytes += stat.size;
    } catch {
      // ignore unreadable files
    }
  }

  const now = new Date().toISOString();
  const alert = totalEvents > ALERT_EVENTS || totalBytes > ALERT_BYTES;

  if (alert) {
    process.stderr.write(
      JSON.stringify({
        level: "warn",
        alert: "dlq_overflow",
        totalFiles,
        totalEvents,
        totalBytes,
        thresholdEvents: ALERT_EVENTS,
        thresholdBytes: ALERT_BYTES,
        checkedAt: now,
      }) + "\n",
    );
  } else if (totalFiles > 0) {
    process.stdout.write(
      JSON.stringify({
        level: "info",
        check: "dlq_ok",
        totalFiles,
        totalEvents,
        totalBytes,
        checkedAt: now,
      }) + "\n",
    );
  }
}

process.stdout.write(
  JSON.stringify({
    level: "info",
    msg: "host-supervisor started",
    stateDir: STATE_DIR,
    alertEvents: ALERT_EVENTS,
    alertBytes: ALERT_BYTES,
    checkIntervalMs: CHECK_INTERVAL_MS,
  }) + "\n",
);

checkDlq();
setInterval(checkDlq, CHECK_INTERVAL_MS);
