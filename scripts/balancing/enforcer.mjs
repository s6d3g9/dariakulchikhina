#!/usr/bin/env node
// Balancing enforcer — Claude Code PreToolUse hook.
//
// Reads /home/claudecode/daria/.claude-balancing.json and rewrites tool inputs
// for Agent + Bash(claude-session create) so the active preset is *physically*
// applied: model, isolation/worktree. Without the hook the preset is just a
// hint; with it, the policy travels with every spawn even when I forget.
//
// Modes:
//   activePresetId set       → manual: that preset wins, no analysis
//   activePresetId === null  → auto:   pick by prompt/command keywords
//   config file missing      → auto:   "balanced" defaults inline
//
// The hook is intentionally non-blocking on errors: any exception in this
// script returns exit 0 with no output, so a malformed config never bricks
// tool execution. Validation happens upstream in messenger-core (Zod).

import { readFileSync, appendFileSync } from 'node:fs'

const CONFIG_PATH = '/home/claudecode/daria/.claude-balancing.json'
const AUDIT_PATH = '/home/claudecode/daria/.claude-balancing.audit.log'

// Inline defaults mirror messenger/core/src/balancing/balancing-handler.ts so
// the hook works even before the user saves a preset via the aidev UI. Keep
// in sync with DEFAULT_STATE there if you ever add a preset.
const DEFAULT_PRESETS = {
  economy: { id: 'economy', name: 'Экономия токенов', model: 'haiku', agentStyle: 'subagent', useWorktree: false, maxParallel: 2 },
  balanced: { id: 'balanced', name: 'Сбалансированный', model: 'sonnet', agentStyle: 'mixed', useWorktree: true, maxParallel: 3 },
  deep: { id: 'deep', name: 'Глубокий', model: 'opus', agentStyle: 'subagent', useWorktree: true, maxParallel: 4 },
  visible: { id: 'visible', name: 'Наблюдаемый', model: 'sonnet', agentStyle: 'tmux-session', useWorktree: true, maxParallel: 2 },
}
const FALLBACK_PRESET_ID = 'balanced'

// Auto-mode keyword routing. Order matters: first match wins.
const AUTO_RULES = [
  // Heavy work — architecture, design, complex refactors → opus
  { id: 'deep', re: /архитектур|рефактор\w*|design\b|architect\w*|migrate|migration|перепроектир|редизайн/i },
  // Long-running visibility → tmux session
  { id: 'visible', re: /наблюдат|долго|long.?run|streaming|tmux|видн[аое]|live\s+monitor/i },
  // Light reads — search, find, locate → haiku
  { id: 'economy', re: /\bнайт[иь]\b|\bпоиск\w*|\blocate\b|\bsearch\b|\bfind\b|\bgrep\b|map\s+the|where\s+is/i },
]

function loadConfig() {
  try {
    const raw = readFileSync(CONFIG_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    if (parsed && Array.isArray(parsed.presets) && parsed.presets.length > 0) return parsed
  }
  catch { /* ENOENT or malformed — fall through to inline defaults */ }
  return null
}

function autoPickPresetId(text) {
  const sample = String(text ?? '')
  for (const rule of AUTO_RULES) {
    if (rule.re.test(sample)) return rule.id
  }
  return FALLBACK_PRESET_ID
}

function resolvePreset(state, signalText) {
  if (state?.activePresetId) {
    const found = state.presets.find(p => p.id === state.activePresetId)
    if (found) return { preset: found, mode: 'manual' }
  }
  const id = autoPickPresetId(signalText)
  const fromState = state?.presets?.find(p => p.id === id)
  return { preset: fromState ?? DEFAULT_PRESETS[id] ?? DEFAULT_PRESETS[FALLBACK_PRESET_ID], mode: 'auto' }
}

function processAgent(toolInput, state) {
  const signal = [toolInput.description, toolInput.prompt].filter(Boolean).join(' ')
  const { preset, mode } = resolvePreset(state, signal)
  const updated = { ...toolInput }
  const changes = []

  if (!toolInput.model && ['haiku', 'sonnet', 'opus'].includes(preset.model)) {
    updated.model = preset.model
    changes.push(`model=${preset.model}`)
  }
  if (!toolInput.isolation && preset.useWorktree) {
    updated.isolation = 'worktree'
    changes.push('isolation=worktree')
  }

  if (changes.length === 0) return null

  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      updatedInput: updated,
    },
    systemMessage: `[balancing/${mode}/${preset.id}] applied: ${changes.join(', ')}`,
  }
}

function processBash(toolInput, state) {
  const cmd = String(toolInput.command ?? '')
  if (!/\bclaude-session\s+create\b/.test(cmd)) return null

  const { preset, mode } = resolvePreset(state, cmd)
  let updated = cmd
  const changes = []

  if (!/--model[\s=]\S+/.test(updated)) {
    updated = updated.replace(/(\bclaude-session\s+create\b)/, `$1 --model ${preset.model}`)
    changes.push(`--model ${preset.model}`)
  }

  // Worktree enforcement — only ask, don't auto-pick a name. Picking a name
  // here would create badly-slugged workrooms; the operator should choose.
  if (preset.useWorktree && !/--workroom[\s=]\S+/.test(updated)) {
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'ask',
        permissionDecisionReason:
          `[balancing/${mode}/${preset.id}] preset requires --workroom <name>. ` +
          `Add it to the command, or switch to "economy" preset (no worktree) via aidev → Балансировка.`,
      },
    }
  }

  if (changes.length === 0) return null

  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      updatedInput: { ...toolInput, command: updated },
    },
    systemMessage: `[balancing/${mode}/${preset.id}] rewrote claude-session: ${changes.join(', ')}`,
  }
}

function audit(line) {
  // Best-effort append; if the file is unwritable we silently drop the line —
  // never block the tool because audit failed.
  try {
    appendFileSync(AUDIT_PATH, line + '\n', 'utf8')
  }
  catch { /* swallow */ }
}

function summarizeResult(result) {
  if (!result) return 'noop'
  const out = result.hookSpecificOutput
  if (out?.permissionDecision) return `${out.permissionDecision}: ${out.permissionDecisionReason ?? ''}`.trim()
  if (out?.updatedInput) return result.systemMessage ?? 'updated'
  return 'unknown'
}

async function main() {
  const chunks = []
  for await (const c of process.stdin) chunks.push(c)
  const raw = Buffer.concat(chunks).toString('utf8').trim()
  if (!raw) return
  const input = JSON.parse(raw)

  const state = loadConfig()

  let result = null
  if (input.tool_name === 'Agent') result = processAgent(input.tool_input ?? {}, state)
  else if (input.tool_name === 'Bash') result = processBash(input.tool_input ?? {}, state)

  if (result) {
    audit(`${new Date().toISOString()}\t${input.tool_name}\t${summarizeResult(result)}`)
    process.stdout.write(JSON.stringify(result))
  }
}

main().catch((err) => {
  process.stderr.write(`balancing-enforcer: ${err?.message ?? err}\n`)
  process.exit(0)
})
