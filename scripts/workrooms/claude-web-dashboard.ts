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
const BIN_CLAUDE_SESSION = join(HOME, 'bin/claude-session');

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
      slug, uuid, window, workroom: workroom || '', model, created,
    }));
}

// ──────────────── per-session derived metrics ────────────────

function zeroMetrics(slug) {
  return {
    slug, lastLineAt: 0, state: 'idle',
    tokensIn: 0, tokensOut: 0, cacheRead: 0, cacheCreate: 0,
    contextUsed: 0, totalCostUsd: 0, durationMs: 0, turns: 0,
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

  // Forward pass: accumulate tokens / cost from ALL results in the log
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
    } catch { /* skip */ }
  }
  m.contextUsed = m.tokensIn + m.tokensOut + m.cacheRead + m.cacheCreate;
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

async function pollLoop() {
  setInterval(async () => {
    try {
      const rows = readRegistry();
      // Per-session log mtime changes → push metrics update
      for (const r of rows) {
        const p = sessionLogPath(r.slug);
        if (!existsSync(p)) continue;
        const mt = statSync(p).mtimeMs;
        if (lastSnapshot[r.slug] !== mt) {
          lastSnapshot[r.slug] = mt;
          const m = await computeMetrics(r.slug);
          broadcastSse('metrics', { session: r, metrics: m }, r.slug);
          broadcastSse('metrics', { session: r, metrics: m }, '*'); // status feed
        }
      }
      // Always push overall status once per cycle
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

  // ── sessions list ──
  if (p === '/api/sessions' && req.method === 'GET') {
    const rows = readRegistry();
    const all = await Promise.all(rows.map(async r => ({
      session: r,
      metrics: await computeMetrics(r.slug),
    })));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(all));
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
    const path = sessionLogPath(slug);
    if (!existsSync(path)) { res.writeHead(404); res.end(); return; }
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
  nav{display:flex;gap:.3rem;padding:.4rem .6rem;border-bottom:1px solid var(--line);background:var(--panel);overflow-x:auto}
  nav .tab{padding:.35rem .7rem;border-radius:4px;background:#1a1f26;cursor:pointer;white-space:nowrap;display:flex;gap:6px;align-items:center;border:1px solid transparent}
  nav .tab:hover{border-color:var(--line)}
  nav .tab.active{border-color:var(--accent);color:var(--accent)}
  nav .tab .dot{width:8px;height:8px;border-radius:50%;background:var(--mute)}
  nav .tab .dot.thinking{background:var(--warn);box-shadow:0 0 4px var(--warn)}
  nav .tab .dot.tool_call{background:#a78bfa;box-shadow:0 0 4px #a78bfa}
  nav .tab .dot.streaming{background:var(--accent);box-shadow:0 0 4px var(--accent)}
  nav .tab .dot.running{background:var(--accent)}
  nav .tab .dot.done{background:var(--ok)}
  nav .tab .dot.error{background:var(--err)}
  nav .tab .dot.idle{background:var(--mute)}
  nav .tab .dot.stalled{background:#6b7280}
  main{display:grid;grid-template-columns:minmax(240px,300px) 1fr;height:calc(100vh - 100px)}
  .side{border-right:1px solid var(--line);padding:.8rem;overflow-y:auto;background:var(--panel)}
  .side dl{margin:0;display:grid;grid-template-columns:1fr auto;gap:4px 10px;font-size:12px}
  .side dt{color:var(--mute)}
  .side dd{margin:0;text-align:right;font-variant-numeric:tabular-nums}
  .side h3{margin:1rem 0 .3rem;font-size:11px;color:var(--mute);letter-spacing:.5px;text-transform:uppercase}
  .content{padding:.6rem 1rem;overflow-y:auto;display:flex;flex-direction:column;gap:.5rem}
  .log{flex:1;background:#06080a;border:1px solid var(--line);border-radius:4px;padding:.5rem;overflow-y:auto;white-space:pre-wrap;word-break:break-word;font-size:12px;line-height:1.5}
  .log .assistant{color:#e5e7eb}
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
<nav id="tabs"></nav>
<main>
  <aside class="side" id="side"><div class="placeholder">pick a tab</div></aside>
  <section class="content" id="content"><div class="placeholder">no session selected</div></section>
</main>
<script>
(() => {
  const state = { sessions: [], metrics: {}, active: null, startedAt: Date.now(),
                  status: { activeSessions:0, monthCostUsd:0, monthBudgetUsd:200, ctxLimit:200000 } };
  const tabsEl = document.getElementById('tabs');
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

  function renderTabs() {
    tabsEl.innerHTML = '';
    for (const s of state.sessions) {
      const st = state.metrics[s.slug]?.state || 'idle';
      const t = document.createElement('div');
      t.className = 'tab' + (state.active === s.slug ? ' active' : '');
      t.innerHTML = \`<span class="dot \${st}"></span><span>\${s.slug}</span><small style="color:var(--mute)">[\${st}]</small>\`;
      t.onclick = () => selectTab(s.slug);
      tabsEl.appendChild(t);
    }
  }

  function renderSide(slug) {
    const s = state.sessions.find(x => x.slug === slug);
    const m = state.metrics[slug];
    if (!s || !m) { sideEl.innerHTML = '<div class="placeholder">loading…</div>'; return; }
    const ctxPct = Math.min(100, (m.contextUsed / state.status.ctxLimit) * 100);
    sideEl.innerHTML = \`
      <dl>
        <dt>slug</dt><dd>\${s.slug}</dd>
        <dt>state</dt><dd>\${m.state}</dd>
        <dt>model</dt><dd>\${s.model}</dd>
        <dt>workroom</dt><dd>\${s.workroom || '–'}</dd>
        <dt>uuid</dt><dd style="font-size:10px;color:var(--mute)">\${s.uuid.slice(0,8)}…</dd>
        <dt>created</dt><dd style="font-size:11px">\${s.created.slice(0,19).replace('T',' ')}</dd>
      </dl>
      <h3>context \${ctxPct.toFixed(0)}%</h3>
      <div class="bar"><i style="width:\${ctxPct}%"></i></div>
      <dl style="margin-top:.3rem">
        <dt>used</dt><dd>\${fmt(m.contextUsed)} / \${fmt(state.status.ctxLimit)}</dd>
        <dt>cache read</dt><dd>\${fmt(m.cacheRead)}</dd>
        <dt>cache create</dt><dd>\${fmt(m.cacheCreate)}</dd>
        <dt>input</dt><dd>\${fmt(m.tokensIn)}</dd>
        <dt>output</dt><dd>\${fmt(m.tokensOut)}</dd>
      </dl>
      <h3>cost & time</h3>
      <dl>
        <dt>cost</dt><dd>\${fmtUsd(m.totalCostUsd)}</dd>
        <dt>duration</dt><dd>\${fmtDur(m.durationMs)}</dd>
        <dt>turns</dt><dd>\${m.turns}</dd>
      </dl>
      <h3>actions</h3>
      <div style="display:flex;flex-direction:column;gap:6px">
        <button id="btn-kill" class="danger">kill</button>
      </div>
    \`;
    document.getElementById('btn-kill').onclick = () => {
      if (!confirm('Kill session '+slug+'?')) return;
      fetch('/api/sessions/'+slug, { method: 'DELETE' }).then(refresh);
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
    const r = await fetch('/api/sessions');
    const arr = await r.json();
    state.sessions = arr.map(x => x.session);
    arr.forEach(x => { state.metrics[x.session.slug] = x.metrics; });
    if (!state.active && state.sessions.length) state.active = state.sessions[0].slug;
    renderTabs();
    if (state.active) { renderSide(state.active); if (!renderCache[state.active]) renderContent(state.active); }
  }
  document.getElementById('btn-refresh').onclick = () => {
    for (const k of Object.keys(renderCache)) delete renderCache[k];
    refresh();
  };
  refresh();

  // SSE
  const sse = new EventSource('/api/stream');
  sse.addEventListener('metrics', ev => {
    const { session, metrics } = JSON.parse(ev.data);
    state.metrics[session.slug] = metrics;
    if (state.active === session.slug) {
      renderSide(session.slug);
      // Append newly arrived log lines by bumping the tail lazily — easiest: just reload log when it's short
      delete renderCache[session.slug];
      renderContent(session.slug);
    }
    renderTabs();
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
