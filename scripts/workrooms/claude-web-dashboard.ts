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
import { spawn } from 'node:child_process';
import {
  createReadStream,
  existsSync,
  promises as fsp,
  readdirSync,
  readFileSync,
  statSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

// ────────────────────────── config ──────────────────────────

const HOME = homedir();
const STATE_DIR = join(HOME, 'state/claude-sessions');
const REGISTRY = join(STATE_DIR, '.registry.tsv');
const ARCHIVE_DIR = join(STATE_DIR, 'archive');
const ARCHIVE_REGISTRY = join(ARCHIVE_DIR, '.registry.tsv');
const BIN_CLAUDE_SESSION = join(HOME, 'bin/claude-session');

// Ensure archive dir exists + has a registry header
try {
  if (!existsSync(ARCHIVE_DIR)) {
    require('node:fs').mkdirSync(ARCHIVE_DIR, { recursive: true });
  }
  if (!existsSync(ARCHIVE_REGISTRY)) {
    require('node:fs').writeFileSync(ARCHIVE_REGISTRY, 'slug\tuuid\twindow\tworkroom\tmodel\tcreated\tarchived_at\n');
  }
} catch {}

// Heuristic: is this session an orchestrator/coordinator (shown in top row)?
function isOrchestratorSlug(slug) {
  return /orchestrator|coordinator|planner|manager/i.test(slug);
}

const MAX_SUBSCRIPTION_BUDGET_USD = 200; // Anthropic Max tier
const CTX_WINDOW_LIMIT = 200_000;        // claude-sonnet-4-6 / haiku-4-5

const PORT = Number(process.argv.includes('--port') ? process.argv[process.argv.indexOf('--port') + 1] : 9090);
const BASIC_USER = process.env.DASHBOARD_USER || '';
const BASIC_PASS = process.env.DASHBOARD_PASS || '';
const AUTH_REQUIRED = Boolean(BASIC_USER && BASIC_PASS);

function checkAuth(req, res) {
  if (!AUTH_REQUIRED) return true;
  const header = req.headers.authorization || '';
  if (header.startsWith('Basic ')) {
    try {
      const [u, p] = Buffer.from(header.slice(6), 'base64').toString('utf8').split(':');
      if (u === BASIC_USER && p === BASIC_PASS) return true;
    } catch {}
  }
  res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="claude-sessions"', 'Content-Type': 'text/plain' });
  res.end('Unauthorized');
  return false;
}

// ────────────────────────── registry ─────────────────────────

function readRegistry() {
  if (!existsSync(REGISTRY)) return [];
  const lines = readFileSync(REGISTRY, 'utf8').trim().split('\n');
  if (lines.length < 2) return [];
  return lines
    .slice(1)
    .map(l => l.split('\t'))
    .filter(cols => cols.length >= 6)
    .map(([slug, uuid, window, workroom, model, created]) => ({
      slug, uuid, window, workroom: workroom || '', model, created, archived: false,
    }));
}

function readArchiveRegistry() {
  if (!existsSync(ARCHIVE_REGISTRY)) return [];
  const lines = readFileSync(ARCHIVE_REGISTRY, 'utf8').trim().split('\n');
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
  const { spawnSync } = require('node:child_process');
  // Best effort: kill tmux window + session via claude-session (will ignore errors if already gone)
  try { spawnSync(BIN_CLAUDE_SESSION, ['kill', slug], { timeout: 5000 }); } catch {}
  // Move log + state json
  const fs = require('node:fs');
  const moveIfExists = (src, dst) => { if (existsSync(src)) try { fs.renameSync(src, dst); } catch {} };
  moveIfExists(join(STATE_DIR, `${slug}.log`),  join(ARCHIVE_DIR, `${slug}.log`));
  moveIfExists(join(STATE_DIR, `${slug}.json`), join(ARCHIVE_DIR, `${slug}.json`));
  // Remove from active registry (kill already did, but be safe)
  if (existsSync(REGISTRY)) {
    const lines = readFileSync(REGISTRY, 'utf8').split('\n');
    const kept = lines.filter(l => !l.startsWith(`${slug}\t`));
    fs.writeFileSync(REGISTRY, kept.join('\n'));
  }
  // Append to archive registry
  const archivedAt = new Date().toISOString();
  fs.appendFileSync(
    ARCHIVE_REGISTRY,
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

function sessionLogPath(slug) { return join(STATE_DIR, `${slug}.log`); }

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
  if (!existsSync(STATE_DIR)) return 0;
  const firstOfMonth = new Date();
  firstOfMonth.setDate(1); firstOfMonth.setHours(0, 0, 0, 0);

  let total = 0;
  for (const f of readdirSync(STATE_DIR)) {
    if (!f.endsWith('.log')) continue;
    const p = join(STATE_DIR, f);
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

// ──────────────────────── SSE plumbing ────────────────────────

const sseClients = new Set();

function broadcastSse(event, data, slug = null) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const c of sseClients) {
    if (slug && c.slug && c.slug !== slug && c.slug !== '*') continue;
    try { c.res.write(payload); } catch { /* ignore */ }
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

async function pollLoop() {
  setInterval(async () => {
    try {
      const rows = readRegistry();
      for (const r of rows) {
        const p = sessionLogPath(r.slug);
        if (!existsSync(p)) continue;
        const mt = statSync(p).mtimeMs;
        const sz = statSync(p).size;

        // (A) Stream new log bytes (append-only to clients)
        if (lastStreamPos[r.slug] === undefined) {
          // First time we see this slug — baseline at EOF so we don't flood old content
          lastStreamPos[r.slug] = sz;
        } else if (sz > lastStreamPos[r.slug]) {
          const { bytes, raw } = await readLogTailSince(r.slug, lastStreamPos[r.slug]);
          lastStreamPos[r.slug] = bytes;
          if (raw) {
            // Only send complete lines — hold back an incomplete tail for next cycle
            const lastNl = raw.lastIndexOf('\n');
            if (lastNl >= 0) {
              const complete = raw.slice(0, lastNl);
              lastStreamPos[r.slug] = bytes - (raw.length - lastNl - 1);
              broadcastSse('log-append', { slug: r.slug, raw: complete }, '*');
            }
          }
        }

        // (B) Metrics update on mtime change (left panel)
        if (lastSnapshot[r.slug] !== mt) {
          lastSnapshot[r.slug] = mt;
          const m = await computeMetrics(r.slug);
          broadcastSse('metrics', { session: r, metrics: m }, '*');
        }
      }
      // Overall status every cycle
      const cost = await monthCostSoFar();
      broadcastSse('status', {
        activeSessions: rows.length,
        monthCostUsd: Number(cost.toFixed(4)),
        monthBudgetUsd: MAX_SUBSCRIPTION_BUDGET_USD,
        ctxLimit: CTX_WINDOW_LIMIT,
      }, '*');
    } catch (err) {
      console.error('[poll]', err);
    }
  }, 1000);
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
    const p = spawn(BIN_CLAUDE_SESSION, args);
    let stdout = '', stderr = '';
    p.stdout.on('data', d => stdout += d.toString());
    p.stderr.on('data', d => stderr += d.toString());
    p.on('close', code => resolveFn({ code: code ?? 0, stdout, stderr }));
  });
}

async function handle(req, res) {
  if (!checkAuth(req, res)) return;
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
      session: { ...r, role: isOrchestratorSlug(r.slug) ? 'orchestrator' : 'worker' },
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

  // ── overall status ──
  if (p === '/api/status' && req.method === 'GET') {
    const cost = await monthCostSoFar();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      activeSessions: readRegistry().length,
      monthCostUsd: Number(cost.toFixed(4)),
      monthBudgetUsd: MAX_SUBSCRIPTION_BUDGET_USD,
      ctxLimit: CTX_WINDOW_LIMIT,
    }));
    return;
  }

  // ── full log dump (for tab switch; client truncates to last N lines) ──
  const logM = p.match(/^\/api\/sessions\/([a-z0-9-]+)\/log$/);
  if (logM && req.method === 'GET') {
    const slug = logM[1];
    const activePath = sessionLogPath(slug);
    const archivePath = join(ARCHIVE_DIR, `${slug}.log`);
    const path = existsSync(activePath) ? activePath
               : existsSync(archivePath) ? archivePath
               : null;
    if (!path) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': 'application/x-ndjson' });
    createReadStream(path).pipe(res);
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
    const client = { res, slug: '*' };
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
  header{display:flex;gap:1rem;align-items:center;padding:.6rem 1rem;border-bottom:1px solid var(--line);background:var(--panel)}
  header h1{margin:0;font-size:14px;letter-spacing:.5px;color:var(--accent)}
  .stat{display:flex;flex-direction:column;gap:2px;padding:2px 10px;border-left:1px solid var(--line)}
  .stat b{font-size:12px;color:var(--mute);font-weight:normal}
  .stat span{font-variant-numeric:tabular-nums}
  .bar{width:100%;height:4px;background:#222;border-radius:2px;overflow:hidden;margin-top:2px}
  .bar > i{display:block;height:100%;background:linear-gradient(90deg,#5b8ff9,#b78fff);transition:width .4s}
  .navs{display:flex;flex-direction:column;border-bottom:1px solid var(--line);background:var(--panel);position:relative}
  #deps-svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1}
  #deps-svg .dep-line{fill:none;stroke-width:1.6;opacity:.55;stroke-dasharray:6 4;animation:dep-flow 1.6s linear infinite}
  #deps-svg .dep-line.highlight{opacity:1;stroke-width:2.5;filter:drop-shadow(0 0 4px currentColor)}
  #deps-svg .dep-arrow{fill:currentColor;opacity:.8}
  @keyframes dep-flow{from{stroke-dashoffset:0}to{stroke-dashoffset:-20}}
  .nav-row{display:flex;gap:.3rem;padding:.4rem .6rem;overflow-x:auto;align-items:center}
  .nav-row + .nav-row{border-top:1px solid var(--line)}
  .nav-row .label{color:var(--mute);font-size:10px;letter-spacing:.5px;text-transform:uppercase;margin-right:.5rem;min-width:90px;flex-shrink:0}
  .nav-row.orchestrators{background:#0f1419}
  .nav-row.orchestrators .label{color:#a78bfa}
  .nav-row .tab{padding:.35rem .7rem;border-radius:4px;background:#1a1f26;cursor:pointer;white-space:nowrap;display:flex;gap:6px;align-items:center;border:1px solid transparent}
  .nav-row .tab:hover{border-color:var(--line)}
  .nav-row .tab.active{border-color:var(--accent);color:var(--accent)}
  .nav-row.orchestrators .tab.active{border-color:#a78bfa;color:#a78bfa}
  .nav-row .tab .dot{width:8px;height:8px;border-radius:50%;background:var(--mute)}
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
  main{display:grid;grid-template-columns:minmax(240px,300px) 1fr;height:calc(100vh - 100px)}
  .side{border-right:1px solid var(--line);padding:.8rem;overflow-y:auto;background:var(--panel)}
  .side dl{margin:0;display:grid;grid-template-columns:1fr auto;gap:4px 10px;font-size:12px}
  .side dt{color:var(--mute)}
  .side dd{margin:0;text-align:right;font-variant-numeric:tabular-nums}
  .side h3{margin:1rem 0 .3rem;font-size:11px;color:var(--mute);letter-spacing:.5px;text-transform:uppercase}
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
  <div class="stat"><b>cost this month</b><span id="hdr-cost">–</span>
    <div class="bar"><i id="hdr-cost-bar" style="width:0%"></i></div>
  </div>
  <div class="stat"><b>uptime</b><span id="hdr-uptime">–</span></div>
  <div style="flex:1"></div>
  <button id="btn-refresh" title="force refresh">↻</button>
</header>
<div class="navs">
  <svg id="deps-svg" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"></svg>
  <div class="nav-row orchestrators" id="nav-orchestrators"><span class="label">◆ orchestrators</span></div>
  <div class="nav-row workers" id="nav-workers"><span class="label">workers</span><span class="spacer"></span>
    <button class="toggle-btn" id="btn-archive-all-done" title="Archive all sessions in state=done">archive done</button>
    <button class="toggle-btn" id="btn-toggle-archive" title="Show archived sessions">show archive</button>
    <button class="toggle-btn" id="btn-toggle-deps" title="Show dependency lines">deps ✓</button>
  </div>
</div>
<main>
  <aside class="side" id="side"><div class="placeholder">pick a tab</div></aside>
  <section class="content" id="content"><div class="placeholder">no session selected</div></section>
</main>
<script>
(() => {
  const state = { sessions: [], metrics: {}, active: null, showArchive: false, showDeps: true, hoveredSlug: null, startedAt: Date.now(),
                  status: { activeSessions:0, monthCostUsd:0, monthBudgetUsd:200, ctxLimit:200000 } };
  const orchRowEl = document.getElementById('nav-orchestrators');
  const workersRowEl = document.getElementById('nav-workers');
  const sideEl = document.getElementById('side');
  const contentEl = document.getElementById('content');

  const fmt = (n, d=0) => Number(n||0).toLocaleString(undefined,{maximumFractionDigits:d});
  const fmtUsd = n => '$' + Number(n||0).toFixed(2);
  const fmtDur = ms => {
    const s = Math.round(ms/1000);
    if (s < 60) return s+'s';
    const m = Math.floor(s/60), r = s%60;
    return m+'m'+r+'s';
  };

  function renderHeader() {
    document.getElementById('hdr-count').textContent = state.status.activeSessions;
    document.getElementById('hdr-cost').textContent =
      fmtUsd(state.status.monthCostUsd) + ' / ' + fmtUsd(state.status.monthBudgetUsd);
    const pct = Math.min(100, (state.status.monthCostUsd / state.status.monthBudgetUsd) * 100);
    document.getElementById('hdr-cost-bar').style.width = pct + '%';
    document.getElementById('hdr-uptime').textContent = fmtDur(Date.now() - state.startedAt);
  }
  setInterval(renderHeader, 1000);

  function makeTabEl(s) {
    const m = state.metrics[s.slug] || {};
    const st = m.state || (s.archived ? 'archived' : 'idle');
    const t = document.createElement('div');
    t.className = 'tab' + (state.active === s.slug ? ' active' : '') + (s.archived ? ' archived' : '');
    t.dataset.slug = s.slug;
    t.innerHTML = '<span class="dot ' + st + '"></span><span>' + s.slug + '</span>' +
                  '<small style="color:var(--mute)">[' + st + ']</small>';
    t.onclick = () => selectTab(s.slug);
    t.onmouseenter = () => { state.hoveredSlug = s.slug; drawDeps(); };
    t.onmouseleave = () => { state.hoveredSlug = null; drawDeps(); };
    return t;
  }

  // ── Dependency graph ──

  // Stable hue from a chain prefix → distinct color per chain
  function chainColor(prefix) {
    if (prefix === 'orchestrator') return '#a78bfa'; // violet
    let h = 0;
    for (let i = 0; i < prefix.length; i++) h = (h * 31 + prefix.charCodeAt(i)) >>> 0;
    return 'hsl(' + (h % 360) + ', 70%, 62%)';
  }

  // Group slug into a "chain" key — shared prefix family
  function chainOf(slug) {
    // wave3-calls-XXX   → wave3-calls
    // wave3-actions-XXX → wave3-actions
    // wave3-chat-XXX    → wave3-chat
    // wm/ other         → first segment
    const parts = slug.split('-');
    if (parts.length >= 2) return parts[0] + '-' + parts[1];
    return parts[0];
  }

  // Derive edges from current state:
  //  • within each chain, order by created timestamp → linear dependency
  //  • orchestrator → every worker session created after it
  function inferDeps() {
    const deps = [];
    const byChain = {};
    for (const s of state.sessions) {
      if (s.role === 'orchestrator') continue;
      const c = chainOf(s.slug);
      (byChain[c] ||= []).push(s);
    }
    for (const [chain, items] of Object.entries(byChain)) {
      if (items.length < 2) continue;
      items.sort((a, b) => (a.created || '').localeCompare(b.created || ''));
      for (let i = 1; i < items.length; i++) {
        deps.push({ from: items[i-1].slug, to: items[i].slug, chain, color: chainColor(chain) });
      }
    }
    // Orchestrator edges
    const orch = state.sessions.filter(s => s.role === 'orchestrator');
    for (const o of orch) {
      for (const s of state.sessions) {
        if (s.role !== 'orchestrator' && (s.created || '') > (o.created || '')) {
          deps.push({ from: o.slug, to: s.slug, chain: 'orchestrator', color: chainColor('orchestrator'), orchestrator: true });
        }
      }
    }
    return deps;
  }

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

    const tabEls = {};
    for (const el of document.querySelectorAll('.navs .tab[data-slug]')) {
      tabEls[el.dataset.slug] = el;
    }

    const deps = inferDeps();
    const hover = state.hoveredSlug;
    for (const dep of deps) {
      const a = tabEls[dep.from], b = tabEls[dep.to];
      if (!a || !b) continue;
      const aR = a.getBoundingClientRect(), bR = b.getBoundingClientRect();
      const x1 = aR.left + aR.width / 2 - nRect.left;
      const y1 = aR.bottom - nRect.top;
      const x2 = bR.left + bR.width / 2 - nRect.left;
      const y2 = bR.bottom - nRect.top;
      // Bezier that dips below the tab row
      const midY = Math.max(y1, y2) + Math.max(20, Math.abs(x2 - x1) * 0.18);
      const d = 'M ' + x1 + ' ' + y1 +
                ' C ' + x1 + ' ' + midY + ', ' + x2 + ' ' + midY + ', ' + x2 + ' ' + y2;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('stroke', dep.color);
      path.setAttribute('style', 'color:' + dep.color);
      const isHl = hover === dep.from || hover === dep.to;
      path.setAttribute('class', 'dep-line' + (isHl ? ' highlight' : ''));
      svg.appendChild(path);
    }
  }
  window.addEventListener('resize', drawDeps);
  document.addEventListener('scroll', drawDeps, true);
  // Also redraw when nav rows scroll horizontally
  for (const row of document.querySelectorAll('.nav-row')) row.addEventListener('scroll', drawDeps);
  setInterval(drawDeps, 2000); // periodic re-layout guard

  function renderTabs() {
    // Orchestrators row
    orchRowEl.querySelectorAll('.tab').forEach(n => n.remove());
    const orch = state.sessions.filter(s => s.role === 'orchestrator');
    if (orch.length === 0) {
      const empty = document.createElement('small'); empty.className = 'tab'; empty.style.opacity = '.4';
      empty.style.cursor = 'default'; empty.textContent = '(no orchestrators)';
      orchRowEl.appendChild(empty);
    } else {
      for (const s of orch) orchRowEl.appendChild(makeTabEl(s));
    }
    // Workers row — remove existing tabs but keep label/spacer/buttons
    workersRowEl.querySelectorAll('.tab').forEach(n => n.remove());
    const workers = state.sessions.filter(s => s.role !== 'orchestrator');
    // Insert worker tabs before the spacer
    const spacer = workersRowEl.querySelector('.spacer');
    for (const s of workers) workersRowEl.insertBefore(makeTabEl(s), spacer);
  }

  function renderSide(slug) {
    const s = state.sessions.find(x => x.slug === slug);
    const m = state.metrics[slug];
    if (!s || !m) { sideEl.innerHTML = '<div class="placeholder">loading…</div>'; return; }
    const ctxPct = Math.min(100, (m.lastTurnContextUsed / state.status.ctxLimit) * 100);
    const ctxPctRaw = (m.lastTurnContextUsed / state.status.ctxLimit) * 100;
    const pctColor = ctxPctRaw > 85 ? 'var(--err)' : ctxPctRaw > 60 ? 'var(--warn)' : 'var(--accent)';
    sideEl.innerHTML = \`
      <dl>
        <dt>slug</dt><dd>\${s.slug}</dd>
        <dt>state</dt><dd>\${m.state}</dd>
        <dt>model</dt><dd>\${s.model}</dd>
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
        \${(!s.archived && m.state === 'done') ? '<button id="btn-archive">archive</button>' : ''}
      </div>
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
    delete renderCache[slug]; // force reload log on tab click
    renderContent(slug);
  }

  async function refresh() {
    const url = '/api/sessions' + (state.showArchive ? '?include=archive' : '');
    const r = await fetch(url);
    const arr = await r.json();
    state.sessions = arr.map(x => x.session);
    arr.forEach(x => { state.metrics[x.session.slug] = x.metrics; });
    if (!state.active && state.sessions.length) state.active = state.sessions[0].slug;
    if (state.active && !state.sessions.find(s => s.slug === state.active)) {
      state.active = state.sessions[0]?.slug || null;
    }
    renderTabs();
    if (state.active) { renderSide(state.active); renderContent(state.active); }
    else { sideEl.innerHTML = '<div class="placeholder">no session selected</div>'; contentEl.innerHTML = '<div class="placeholder">no session selected</div>'; }
    requestAnimationFrame(drawDeps);
  }
  document.getElementById('btn-refresh').onclick = () => {
    for (const k of Object.keys(renderCache)) delete renderCache[k];
    refresh();
  };
  document.getElementById('btn-toggle-archive').onclick = (e) => {
    state.showArchive = !state.showArchive;
    e.target.classList.toggle('active', state.showArchive);
    e.target.textContent = state.showArchive ? 'hide archive' : 'show archive';
    for (const k of Object.keys(renderCache)) delete renderCache[k];
    refresh();
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
