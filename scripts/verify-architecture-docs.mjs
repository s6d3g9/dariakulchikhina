// verify-architecture-docs — structural + reality checks for docs/architecture-v5/.
//
// Phases:
//   1. Structural (legacy): duplicate root headings, duplicate "Current Status"
//      blocks, numbered docs have exactly one numbered H1.
//   2. INDEX.md completeness: every NN-*.md file exists and is referenced.
//   3. Matrix reality check: parse "- <source> -> <target>" rows from matrices
//      10, 11, 12 and classify each move as done / pending / ambiguous / missing.
//      Reported as informational summary (does not fail the check — existing
//      debt is expected).
//
// Exit codes:
//   0 — all structural + INDEX checks pass.
//   2 — one or more structural errors or an INDEX.md reference points at a
//       missing file.

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '..', '..')
const DOCS_DIR = join(REPO_ROOT, 'docs', 'architecture-v5')

function getMarkdownFiles(dirPath) {
  return readdirSync(dirPath)
    .map((name) => join(dirPath, name))
    .filter((path) => statSync(path).isFile() && path.endsWith('.md'))
    .sort((a, b) => a.localeCompare(b))
}

// --- Phase 1: structural ---

function validateStructure(filePath) {
  const issues = []
  const fileName = basename(filePath)
  const content = readFileSync(filePath, 'utf8')
  const lines = content.split(/\r?\n/)

  const firstH1Index = lines.findIndex((line) => line.trim().startsWith('# '))
  if (firstH1Index >= 0) {
    const firstH1 = lines[firstH1Index].trim()
    for (let i = firstH1Index + 1; i < lines.length; i += 1) {
      if (lines[i].trim() === firstH1) {
        issues.push(
          `${fileName}: duplicate root heading '${firstH1}' at line ${i + 1}`,
        )
      }
    }
  }

  const statusBlockLines = lines
    .map((line, index) => ({ line: line.trim(), lineNumber: index + 1 }))
    .filter(({ line }) => line.startsWith('## Current Status vs Target'))

  if (statusBlockLines.length > 1) {
    issues.push(
      `${fileName}: duplicate 'Current Status vs Target' blocks at lines ${statusBlockLines
        .map(({ lineNumber }) => String(lineNumber))
        .join(',')}`,
    )
  }

  const isNumberedDoc = /^\d{2}-.+\.md$/.test(fileName)
  if (isNumberedDoc) {
    const numberedH1Count = lines.filter((line) =>
      /^#\s+\d+\./.test(line.trim()),
    ).length
    if (numberedH1Count !== 1) {
      issues.push(
        `${fileName}: expected exactly 1 numbered root heading, found ${numberedH1Count}`,
      )
    }
  }

  return issues
}

// --- Phase 2: INDEX.md completeness ---

function validateIndex(allFiles) {
  const issues = []
  const indexPath = join(DOCS_DIR, 'INDEX.md')
  if (!existsSync(indexPath)) {
    issues.push('INDEX.md is missing')
    return issues
  }
  const content = readFileSync(indexPath, 'utf8')

  // Every NN-*.md file (not INDEX, not REFACTORING_PLAN, not report files) must
  // be referenced in INDEX.md.
  const numbered = allFiles
    .map((f) => basename(f))
    .filter((n) => /^\d{2}-.+\.md$/.test(n))

  for (const fileName of numbered) {
    if (!content.includes(`./${fileName}`) && !content.includes(fileName)) {
      issues.push(`INDEX.md: no reference to ${fileName}`)
    }
  }

  // Every link `./NN-name.md` in INDEX.md must point at an existing file.
  // Use negative lookbehind to avoid matching the second dot in `../`
  const linkRe = /(?<!\.)\.\/([^)\s]+\.md)/g
  for (const m of content.matchAll(linkRe)) {
    const referenced = m[1]
    const abs = join(DOCS_DIR, referenced)
    if (!existsSync(abs)) {
      issues.push(`INDEX.md: broken link ./${referenced}`)
    }
  }

  // Also check for `../` links (e.g., to sibling directories like ../task-templates/)
  const upLinkRe = /\.\.\/?([^)\s]+\.md)/g
  for (const m of content.matchAll(upLinkRe)) {
    const referenced = m[1]
    const abs = join(DOCS_DIR, '..', referenced)
    if (!existsSync(abs)) {
      issues.push(`INDEX.md: broken link ../${referenced}`)
    }
  }

  return issues
}

// --- Phase 3: matrix reality ---

function parseMatrix(filePath) {
  const content = readFileSync(filePath, 'utf8')
  const rows = []
  const lineRe = /^-\s+`?([^`\s]+)`?\s+->\s+`?([^`\s]+)`?\s*$/
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    const m = line.match(lineRe)
    if (!m) continue
    const [, source, target] = m
    // Only interested in paths that look like file moves (have . or /).
    if (!/[.\/]/.test(target)) continue
    rows.push({ source, target })
  }
  return rows
}

function classifyMove({ source, target }, legacyBasenameIndex) {
  const absTarget = join(REPO_ROOT, target)
  const targetExists = existsSync(absTarget)

  let sourceExists = false
  if (source.includes('/')) {
    sourceExists = existsSync(join(REPO_ROOT, source))
  } else {
    // basename — look it up in the legacy `app/components/**` index.
    sourceExists = legacyBasenameIndex.has(source)
  }

  if (targetExists && !sourceExists) return 'done'
  if (!targetExists && sourceExists) return 'pending'
  if (targetExists && sourceExists) return 'ambiguous'
  return 'missing'
}

function indexLegacyBasenames() {
  // Walk app/components/ recursively. This is where matrix 10 sources live
  // when given as bare basenames.
  const set = new Set()
  const roots = [join(REPO_ROOT, 'app', 'components')]
  for (const root of roots) {
    if (!existsSync(root)) continue
    const stack = [root]
    while (stack.length) {
      const dir = stack.pop()
      for (const name of readdirSync(dir)) {
        const abs = join(dir, name)
        const st = statSync(abs)
        if (st.isDirectory()) stack.push(abs)
        else set.add(name)
      }
    }
  }
  return set
}

function checkMatrices() {
  const matrices = [
    '10-frontend-refactor-map.md',
    '11-backend-shared-refactor-map.md',
    '12-messenger-services-refactor-map.md',
  ]
  const legacy = indexLegacyBasenames()
  const summary = []

  for (const matrix of matrices) {
    const file = join(DOCS_DIR, matrix)
    if (!existsSync(file)) {
      summary.push({ matrix, error: 'missing' })
      continue
    }
    const rows = parseMatrix(file)
    const buckets = { done: 0, pending: 0, ambiguous: 0, missing: 0 }
    for (const row of rows) {
      buckets[classifyMove(row, legacy)] += 1
    }
    summary.push({ matrix, parsed: rows.length, ...buckets })
  }

  return summary
}

// --- Phase 4: server/utils/ filename whitelist ---

const SERVER_UTILS_ALLOWED = new Set([
  'body.ts',
  'define-endpoint.ts',
  'errors.ts',
  'logger.ts',
  'messenger-cors.ts',
  'query.ts',
  'request-context.ts',
  'security-headers.ts',
])

function checkServerUtilsWhitelist() {
  const utilsDir = join(REPO_ROOT, 'server', 'utils')
  if (!existsSync(utilsDir)) return []
  const issues = []
  for (const name of readdirSync(utilsDir)) {
    const abs = join(utilsDir, name)
    if (!statSync(abs).isFile()) continue
    if (!SERVER_UTILS_ALLOWED.has(name)) {
      issues.push(
        `server/utils/${name}: file not in the allowed whitelist. Add it to SERVER_UTILS_ALLOWED in scripts/verify-architecture-docs.mjs after architecture review.`,
      )
    }
  }
  return issues
}

// --- main ---

const allFiles = getMarkdownFiles(DOCS_DIR)

const structuralIssues = allFiles.flatMap((filePath) =>
  validateStructure(filePath),
)
const indexIssues = validateIndex(allFiles)

const utilsWhitelistIssues = checkServerUtilsWhitelist()
const issues = [...structuralIssues, ...indexIssues, ...utilsWhitelistIssues]

if (issues.length > 0) {
  console.error('Architecture docs validation failed:')
  for (const issue of issues) console.error(`- ${issue}`)
  process.exit(2)
}

const matrixSummary = checkMatrices()

console.log(
  `Architecture docs validation passed (${allFiles.length} files checked).`,
)
console.log('\nMatrix reality (informational — does not fail the check):')
for (const row of matrixSummary) {
  if (row.error) {
    console.log(`  ${row.matrix}: ${row.error}`)
    continue
  }
  const total = row.done + row.pending + row.ambiguous + row.missing
  console.log(
    `  ${row.matrix}: parsed ${row.parsed} move rows, ` +
      `${row.done} done, ${row.pending} pending, ` +
      `${row.ambiguous} ambiguous (bridge or partial), ${row.missing} missing — total ${total}`,
  )
}
