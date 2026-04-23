/**
 * claude-cli-reply.ts — bridge from messenger agent reply flow to the
 * user's Claude Code CLI subscription.
 *
 * Contract:
 *   callClaudeSessionReply({ slug, model, systemPrompt, history, message })
 *     → Promise<string>  // the assistant's plain-text reply
 *
 * Implementation: each call spawns a fresh ephemeral `claude --print`
 * session (no persistence across messenger turns). Context comes from:
 *   1. --append-system-prompt with the agent's role description.
 *   2. A compact transcript of the last N messenger turns passed on stdin
 *      before the new user message.
 *
 * Rationale: the tmux `claude-session` for composer/orchestrator holds
 * its session UUID exclusively — a concurrent `claude --session-id` with
 * the same UUID fails ("Session ID is already in use"). Forking is an
 * option but complicates state management; for messenger-initiated
 * replies the conversation history already lives in the messenger DB, so
 * per-call ephemeral sessions are cleaner.
 */
import { spawn } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { readMessengerConfig } from '../config.ts'

const HOME = homedir()
const REGISTRY_PATH = join(HOME, 'state/claude-sessions/.registry.tsv')
const config = readMessengerConfig()
const CLAUDE_BIN = config.CLAUDE_BIN || join(HOME, '.local/bin/claude')

export interface ClaudeSessionRegistryRow {
  slug: string
  uuid: string
  window: string
  workroom: string
  model: string
  created: string
  kind: string
}

function readRegistry(): ClaudeSessionRegistryRow[] {
  if (!existsSync(REGISTRY_PATH)) return []
  const lines = readFileSync(REGISTRY_PATH, 'utf8').trim().split('\n')
  if (lines.length < 2) return []
  return lines.slice(1).map((l) => {
    const [slug, uuid, window, workroom, model, created, kind] = l.split('\t')
    return {
      slug: slug || '',
      uuid: uuid || '',
      window: window || '',
      workroom: workroom || '',
      model: model || '',
      created: created || '',
      kind: (kind || '').trim(),
    }
  })
}

export function findClaudeSessionBySlug(slug: string): ClaudeSessionRegistryRow | null {
  return readRegistry().find((r) => r.slug === slug) ?? null
}

export interface CliReplyHistoryItem {
  role: 'user' | 'assistant'
  content: string
}

interface CallOptions {
  slug: string
  model?: string
  systemPrompt?: string
  history?: CliReplyHistoryItem[]
  message: string
  timeoutMs?: number
}

/**
 * Spawn `claude --print` with the agent's system prompt appended and a
 * compact transcript of previous messenger turns prepended to the new
 * user message. Parse NDJSON stdout for assistant text content. No
 * session persistence — each call is independent.
 */
export function callClaudeSessionReply(opts: CallOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    // Registry lookup is informational (workroom cwd, default model). If the
    // slug is unknown that's fine — we still run the ephemeral CLI call.
    const row = findClaudeSessionBySlug(opts.slug)
    if (!existsSync(CLAUDE_BIN)) return reject(new Error(`claude CLI not found at ${CLAUDE_BIN}`))

    const model = opts.model || row?.model || 'claude-sonnet-4-6'
    const cwd = row?.workroom ? join(HOME, 'workrooms', row.workroom) : HOME

    const args = [
      '--print',
      '--dangerously-skip-permissions',
      '--exclude-dynamic-system-prompt-sections',
      '--no-session-persistence',
      '--model', model,
      '--output-format', 'stream-json',
      '--verbose',
      '--input-format', 'text',
    ]
    if (opts.systemPrompt) {
      args.push('--append-system-prompt', opts.systemPrompt)
    }

    // Build the stdin prompt. Claude's --input-format text reads the whole
    // stdin as a single user message, so we inline the transcript as prose.
    const parts: string[] = []
    if (opts.history && opts.history.length) {
      parts.push('Conversation transcript (oldest first):')
      for (const h of opts.history.slice(-8)) {
        parts.push(`${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`)
      }
      parts.push('')
      parts.push('Reply to the next user message below.')
      parts.push('')
    }
    parts.push(`User: ${opts.message}`)
    const stdinPayload = parts.join('\n')

    const child = spawn(CLAUDE_BIN, args, {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    })

    let stdout = ''
    let stderr = ''
    let settled = false
    const settle = (fn: () => void) => {
      if (settled) return
      settled = true
      fn()
    }

    const timer = setTimeout(() => {
      settle(() => {
        try { child.kill('SIGTERM') } catch { /* ignore */ }
        reject(new Error(`claude CLI timeout after ${opts.timeoutMs ?? 180_000}ms`))
      })
    }, opts.timeoutMs ?? 180_000)

    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('error', (err) => settle(() => { clearTimeout(timer); reject(err) }))
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code !== 0) {
        return settle(() => reject(new Error(`claude CLI exit ${code}: ${stderr.slice(0, 400)}`)))
      }
      const pieces: string[] = []
      for (const ln of stdout.split('\n')) {
        if (!ln.trim()) continue
        try {
          const e = JSON.parse(ln)
          if (e.type === 'assistant' && Array.isArray(e.message?.content)) {
            for (const c of e.message.content) {
              if (c.type === 'text' && typeof c.text === 'string') pieces.push(c.text)
            }
          }
        } catch { /* non-JSON line, skip */ }
      }
      const text = pieces.join('').trim()
      if (!text) {
        return settle(() => reject(new Error('claude CLI returned no assistant text')))
      }
      settle(() => resolve(text))
    })

    child.stdin.write(stdinPayload, 'utf8')
    child.stdin.end()
  })
}
