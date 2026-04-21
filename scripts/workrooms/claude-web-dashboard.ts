#!/usr/bin/env node
/**
 * claude-web-dashboard — single-file HTTP+SSE server over ~/state/claude-sessions/.
 *
 * Serves a dark, minimalist dashboard where every live claude-session shows up
 * as a tab. Each tab streams the session's log (JSONL) parsed into
 * human-readable thinking / assistant / tool / result lines, plus token
 * counters, context-window progress, duration, and a per-day cost roll-up
 * vs the Max subscription budget.
 *
 * No npm dependencies. Just Node built-ins + minimal HTML/JS.
 *
 * Run on the server:
 *   ~/bin/claude-web-dashboard [--port 9090]
 *
 * From your laptop:
 *   ssh -L 9090:localhost:9090 daria-dev
 *   # or let VS Code Remote-SSH auto-forward the port
 *   open http://localhost:9090
 */

import { createServer } from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import {
  appendFileSync,
  createReadStream,
  existsSync,
  mkdirSync,
  promises as fsp,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { AsyncLocalStorage } from 'node:async_hooks';
const requestCtx = new AsyncLocalStorage();
import { homedir } from 'node:os';
import { join } from 'node:path';

// ────────────────────────── config ──────────────────────────

const HOME = homedir();
const DEFAULT_STATE_DIR = process.env.DASHBOARD_STATE_DIR || join(HOME, 'state/claude-sessions');
const DEFAULT_QUEUE_ROOT = process.env.DASHBOARD_QUEUE_DIR || join(HOME, 'state/queue');
const DEFAULT_WORKROOMS_ROOT = process.env.DASHBOARD_WORKROOMS_DIR || join(HOME, 'workrooms');
function stateDir() { return (requestCtx.getStore() as any)?.stateDir ?? DEFAULT_STATE_DIR; }
function archiveDir() { return join(stateDir(), 'archive'); }
function registry() { return join(stateDir(), '.registry.tsv'); }
function archiveRegistry() { return join(archiveDir(), '.registry.tsv'); }
function projectsFile() { return join(stateDir(), '.projects.json'); }
function workroomsRoot() { return (requestCtx.getStore() as any)?.workroomsDir ?? DEFAULT_WORKROOMS_ROOT; }
function queueRoot() { return (requestCtx.getStore() as any)?.queueDir ?? DEFAULT_QUEUE_ROOT; }
const BIN_CLAUDE_SESSION = join(HOME, 'bin/claude-session');

// Ensure archive dir exists + has a registry header (for default user at startup)
try {
  const _initArchiveDir = join(DEFAULT_STATE_DIR, 'archive');
  const _initArchiveRegistry = join(_initArchiveDir, '.registry.tsv');
  if (!existsSync(_initArchiveDir)) mkdirSync(_initArchiveDir, { recursive: true });
  if (!existsSync(_initArchiveRegistry)) {
    writeFileSync(_initArchiveRegistry, 'slug\tuuid\twindow\tworkroom\tmodel\tcreated\tarchived_at\n');
  }
} catch {}

// Heuristic: is this session an orchestrator/coordinator (shown in top row)?
function isOrchestratorSlug(slug) {
  return /orchestrator|coordinator|planner|manager/i.test(slug);
}

// Composer is the top layer of the hierarchy: user + assistant discuss
// strategy, triage, architecture. Composer instructs the orchestrator,
// orchestrator spawns workers. There is typically exactly one composer.
function isComposerSlug(slug) {
  return /^composer(-.*)?$/i.test(slug);
}

const QUEUE_DIRS = ['pending', 'running', 'done', 'failed'];

// Returns the body of a TASK.md (strips YAML frontmatter) and a frontmatter dict.
function parseTaskFile(file) {
  try {
    const txt = readFileSync(file, 'utf8');
    const fm = { };
    let body = txt;
    if (txt.startsWith('---')) {
      const end = txt.indexOf('\n---', 3);
      if (end > 0) {
        const header = txt.slice(3, end);
        body = txt.slice(end + 4);
        for (const ln of header.split('\n')) {
          const m = /^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/.exec(ln.trim());
          if (m) fm[m[1]] = m[2];
        }
      }
    }
    return { fm, body };
  } catch { return { fm: {}, body: '' }; }
}

// Extract dependency hints from a task body. We scan for a dependency "verb"
// (depends/wait/after/blocks), then collect any known slug mentioned in the
// 5-line window around it (the author may phrase the verb and the slug on
// different lines within a sentence).
function extractBodyDeps(body, allSlugs) {
  const deps = new Set();
  const lines = body.split('\n');
  const verb = /\b(depends?\s*on|wait\s*for|run\s*after|blocks?\s*on|after[^.\n]*merge|prerequisite)\b/i;
  for (let i = 0; i < lines.length; i++) {
    if (!verb.test(lines[i])) continue;
    // Window: [i-1 .. i+4] (verb line + next 4 lines, plus previous for backlinks)
    const from = Math.max(0, i - 1);
    const to = Math.min(lines.length, i + 5);
    const window = lines.slice(from, to).join('\n');
    for (const s of allSlugs) {
      if (window.includes(s)) deps.add(s);
    }
  }
  return [...deps];
}

async function computeDependencyEdges() {
  const edges = [];
  const active = readRegistry();
  const archive = readArchiveRegistry();
  const known = [...active, ...archive];
  const knownSlugs = known.map(r => r.slug);

  // (A) declared deps from TASK.md frontmatter/body in queue dirs
  for (const dir of QUEUE_DIRS) {
    const full = join(queueRoot(), dir);
    if (!existsSync(full)) continue;
    for (const name of readdirSync(full)) {
      if (!name.endsWith('.md')) continue;
      const id = name.replace(/\.md$/, '');
      // Map task id → session slug (id === slug in our current naming)
      const { fm, body } = parseTaskFile(join(full, name));
      // Frontmatter: depends_on can be inline "[a, b]" or list
      let declared = [];
      if (fm.depends_on) {
        declared = fm.depends_on
          .replace(/[\[\]]/g, '')
          .split(/[\s,]+/)
          .map(s => s.trim())
          .filter(Boolean);
      }
      // Body hints
      const hinted = extractBodyDeps(body, knownSlugs);
      const all = [...new Set([...declared, ...hinted])].filter(d => d !== id);
      for (const dep of all) {
        if (!knownSlugs.includes(dep)) continue;
        edges.push({ from: dep, to: id, kind: 'declared' });
      }
    }
  }

  // (B) orchestrator → worker: any worker whose `created` > orchestrator.created
  const orchs = known.filter(r => isOrchestratorSlug(r.slug));
  const workers = known.filter(r => !isOrchestratorSlug(r.slug));
  for (const o of orchs) {
    for (const w of workers) {
      if ((w.created || '') > (o.created || '')) {
        edges.push({ from: o.slug, to: w.slug, kind: 'spawned' });
      }
    }
  }

  // Deduplicate (declared + spawned can overlap for same pair)
  const seen = new Set();
  const unique = [];
  for (const e of edges) {
    const k = e.from + '→' + e.to;
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(e);
  }
  return unique;
}

const MAX_SUBSCRIPTION_BUDGET_USD = 200; // Anthropic Max tier
const CTX_WINDOW_LIMIT = 200_000;        // claude-sonnet-4-6 / haiku-4-5

// Find the TASK.md associated with a session slug. Checked in priority order:
// 1) live workroom  2) queue/{running,pending,done,failed}/<slug>.md
function findTaskFile(slug) {
  const live = join(workroomsRoot(), slug, 'TASK.md');
  if (existsSync(live)) return { path: live, location: 'workroom' };
  for (const dir of QUEUE_DIRS) {
    const f = join(queueRoot(), dir, `${slug}.md`);
    if (existsSync(f)) return { path: f, location: `queue/${dir}` };
  }
  return null;
}

// Extract file-touch events from a session log. We look for tool_use entries
// with Edit/Write/Read/MultiEdit inputs and aggregate per path.
function collectSessionFiles(logPath, limit = 80) {
  if (!existsSync(logPath)) return [];
  let content;
  try { content = readFileSync(logPath, 'utf8'); } catch { return []; }
  const files = new Map(); // path → { path, ops, count, lastAt }
  const lines = content.split('\n');
  let turnIdx = 0;
  for (const ln of lines) {
    if (!ln) continue;
    let e;
    try { e = JSON.parse(ln); } catch { continue; }
    if (e.type === 'assistant' && Array.isArray(e.message?.content)) {
      for (const c of e.message.content) {
        if (c.type !== 'tool_use') continue;
        const name = c.name || '';
        const input = c.input || {};
        let fp = input.file_path || input.path || input.notebook_path || null;
        if (!fp && name === 'Bash' && typeof input.command === 'string') {
          // mine likely file args from Bash commands (best-effort)
          const m = input.command.match(/(?:^|\s)([\w./-]+\.(?:ts|tsx|js|vue|md|json|sql|sh|py|yml|yaml))/);
          if (m) fp = m[1];
        }
        if (!fp) continue;
        const ops = files.get(fp) || { path: fp, ops: {}, count: 0, lastAt: turnIdx };
        ops.ops[name] = (ops.ops[name] || 0) + 1;
        ops.count += 1;
        ops.lastAt = turnIdx;
        files.set(fp, ops);
      }
    }
    turnIdx++;
  }
  const arr = [...files.values()];
  // Sort by recency desc, keep the latest N.
  arr.sort((a, b) => b.lastAt - a.lastAt);
  return arr.slice(0, limit);
}

function collectSessionContext(slug) {
  const taskFile = findTaskFile(slug);
  let task = null;
  if (taskFile) {
    const parsed = parseTaskFile(taskFile.path);
    task = {
      id: parsed.fm.id || slug,
      model: parsed.fm.model || '',
      priority: parsed.fm.priority || '',
      depends_on: parsed.fm.depends_on || '',
      body: (parsed.body || '').slice(0, 4000),
      location: taskFile.location,
    };
  }
  const activeLog = sessionLogPath(slug);
  const archiveLog = join(archiveDir(), `${slug}.log`);
  const lp = existsSync(activeLog) ? activeLog : archiveLog;
  const files = collectSessionFiles(lp);
  return { task, files };
}

const PORT = Number(process.argv.includes('--port') ? process.argv[process.argv.indexOf('--port') + 1] : 9090);
function parseUsers() {
  const raw = process.env.DASHBOARD_USERS;
  if (raw) { try { return JSON.parse(raw); } catch {} }
  const u1 = { user: process.env.DASHBOARD_USER || '', pass: process.env.DASHBOARD_PASS || '',
    stateDir: DEFAULT_STATE_DIR, queueDir: DEFAULT_QUEUE_ROOT, workroomsDir: DEFAULT_WORKROOMS_ROOT };
  return [u1];
}
const USERS = parseUsers();

function checkAuth(req, res) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Basic ')) {
    try {
      const [u, p] = Buffer.from(header.slice(6), 'base64').toString('utf8').split(':');
      const matched = USERS.find((cfg: any) => cfg.user === u && cfg.pass === p);
      if (!matched) {
        res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="claude-sessions"', 'Content-Type': 'text/plain' });
        res.end('Unauthorized');
        return false;
      }
      return matched;
    } catch {}
  }
  if (USERS.every((u: any) => !u.user && !u.pass)) return USERS[0];
  res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="claude-sessions"', 'Content-Type': 'text/plain' });
  res.end('Unauthorized');
  return false;
}

// ────────────────────────── registry ─────────────────────────

function readRegistry() {
  if (!existsSync(registry())) return [];
  const lines = readFileSync(registry(), 'utf8').trim().split('\n');
  if (lines.length < 2) return [];
  return lines
    .slice(1)
    .map(l => l.split('\t'))
    .filter(cols => cols.length >= 6)
    .map(([slug, uuid, window, workroom, model, created, kind]) => ({
      slug, uuid, window, workroom: workroom || '', model, created,
      kind: (kind || '').trim(),
      archived: false,
    }));
}

function readArchiveRegistry() {
  if (!existsSync(archiveRegistry())) return [];
  const lines = readFileSync(archiveRegistry(), 'utf8').trim().split('\n');
  if (lines.length < 2) return [];
  return lines
    .slice(1)
    .map(l => l.split('\t'))
    .filter(cols => cols.length >= 6)
    .map(([slug, uuid, window, workroom, model, created, archivedAt]) => ({
      slug, uuid, window, workroom: workroom || '', model, created,
      archivedAt: archivedAt || '', archived: true,
    }));
}

// Archive: kill tmux window if alive, move log + state file into archive/, add to archive registry.
function archiveSession(slug) {
  const active = readRegistry().find(r => r.slug === slug);
  if (!active) return { ok: false, reason: 'not found in active registry' };
  // Best effort: kill tmux window via claude-session (ignores errors if already gone)
  try { spawnSync(BIN_CLAUDE_SESSION, ['kill', slug], { timeout: 5000, env: { ...process.env, CLAUDE_SESSION_STATE_DIR: stateDir(), CLAUDE_SESSION_WORKROOMS_ROOT: workroomsRoot() } }); } catch {}
  const moveIfExists = (src, dst) => {
    if (existsSync(src)) { try { renameSync(src, dst); } catch {} }
  };
  moveIfExists(join(stateDir(), `${slug}.log`),  join(archiveDir(), `${slug}.log`));
  moveIfExists(join(stateDir(), `${slug}.json`), join(archiveDir(), `${slug}.json`));
  // Remove from active registry (kill already did, but be safe)
  if (existsSync(registry())) {
    const lines = readFileSync(registry(), 'utf8').split('\n');
    const kept = lines.filter(l => !l.startsWith(`${slug}\t`));
    writeFileSync(registry(), kept.join('\n'));
  }
  // Append to archive registry
  const archivedAt = new Date().toISOString();
  appendFileSync(
    archiveRegistry(),
    `${active.slug}\t${active.uuid}\t${active.window}\t${active.workroom}\t${active.model}\t${active.created}\t${archivedAt}\n`,
  );
  return { ok: true };
}

// Bulk: archive every session currently in state=done
async function archiveAllDone() {
  const rows = readRegistry();
  const archived = [];
  for (const r of rows) {
    const m = await computeMetrics(r.slug);
    if (m.state === 'done' && !isOrchestratorSlug(r.slug)) {
      if (archiveSession(r.slug).ok) archived.push(r.slug);
    }
  }
  return archived;
}

// ──────────────── per-session derived metrics ────────────────

function zeroMetrics(slug) {
  return {
    slug, lastLineAt: 0, state: 'idle',
    // cumulative (across all turns in the session)
    tokensIn: 0, tokensOut: 0, cacheRead: 0, cacheCreate: 0,
    totalTokensProcessed: 0,
    totalCostUsd: 0, durationMs: 0, turns: 0,
    // per-API-call snapshots (honest context-window occupancy)
    lastTurnInput: 0, lastTurnOutput: 0, lastTurnCacheRead: 0, lastTurnCacheCreate: 0,
    lastTurnContextUsed: 0,   // most recent LLM call's input+cache → occupied window
    peakContextUsed: 0,        // worst-case LLM call throughout the session
    lastAssistantSnippet: '', lastThinkingSnippet: '',
  };
}

function sessionLogPath(slug) { return join(stateDir(), `${slug}.log`); }

/** Compute per-session metrics by scanning the session log. */
async function computeMetrics(slug) {
  const m = zeroMetrics(slug);
  const path = sessionLogPath(slug);
  if (!existsSync(path)) return m;
  const st = statSync(path);
  m.lastLineAt = st.mtimeMs;

  const content = await fsp.readFile(path, 'utf8');
  const lines = content.split('\n');
  let lastResult = null;
  let lastAssistantText = '';
  let lastThinkingText = '';
  let lastIsError = false;

  for (let i = lines.length - 1; i >= 0; i--) {
    const ln = lines[i]; if (!ln) continue;
    // We parse in forward order for stats, but grab "last X" lazily in reverse.
    try {
      const e = JSON.parse(ln);
      if (e.type === 'result' && !lastResult) {
        lastResult = e;
        lastIsError = !!e.is_error;
      }
      if (e.type === 'assistant' && !lastAssistantText) {
        const text = (e.message?.content || [])
          .filter(c => c.type === 'text')
          .map(c => c.text)
          .join('');
        if (text) lastAssistantText = text;
      }
      if (e.type === 'stream_event' && !lastThinkingText) {
        const d = e.event?.delta;
        if (d?.type === 'thinking_delta' && d.thinking) lastThinkingText = d.thinking;
      }
      if (lastResult && lastAssistantText && lastThinkingText) break;
    } catch { /* skip non-json lines */ }
  }

  // Two passes:
  // (A) Cumulative from `result` events (session-wide totals, useful for cost/quota)
  // (B) Peak per-API-call context from `stream_event.message_start` events
  //     — each internal LLM call inside a --print run emits one of these, and
  //     its usage.{input_tokens + cache_read + cache_create} is the real context
  //     window occupancy for that specific API call. The max across all calls
  //     is the closest honest "how full was the window at its worst" metric.
  let peakApiCallContext = 0;
  let lastApiCallUsage = null;

  for (const ln of lines) {
    if (!ln) continue;
    try {
      const e = JSON.parse(ln);
      if (e.type === 'result') {
        const u = e.usage || {};
        m.tokensIn += u.input_tokens || 0;
        m.tokensOut += u.output_tokens || 0;
        m.cacheRead += u.cache_read_input_tokens || 0;
        m.cacheCreate += u.cache_creation_input_tokens || 0;
        m.totalCostUsd += e.total_cost_usd || 0;
        m.durationMs += e.duration_ms || 0;
        m.turns += e.num_turns || 0;
      }
      // Peak single-API-call usage from stream_event.message_start (most honest window measurement)
      if (e.type === 'stream_event' && e.event?.type === 'message_start' && e.event.message?.usage) {
        const u = e.event.message.usage;
        const thisCtx = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
        if (thisCtx > peakApiCallContext) peakApiCallContext = thisCtx;
        lastApiCallUsage = u;
      }
    } catch { /* skip */ }
  }

  m.totalTokensProcessed = m.tokensIn + m.tokensOut + m.cacheRead + m.cacheCreate;

  // Report the most recent single-API-call usage as "last turn" — this is
  // what actually occupied the context window at that moment.
  if (lastApiCallUsage) {
    m.lastTurnInput = lastApiCallUsage.input_tokens || 0;
    m.lastTurnOutput = lastApiCallUsage.output_tokens || 0;
    m.lastTurnCacheRead = lastApiCallUsage.cache_read_input_tokens || 0;
    m.lastTurnCacheCreate = lastApiCallUsage.cache_creation_input_tokens || 0;
    m.lastTurnContextUsed = m.lastTurnInput + m.lastTurnCacheRead + m.lastTurnCacheCreate;
  }
  m.peakContextUsed = peakApiCallContext;

  m.lastAssistantSnippet = lastAssistantText.slice(-400);
  m.lastThinkingSnippet = lastThinkingText.slice(-400);

  // State
  const now = Date.now();
  const age = (now - m.lastLineAt) / 1000;
  if (lastResult) { m.state = lastIsError ? 'error' : 'done'; }
  else if (age < 15) {
    const tail = lines.slice(-6).join('\n');
    if (tail.includes('"thinking_delta"')) m.state = 'thinking';
    else if (tail.includes('"tool_use"'))  m.state = 'tool_call';
    else if (tail.includes('"text_delta"')) m.state = 'streaming';
    else m.state = 'running';
  } else if (age < 120) m.state = 'idle';
  else m.state = 'stalled';

  return m;
}

// ──────────────── cost roll-up (month so far) ────────────────

async function monthCostSoFar() {
  if (!existsSync(stateDir())) return 0;
  const firstOfMonth = new Date();
  firstOfMonth.setDate(1); firstOfMonth.setHours(0, 0, 0, 0);

  let total = 0;
  for (const f of readdirSync(stateDir())) {
    if (!f.endsWith('.log')) continue;
    const p = join(stateDir(), f);
    const st = statSync(p);
    if (st.mtimeMs < firstOfMonth.getTime()) continue;
    try {
      const content = await fsp.readFile(p, 'utf8');
      for (const ln of content.split('\n')) {
        if (!ln) continue;
        try {
          const e = JSON.parse(ln);
          if (e.type === 'result' && e.total_cost_usd) total += e.total_cost_usd;
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }
  return total;
}

// Cost per time-window + per model family. Scans active + archived session
// logs. Each stream starts with a `system init` event carrying the model;
// subsequent `result` events in that stream attribute cost to that model.
async function costWindows() {
  const now = Date.now();
  const w5h = now - 5 * 3600 * 1000;
  const w7d = now - 7 * 86400 * 1000;
  const res = { last5hUsd: 0, last7dUsd: 0, byModel: { opus: 0, sonnet: 0, haiku: 0, other: 0 } };
  const dirs = [stateDir()];
  if (existsSync(archiveDir())) dirs.push(archiveDir());
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.log')) continue;
      const p = join(dir, f);
      const st = statSync(p);
      if (st.mtimeMs < w7d) continue;
      let content;
      try { content = await fsp.readFile(p, 'utf8'); } catch { continue; }
      let currentModel = 'other';
      for (const ln of content.split('\n')) {
        if (!ln) continue;
        let e;
        try { e = JSON.parse(ln); } catch { continue; }
        if (e.type === 'system' && e.subtype === 'init' && typeof e.model === 'string') {
          const m = e.model.toLowerCase();
          if (m.includes('opus')) currentModel = 'opus';
          else if (m.includes('haiku')) currentModel = 'haiku';
          else if (m.includes('sonnet')) currentModel = 'sonnet';
          else currentModel = 'other';
        }
        if (e.type === 'result' && e.total_cost_usd) {
          const ts = e.timestamp ? Date.parse(e.timestamp) : st.mtimeMs;
          if (ts >= w7d) { res.last7dUsd += e.total_cost_usd; res.byModel[currentModel] = (res.byModel[currentModel] || 0) + e.total_cost_usd; }
          if (ts >= w5h) res.last5hUsd += e.total_cost_usd;
        }
      }
    }
  }
  return res;
}

// Anthropic Max subscription limits we mirror. The real quota UI is owned
// by the CLI's /usage; we expose the same *shape* so the dashboard doesn't
// look empty. Tunable via env vars if the user has a different plan.
const MAX_5H_USD         = Number(process.env.DASHBOARD_MAX_5H_USD || 10);
const MAX_7D_USD         = Number(process.env.DASHBOARD_MAX_7D_USD || 50);
const MAX_SONNET_7D_USD  = Number(process.env.DASHBOARD_MAX_SONNET_7D_USD || 35);
const CTX_1M = 1_000_000;
const CTX_200K = 200_000;

// ──────────────── Anthropic live quota (mirrors Claude Code /status) ────────────────
// The CLI stores an OAuth token in ~/.claude/.credentials.json and hits
// https://api.anthropic.com/api/oauth/usage for the Plan Usage panel.
// We replay the same call — response shape (observed 2026-04-19):
//   { five_hour: { utilization, resets_at },
//     seven_day: { utilization, resets_at },
//     seven_day_opus: { utilization, resets_at } | null,
//     seven_day_sonnet: { utilization, resets_at } | null,
//     seven_day_omelette: { utilization, resets_at } | null,   // "Claude Design"
//     extra_usage: { is_enabled, monthly_limit, utilization, ... } }
// Utilization is already in percent (0-100), so we don't guess budgets.
const CLAUDE_CREDS_PATH = join(HOME, '.claude/.credentials.json');
let _quotaCache = { at: 0, data: null };
const QUOTA_TTL_MS = 60_000; // refresh once per minute — API has its own rate limits

async function fetchAnthropicUsage() {
  const now = Date.now();
  if (_quotaCache.data && now - _quotaCache.at < QUOTA_TTL_MS) return _quotaCache.data;
  try {
    const raw = await fsp.readFile(CLAUDE_CREDS_PATH, 'utf8');
    const token = JSON.parse(raw)?.claudeAiOauth?.accessToken;
    if (!token) return null;
    const r = await fetch('https://api.anthropic.com/api/oauth/usage', {
      headers: {
        'Authorization': 'Bearer ' + token,
        'anthropic-beta': 'oauth-2025-04-20',
        'User-Agent': 'claude-web-dashboard/1.0',
      },
    });
    if (!r.ok) return null;
    const j = await r.json();
    _quotaCache = { at: now, data: j };
    return j;
  } catch {
    return null;
  }
}

// ──────────────────────── SSE plumbing ────────────────────────

const sseClients = new Set();

function broadcastSse(event, data, slug = null, forStateDir = null) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const c of sseClients) {
    if (slug && (c as any).slug && (c as any).slug !== slug && (c as any).slug !== '*') continue;
    if (forStateDir && (c as any).stateDir && (c as any).stateDir !== forStateDir) continue;
    try { (c as any).res.write(payload); } catch { /* ignore */ }
  }
}

// Watch registry + log files for changes and broadcast.
// Simple approach: per-file mtime poll every 1s (reliable across FS events).
let lastSnapshot = {};
// Per-session byte offset of what was already streamed to SSE clients.
let lastStreamPos = {};

async function readLogTailSince(slug, byteOffset) {
  const path = sessionLogPath(slug);
  if (!existsSync(path)) return { bytes: byteOffset, raw: '' };
  const st = statSync(path);
  if (st.size <= byteOffset) return { bytes: st.size, raw: '' };
  const fd = await fsp.open(path, 'r');
  try {
    const buf = Buffer.alloc(st.size - byteOffset);
    await fd.read(buf, 0, buf.length, byteOffset);
    return { bytes: st.size, raw: buf.toString('utf8') };
  } finally {
    await fd.close();
  }
}

async function pollLoopForDir(userStateDir: string) {
  setInterval(async () => {
    try {
      await requestCtx.run({ stateDir: userStateDir }, async () => {
        const rows = readRegistry();
        for (const r of rows) {
          const p = sessionLogPath(r.slug);
          if (!existsSync(p)) continue;
          const mt = statSync(p).mtimeMs;
          const sz = statSync(p).size;
          const posKey = `${userStateDir}:${r.slug}`;

          // (A) Stream new log bytes (append-only to clients)
          if (lastStreamPos[posKey] === undefined) {
            lastStreamPos[posKey] = sz;
          } else if (sz > lastStreamPos[posKey]) {
            const { bytes, raw } = await readLogTailSince(r.slug, lastStreamPos[posKey]);
            lastStreamPos[posKey] = bytes;
            if (raw) {
              const lastNl = raw.lastIndexOf('\n');
              if (lastNl >= 0) {
                const complete = raw.slice(0, lastNl);
                lastStreamPos[posKey] = bytes - (raw.length - lastNl - 1);
                broadcastSse('log-append', { slug: r.slug, raw: complete }, '*', userStateDir);
              }
            }
          }

          // (B) Metrics update on mtime change (left panel)
          const snapKey = `${userStateDir}:${r.slug}`;
          if (lastSnapshot[snapKey] !== mt) {
            lastSnapshot[snapKey] = mt;
            const m = await computeMetrics(r.slug);
            broadcastSse('metrics', { session: r, metrics: m }, '*', userStateDir);
          }
        }
        const cost = await monthCostSoFar();
        const usage = await fetchAnthropicUsage();
        broadcastSse('status', {
          activeSessions: rows.length,
          monthCostUsd: Number(cost.toFixed(4)),
          monthBudgetUsd: MAX_SUBSCRIPTION_BUDGET_USD,
          ctxLimit: CTX_WINDOW_LIMIT,
          quota: usage,
        }, '*', userStateDir);
      });
    } catch (err) {
      console.error('[poll]', err);
    }
  }, 1000);
}

async function pollLoop() {
  const watchedDirs = new Set(USERS.map((u: any) => u.stateDir));
  watchedDirs.forEach((dir: any) => pollLoopForDir(dir));
}

// ──────────────────────── HTTP server ────────────────────────

function readBody(req) {
  return new Promise((resolveFn, rej) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolveFn(Buffer.concat(chunks).toString('utf8')));
    req.on('error', rej);
  });
}

function runBin(args) {
  return new Promise(resolveFn => {
    const ctx = (requestCtx.getStore() as any);
    const env = ctx?.stateDir
      ? { ...process.env, CLAUDE_SESSION_STATE_DIR: ctx.stateDir, CLAUDE_SESSION_WORKROOMS_ROOT: ctx.workroomsDir ?? DEFAULT_WORKROOMS_ROOT }
      : process.env;
    const p = spawn(BIN_CLAUDE_SESSION, args, { env });
    let stdout = '', stderr = '';
    p.stdout.on('data', d => stdout += d.toString());
    p.stderr.on('data', d => stderr += d.toString());
    p.on('close', code => resolveFn({ code: code ?? 0, stdout, stderr }));
  });
}

async function handle(req, res) {
  const userConfig = checkAuth(req, res);
  if (!userConfig) return;
  return requestCtx.run(userConfig, () => handleInner(req, res));
}
async function handleInner(req, res) {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const p = url.pathname;

  // ── static HTML ──
  if (p === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(HTML);
    return;
  }

  // ── sessions list (with optional archive) ──
  if (p === '/api/sessions' && req.method === 'GET') {
    const includeArchive = url.searchParams.get('include') === 'archive';
    const active = readRegistry();
    const archive = includeArchive ? readArchiveRegistry() : [];
    const all = [...active, ...archive];
    const enriched = await Promise.all(all.map(async r => ({
      session: { ...r, role: isComposerSlug(r.slug) ? 'composer' : isOrchestratorSlug(r.slug) ? 'orchestrator' : 'worker' },
      metrics: r.archived ? zeroMetrics(r.slug) : await computeMetrics(r.slug),
    })));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(enriched));
    return;
  }

  // ── archive one session ──
  const archM = p.match(/^\/api\/sessions\/([a-z0-9-]+)\/archive$/);
  if (archM && req.method === 'POST') {
    const r = archiveSession(archM[1]);
    res.writeHead(r.ok ? 200 : 404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(r));
    return;
  }

  // ── archive all done ──
  if (p === '/api/sessions/archive-all-done' && req.method === 'POST') {
    const archived = await archiveAllDone();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ archived }));
    return;
  }

  // ── dependency graph (real, parsed from TASK.md and session timing) ──
  // ── skill bundles (kind → plugin list) ──
  if (p === '/api/skill-bundles' && req.method === 'GET') {
    const f = join(HOME, 'daria/scripts/workrooms/skill-bundles.json');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    try { res.end(readFileSync(f, 'utf8')); }
    catch { res.end('{}'); }
    return;
  }

  if (p === '/api/deps' && req.method === 'GET') {
    const edges = await computeDependencyEdges();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(edges));
    return;
  }

  // ── overall status ──
  if (p === '/api/status' && req.method === 'GET') {
    const cost = await monthCostSoFar();
    const usage = await fetchAnthropicUsage();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      activeSessions: readRegistry().length,
      monthCostUsd: Number(cost.toFixed(4)),
      monthBudgetUsd: MAX_SUBSCRIPTION_BUDGET_USD,
      ctxLimit: CTX_WINDOW_LIMIT,
      // Real live quotas from Anthropic (mirror of Claude Code /status).
      // Shape matches the API response verbatim so the client can read
      // utilization/resets_at directly.
      quota: usage,
    }));
    return;
  }

  // ── full log dump (for tab switch; client truncates to last N lines) ──
  const logM = p.match(/^\/api\/sessions\/([a-z0-9-]+)\/log$/);
  if (logM && req.method === 'GET') {
    const slug = logM[1];
    const activePath = sessionLogPath(slug);
    const archivePath = join(archiveDir(), `${slug}.log`);
    const path = existsSync(activePath) ? activePath
               : existsSync(archivePath) ? archivePath
               : null;
    if (!path) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': 'application/x-ndjson' });
    createReadStream(path).pipe(res);
    return;
  }

  // ── session context (TASK.md + files touched) ──
  const ctxM = p.match(/^\/api\/sessions\/([a-z0-9-]+)\/context$/);
  if (ctxM && req.method === 'GET') {
    const slug = ctxM[1];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(collectSessionContext(slug)));
    return;
  }

  // ── SSE stream (all sessions on one connection; client filters) ──
  if (p === '/api/stream' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(':connected\n\n');
    const client = { res, slug: '*', stateDir: stateDir() };
    sseClients.add(client);
    req.on('close', () => { sseClients.delete(client); try { res.end(); } catch {} });
    return;
  }

  // ── send follow-up ──
  const sendM = p.match(/^\/api\/sessions\/([a-z0-9-]+)\/send$/);
  if (sendM && req.method === 'POST') {
    const slug = sendM[1];
    const body = await readBody(req);
    let payload = {};
    try { payload = JSON.parse(body); } catch { }
    const prompt = String(payload.prompt || '').trim();
    if (!prompt) { res.writeHead(400); res.end('prompt required'); return; }
    const r = await runBin(['send', slug, prompt]);
    res.writeHead(r.code === 0 ? 200 : 500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ code: r.code, stdout: r.stdout, stderr: r.stderr }));
    return;
  }

  // ── kill session ──
  const killM = p.match(/^\/api\/sessions\/([a-z0-9-]+)$/);
  if (killM && req.method === 'DELETE') {
    const slug = killM[1];
    const r = await runBin(['kill', slug]);
    res.writeHead(r.code === 0 ? 200 : 500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ code: r.code, stdout: r.stdout, stderr: r.stderr }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('not found');
}

// ──────────────────────────── HTML ────────────────────────────
// Dark, tabbed, polling-based on top of SSE.

const HTML = /* html */ `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><title>Claude sessions dashboard</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  :root {
    --bg:#0b0d10; --panel:#14171c; --ink:#e8ecef; --mute:#7f8a94;
    --line:#222830; --accent:#7cc4ff; --ok:#4ade80; --warn:#fbbf24; --err:#f87171;
  }
  *{box-sizing:border-box;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
  html,body{margin:0;height:100%;background:var(--bg);color:var(--ink);font-size:13px}
  body{display:flex;flex-direction:column;min-height:100vh}
  header{display:flex;gap:1rem;align-items:center;padding:.6rem 1rem;border-bottom:1px solid var(--line);background:var(--panel)}
  header h1{margin:0;font-size:14px;letter-spacing:.5px;color:var(--accent)}
  /* ── Claude Code style "Plan usage" card at the top (mirrors the desktop app) ── */
  .plan-header{background:var(--panel);border-bottom:1px solid var(--line);padding:.7rem 1.1rem .85rem;display:flex;flex-direction:column;gap:.4rem}
  .plan-header .ctx-row{display:flex;justify-content:space-between;align-items:baseline;font-size:13px;color:var(--ink)}
  .plan-header .ctx-row .label{color:var(--mute)}
  .plan-header .ctx-row .val{font-variant-numeric:tabular-nums;color:var(--mute)}
  .plan-header .ctx-row .val b{color:var(--ink);font-weight:600}
  .plan-header .ph-bar{width:100%;height:3px;background:#1a1f26;border-radius:99px;overflow:hidden}
  .plan-header .ph-bar > i{display:block;height:100%;background:var(--accent);transition:width .4s cubic-bezier(.2,0,0,1);border-radius:99px}
  .plan-header .ph-bar > i.warn{background:var(--warn)}
  .plan-header .ph-bar > i.err{background:var(--err)}
  .plan-header .plan-usage-label{margin-top:.3rem;display:flex;align-items:center;justify-content:space-between;font-size:11px;color:var(--mute);letter-spacing:.3px;text-transform:uppercase}
  .plan-header .plan-usage-label .arrow{color:var(--mute);opacity:.6}
  .plan-header .quota-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.3rem .9rem}
  .plan-header .quota-row{display:flex;flex-direction:column;gap:2px;padding:.1rem 0}
  .plan-header .quota-row .top{display:flex;justify-content:space-between;align-items:baseline;font-size:12px}
  .plan-header .quota-row .top .k{color:var(--ink);font-weight:500}
  .plan-header .quota-row .top .v{color:var(--mute);font-variant-numeric:tabular-nums;font-size:11px}
  .plan-header .quota-row .top .v b{color:var(--ink);font-weight:600}
  .plan-header .footer{display:flex;justify-content:flex-end;align-items:center;gap:10px;font-size:11px;color:var(--mute);margin-top:.25rem}
  .plan-header .footer .active-pill{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:99px;border:1px solid var(--line);background:#0f1419}
  .plan-header .footer .active-pill .glyph{width:7px;height:7px;border-radius:50%;background:var(--accent);box-shadow:0 0 5px var(--accent)}
  .plan-header.collapsed .quota-grid, .plan-header.collapsed .plan-usage-label .arrow-text{display:none}
  .plan-header .toggle{cursor:pointer;user-select:none}
  .plan-header .toggle:hover{color:var(--ink)}
  .stat{display:flex;flex-direction:column;gap:2px;padding:2px 10px;border-left:1px solid var(--line)}
  .stat b{font-size:12px;color:var(--mute);font-weight:normal}
  .stat span{font-variant-numeric:tabular-nums}
  .bar{width:100%;height:4px;background:#222;border-radius:2px;overflow:hidden;margin-top:2px}
  .bar > i{display:block;height:100%;background:linear-gradient(90deg,#5b8ff9,#b78fff);transition:width .4s}
  .navs{display:flex;flex-direction:column;border-bottom:1px solid var(--line);background:var(--panel);position:relative;padding-bottom:120px}
  #deps-svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1}
  #deps-svg .dep-line{fill:none;stroke-width:1.6;opacity:.65;stroke-dasharray:6 4;animation:dep-flow 1.6s linear infinite;transition:opacity .2s;stroke-linejoin:round;stroke-linecap:round}
  #deps-svg .dep-line.dim{opacity:.1}
  #deps-svg .dep-line.highlight{opacity:1;stroke-width:2.5;filter:drop-shadow(0 0 5px currentColor)}
  #deps-svg .dep-arrow{fill:currentColor;opacity:.8}
  @keyframes dep-flow{from{stroke-dashoffset:0}to{stroke-dashoffset:-20}}
  .nav-row{display:flex;gap:.3rem;padding:.4rem .6rem;overflow-x:auto;overflow-y:hidden;align-items:center;scrollbar-width:none;-ms-overflow-style:none;user-select:none;cursor:grab}
  .nav-row::-webkit-scrollbar{display:none;width:0;height:0}
  .nav-row.dragging{cursor:grabbing}

  /* ── M3-style scrollbars ──
     Hidden by default. On any user interaction inside a scroll container
     (hover/focus-within/scrolling class) we fade the thin thumb in with
     M3 surface-tint colors. Firefox gets the limited scrollbar-width API;
     Webkit/Chromium gets the full styled pseudo-elements. */
  :root{
    --sb-thumb:rgba(202,196,208,.24);     /* M3 dark on-surface variant @ 24% */
    --sb-thumb-hover:rgba(230,225,229,.55);/* M3 on-surface @ 55% */
    --sb-track:transparent;
  }
  /* Firefox: there's no "hover reveal" so we keep it hidden by default;
     we flip scrollbar-width to thin when the element has .scrolling. */
  .log, .side, .right-side, .content{scrollbar-width:none;scrollbar-color:var(--sb-thumb) var(--sb-track)}
  .log.scrolling, .side.scrolling, .right-side.scrolling, .content.scrolling,
  .log:hover, .side:hover, .right-side:hover, .content:hover,
  .log:focus-within, .side:focus-within, .right-side:focus-within, .content:focus-within{scrollbar-width:thin}
  /* Webkit: scrollbar is always present (so the layout doesn't jump) but
     fully transparent; thumb fades in on hover / active scroll. */
  .log::-webkit-scrollbar, .side::-webkit-scrollbar, .right-side::-webkit-scrollbar, .content::-webkit-scrollbar{
    width:8px;height:8px;background:transparent
  }
  .log::-webkit-scrollbar-track, .side::-webkit-scrollbar-track, .right-side::-webkit-scrollbar-track, .content::-webkit-scrollbar-track{background:transparent}
  .log::-webkit-scrollbar-thumb, .side::-webkit-scrollbar-thumb, .right-side::-webkit-scrollbar-thumb, .content::-webkit-scrollbar-thumb{
    background:transparent;border-radius:99px;border:2px solid transparent;background-clip:padding-box;
    transition:background-color .18s cubic-bezier(.2,0,0,1)
  }
  .log:hover::-webkit-scrollbar-thumb, .log.scrolling::-webkit-scrollbar-thumb,
  .side:hover::-webkit-scrollbar-thumb, .side.scrolling::-webkit-scrollbar-thumb,
  .right-side:hover::-webkit-scrollbar-thumb, .right-side.scrolling::-webkit-scrollbar-thumb,
  .content:hover::-webkit-scrollbar-thumb, .content.scrolling::-webkit-scrollbar-thumb{
    background-color:var(--sb-thumb)
  }
  .log::-webkit-scrollbar-thumb:hover, .side::-webkit-scrollbar-thumb:hover,
  .right-side::-webkit-scrollbar-thumb:hover, .content::-webkit-scrollbar-thumb:hover{
    background-color:var(--sb-thumb-hover)
  }
  /* Small inner scrollers (file list, task body) follow the same rule. */
  .file-list, .task-body{scrollbar-width:none}
  .file-list:hover, .task-body:hover{scrollbar-width:thin}
  .file-list::-webkit-scrollbar, .task-body::-webkit-scrollbar{width:6px;height:6px;background:transparent}
  .file-list::-webkit-scrollbar-thumb, .task-body::-webkit-scrollbar-thumb{
    background:transparent;border-radius:99px;transition:background-color .18s cubic-bezier(.2,0,0,1)
  }
  .file-list:hover::-webkit-scrollbar-thumb, .task-body:hover::-webkit-scrollbar-thumb,
  .file-list.scrolling::-webkit-scrollbar-thumb, .task-body.scrolling::-webkit-scrollbar-thumb{
    background-color:var(--sb-thumb)
  }
  .nav-row + .nav-row{border-top:1px solid var(--line)}
  .nav-row .label{color:var(--mute);font-size:10px;letter-spacing:.5px;text-transform:uppercase;margin-right:.5rem;min-width:90px;flex-shrink:0;position:sticky;left:0;z-index:3;background:var(--panel);padding:.15rem .5rem .15rem 0;box-shadow:4px 0 6px -4px rgba(0,0,0,.6)}
  .nav-row.composers{background:#14130b;border-bottom:1px solid var(--line)} .nav-row.composers .label{background:#14130b}
  .nav-row.composers .label{color:#fbbf24;font-weight:600}
  .nav-row.composers .tab{background:#1f1b0c;border:1px solid #3a2f12}
  .nav-row.composers .tab.active{border-color:#fbbf24;color:#fbbf24;box-shadow:inset 0 0 0 1px #fbbf24}
  .nav-row.composers .tab .dot.standby{background:#fbbf24;box-shadow:0 0 6px #fbbf24}
  .nav-row.orchestrators{background:#0f1419} .nav-row.orchestrators .label{background:#0f1419}
  .nav-row.orchestrators .label{color:#a78bfa}
  .nav-row.archive{background:#0a0d11;min-height:30px} .nav-row.archive .label{background:#0a0d11}
  .nav-row.archive .label{color:#6b7280;min-width:auto}
  .nav-row.archive.collapsed .tab{display:none}
  .nav-row.archive .archive-toggle{cursor:pointer;user-select:none;padding:.2rem .5rem;border-radius:3px}
  .nav-row.archive .archive-toggle:hover{background:#14171c;color:var(--ink)}
  .nav-row .tab{padding:.35rem .7rem;border-radius:4px;background:#1a1f26;cursor:pointer;white-space:nowrap;display:flex;gap:6px;align-items:center;border:1px solid transparent}
  .nav-row .tab:hover{border-color:var(--line)}
  .nav-row .tab.active{border-color:var(--accent);color:var(--accent)}
  .nav-row.orchestrators .tab.active{border-color:#a78bfa;color:#a78bfa}
  .nav-row .tab .dot{width:8px;height:8px;border-radius:50%;background:var(--mute)}
  .nav-row .tab .dot.standby{background:#a78bfa;box-shadow:0 0 4px #a78bfa}
  .nav-row .tab .dot.thinking{background:var(--warn);box-shadow:0 0 4px var(--warn)}
  .nav-row .tab .dot.tool_call{background:#a78bfa;box-shadow:0 0 4px #a78bfa}
  .nav-row .tab .dot.streaming{background:var(--accent);box-shadow:0 0 4px var(--accent)}
  .nav-row .tab .dot.running{background:var(--accent)}
  .nav-row .tab .dot.done{background:var(--ok)}
  .nav-row .tab .dot.error{background:var(--err)}
  .nav-row .tab .dot.idle{background:var(--mute)}
  .nav-row .tab .dot.stalled{background:#6b7280}
  .nav-row .tab.archived{opacity:.55}
  .nav-row .spacer{flex:1}
  .nav-row .toggle-btn{font-size:11px;padding:.2rem .5rem;border:1px solid var(--line);border-radius:4px;background:transparent;color:var(--mute);cursor:pointer}
  .nav-row .toggle-btn.active{color:var(--accent);border-color:var(--accent)}
  .nav-row .toggle-btn:hover{color:var(--ink)}
  main{display:grid;grid-template-columns:minmax(240px,300px) 1fr minmax(240px,320px);flex:1;min-height:0;overflow:hidden}
  .side{border-right:1px solid var(--line);padding:.8rem;overflow-y:auto;background:var(--panel)}
  .right-side{border-left:1px solid var(--line);padding:.8rem;overflow-y:auto;background:var(--panel)}
  .side dl, .right-side dl{margin:0;display:grid;grid-template-columns:1fr auto;gap:4px 10px;font-size:12px}
  .side dt, .right-side dt{color:var(--mute)}
  .side dd, .right-side dd{margin:0;text-align:right;font-variant-numeric:tabular-nums}
  .side h3, .right-side h3{margin:1rem 0 .3rem;font-size:11px;color:var(--mute);letter-spacing:.5px;text-transform:uppercase;display:flex;align-items:center;gap:6px}
  .model-pill{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:10px;font-size:11px;font-weight:600;letter-spacing:.3px;text-transform:uppercase;border:1px solid currentColor;background:rgba(255,255,255,0.03)}
  .kind-pill{display:inline-block;padding:1px 7px;border-radius:9px;font-size:9px;font-weight:500;letter-spacing:.5px;text-transform:uppercase;border:1px solid currentColor;background:rgba(255,255,255,0.02);white-space:nowrap}
  .skill-list{display:flex;flex-direction:column;gap:3px;margin-top:.4rem}
  .skill-row{display:flex;align-items:center;gap:6px;font-size:11px;padding:3px 6px;border-radius:4px;background:#0f1419;border:1px solid var(--line)}
  .skill-row .dot{width:6px;height:6px;border-radius:50%;background:var(--accent);flex-shrink:0}
  .skill-row .name{flex:1;color:var(--ink);font-family:ui-monospace,monospace}
  .skill-row.muted{opacity:.5}
  .kind-select{background:#0e1116;border:1px solid var(--line);color:var(--ink);padding:3px 6px;border-radius:4px;font:inherit;font-size:11px;width:100%;margin-top:.3rem}
  .model-pill.opus{color:#c4b5fd}
  .model-pill.sonnet{color:#7cc4ff}
  .model-pill.haiku{color:#4ade80}
  .model-pill .glyph{width:6px;height:6px;border-radius:50%;background:currentColor;box-shadow:0 0 4px currentColor}
  .plan-card{background:#0f1419;border:1px solid var(--line);border-radius:6px;padding:.6rem .8rem;margin-bottom:.8rem}
  .plan-card h4{margin:0 0 .4rem;font-size:10px;color:var(--mute);letter-spacing:.5px;text-transform:uppercase;font-weight:normal}
  .plan-row{display:flex;justify-content:space-between;align-items:baseline;font-size:12px;margin-top:.3rem}
  .plan-row .k{color:var(--mute)}
  .plan-row .v{font-variant-numeric:tabular-nums}
  .plan-bar{width:100%;height:3px;background:#1a1f26;border-radius:2px;overflow:hidden;margin-top:2px}
  .plan-bar > i{display:block;height:100%;background:var(--accent);transition:width .4s}
  .plan-bar > i.warn{background:var(--warn)}
  .plan-bar > i.err{background:var(--err)}
  .file-list{margin-top:.3rem;display:flex;flex-direction:column;gap:2px;font-size:11px;max-height:40vh;overflow-y:auto}
  .file-row{display:flex;align-items:center;gap:6px;padding:2px 4px;border-radius:3px;white-space:nowrap}
  .file-row:hover{background:#1a1f26}
  .file-row .ops{display:flex;gap:2px;flex-shrink:0}
  .file-row .op{display:inline-block;width:14px;text-align:center;border-radius:2px;font-size:9px;font-weight:600}
  .file-row .op.R{background:#1e3a5f;color:#7cc4ff}
  .file-row .op.W{background:#3a1e1e;color:#f87171}
  .file-row .op.E{background:#3a2f1e;color:#fbbf24}
  .file-row .op.M{background:#3a1e3a;color:#c4b5fd}
  .file-row .op.B{background:#2a2a2a;color:var(--mute)}
  .file-row .path{overflow:hidden;text-overflow:ellipsis;flex:1;color:var(--ink);font-family:ui-monospace,monospace}
  .task-body{font-size:11px;color:var(--mute);line-height:1.45;white-space:pre-wrap;max-height:28vh;overflow-y:auto;background:#0a0d11;padding:.5rem;border-radius:4px;border:1px solid var(--line);font-family:ui-monospace,monospace}
  .content{padding:.6rem 1rem;overflow-y:auto;display:flex;flex-direction:column;gap:.5rem}
  .log{flex:1;background:#06080a;border:1px solid var(--line);border-radius:4px;padding:.5rem;overflow-y:auto;white-space:pre-wrap;word-break:break-word;font-size:12px;line-height:1.5}
  .log .assistant{color:#e5e7eb}
  .log .assistant.streaming{border-left:2px solid var(--accent);padding-left:6px;margin-left:-8px}
  .log .thinking{color:#94a3b8;font-style:italic}
  .log .tool{color:#a78bfa}
  .log .meta{color:var(--mute);font-size:11px}
  .log .err{color:var(--err)}
  .row{display:flex;gap:.4rem}
  input[type=text]{flex:1;background:#0e1116;border:1px solid var(--line);color:var(--ink);padding:.4rem .6rem;border-radius:4px;font:inherit}
  button{background:#1e2530;color:var(--ink);border:1px solid var(--line);padding:.4rem .8rem;border-radius:4px;cursor:pointer;font:inherit}
  button:hover{border-color:var(--accent)}
  button.danger:hover{border-color:var(--err);color:var(--err)}
  .placeholder{color:var(--mute);padding:2rem;text-align:center}
</style></head><body>
<header>
  <h1>◼ claude sessions</h1>
  <div class="stat"><b>active</b><span id="hdr-count">–</span></div>
  <div class="stat"><b>uptime</b><span id="hdr-uptime">–</span></div>
  <div style="flex:1"></div>
  <button id="btn-refresh" title="force refresh">↻</button>
</header>
<section class="plan-header" id="plan-header">
  <div class="ctx-row toggle" id="plan-toggle">
    <span class="label">Context window</span>
    <span class="val"><b id="ph-ctx-val">–</b> <span id="ph-ctx-pct" style="color:var(--mute);margin-left:6px">–</span> <span class="arrow" id="ph-chev">›</span></span>
  </div>
  <div class="ph-bar"><i id="ph-ctx-bar" style="width:0%"></i></div>
  <div class="plan-usage-label">
    <span>Plan usage</span>
    <span class="arrow arrow-text">↗</span>
  </div>
  <div class="quota-grid" id="quota-grid">
    <div class="quota-row" data-row="5h">
      <div class="top"><span class="k">5-hour limit</span><span class="v"><b id="q5h-pct">–</b> · resets <span id="q5h-reset">–</span></span></div>
      <div class="ph-bar"><i id="q5h-bar" style="width:0%"></i></div>
    </div>
    <div class="quota-row" data-row="7d-all">
      <div class="top"><span class="k">Weekly · all models</span><span class="v"><b id="q7d-pct">–</b> · resets <span id="q7d-reset">–</span></span></div>
      <div class="ph-bar"><i id="q7d-bar" style="width:0%"></i></div>
    </div>
    <div class="quota-row" data-row="design">
      <div class="top"><span class="k">Weekly · Claude Design</span><span class="v"><b id="qdes-pct">0%</b> · resets <span id="qdes-reset">—</span></span></div>
      <div class="ph-bar"><i id="qdes-bar" style="width:0%"></i></div>
    </div>
    <div class="quota-row" data-row="sonnet">
      <div class="top"><span class="k">Sonnet only</span><span class="v"><b id="qson-pct">–</b> · resets <span id="qson-reset">–</span></span></div>
      <div class="ph-bar"><i id="qson-bar" style="width:0%"></i></div>
    </div>
  </div>
  <div class="footer">
    <span class="active-pill"><span class="glyph"></span><span id="ph-active-model">–</span></span>
    <span id="ph-active-slug" style="color:var(--mute);font-size:11px">–</span>
  </div>
</section>
<div class="navs">
  <svg id="deps-svg" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"></svg>
  <div class="nav-row composers" id="nav-composers"><span class="label">★ composer</span></div>
  <div class="nav-row orchestrators" id="nav-orchestrators"><span class="label">◆ orchestrators</span></div>
  <div class="nav-row workers" id="nav-workers"><span class="label">workers</span><span class="spacer"></span>
    <button class="toggle-btn" id="btn-archive-all-done" title="Archive all sessions in state=done">archive all done</button>
    <button class="toggle-btn" id="btn-toggle-deps" title="Show dependency lines">deps ✓</button>
  </div>
  <div class="nav-row archive" id="nav-archive">
    <span class="label archive-toggle" id="archive-folder-label" title="Click to expand/collapse">📁 archive <span id="archive-count">0</span> <span id="archive-chevron">▶</span></span>
  </div>
</div>
<main>
  <aside class="side" id="side"><div class="placeholder">pick a tab</div></aside>
  <section class="content" id="content"><div class="placeholder">no session selected</div></section>
  <aside class="right-side" id="right-side"><div class="placeholder">select a session</div></aside>
</main>
<script>
(() => {
  const state = { sessions: [], metrics: {}, active: null, archiveExpanded: false, showDeps: true, hoveredSlug: null, startedAt: Date.now(),
                  status: { activeSessions:0, monthCostUsd:0, monthBudgetUsd:200, ctxLimit:200000 } };
  const composerRowEl = document.getElementById('nav-composers');
  const orchRowEl = document.getElementById('nav-orchestrators');
  const workersRowEl = document.getElementById('nav-workers');
  const archiveRowEl = document.getElementById('nav-archive');
  const sideEl = document.getElementById('side');
  const contentEl = document.getElementById('content');
  const rightSideEl = document.getElementById('right-side');

  const fmt = (n, d=0) => Number(n||0).toLocaleString(undefined,{maximumFractionDigits:d});
  const fmtUsd = n => '$' + Number(n||0).toFixed(2);
  const fmtDur = ms => {
    const s = Math.round(ms/1000);
    if (s < 60) return s+'s';
    const m = Math.floor(s/60), r = s%60;
    return m+'m'+r+'s';
  };

  function modelCtxLimit(model) {
    const m = String(model || '').toLowerCase();
    if (m.includes('haiku')) return 200_000;
    return 1_000_000;
  }
  function fmtK(n) {
    if (n >= 1_000_000) return (n/1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n/1_000).toFixed(1) + 'k';
    return String(n);
  }
  function barClass(pct){ return pct > 85 ? 'err' : pct > 60 ? 'warn' : ''; }
  // "resets in Nh"/"Nd" helpers. 5h window: rolling — reset time is 5h
  // from the oldest cost-contributing event we've seen. We don't track
  // that precisely; show "~5h" as a static hint. 7d window: weekly ISO,
  // next Monday 00:00 local.
  // Format "resets in Nh" / "Nd" from an ISO timestamp returned by
  // /api/oauth/usage. Matches Claude Code desktop copy ("resets 4h",
  // "resets 5d"). Under 1h shows minutes, otherwise hours/days.
  function humanResetIn(isoTs) {
    const target = Date.parse(isoTs);
    if (!target || isNaN(target)) return '—';
    const diff = Math.max(0, target - Date.now());
    const s = Math.floor(diff / 1000);
    if (s < 3600) return Math.ceil(s / 60) + 'm';
    const h = s / 3600;
    if (h < 24) return Math.ceil(h) + 'h';
    return Math.ceil(h / 24) + 'd';
  }

  function renderHeader() {
    document.getElementById('hdr-count').textContent = state.status.activeSessions;
    document.getElementById('hdr-uptime').textContent = fmtDur(Date.now() - state.startedAt);

    // Plan-header (Claude Code style): context for active session, plus
    // 5h / 7d / sonnet rolling quota bars.
    const s = state.sessions.find(x => x.slug === state.active);
    const m = state.metrics[state.active] || {};
    const ctxLimit = modelCtxLimit(s ? s.model : 'sonnet');
    const ctxUsed = m.lastTurnContextUsed || 0;
    const ctxPct = Math.min(100, (ctxUsed / ctxLimit) * 100);
    document.getElementById('ph-ctx-val').textContent = fmtK(ctxUsed) + ' / ' + fmtK(ctxLimit);
    document.getElementById('ph-ctx-pct').textContent = '(' + ctxPct.toFixed(0) + '%)';
    const ctxBar = document.getElementById('ph-ctx-bar');
    ctxBar.style.width = ctxPct + '%';
    ctxBar.className = barClass(ctxPct);

    // Real quota from Anthropic /api/oauth/usage (mirror of Claude Code
    // /status). Each bucket has { utilization: 0-100, resets_at: ISO }.
    const q = (state.status && state.status.quota) || {};
    const bucket = (key) => q[key] || null;
    const renderBucket = (b, pctId, resetId, barId) => {
      const pct = b && typeof b.utilization === 'number' ? b.utilization : 0;
      const resetStr = b && b.resets_at ? humanResetIn(b.resets_at) : '—';
      document.getElementById(pctId).textContent = pct.toFixed(0) + '%';
      document.getElementById(resetId).textContent = resetStr;
      const bar = document.getElementById(barId);
      bar.style.width = Math.min(100, pct) + '%';
      bar.className = barClass(pct);
    };
    renderBucket(bucket('five_hour'),            'q5h-pct',  'q5h-reset',  'q5h-bar');
    renderBucket(bucket('seven_day'),            'q7d-pct',  'q7d-reset',  'q7d-bar');
    renderBucket(bucket('seven_day_omelette'),   'qdes-pct', 'qdes-reset', 'qdes-bar');
    renderBucket(bucket('seven_day_sonnet'),     'qson-pct', 'qson-reset', 'qson-bar');

    document.getElementById('ph-active-model').textContent = s ? (s.model || '?') + ' · ' + fmtK(ctxLimit) : '—';
    document.getElementById('ph-active-slug').textContent = s ? s.slug : '';
  }
  setInterval(renderHeader, 1000);

  // Collapse/expand the detail grid — clicking the context row flips a flag.
  document.getElementById('plan-toggle').addEventListener('click', () => {
    const el = document.getElementById('plan-header');
    el.classList.toggle('collapsed');
    document.getElementById('ph-chev').textContent = el.classList.contains('collapsed') ? '›' : '⌄';
  });

  function displayState(s, m) {
    // Orchestrators don't die on --print completion — their conversation
    // state is resumable. Show "done" for them as "standby" so it's clear
    // they're available for another poke.
    if ((s.role === 'orchestrator' || s.role === 'composer') && m.state === 'done') return 'standby';
    return m.state || (s.archived ? 'archived' : 'idle');
  }

  function modelClass(model) {
    const m = String(model || '').toLowerCase();
    if (m.includes('opus')) return 'opus';
    if (m.includes('haiku')) return 'haiku';
    return 'sonnet';
  }
  function modelShort(model) {
    const m = String(model || '').toLowerCase();
    if (m.includes('opus')) return 'opus';
    if (m.includes('haiku')) return 'haiku';
    if (m.includes('sonnet')) return 'sonnet';
    return model || '?';
  }
  // Color per worker kind — stable hash so "frontend-ui" is always cyan-ish etc.
  function kindColor(kind) {
    if (!kind) return 'hsl(220, 10%, 55%)';
    if (kind === 'composer') return '#fbbf24';
    if (kind === 'orchestrator') return '#a78bfa';
    let h = 0;
    for (let i = 0; i < kind.length; i++) h = (h * 31 + kind.charCodeAt(i)) >>> 0;
    return 'hsl(' + (h % 360) + ', 55%, 62%)';
  }
  function makeTabEl(s) {
    const m = state.metrics[s.slug] || {};
    const st = displayState(s, m);
    const t = document.createElement('div');
    t.className = 'tab' + (state.active === s.slug ? ' active' : '') + (s.archived ? ' archived' : '');
    t.dataset.slug = s.slug;
    const mc = modelClass(s.model);
    const kind = s.kind || '';
    const kindPill = kind
      ? '<span class="kind-pill" style="color:' + kindColor(kind) + ';border-color:' + kindColor(kind) + '">' + kind + '</span>'
      : '';
    t.innerHTML = '<span class="dot ' + st + '"></span>' +
                  '<span>' + s.slug + '</span>' +
                  kindPill +
                  '<span class="model-pill ' + mc + '" style="padding:1px 6px;font-size:9px"><span class="glyph"></span>' + modelShort(s.model) + '</span>' +
                  '<small style="color:var(--mute)">[' + st + ']</small>';
    t.onclick = () => selectTab(s.slug);
    t.onmouseenter = () => { state.hoveredSlug = s.slug; drawDeps(); };
    t.onmouseleave = () => { state.hoveredSlug = null; drawDeps(); };
    return t;
  }

  // ── Dependency graph ──

  // Each edge gets its own color — stable (hash-based, not rand()) but
  // distinct per (from, to) pair. Spawned edges stay in the violet range
  // (so you can still tell "orchestrator sent this" at a glance), declared
  // edges drift across the full hue wheel.
  function edgeColor(dep) {
    const key = dep.from + '→' + dep.to;
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
    if (dep.kind === 'spawned') {
      // violet base 270°, jitter ±25°, medium saturation
      const hue = 245 + (h % 50);
      return 'hsl(' + hue + ', 65%, 68%)';
    }
    return 'hsl(' + (h % 360) + ', 68%, 62%)';
  }

  state.deps = [];
  async function fetchDeps() {
    try {
      const r = await fetch('/api/deps');
      state.deps = await r.json();
    } catch { state.deps = []; }
  }

  // Orthogonal (Manhattan) routing with horizontal lanes beneath the nav rows.
  // Each edge: down from source → run horizontally on an assigned lane → up to target.
  // Lanes are 14px apart, assigned greedily to avoid overlap in the horizontal segment.
  function drawDeps() {
    const svg = document.getElementById('deps-svg');
    if (!svg) return;
    svg.innerHTML = '';
    if (!state.showDeps) return;
    const navs = document.querySelector('.navs');
    const nRect = navs.getBoundingClientRect();
    svg.setAttribute('viewBox', '0 0 ' + nRect.width + ' ' + nRect.height);
    svg.setAttribute('width', nRect.width);
    svg.setAttribute('height', nRect.height);

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const markerIds = new Set();
    svg.appendChild(defs);

    const tabEls = {};
    for (const el of document.querySelectorAll('.navs .tab[data-slug]')) {
      tabEls[el.dataset.slug] = el;
    }

    // Prepare edge geometry
    const prepared = [];
    for (const dep of state.deps) {
      const a = tabEls[dep.from], b = tabEls[dep.to];
      if (!a || !b) continue;
      const aR = a.getBoundingClientRect(), bR = b.getBoundingClientRect();
      const x1 = aR.left + aR.width / 2 - nRect.left;
      const y1 = aR.bottom - nRect.top + 2;        // source: just below the tab
      const x2 = bR.left + bR.width / 2 - nRect.left;
      const y2 = bR.bottom - nRect.top + 2;        // target: just below the tab (anchor to card bottom so the line never crosses the card body)
      const xMin = Math.min(x1, x2);
      const xMax = Math.max(x1, x2);
      prepared.push({ dep, x1, y1, x2, y2, xMin, xMax });
    }

    // Horizontal lanes live in the padding-bottom area beneath the nav rows.
    // padding-bottom was increased to 120px to give more room for lanes; we
    // start the first lane 100px from the bottom and space lanes 9px apart
    // (tighter than before) to fit more concurrent edges cleanly.
    const laneBaseY = nRect.height - 100;  // first lane
    const laneStep  = 9;                   // vertical distance between lanes
    const lanes = [];                      // lanes[i] = [{xMin,xMax}, ...]

    // Greedy lane assignment: pick the lowest-index lane whose existing
    // segments don't overlap with this one (with a tiny buffer).
    prepared.sort((a, b) => a.xMin - b.xMin);
    for (const p of prepared) {
      let lane = 0;
      const buf = 6;
      while (lanes[lane] && lanes[lane].some(r =>
        !(p.xMax + buf < r.xMin || p.xMin - buf > r.xMax))) lane++;
      (lanes[lane] ||= []).push({ xMin: p.xMin, xMax: p.xMax });
      p.lane = lane;
      p.laneY = laneBaseY + lane * laneStep;
    }

    const hover = state.hoveredSlug;
    const R = 5; // corner radius

    for (const p of prepared) {
      const { dep, x1, y1, x2, y2, laneY } = p;
      const color = edgeColor(dep);
      const safeId = 'arr-' + color.replace(/[^a-z0-9]/gi, '');
      const safeIdStart = 'arrS-' + color.replace(/[^a-z0-9]/gi, '');
      if (!markerIds.has(safeId)) {
        markerIds.add(safeId);
        const m = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        m.setAttribute('id', safeId);
        m.setAttribute('viewBox', '0 0 10 10');
        m.setAttribute('refX', '8');
        m.setAttribute('refY', '5');
        m.setAttribute('markerWidth', '6');
        m.setAttribute('markerHeight', '6');
        m.setAttribute('orient', 'auto');
        const t = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        t.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
        t.setAttribute('fill', color);
        m.appendChild(t);
        defs.appendChild(m);
        // Reverse-facing marker for bidirectional (spawned) edges:
        // parent dispatched the task AND the child returns results.
        const mS = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        mS.setAttribute('id', safeIdStart);
        mS.setAttribute('viewBox', '0 0 10 10');
        mS.setAttribute('refX', '2');
        mS.setAttribute('refY', '5');
        mS.setAttribute('markerWidth', '6');
        mS.setAttribute('markerHeight', '6');
        mS.setAttribute('orient', 'auto-start-reverse');
        const tS = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        tS.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
        tS.setAttribute('fill', color);
        mS.appendChild(tS);
        defs.appendChild(mS);
      }

      // Ortho path with rounded corners:
      //   (x1,y1) ↓ → (x1, laneY-R) ↓round→ (x1+sign*R, laneY) → (x2-sign*R, laneY) ↑round→ (x2, laneY ...) ↑ to y2
      const goRight = x2 >= x1;
      const sign = goRight ? 1 : -1;
      const stop = 7;                          // stop short for arrowhead
      // Both source and target are anchored to the card's BOTTOM edge now
      // (y1 = source.bottom+2, y2 = target.bottom+2). The path descends
      // from y1 to the lane, runs horizontally, then ascends back UP to y2.
      // So when stopping short of the target we go BELOW y2 (higher y
      // value); same for bidirectional reverse at source.
      const y2stop = y2 + stop;
      const y1start = dep.kind === 'spawned' ? y1 + stop : y1;

      const c1x = x1, c1y = laneY - R;
      const c2x = x1 + sign * R, c2y = laneY;
      const c3x = x2 - sign * R, c3y = laneY;
      const c4x = x2, c4y = laneY - R;

      // Build path
      const d = [
        'M', x1, y1start,
        'L', c1x, c1y,
        // 90° corner at (x1, laneY)
        'Q', x1, laneY, c2x, c2y,
        // horizontal run
        'L', c3x, c3y,
        // 90° corner at (x2, laneY)
        'Q', x2, laneY, c4x, c4y,
        // up to target
        'L', x2, y2stop,
      ].join(' ');

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('stroke', color);
      path.setAttribute('style', 'color:' + color);
      path.setAttribute('marker-end', 'url(#' + safeId + ')');
      // For orchestrator→worker (spawned) edges, also draw a reverse arrow at
      // the source. Visualizes the bidirectional relationship — parent
      // dispatches the task, child will return its result back.
      if (dep.kind === 'spawned') path.setAttribute('marker-start', 'url(#' + safeIdStart + ')');
      const touched = !hover || hover === dep.from || hover === dep.to;
      path.setAttribute('class', 'dep-line' + (touched ? '' : ' dim') + (hover && touched ? ' highlight' : ''));
      if (dep.kind === 'spawned') path.setAttribute('stroke-dasharray', '3 5');
      svg.appendChild(path);
    }
  }
  window.addEventListener('resize', drawDeps);
  document.addEventListener('scroll', drawDeps, true);
  for (const row of document.querySelectorAll('.nav-row')) row.addEventListener('scroll', drawDeps);
  setInterval(() => { fetchDeps().then(drawDeps); }, 5000); // refresh every 5s

  // ── Drag + wheel scroll on nav rows (no visible scrollbar) ──
  // Threshold-based drag so a simple click still fires on tabs/buttons:
  //   pointerdown → record start; don't claim the event yet
  //   pointermove > 6px → activate drag, capture, scroll
  //   click after drag → suppress (don't fire onclick)
  function wireRowScroll(row) {
    let pending = null;   // { x, scroll, pointerId }
    let dragging = false;
    const THRESHOLD = 6;
    row.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      pending = { x: e.clientX, scroll: row.scrollLeft, pointerId: e.pointerId };
    });
    row.addEventListener('pointermove', (e) => {
      if (!pending) return;
      const dx = e.clientX - pending.x;
      if (!dragging && Math.abs(dx) > THRESHOLD) {
        dragging = true;
        row.classList.add('dragging');
        try { row.setPointerCapture(pending.pointerId); } catch {}
      }
      if (dragging) row.scrollLeft = pending.scroll - dx;
    });
    const end = () => {
      if (dragging) row.classList.remove('dragging');
      pending = null;
      // Delay clearing so the 'click' capture handler below sees it
      setTimeout(() => { dragging = false; }, 0);
    };
    row.addEventListener('pointerup', end);
    row.addEventListener('pointercancel', end);
    // Swallow the click that follows a drag so tabs don't switch accidentally
    row.addEventListener('click', (e) => {
      if (dragging) { e.stopPropagation(); e.preventDefault(); }
    }, true);
    // Wheel → horizontal when vertical predominates
    row.addEventListener('wheel', (e) => {
      const absY = Math.abs(e.deltaY), absX = Math.abs(e.deltaX);
      if (absY > absX) {
        e.preventDefault();
        row.scrollLeft += e.deltaY;
      }
    }, { passive: false });
  }
  for (const row of document.querySelectorAll('.nav-row')) wireRowScroll(row);

  // ── M3 scrollbar reveal: flip .scrolling while any scroll container is
  //    actively being scrolled; remove the class after 900ms idle so the
  //    thumb fades back out. Delegated on document so dynamically inserted
  //    panes (renderContent/renderRightSide) are covered for free. ──
  (function wireScrollReveal() {
    const timers = new WeakMap();
    document.addEventListener('scroll', (e) => {
      const t = e.target;
      if (!t || t.nodeType !== 1) return;
      // Only style our known scrollable containers.
      if (!t.matches('.log, .side, .right-side, .content, .file-list, .task-body')) return;
      t.classList.add('scrolling');
      clearTimeout(timers.get(t));
      timers.set(t, setTimeout(() => t.classList.remove('scrolling'), 900));
    }, true);
  })();

  // archive-folder-label click is inside nav-row — make sure it still fires
  // (drag threshold is 6px, label click needs no drag so it's fine)

  function renderTabs() {
    // Composer row — always pinned at the top. Typically one session.
    composerRowEl.querySelectorAll('.tab').forEach(n => n.remove());
    const composers = state.sessions.filter(s => s.role === 'composer' && !s.archived);
    if (composers.length === 0) {
      const empty = document.createElement('small'); empty.className = 'tab'; empty.style.opacity = '.4';
      empty.style.cursor = 'default'; empty.textContent = '(no composer — run: claude-session create composer --model sonnet)';
      composerRowEl.appendChild(empty);
    } else {
      for (const s of composers) composerRowEl.appendChild(makeTabEl(s));
    }
    // Orchestrators row
    orchRowEl.querySelectorAll('.tab').forEach(n => n.remove());
    const orch = state.sessions.filter(s => (s.role === 'orchestrator' || s.role === 'composer') && !s.archived);
    if (orch.length === 0) {
      const empty = document.createElement('small'); empty.className = 'tab'; empty.style.opacity = '.4';
      empty.style.cursor = 'default'; empty.textContent = '(no orchestrators)';
      orchRowEl.appendChild(empty);
    } else {
      for (const s of orch) orchRowEl.appendChild(makeTabEl(s));
    }
    // Workers row — active only, composer + orchestrator excluded.
    // If a composer tab is selected, filter workers to those created after
    // that composer (approximates "spawned during this composer's tenure"
    // since the registry has no parent-run column yet).
    workersRowEl.querySelectorAll('.tab').forEach(n => n.remove());
    let workers = state.sessions.filter(s => s.role !== 'orchestrator' && s.role !== 'composer' && !s.archived);
    const activeComp = state.active && (state.sessions.find(x => x.slug === state.active)?.role === 'composer') ? state.active : null;
    if (activeComp) {
      const comp = state.sessions.find(x => x.slug === activeComp);
      if (comp) workers = workers.filter(w => w.created >= comp.created);
    }
    const lbl = workersRowEl.querySelector('.label');
    if (lbl) lbl.textContent = activeComp ? `workers · ${workers.length} (${activeComp})` : `workers · ${workers.length}`;
    const spacer = workersRowEl.querySelector('.spacer');
    for (const s of workers) workersRowEl.insertBefore(makeTabEl(s), spacer);
    // Archive row — archived sessions (both orchestrators & workers)
    archiveRowEl.querySelectorAll('.tab').forEach(n => n.remove());
    const archived = state.sessions.filter(s => s.archived);
    document.getElementById('archive-count').textContent = archived.length;
    document.getElementById('archive-chevron').textContent = state.archiveExpanded ? '▼' : '▶';
    archiveRowEl.classList.toggle('collapsed', !state.archiveExpanded);
    for (const s of archived) archiveRowEl.appendChild(makeTabEl(s));
    // Hide the archive row entirely when there's nothing there
    archiveRowEl.style.display = archived.length === 0 ? 'none' : 'flex';
  }

  function renderSide(slug) {
    const s = state.sessions.find(x => x.slug === slug);
    const m = state.metrics[slug];
    if (!s || !m) { sideEl.innerHTML = '<div class="placeholder">loading…</div>'; return; }
    const ctxPct = Math.min(100, (m.lastTurnContextUsed / state.status.ctxLimit) * 100);
    const ctxPctRaw = (m.lastTurnContextUsed / state.status.ctxLimit) * 100;
    const pctColor = ctxPctRaw > 85 ? 'var(--err)' : ctxPctRaw > 60 ? 'var(--warn)' : 'var(--accent)';
    const ctxBarClass = ctxPctRaw > 85 ? 'err' : ctxPctRaw > 60 ? 'warn' : '';
    const mc = modelClass(s.model);
    const monthPct = Math.min(100, (state.status.monthCostUsd / state.status.monthBudgetUsd) * 100);
    const monthBarClass = monthPct > 85 ? 'err' : monthPct > 60 ? 'warn' : '';
    sideEl.innerHTML = \`
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:.5rem">
        <span class="model-pill \${mc}"><span class="glyph"></span>\${s.model || '?'}</span>
        <span style="color:var(--mute);font-size:11px">\${m.state}</span>
      </div>
      <div class="plan-card">
        <h4>plan usage</h4>
        <div class="plan-row"><span class="k">context window</span><span class="v">\${fmt(m.lastTurnContextUsed)} / \${fmt(state.status.ctxLimit)} (\${ctxPct.toFixed(0)}%)</span></div>
        <div class="plan-bar"><i class="\${ctxBarClass}" style="width:\${ctxPct}%"></i></div>
        <div class="plan-row"><span class="k">cost · this month</span><span class="v">\${fmtUsd(state.status.monthCostUsd)} / \${fmtUsd(state.status.monthBudgetUsd)} (\${monthPct.toFixed(0)}%)</span></div>
        <div class="plan-bar"><i class="\${monthBarClass}" style="width:\${monthPct}%"></i></div>
        <div class="plan-row"><span class="k">session cost</span><span class="v">\${fmtUsd(m.totalCostUsd)} · \${m.turns || 0} turns</span></div>
      </div>
      <dl>
        <dt>slug</dt><dd>\${s.slug}</dd>
        <dt>workroom</dt><dd>\${s.workroom || '–'}</dd>
        <dt>uuid</dt><dd style="font-size:10px;color:var(--mute)">\${s.uuid.slice(0,8)}…</dd>
        <dt>created</dt><dd style="font-size:11px">\${s.created.slice(0,19).replace('T',' ')}</dd>
      </dl>
      <h3>context window — last API call <span style="color:\${pctColor}">\${ctxPct.toFixed(0)}%</span></h3>
      <div class="bar"><i style="width:\${ctxPct}%;background:\${pctColor}"></i></div>
      <dl style="margin-top:.3rem">
        <dt>last call</dt><dd>\${fmt(m.lastTurnContextUsed)} / \${fmt(state.status.ctxLimit)}</dd>
        <dt>peak call</dt><dd>\${fmt(m.peakContextUsed)} (\${((m.peakContextUsed/state.status.ctxLimit)*100).toFixed(0)}%)</dd>
        <dt>├ input</dt><dd>\${fmt(m.lastTurnInput)}</dd>
        <dt>├ cache read</dt><dd>\${fmt(m.lastTurnCacheRead)}</dd>
        <dt>├ cache create</dt><dd>\${fmt(m.lastTurnCacheCreate)}</dd>
        <dt>└ output</dt><dd>\${fmt(m.lastTurnOutput)}</dd>
      </dl>
      <h3>session total work</h3>
      <dl>
        <dt>tokens processed</dt><dd>\${fmt(m.totalTokensProcessed)}</dd>
        <dt>├ input</dt><dd>\${fmt(m.tokensIn)}</dd>
        <dt>├ output</dt><dd>\${fmt(m.tokensOut)}</dd>
        <dt>└ cache read</dt><dd>\${fmt(m.cacheRead)}</dd>
      </dl>
      <h3>cost & time</h3>
      <dl>
        <dt>cost</dt><dd>\${fmtUsd(m.totalCostUsd)}</dd>
        <dt>duration</dt><dd>\${fmtDur(m.durationMs)}</dd>
        <dt>turns</dt><dd>\${m.turns}</dd>
      </dl>
      <h3>actions</h3>
      <div style="display:flex;flex-direction:column;gap:6px">
        \${s.archived ? '<button id="btn-kill" class="danger" disabled title="session archived">archived</button>'
                     : '<button id="btn-kill" class="danger">kill</button>'}
        \${(!s.archived && m.state === 'done' && s.role !== 'orchestrator') ? '<button id="btn-archive">archive</button>' : ''}
        \${(!s.archived && (s.role === 'orchestrator' || s.role === 'composer')) ? '<button id="btn-poke" title="Resume session with a new instruction">poke (resume)</button>' : ''}
      </div>
      \${(!s.archived && (s.role === 'orchestrator' || s.role === 'composer')) ? \`
      <h3>why 'standby'?</h3>
      <div style="font-size:11px;color:var(--mute);line-height:1.4">
        claude --print one-shot completed and session is resumable by UUID.
        Use 'poke' to continue the conversation — nothing was lost.
      </div>\` : ''}
    \`;
    const kBtn = document.getElementById('btn-kill');
    if (kBtn && !s.archived) kBtn.onclick = () => {
      if (!confirm('Kill session '+slug+'?')) return;
      fetch('/api/sessions/'+slug, { method: 'DELETE' }).then(refresh);
    };
    const aBtn = document.getElementById('btn-archive');
    if (aBtn) aBtn.onclick = async () => {
      await fetch('/api/sessions/'+slug+'/archive', { method: 'POST' });
      delete renderCache[slug];
      refresh();
    };
    const pBtn = document.getElementById('btn-poke');
    if (pBtn) pBtn.onclick = async () => {
      const msg = prompt('Resume orchestrator with what instruction?', 'Check ~/state/queue/{pending,running,done}/, then if pending count is below 10 generate another 15-20 TASK.md tasks from the open matrices in docs/architecture-v5/11-*.md and 12-*.md. Final report.');
      if (!msg) return;
      await fetch('/api/sessions/'+slug+'/send', {
        method: 'POST', headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ prompt: msg })
      });
      delete renderCache[slug];
      refresh();
    };
  }

  async function renderRightSide(slug) {
    if (!slug) { rightSideEl.innerHTML = '<div class="placeholder">select a session</div>'; return; }
    try {
      const r = await fetch('/api/sessions/'+slug+'/context');
      const ctx = await r.json();
      const esc = s => String(s||'').replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
      const taskHtml = ctx.task ? \`
        <h3>task <span style="color:var(--mute);font-weight:normal">· \${esc(ctx.task.location)}</span></h3>
        <dl>
          <dt>id</dt><dd>\${esc(ctx.task.id)}</dd>
          \${ctx.task.model ? '<dt>model</dt><dd>'+esc(ctx.task.model)+'</dd>' : ''}
          \${ctx.task.priority ? '<dt>priority</dt><dd>'+esc(ctx.task.priority)+'</dd>' : ''}
          \${ctx.task.depends_on ? '<dt>depends_on</dt><dd style="font-size:11px">'+esc(ctx.task.depends_on)+'</dd>' : ''}
        </dl>
        <div class="task-body" style="margin-top:.4rem">\${esc(ctx.task.body)}</div>
      \` : '<h3>task</h3><div style="color:var(--mute);font-size:11px">no TASK.md found (workroom cleaned / not a queue task)</div>';
      const opBadge = (name, count) => {
        const short = { Read:'R', Write:'W', Edit:'E', MultiEdit:'M', NotebookEdit:'M', Bash:'B' }[name] || name[0];
        return '<span class="op '+short+'" title="'+esc(name)+' ×'+count+'">'+short+'</span>';
      };
      const filesHtml = (ctx.files && ctx.files.length) ? \`
        <h3>files touched <span style="color:var(--mute);font-weight:normal">\${ctx.files.length}</span></h3>
        <div class="file-list">
          \${ctx.files.map(f => \`
            <div class="file-row" title="\${esc(f.path)} · \${f.count} ops">
              <span class="ops">\${Object.entries(f.ops).map(([n,c]) => opBadge(n,c)).join('')}</span>
              <span class="path">\${esc(f.path)}</span>
            </div>
          \`).join('')}
        </div>
      \` : '<h3>files touched</h3><div style="color:var(--mute);font-size:11px">none yet</div>';

      // Skill bundle block — driven off the session's kind column from the
      // registry (falls back to inferred default). Per-kind plugin list is
      // fetched once from /api/skill-bundles and stashed on state.
      const session = state.sessions.find(x => x.slug === slug);
      const bundles = state.skillBundles || {};
      const kind = (session && session.kind) ||
                   (session && session.role === 'composer' ? 'composer' :
                    session && session.role === 'orchestrator' ? 'orchestrator' : 'default');
      const bundle = bundles[kind] || bundles.default || { purpose: '', plugins: [] };
      const kindOptions = Object.keys(bundles).sort()
        .map(k => '<option value="'+esc(k)+'"'+(k===kind?' selected':'')+'>'+esc(k)+'</option>')
        .join('');
      const skillsHtml = \`
        <h3>skill bundle
          <span class="kind-pill" style="color:\${kindColor(kind)};border-color:\${kindColor(kind)}">\${esc(kind)}</span>
        </h3>
        <div style="color:var(--mute);font-size:11px;line-height:1.4">\${esc(bundle.purpose || '—')}</div>
        <select class="kind-select" id="skill-kind-select">\${kindOptions}</select>
        <div class="skill-list">
          \${(bundle.plugins || []).map(pl => '<div class="skill-row"><span class="dot"></span><span class="name">'+esc(pl)+'</span></div>').join('') ||
            '<div class="skill-row muted"><span class="name">(no plugins)</span></div>'}
        </div>
        <div style="color:var(--mute);font-size:10px;margin-top:.4rem;line-height:1.4">
          Selecting a new kind changes the bias prompt for the next turn; existing turns keep their original subjectivity.
        </div>
      \`;
      rightSideEl.innerHTML = taskHtml + filesHtml + skillsHtml;
      const sel = document.getElementById('skill-kind-select');
      if (sel) sel.onchange = async () => {
        const newKind = sel.value;
        const b = (state.skillBundles[newKind]) || {};
        const plugins = (b.plugins || []).join(', ');
        const msg = 'System update: your worker kind is now \`'+newKind+'\`. Purpose: '+(b.purpose||'—')+' Recommended skills: '+plugins+'. Acknowledge and continue.';
        await fetch('/api/sessions/'+slug+'/send', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ prompt: msg })
        });
      };
    } catch (e) {
      rightSideEl.innerHTML = '<div class="placeholder">failed to load context</div>';
    }
  }

  const renderCache = {};

  async function renderContent(slug) {
    if (renderCache[slug] === undefined) {
      renderCache[slug] = { loaded: false, dom: null };
    }
    if (!renderCache[slug].loaded) {
      contentEl.innerHTML = '<div class="placeholder">loading log…</div>';
      const r = await fetch('/api/sessions/'+slug+'/log');
      const text = await r.text();
      const dom = buildLogDom(text);
      renderCache[slug] = { loaded: true, dom };
    }
    contentEl.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:.4rem;flex:1;min-height:0';
    const logBox = document.createElement('div');
    logBox.className = 'log';
    logBox.id = 'log-'+slug;
    logBox.appendChild(renderCache[slug].dom);
    wrap.appendChild(logBox);
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = \`<input type="text" id="send-input" placeholder="Follow-up prompt to \${slug}…"><button id="send-btn">send</button>\`;
    wrap.appendChild(row);
    contentEl.appendChild(wrap);
    logBox.scrollTop = logBox.scrollHeight;
    document.getElementById('send-btn').onclick = doSend;
    document.getElementById('send-input').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }});
    function doSend() {
      const inp = document.getElementById('send-input');
      const v = inp.value.trim(); if (!v) return;
      inp.disabled = true;
      fetch('/api/sessions/'+slug+'/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: v })})
        .then(r => r.json()).then(() => { inp.value = ''; inp.disabled = false; inp.focus(); });
    }
  }

  function buildLogDom(ndjson) {
    const frag = document.createDocumentFragment();
    const lines = ndjson.split('\\n');
    let textBuffer = '';
    for (const ln of lines) {
      if (!ln) continue;
      try {
        const e = JSON.parse(ln);
        if (e.type === 'assistant') {
          const txt = (e.message?.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
          if (txt) { const d = document.createElement('div'); d.className = 'assistant'; d.textContent = txt; frag.appendChild(d); }
        } else if (e.type === 'stream_event') {
          const delta = e.event?.delta;
          if (delta?.type === 'thinking_delta' && delta.thinking) {
            const d = document.createElement('span'); d.className = 'thinking'; d.textContent = delta.thinking;
            frag.appendChild(d);
          }
        } else if (e.type === 'user' && e.message?.content?.[0]?.type === 'tool_result' && e.message.content[0].is_error) {
          const d = document.createElement('div'); d.className = 'err'; d.textContent = '! ' + (e.message.content[0].content || '').slice(0, 400);
          frag.appendChild(d);
        } else if (e.type === 'result') {
          const d = document.createElement('div'); d.className = 'meta';
          d.textContent = '── done tokens=' + (e.usage?.output_tokens || '?') + ' duration=' + ((e.duration_ms||0)/1000).toFixed(1) + 's cost=' + (e.total_cost_usd||0).toFixed(4);
          frag.appendChild(d);
        }
      } catch {/* ignore non-json */}
    }
    return frag;
  }

  function selectTab(slug) {
    state.active = slug;
    renderTabs();
    renderSide(slug);
    renderRightSide(slug);
    delete renderCache[slug]; // force reload log on tab click
    renderContent(slug);
  }

  async function refresh() {
    // Skill-bundles (kind → { purpose, plugins[] }) — lazy-fetched once.
    if (!state.skillBundles) {
      try {
        const sb = await fetch('/api/skill-bundles');
        state.skillBundles = await sb.json();
      } catch { state.skillBundles = {}; }
    }
    // Always include archive now — folder collapses/hides it visually
    const r = await fetch('/api/sessions?include=archive');
    const arr = await r.json();
    state.sessions = arr.map(x => x.session);
    arr.forEach(x => { state.metrics[x.session.slug] = x.metrics; });
    if (!state.active && state.sessions.length) {
      // Default to composer if it exists, else first session.
      const comp = state.sessions.find(s => s.role === 'composer' && !s.archived);
      state.active = (comp ? comp.slug : state.sessions[0].slug);
    }
    if (state.active && !state.sessions.find(s => s.slug === state.active)) {
      state.active = state.sessions[0]?.slug || null;
    }
    renderTabs();
    if (state.active) { renderSide(state.active); renderContent(state.active); renderRightSide(state.active); }
    else { sideEl.innerHTML = '<div class="placeholder">no session selected</div>'; contentEl.innerHTML = '<div class="placeholder">no session selected</div>'; rightSideEl.innerHTML = '<div class="placeholder">no session selected</div>'; }
    await fetchDeps();
    requestAnimationFrame(drawDeps);
  }
  document.getElementById('btn-refresh').onclick = () => {
    for (const k of Object.keys(renderCache)) delete renderCache[k];
    refresh();
  };
  document.getElementById('archive-folder-label').onclick = () => {
    state.archiveExpanded = !state.archiveExpanded;
    renderTabs();
    requestAnimationFrame(drawDeps);
  };
  document.getElementById('btn-toggle-deps').onclick = (e) => {
    state.showDeps = !state.showDeps;
    e.target.textContent = 'deps ' + (state.showDeps ? '✓' : '✗');
    e.target.classList.toggle('active', state.showDeps);
    drawDeps();
  };
  document.getElementById('btn-toggle-deps').classList.add('active');
  document.getElementById('btn-archive-all-done').onclick = async () => {
    if (!confirm('Archive all sessions in state=done? (orchestrators are skipped)')) return;
    const r = await fetch('/api/sessions/archive-all-done', { method: 'POST' });
    const j = await r.json();
    alert('Archived ' + (j.archived || []).length + ' sessions: ' + (j.archived || []).join(', '));
    for (const k of Object.keys(renderCache)) delete renderCache[k];
    refresh();
  };
  refresh();

  // ── append helper used by SSE log-append and initial load ──
  function appendLinesToLog(slug, ndjsonText) {
    const logBox = document.getElementById('log-'+slug);
    if (!logBox) return;
    const wasAtBottom = Math.abs(logBox.scrollTop + logBox.clientHeight - logBox.scrollHeight) < 60;
    const lines = ndjsonText.split('\\n');
    for (const ln of lines) {
      if (!ln) continue;
      try {
        const e = JSON.parse(ln);
        if (e.type === 'assistant') {
          const txt = (e.message?.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
          if (txt) { const d = document.createElement('div'); d.className='assistant'; d.textContent = txt; logBox.appendChild(d); }
        } else if (e.type === 'stream_event') {
          const delta = e.event?.delta;
          if (delta?.type === 'thinking_delta' && delta.thinking) {
            const d = document.createElement('span'); d.className='thinking'; d.textContent = delta.thinking;
            logBox.appendChild(d);
          } else if (delta?.type === 'text_delta' && delta.text) {
            // live assistant streaming chunk
            let last = logBox.lastElementChild;
            if (!last || !last.classList.contains('streaming')) {
              last = document.createElement('div'); last.className = 'assistant streaming';
              logBox.appendChild(last);
            }
            last.textContent += delta.text;
          }
        } else if (e.type === 'user' && e.message?.content?.[0]?.type === 'tool_result' && e.message.content[0].is_error) {
          const d = document.createElement('div'); d.className='err';
          d.textContent = '! ' + (e.message.content[0].content || '').slice(0, 400);
          logBox.appendChild(d);
        } else if (e.type === 'result') {
          const d = document.createElement('div'); d.className='meta';
          d.textContent = '── done tokens=' + (e.usage?.output_tokens || '?')
            + ' duration=' + ((e.duration_ms||0)/1000).toFixed(1) + 's'
            + ' cost=' + (e.total_cost_usd||0).toFixed(4);
          logBox.appendChild(d);
        }
      } catch {/* skip non-json */}
    }
    if (wasAtBottom) logBox.scrollTop = logBox.scrollHeight;
  }

  // Periodic right-side refresh (tool_use events trickle in over time).
  setInterval(() => { if (state.active) renderRightSide(state.active); }, 5000);

  // SSE
  const sse = new EventSource('/api/stream');
  // Left panel + tab-badge updates only — NO full log reload
  sse.addEventListener('metrics', ev => {
    const { session, metrics } = JSON.parse(ev.data);
    state.metrics[session.slug] = metrics;
    if (state.active === session.slug) renderSide(session.slug);
    renderTabs();
  });
  // Append new log chunks to the right-side log box in real time
  sse.addEventListener('log-append', ev => {
    const { slug, raw } = JSON.parse(ev.data);
    if (state.active !== slug) return;         // other tab — ignore
    appendLinesToLog(slug, raw);
  });
  sse.addEventListener('status', ev => { state.status = JSON.parse(ev.data); renderHeader(); });
})();
</script></body></html>`;

// ──────────────────────────── main ────────────────────────────

const server = createServer(handle);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[claude-web-dashboard] listening on http://0.0.0.0:${PORT}`);
  pollLoop();
});
