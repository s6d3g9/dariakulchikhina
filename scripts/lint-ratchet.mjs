#!/usr/bin/env node
// lint-ratchet — prevents architectural-lint regressions without forcing
// a full cleanup of existing debt.
//
// Modes:
//   update   — run ESLint across the repo, save per-file error counts to
//              .lint-baseline.json. Use after legitimate backlog reduction.
//   check    — run ESLint, compare against baseline. Fails with a clear
//              report if any file has MORE errors than the baseline, or if
//              a new file is introduced with errors. Per-file ratchet:
//              existing debt is tolerated, regression is not.
//
// Typical use:
//   - Developer edits file A (which has existing errors). Ratchet allows
//     as long as error count in A does not increase.
//   - Developer adds new file B with errors. Ratchet fails — new files
//     must be clean.
//   - Developer cleans up 30 errors. Run `pnpm lint:baseline` to lock in
//     the new, lower total.

import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASELINE_PATH = path.join(REPO_ROOT, '.lint-baseline.json')
const ESLINT_BIN = path.join(REPO_ROOT, 'node_modules', 'eslint', 'bin', 'eslint.js')

const mode = process.argv[2]
if (!['update', 'check'].includes(mode)) {
  console.error('usage: node scripts/lint-ratchet.mjs <update|check>')
  process.exit(2)
}

function runEslint() {
  if (!existsSync(ESLINT_BIN)) {
    console.error(`[lint-ratchet] eslint binary not found at ${ESLINT_BIN}. Run \`pnpm install\` first.`)
    process.exit(2)
  }
  const r = spawnSync(
    process.execPath,
    [ESLINT_BIN, '.', '--quiet', '--format', 'json'],
    {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      maxBuffer: 128 * 1024 * 1024,
    },
  )
  // ESLint exits 1 when there are errors; the JSON is still valid on stdout.
  if (!r.stdout) {
    console.error('[lint-ratchet] ESLint produced no stdout. stderr:')
    console.error(r.stderr || '(empty)')
    process.exit(2)
  }
  try {
    return JSON.parse(r.stdout)
  } catch (e) {
    console.error('[lint-ratchet] failed to parse ESLint JSON:', e.message)
    console.error('stderr:', r.stderr?.slice(0, 2000) || '(empty)')
    console.error('stdout head:', r.stdout.slice(0, 500))
    process.exit(2)
  }
}

function collect(results) {
  const perFile = {}
  let total = 0
  for (const r of results) {
    if (r.errorCount > 0) {
      const rel = path.relative(REPO_ROOT, r.filePath).replaceAll('\\', '/')
      perFile[rel] = r.errorCount
      total += r.errorCount
    }
  }
  return { perFile, total }
}

function loadBaseline() {
  if (!existsSync(BASELINE_PATH)) return null
  return JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
}

function saveBaseline(data) {
  const sorted = {}
  for (const k of Object.keys(data.perFile).sort()) sorted[k] = data.perFile[k]
  const payload = {
    generatedAt: new Date().toISOString(),
    totalErrors: data.total,
    perFile: sorted,
  }
  writeFileSync(BASELINE_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8')
}

const results = runEslint()
const current = collect(results)

if (mode === 'update') {
  saveBaseline(current)
  console.log(
    `[lint-ratchet] baseline updated: ${current.total} errors across ${Object.keys(current.perFile).length} files`,
  )
  process.exit(0)
}

// mode === 'check'
const baseline = loadBaseline()
if (!baseline) {
  console.error('[lint-ratchet] no baseline found. Run `pnpm lint:baseline` first.')
  process.exit(2)
}

const regressions = []
for (const [file, currentCount] of Object.entries(current.perFile)) {
  const baselineCount = baseline.perFile[file] ?? 0
  if (currentCount > baselineCount) {
    regressions.push({
      file,
      baselineCount,
      currentCount,
      delta: currentCount - baselineCount,
    })
  }
}

if (regressions.length === 0) {
  console.log(
    `[lint-ratchet] OK — ${current.total} errors total (baseline: ${baseline.totalErrors})`,
  )
  if (current.total < baseline.totalErrors) {
    console.log(
      `[lint-ratchet] ${baseline.totalErrors - current.total} errors eliminated since baseline. Run \`pnpm lint:baseline\` to lock in.`,
    )
  }
  process.exit(0)
}

console.error(
  '[lint-ratchet] REGRESSION — the following files gained errors vs baseline:\n',
)
for (const r of regressions) {
  console.error(
    `  ${r.file}: ${r.baselineCount} -> ${r.currentCount} (+${r.delta})`,
  )
}
console.error(
  '\nFix the new errors, or if the existing debt is legitimately moving, update the baseline:',
)
console.error('  pnpm lint:baseline')
process.exit(1)
