import { mkdtemp, readFile, readdir, realpath, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { posix as pathPosix } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import type { MessengerAgentSettingsRecord } from './agent-settings-store.ts'

const execFileAsync = promisify(execFile)
const MAX_FILE_PREVIEW_BYTES = 64 * 1024
const MAX_FILE_PREVIEW_LINES = 220

export interface MessengerAgentWorkspaceEntry {
  path: string
  name: string
  kind: 'file' | 'directory'
  size: number
}

export interface MessengerAgentWorkspaceListing {
  source: 'local' | 'ssh'
  sshTarget: string | null
  rootPath: string
  currentPath: string
  entries: MessengerAgentWorkspaceEntry[]
}

export interface MessengerAgentWorkspaceFilePreview {
  source: 'local' | 'ssh'
  sshTarget: string | null
  rootPath: string
  path: string
  name: string
  content: string
  truncated: boolean
}

function shellQuote(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

function normalizeRelativeWorkspacePath(value?: string) {
  const normalized = pathPosix.normalize((value || '').trim() || '.')
  const withoutLeadingSlash = normalized.replace(/^\/+/, '')

  if (!withoutLeadingSlash || withoutLeadingSlash === '.') {
    return ''
  }

  if (withoutLeadingSlash === '..' || withoutLeadingSlash.startsWith('../')) {
    throw new Error('WORKSPACE_PATH_OUTSIDE_ROOT')
  }

  return withoutLeadingSlash
}

function trimPreviewContent(value: string) {
  const lines = value.replace(/\r\n/g, '\n').split('\n')
  const trimmedLines = lines.slice(0, MAX_FILE_PREVIEW_LINES)
  return {
    content: trimmedLines.join('\n'),
    truncated: lines.length > MAX_FILE_PREVIEW_LINES,
  }
}

function resolveSshTarget(settings: MessengerAgentSettingsRecord) {
  const host = settings.ssh.host.trim()
  const login = settings.ssh.login.trim()
  const privateKey = settings.ssh.privateKey.trim()

  if (!host || !login || !privateKey) {
    return null
  }

  return {
    host,
    login,
    port: settings.ssh.port,
    privateKey,
    workspacePath: settings.ssh.workspacePath.trim(),
    sshTarget: `${login}@${host}:${settings.ssh.port}`,
  }
}

function ensureWorkspacePath(settings: MessengerAgentSettingsRecord) {
  const workspacePath = settings.ssh.workspacePath.trim()
  if (!workspacePath) {
    throw new Error('AGENT_WORKSPACE_NOT_CONFIGURED')
  }

  return workspacePath
}

async function withTemporaryPrivateKey<T>(privateKey: string, task: (keyPath: string) => Promise<T>) {
  const tempDir = await mkdtemp(join(tmpdir(), 'daria-agent-ssh-'))
  const keyPath = join(tempDir, 'agent-key')

  try {
    await writeFile(keyPath, privateKey.endsWith('\n') ? privateKey : `${privateKey}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    })

    return await task(keyPath)
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

async function execRemoteShell(settings: MessengerAgentSettingsRecord, script: string) {
  const ssh = resolveSshTarget(settings)
  if (!ssh) {
    throw new Error('AGENT_SSH_NOT_CONFIGURED')
  }

  const remoteCommand = `sh -lc ${shellQuote(script)}`

  return await withTemporaryPrivateKey(ssh.privateKey, async (keyPath) => {
    const result = await execFileAsync('ssh', [
      '-i', keyPath,
      '-p', String(ssh.port),
      '-o', 'BatchMode=yes',
      '-o', 'ConnectTimeout=5',
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'UserKnownHostsFile=/dev/null',
      `${ssh.login}@${ssh.host}`,
      remoteCommand,
    ], {
      timeout: 12000,
      maxBuffer: 1024 * 1024,
    })

    return {
      ...result,
      sshTarget: ssh.sshTarget,
      workspacePath: ssh.workspacePath,
    }
  })
}

async function listLocalWorkspace(settings: MessengerAgentSettingsRecord, relativePath: string): Promise<MessengerAgentWorkspaceListing> {
  const rootPath = ensureWorkspacePath(settings)
  const rootReal = await realpath(resolve(rootPath))
  const targetReal = await realpath(resolve(rootReal, relativePath || '.'))

  if (targetReal !== rootReal && !targetReal.startsWith(`${rootReal}/`)) {
    throw new Error('WORKSPACE_PATH_OUTSIDE_ROOT')
  }

  const entries = await readdir(targetReal, { withFileTypes: true })
  const normalizedEntries = await Promise.all(entries.map(async (entry) => {
    const entryPath = resolve(targetReal, entry.name)
    const entryStat = await stat(entryPath)

    return {
      path: pathPosix.relative(rootReal, entryPath).replace(/^\.$/, ''),
      name: entry.name,
      kind: entry.isDirectory() ? 'directory' as const : 'file' as const,
      size: entryStat.size,
    }
  }))

  normalizedEntries.sort((left, right) => {
    if (left.kind !== right.kind) {
      return left.kind === 'directory' ? -1 : 1
    }

    return left.name.localeCompare(right.name, 'ru')
  })

  return {
    source: 'local',
    sshTarget: null,
    rootPath: rootReal,
    currentPath: pathPosix.relative(rootReal, targetReal).replace(/^\.$/, ''),
    entries: normalizedEntries,
  }
}

async function listRemoteWorkspace(settings: MessengerAgentSettingsRecord, relativePath: string): Promise<MessengerAgentWorkspaceListing> {
  const rootPath = ensureWorkspacePath(settings)
  const script = [
    `ROOT_INPUT=${shellQuote(rootPath)}`,
    `REL_INPUT=${shellQuote(relativePath)}`,
    'case "$ROOT_INPUT" in',
    '  ~*) ROOT_RESOLVED="$HOME${ROOT_INPUT#~}" ;;',
    '  *) ROOT_RESOLVED="$ROOT_INPUT" ;;',
    'esac',
    'ROOT_REAL=$(cd -- "$ROOT_RESOLVED" 2>/dev/null && pwd -P) || { echo "__ERROR__ROOT_NOT_FOUND"; exit 7; }',
    'TARGET_INPUT="$ROOT_REAL"',
    'if [ -n "$REL_INPUT" ]; then TARGET_INPUT="$ROOT_REAL/$REL_INPUT"; fi',
    'TARGET_REAL=$(cd -- "$TARGET_INPUT" 2>/dev/null && pwd -P) || { echo "__ERROR__TARGET_NOT_FOUND"; exit 8; }',
    'case "$TARGET_REAL" in',
    '  "$ROOT_REAL"|"$ROOT_REAL"/*) ;;',
    '  *) echo "__ERROR__OUTSIDE_ROOT"; exit 9 ;;',
    'esac',
    'printf "__ROOT__%s\n" "$ROOT_REAL"',
    'printf "__TARGET__%s\n" "$TARGET_REAL"',
    'find "$TARGET_REAL" -mindepth 1 -maxdepth 1 -printf "%f\t%y\t%s\n" | sort',
  ].join('; ')

  const { stdout, sshTarget } = await execRemoteShell(settings, script)
  const lines = stdout.replace(/\r\n/g, '\n').split('\n').filter(Boolean)
  const rootRealLine = lines.find(line => line.startsWith('__ROOT__'))
  const targetRealLine = lines.find(line => line.startsWith('__TARGET__'))

  if (!rootRealLine || !targetRealLine) {
    throw new Error('AGENT_WORKSPACE_UNAVAILABLE')
  }

  const rootReal = rootRealLine.replace('__ROOT__', '')
  const targetReal = targetRealLine.replace('__TARGET__', '')
  const entries = lines
    .filter(line => !line.startsWith('__ROOT__') && !line.startsWith('__TARGET__'))
    .map((line) => {
      const [name = '', kindFlag = 'f', sizeText = '0'] = line.split('\t')
      const joinedPath = targetReal === rootReal ? `${rootReal}/${name}` : `${targetReal}/${name}`

      return {
        path: pathPosix.relative(rootReal, joinedPath),
        name,
        kind: kindFlag === 'd' ? 'directory' as const : 'file' as const,
        size: Number(sizeText) || 0,
      }
    })

  return {
    source: 'ssh',
    sshTarget,
    rootPath: rootReal,
    currentPath: pathPosix.relative(rootReal, targetReal).replace(/^\.$/, ''),
    entries,
  }
}

async function readLocalWorkspaceFile(settings: MessengerAgentSettingsRecord, relativePath: string): Promise<MessengerAgentWorkspaceFilePreview> {
  const rootPath = ensureWorkspacePath(settings)
  const rootReal = await realpath(resolve(rootPath))
  const targetReal = await realpath(resolve(rootReal, relativePath || '.'))

  if (targetReal !== rootReal && !targetReal.startsWith(`${rootReal}/`)) {
    throw new Error('WORKSPACE_PATH_OUTSIDE_ROOT')
  }

  const buffer = await readFile(targetReal)
  if (buffer.includes(0)) {
    throw new Error('AGENT_WORKSPACE_BINARY_FILE')
  }

  const preview = trimPreviewContent(buffer.subarray(0, MAX_FILE_PREVIEW_BYTES).toString('utf8'))

  return {
    source: 'local',
    sshTarget: null,
    rootPath: rootReal,
    path: pathPosix.relative(rootReal, targetReal),
    name: targetReal.split('/').pop() || targetReal,
    content: preview.content,
    truncated: preview.truncated || buffer.byteLength > MAX_FILE_PREVIEW_BYTES,
  }
}

async function readRemoteWorkspaceFile(settings: MessengerAgentSettingsRecord, relativePath: string): Promise<MessengerAgentWorkspaceFilePreview> {
  const rootPath = ensureWorkspacePath(settings)
  const script = [
    `ROOT_INPUT=${shellQuote(rootPath)}`,
    `REL_INPUT=${shellQuote(relativePath)}`,
    'case "$ROOT_INPUT" in',
    '  ~*) ROOT_RESOLVED="$HOME${ROOT_INPUT#~}" ;;',
    '  *) ROOT_RESOLVED="$ROOT_INPUT" ;;',
    'esac',
    'ROOT_REAL=$(cd -- "$ROOT_RESOLVED" 2>/dev/null && pwd -P) || { echo "__ERROR__ROOT_NOT_FOUND"; exit 7; }',
    'TARGET_INPUT="$ROOT_REAL/$REL_INPUT"',
    'TARGET_REAL=$(cd -- "$(dirname -- "$TARGET_INPUT")" 2>/dev/null && pwd -P)/$(basename -- "$TARGET_INPUT")',
    'case "$TARGET_REAL" in',
    '  "$ROOT_REAL"|"$ROOT_REAL"/*) ;;',
    '  *) echo "__ERROR__OUTSIDE_ROOT"; exit 8 ;;',
    'esac',
    '[ -f "$TARGET_REAL" ] || { echo "__ERROR__FILE_NOT_FOUND"; exit 9; }',
    'if grep -qU "\x00" "$TARGET_REAL"; then echo "__ERROR__BINARY_FILE"; exit 10; fi',
    'printf "__ROOT__%s\n" "$ROOT_REAL"',
    'printf "__TARGET__%s\n" "$TARGET_REAL"',
    `head -c ${MAX_FILE_PREVIEW_BYTES} -- "$TARGET_REAL"`,
  ].join('; ')

  const { stdout, sshTarget } = await execRemoteShell(settings, script)
  if (stdout.includes('__ERROR__BINARY_FILE')) {
    throw new Error('AGENT_WORKSPACE_BINARY_FILE')
  }

  const rootStart = stdout.indexOf('__ROOT__')
  const targetStart = stdout.indexOf('__TARGET__')
  if (rootStart === -1 || targetStart === -1) {
    throw new Error('AGENT_WORKSPACE_UNAVAILABLE')
  }

  const rootLineEnd = stdout.indexOf('\n', rootStart)
  const targetLineEnd = stdout.indexOf('\n', targetStart)
  const rootReal = stdout.slice(rootStart + 8, rootLineEnd).trim()
  const targetReal = stdout.slice(targetStart + 10, targetLineEnd).trim()
  const content = stdout.slice(targetLineEnd + 1)
  const preview = trimPreviewContent(content)

  return {
    source: 'ssh',
    sshTarget,
    rootPath: rootReal,
    path: pathPosix.relative(rootReal, targetReal),
    name: targetReal.split('/').pop() || targetReal,
    content: preview.content,
    truncated: preview.truncated || Buffer.byteLength(content, 'utf8') >= MAX_FILE_PREVIEW_BYTES,
  }
}

export async function listMessengerAgentWorkspace(settings: MessengerAgentSettingsRecord, currentPath?: string) {
  const relativePath = normalizeRelativeWorkspacePath(currentPath)
  if (resolveSshTarget(settings)) {
    return await listRemoteWorkspace(settings, relativePath)
  }

  return await listLocalWorkspace(settings, relativePath)
}

export async function readMessengerAgentWorkspaceFile(settings: MessengerAgentSettingsRecord, filePath: string) {
  const relativePath = normalizeRelativeWorkspacePath(filePath)
  if (!relativePath) {
    throw new Error('AGENT_WORKSPACE_FILE_REQUIRED')
  }

  if (resolveSshTarget(settings)) {
    return await readRemoteWorkspaceFile(settings, relativePath)
  }

  return await readLocalWorkspaceFile(settings, relativePath)
}