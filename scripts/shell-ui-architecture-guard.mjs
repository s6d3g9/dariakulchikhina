import { access, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export const SHELL_UI_GUARD_SCHEMA_VERSION = 1
export const DEFAULT_SHELL_UI_ROOTS = ['app', 'messenger/web']
export const SHELL_UI_METRICS = [
  'rawZIndexDeclarations',
  'importantDeclarations',
  'fixedPositionDeclarations',
  'teleports',
  'globalKeydownListeners',
  'documentPointerdownListeners',
  'boundingRectCalls',
  'navigationCustomEvents',
  'booleanNavigationStateDeclarations',
  'duplicateSelectorDefinitions',
]

const SOURCE_EXTENSIONS = new Set(['.css', '.js', '.jsx', '.less', '.mjs', '.sass', '.scss', '.ts', '.tsx', '.vue'])
const IGNORED_DIRECTORIES = new Set([
  '.git',
  '.nuxt',
  '.output',
  'coverage',
  'dist',
  'node_modules',
  'test',
  'tests',
])

const SOURCE_PATTERNS = {
  rawZIndexDeclarations: /\bz-index\s*:/gi,
  importantDeclarations: /!important\b/gi,
  fixedPositionDeclarations: /\bposition\s*:\s*fixed\b/gi,
  teleports: /<Teleport\b/gi,
  globalKeydownListeners: /(?:window|document)\.addEventListener\s*\(\s*['"`]keydown['"`]/gi,
  documentPointerdownListeners: /document\.addEventListener\s*\(\s*['"`](?:pointerdown|mousedown|click)['"`]/gi,
  boundingRectCalls: /\.getBoundingClientRect\s*\(/g,
  navigationCustomEvents: /new\s+CustomEvent\s*\(\s*['"`][^'"`]*(?:menu|nav|drawer|panel|surface|sidebar|chat|files?)[^'"`]*['"`]/gi,
  booleanNavigationStateDeclarations: /\b(?:const|let)\s+(?:is|show|open)[A-Z][A-Za-z0-9]*(?:Menu|Drawer|Panel|Sidebar|Chat|Files?)\s*=/g,
}

function emptyMetrics() {
  return Object.fromEntries(SHELL_UI_METRICS.map(name => [name, 0]))
}

function lineNumberAt(source, index) {
  return source.slice(0, index).split('\n').length
}

function pushEvidence(evidence, metric, location, excerpt) {
  if (evidence[metric].length >= 40) return
  evidence[metric].push({
    file: location.file,
    line: lineNumberAt(location.source, location.index),
    excerpt: excerpt.replace(/\s+/g, ' ').trim().slice(0, 180),
  })
}

async function collectFiles(root, relativeRoot) {
  const absoluteRoot = path.resolve(root, relativeRoot)
  await access(absoluteRoot)
  const files = []

  async function walk(directory) {
    let entries
    try {
      entries = await readdir(directory, { withFileTypes: true })
    } catch (error) {
      if (error && error.code === 'ENOENT') return
      throw error
    }
    entries.sort((left, right) => left.name.localeCompare(right.name))
    for (const entry of entries) {
      if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) continue
      const absolutePath = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        await walk(absolutePath)
      } else if (entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
        files.push(absolutePath)
      }
    }
  }

  await walk(absoluteRoot)
  return files
}

function styleRegions(source, extension) {
  if (extension !== '.vue') return ['.css', '.less', '.sass', '.scss'].includes(extension) ? [source] : []
  return Array.from(source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi), match => match[1] ?? '')
}

function normalizedSelectors(styles) {
  const selectors = []
  const withoutComments = styles.replace(/\/\*[\s\S]*?\*\//g, '')
  for (const match of withoutComments.matchAll(/(?:^|})\s*([^@{}][^{}]*?)\s*\{/g)) {
    const group = (match[1] ?? '').trim()
    if (!group || group.includes(';')) continue
    for (const selector of group.split(',')) {
      const normalized = selector.replace(/\s+/g, ' ').trim()
      if (normalized) selectors.push({ selector: normalized, index: match.index ?? 0 })
    }
  }
  return selectors
}

export async function scanShellUiArchitecture({
  root = process.cwd(),
  roots = DEFAULT_SHELL_UI_ROOTS,
} = {}) {
  const metrics = emptyMetrics()
  const evidence = Object.fromEntries(SHELL_UI_METRICS.map(name => [name, []]))
  const selectorOccurrences = new Map()
  const allFiles = []

  for (const relativeRoot of roots) {
    allFiles.push(...await collectFiles(root, relativeRoot))
  }
  allFiles.sort((left, right) => left.localeCompare(right))

  for (const absolutePath of allFiles) {
    const source = await readFile(absolutePath, 'utf8')
    const relativePath = path.relative(root, absolutePath).split(path.sep).join('/')

    for (const [metric, pattern] of Object.entries(SOURCE_PATTERNS)) {
      pattern.lastIndex = 0
      for (const match of source.matchAll(pattern)) {
        metrics[metric] += 1
        pushEvidence(
          evidence,
          metric,
          { file: relativePath, source, index: match.index ?? 0 },
          match[0],
        )
      }
    }

    const extension = path.extname(absolutePath)
    for (const styles of styleRegions(source, extension)) {
      for (const occurrence of normalizedSelectors(styles)) {
        const existing = selectorOccurrences.get(occurrence.selector) ?? []
        existing.push({ file: relativePath, line: lineNumberAt(styles, occurrence.index) })
        selectorOccurrences.set(occurrence.selector, existing)
      }
    }
  }

  for (const [selector, occurrences] of [...selectorOccurrences.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    if (occurrences.length < 2) continue
    metrics.duplicateSelectorDefinitions += occurrences.length - 1
    for (const occurrence of occurrences.slice(1, 41)) {
      if (evidence.duplicateSelectorDefinitions.length >= 40) break
      evidence.duplicateSelectorDefinitions.push({
        ...occurrence,
        excerpt: selector.slice(0, 180),
      })
    }
  }

  return {
    schemaVersion: SHELL_UI_GUARD_SCHEMA_VERSION,
    roots: [...roots],
    filesScanned: allFiles.length,
    metrics,
    evidence,
  }
}

export function compareShellUiArchitecture(current, baseline) {
  const failures = []
  if (baseline.schemaVersion !== SHELL_UI_GUARD_SCHEMA_VERSION) {
    failures.push({
      metric: 'schemaVersion',
      baseline: baseline.schemaVersion,
      current: current.schemaVersion,
      message: 'Baseline schema version is not supported.',
    })
  }

  if (JSON.stringify(current.roots) !== JSON.stringify(baseline.roots)) {
    failures.push({
      metric: 'roots',
      baseline: baseline.roots,
      current: current.roots,
      message: 'Scanned roots do not match the reviewed baseline scope.',
    })
  }

  for (const metric of SHELL_UI_METRICS) {
    if (!Number.isInteger(baseline.metrics?.[metric]) || baseline.metrics[metric] < 0) {
      failures.push({
        metric,
        baseline: baseline.metrics?.[metric],
        current: current.metrics[metric],
        message: 'Baseline metric is missing or invalid.',
      })
      continue
    }
    if (current.metrics[metric] > baseline.metrics[metric]) {
      failures.push({
        metric,
        baseline: baseline.metrics[metric],
        current: current.metrics[metric],
        message: 'Architecture debt increased.',
      })
    }
  }
  return failures
}

function snapshotOf(report) {
  return {
    schemaVersion: report.schemaVersion,
    roots: report.roots,
    metrics: report.metrics,
  }
}

async function runCli() {
  const command = process.argv[2] ?? 'check'
  const baselinePath = path.resolve(
    process.cwd(),
    process.argv[3] ?? 'scripts/baselines/shell-ui-architecture.json',
  )
  const report = await scanShellUiArchitecture()

  if (command === 'snapshot') {
    process.stdout.write(JSON.stringify(snapshotOf(report), null, 2) + '\n')
    return
  }
  if (command !== 'check') {
    throw new Error('Usage: node scripts/shell-ui-architecture-guard.mjs [check|snapshot] [baseline-path]')
  }

  const baseline = JSON.parse(await readFile(baselinePath, 'utf8'))
  const failures = compareShellUiArchitecture(report, baseline)
  if (failures.length === 0) {
    process.stdout.write(
      'Shell UI architecture guard passed (' + report.filesScanned + ' files, no metric increased).\n',
    )
    return
  }

  for (const failure of failures) {
    process.stderr.write(
      failure.metric + ': baseline=' + String(failure.baseline)
      + ', current=' + String(failure.current) + ' — ' + failure.message + '\n',
    )
    const details = report.evidence[failure.metric] ?? []
    for (const detail of details.slice(-5)) {
      process.stderr.write('  ' + detail.file + ':' + detail.line + ' ' + detail.excerpt + '\n')
    }
  }
  process.exitCode = 1
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  await runCli()
}
