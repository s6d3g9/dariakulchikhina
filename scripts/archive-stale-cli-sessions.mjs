#!/usr/bin/env node
// Sweep stale rows out of ~/state/claude-sessions/.registry.tsv into
// archive/.registry.tsv so the monitor's "all" filter stops surfacing
// zombies. A row is stale when its tmux window is gone OR its log file
// hasn't been touched in STALE_HOURS hours.
//
// Whitelist: any slug listed in WHITELIST never gets archived, no matter
// how stale — that's the operator's own session(s).
//
// Usage:
//   node scripts/archive-stale-cli-sessions.mjs            # dry-run
//   node scripts/archive-stale-cli-sessions.mjs --apply    # actually move rows

import { readFileSync, writeFileSync, statSync, existsSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { homedir } from 'node:os'

const STATE_DIR = join(homedir(), 'state/claude-sessions')
const REG = join(STATE_DIR, '.registry.tsv')
const ARCHIVE_DIR = join(STATE_DIR, 'archive')
const ARCHIVE_REG = join(ARCHIVE_DIR, '.registry.tsv')
const STALE_HOURS = 24

// Slugs that must NEVER be archived. composer-messendzher is the user's
// own session; orchestrator/v5-orchestrator are long-lived control planes.
const WHITELIST = new Set(['composer-messendzher', 'orchestrator', 'v5-orchestrator'])

const apply = process.argv.includes('--apply')

function liveTmuxWindows() {
  try {
    const out = execFileSync('tmux', ['list-windows', '-a', '-F', '#{session_name}:#{window_name}'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return new Set(out.split('\n').filter(Boolean))
  }
  catch {
    return new Set()
  }
}

function logMtimeMs(slug) {
  try { return statSync(join(STATE_DIR, `${slug}.log`)).mtimeMs }
  catch { return null }
}

function readTsv(path) {
  if (!existsSync(path)) return { headers: [], rows: [] }
  const lines = readFileSync(path, 'utf8').replace(/\n+$/, '').split('\n')
  const headers = (lines[0] ?? '').split('\t')
  const rows = lines.slice(1).filter(Boolean).map(line => {
    const cols = line.split('\t')
    const obj = {}
    headers.forEach((h, i) => { obj[h] = cols[i] ?? '' })
    return obj
  })
  return { headers, rows }
}

function writeTsv(path, headers, rows) {
  const body = [headers.join('\t'), ...rows.map(r => headers.map(h => r[h] ?? '').join('\t'))].join('\n') + '\n'
  writeFileSync(path, body)
}

const liveWindows = liveTmuxWindows()
const { headers: liveHeaders, rows: liveRows } = readTsv(REG)
const { headers: archHeadersRaw, rows: archRows } = readTsv(ARCHIVE_REG)
const archHeaders = archHeadersRaw.length ? archHeadersRaw : [...liveHeaders, 'archived_at']
if (!archHeaders.includes('archived_at')) archHeaders.push('archived_at')

const now = Date.now()
const staleThresholdMs = STALE_HOURS * 3600 * 1000
const keep = []
const archive = []

for (const row of liveRows) {
  if (WHITELIST.has(row.slug)) { keep.push(row); continue }
  const tmuxKey = row.window ? `cc:${row.window}` : ''
  const tmuxAlive = tmuxKey && liveWindows.has(tmuxKey)
  const mtime = logMtimeMs(row.slug)
  const ageMs = mtime != null ? now - mtime : null
  const stale = ageMs == null || ageMs > staleThresholdMs

  if (!tmuxAlive || stale) {
    archive.push({ row, reason: !tmuxAlive ? 'tmux-dead' : `log-stale ${(ageMs / 3600000).toFixed(1)}h` })
  }
  else {
    keep.push(row)
  }
}

console.log(`Live registry: ${liveRows.length} rows`)
console.log(`Whitelist preserved: ${liveRows.filter(r => WHITELIST.has(r.slug)).length}`)
console.log(`Would archive: ${archive.length}`)
console.log(`Would keep: ${keep.length}`)
console.log()
for (const { row, reason } of archive) {
  console.log(`  - ${row.slug.padEnd(40)} ${reason}`)
}

if (!apply) {
  console.log('\nDry-run. Re-run with --apply to commit.')
  process.exit(0)
}

if (archive.length === 0) {
  console.log('\nNothing to archive.')
  process.exit(0)
}

if (!existsSync(ARCHIVE_DIR)) mkdirSync(ARCHIVE_DIR, { recursive: true })
const archivedAt = new Date().toISOString()
const newArchRows = [
  ...archRows,
  ...archive.map(({ row }) => ({ ...row, archived_at: archivedAt })),
]
writeTsv(ARCHIVE_REG, archHeaders, newArchRows)
writeTsv(REG, liveHeaders, keep)
console.log(`\nArchived ${archive.length} rows. Live now: ${keep.length}.`)
