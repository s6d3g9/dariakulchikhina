import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { parse as parseYaml } from 'yaml'
import { z } from 'zod'

// --- Zod schema for claude-integrations.yaml ---

const accountSchema = z.object({
  id: z.string(),
  provider: z.string(),
  label: z.string().optional(),
  envKey: z.string().optional(),
})

const subsystemSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  process: z.string().optional(),
  port: z.number().int().positive().optional(),
  envVars: z.array(z.string()).optional(),
  stateFiles: z.array(z.string()).optional(),
})

const connectionSchema = z.object({
  from: z.string(),
  to: z.string(),
  protocol: z.string().optional(),
  description: z.string().optional(),
})

const todoSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string().optional(),
  taskRef: z.string().optional(),
})

const agentSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  model: z.string().optional(),
  skillBundle: z.string().optional(),
})

const modelSchema = z.object({
  id: z.string(),
  provider: z.string().optional(),
  displayName: z.string().optional(),
  envKey: z.string().optional(),
})

const serviceSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  host: z.string().optional(),
  port: z.number().int().positive().optional(),
  envVars: z.array(z.string()).optional(),
})

const toolSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  binaryPath: z.string().optional(),
  stateFiles: z.array(z.string()).optional(),
})

const storageSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  envKey: z.string().optional(),
  description: z.string().optional(),
})

const webhookSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  endpoint: z.string().optional(),
  auth: z.string().optional(),
})

const monitoringSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  endpoint: z.string().optional(),
  interval: z.string().optional(),
})

const permissionSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  description: z.string().optional(),
})

const deploymentSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  stateFiles: z.array(z.string()).optional(),
})

const manifestSchema = z.object({
  version: z.string().optional(),
  accounts: z.array(accountSchema).optional(),
  subsystems: z.array(subsystemSchema).optional(),
  connections: z.array(connectionSchema).optional(),
  todos: z.array(todoSchema).optional(),
  // 9 additional sections from v1.1
  agents: z.array(agentSchema).optional(),
  models: z.array(modelSchema).optional(),
  services: z.array(serviceSchema).optional(),
  tools: z.array(toolSchema).optional(),
  storage: z.array(storageSchema).optional(),
  webhooks: z.array(webhookSchema).optional(),
  monitoring: z.array(monitoringSchema).optional(),
  permissions: z.array(permissionSchema).optional(),
  deployment: z.array(deploymentSchema).optional(),
})

export type Manifest = z.infer<typeof manifestSchema>

export interface PortMismatch {
  subsystemId: string
  declared: number
  actual: string
}

export interface ManifestValidation {
  missingEnv: string[]
  missingFiles: string[]
  portMismatches: PortMismatch[]
  okSummary: string
}

export interface ManifestResult {
  manifest: Manifest
  validation: ManifestValidation
  loadedAt: string
}

let cachedResult: ManifestResult | null = null

function collectEnvVars(manifest: Manifest): string[] {
  const keys: string[] = []
  for (const s of manifest.subsystems ?? []) {
    keys.push(...(s.envVars ?? []))
  }
  for (const svc of manifest.services ?? []) {
    keys.push(...(svc.envVars ?? []))
  }
  for (const a of manifest.accounts ?? []) {
    if (a.envKey) keys.push(a.envKey)
  }
  for (const m of manifest.models ?? []) {
    if (m.envKey) keys.push(m.envKey)
  }
  for (const st of manifest.storage ?? []) {
    if (st.envKey) keys.push(st.envKey)
  }
  return [...new Set(keys)]
}

function collectStateFiles(manifest: Manifest): string[] {
  const files: string[] = []
  for (const s of manifest.subsystems ?? []) {
    files.push(...(s.stateFiles ?? []))
  }
  for (const t of manifest.tools ?? []) {
    files.push(...(t.stateFiles ?? []))
  }
  for (const d of manifest.deployment ?? []) {
    files.push(...(d.stateFiles ?? []))
  }
  return [...new Set(files)]
}

export function loadManifest(repoRoot?: string): ManifestResult {
  // eslint-disable-next-line no-restricted-syntax
  const root = repoRoot ?? process.env.MESSENGER_PROJECT_ROOT ?? process.cwd()
  const manifestPath = resolve(root, 'config/claude-integrations.yaml')

  let manifest: Manifest = {}

  if (!existsSync(manifestPath)) {
    console.warn(`[manifest-loader] config/claude-integrations.yaml not found at ${manifestPath}; running with empty manifest`)
  } else {
    try {
      const raw = readFileSync(manifestPath, 'utf-8')
      const parsed = parseYaml(raw)
      const result = manifestSchema.safeParse(parsed)
      if (!result.success) {
        console.warn('[manifest-loader] YAML schema validation failed:', result.error.flatten().fieldErrors)
        manifest = (parsed as Manifest) ?? {}
      } else {
        manifest = result.data
      }
    } catch (err) {
      console.warn('[manifest-loader] Failed to read or parse manifest:', (err as Error).message)
    }
  }

  // --- Port validation ---
  const portMismatches: PortMismatch[] = []
  // eslint-disable-next-line no-restricted-syntax
  const actualPort = process.env.MESSENGER_CORE_PORT
  for (const sub of manifest.subsystems ?? []) {
    if (sub.process === 'messenger-core' && sub.port !== undefined && actualPort) {
      const declaredPort = sub.port
      const envPort = String(actualPort)
      if (String(declaredPort) !== envPort) {
        portMismatches.push({ subsystemId: sub.id, declared: declaredPort, actual: envPort })
        console.warn(`[manifest-loader] Port mismatch for subsystem "${sub.id}": declared=${declaredPort}, MESSENGER_CORE_PORT=${envPort}`)
      }
    }
  }

  // --- Env var validation ---
  const allEnvKeys = collectEnvVars(manifest)
  // eslint-disable-next-line no-restricted-syntax
  const missingEnv = allEnvKeys.filter(key => !process.env[key])
  if (missingEnv.length > 0) {
    console.warn('[manifest-loader] Missing env vars declared in manifest:', missingEnv.join(', '))
  }

  // --- State file validation ---
  const allFiles = collectStateFiles(manifest)
  const missingFiles = allFiles.filter(f => !existsSync(resolve(root, f)))
  if (missingFiles.length > 0) {
    console.warn('[manifest-loader] Missing state files declared in manifest:', missingFiles.join(', '))
  }

  const totalIssues = portMismatches.length + missingEnv.length + missingFiles.length
  const okSummary = totalIssues === 0
    ? 'All declared ports, env vars, and state files are present'
    : `${portMismatches.length} port mismatch(es), ${missingEnv.length} missing env var(s), ${missingFiles.length} missing file(s)`

  cachedResult = {
    manifest,
    validation: { missingEnv, missingFiles, portMismatches, okSummary },
    loadedAt: new Date().toISOString(),
  }

  return cachedResult
}

export function getManifestResult(): ManifestResult | null {
  return cachedResult
}
