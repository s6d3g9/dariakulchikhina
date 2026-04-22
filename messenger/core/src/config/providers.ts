/**
 * providers.ts — static registry of all AI provider specs.
 *
 * Single source of truth for:
 *  - Which adapter handles each provider (claude-cli, copilot-cli, openai-compat, ollama)
 *  - Default base URLs for API providers
 *  - All model IDs and the exact CLI flag value to pass for each
 *  - Effort-level → API parameter mapping per provider
 *
 * The frontend (useMessengerSubscriptions.ts) mirrors the model lists but
 * this file is what the backend actually uses for routing.
 */

export type SubscriptionProvider =
  | 'claude-code-cli'
  | 'github-copilot'
  | 'openai'
  | 'google'
  | 'alibaba'
  | 'custom'

/** How the backend should send the request */
export type AdapterType =
  | 'claude-cli'       // spawn `claude --print --model <model>`
  | 'copilot-cli'      // spawn copilot CLI (gh copilot or dedicated binary)
  | 'openai-compat'    // POST /v1/chat/completions (OpenAI format)
  | 'ollama'           // POST /api/chat (Ollama native)

export interface ProviderModelSpec {
  /** Canonical model ID used everywhere in the system */
  id: string
  /**
   * Exact value to pass as --model to the CLI, or as "model" in the API body.
   * When undefined, `id` is used verbatim.
   */
  cliArg?: string
  contextK: number
  /** Whether this model supports extended thinking / effort levels */
  supportsEffort: boolean
}

export interface EffortMapping {
  /** Maps 'low'|'medium'|'high'|'xhigh'|'max' → provider-specific param */
  low: number | string
  medium: number | string
  high: number | string
  xhigh: number | string
  max: number | string
}

export interface ProviderSpec {
  id: SubscriptionProvider
  adapter: AdapterType
  /** Default base URL for API providers (overridable per-subscription via config.baseUrl) */
  baseUrl?: string
  requiresApiKey: boolean
  models: ProviderModelSpec[]
  /**
   * Maps effort levels to API-specific params.
   * For claude-cli: maps to --thinking budget_tokens value.
   * For openai-compat: maps to reasoning_effort string.
   */
  effortMap?: EffortMapping
}

// ---------------------------------------------------------------------------
// Provider registry
// ---------------------------------------------------------------------------

export const PROVIDER_SPECS: Record<SubscriptionProvider, ProviderSpec> = {

  'claude-code-cli': {
    id: 'claude-code-cli',
    adapter: 'claude-cli',
    requiresApiKey: false,
    models: [
      { id: 'claude-haiku-4-5',    cliArg: 'claude-haiku-4-5',    contextK: 200,  supportsEffort: true },
      { id: 'claude-sonnet-4-6',   cliArg: 'claude-sonnet-4-6',   contextK: 200,  supportsEffort: true },
      { id: 'claude-opus-4-7',     cliArg: 'claude-opus-4-7',     contextK: 200,  supportsEffort: true },
      { id: 'claude-opus-4-7-1m',  cliArg: 'claude-opus-4-7',     contextK: 1000, supportsEffort: true },
    ],
    // budget_tokens for extended thinking
    effortMap: { low: 1024, medium: 4096, high: 10000, xhigh: 20000, max: 32000 },
  },

  'github-copilot': {
    id: 'github-copilot',
    adapter: 'copilot-cli',
    requiresApiKey: false,
    models: [
      { id: 'gpt-5.4-mini',        contextK: 128,  supportsEffort: false },
      { id: 'gpt-5-mini',          contextK: 128,  supportsEffort: false },
      { id: 'gpt-4.1',             contextK: 128,  supportsEffort: false },
      { id: 'gpt-5.2',             contextK: 200,  supportsEffort: true  },
      { id: 'gpt-5.2-codex',       contextK: 200,  supportsEffort: true  },
      { id: 'gpt-5.3-codex',       contextK: 200,  supportsEffort: true  },
      { id: 'gpt-5.4',             contextK: 200,  supportsEffort: true  },
      // Claude models available via Copilot
      { id: 'claude-haiku-4.5',    cliArg: 'claude-haiku-4.5',    contextK: 200,  supportsEffort: true },
      { id: 'claude-sonnet-4.6',   cliArg: 'claude-sonnet-4.6',   contextK: 200,  supportsEffort: true },
      { id: 'claude-opus-4.7',     cliArg: 'claude-opus-4.7',     contextK: 200,  supportsEffort: true },
      { id: 'claude-opus-4.7-1m',  cliArg: 'claude-opus-4.7',     contextK: 1000, supportsEffort: true },
    ],
    effortMap: { low: 'low', medium: 'medium', high: 'high', xhigh: 'high', max: 'high' },
  },

  'openai': {
    id: 'openai',
    adapter: 'openai-compat',
    baseUrl: 'https://api.openai.com',
    requiresApiKey: true,
    models: [
      { id: 'gpt-4o-mini',  contextK: 128,  supportsEffort: false },
      { id: 'gpt-4o',       contextK: 128,  supportsEffort: false },
      { id: 'gpt-4.1',      contextK: 128,  supportsEffort: false },
      { id: 'o1-mini',      contextK: 128,  supportsEffort: true  },
      { id: 'o1',           contextK: 200,  supportsEffort: true  },
      { id: 'o3',           contextK: 200,  supportsEffort: true  },
    ],
    effortMap: { low: 'low', medium: 'medium', high: 'high', xhigh: 'high', max: 'high' },
  },

  'google': {
    id: 'google',
    adapter: 'openai-compat',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    requiresApiKey: true,
    models: [
      { id: 'gemini-2.0-flash',   contextK: 1000, supportsEffort: false },
      { id: 'gemini-1.5-flash',   contextK: 1000, supportsEffort: false },
      { id: 'gemini-1.5-pro',     contextK: 1000, supportsEffort: false },
      { id: 'gemini-2.0-pro',     contextK: 1000, supportsEffort: false },
    ],
  },

  'alibaba': {
    id: 'alibaba',
    adapter: 'openai-compat',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode',
    requiresApiKey: true,
    models: [
      { id: 'qwen-turbo',  contextK: 128,  supportsEffort: false },
      { id: 'qwen-plus',   contextK: 128,  supportsEffort: false },
      { id: 'qwen-long',   contextK: 1000, supportsEffort: false },
      { id: 'qwen-max',    contextK: 128,  supportsEffort: false },
    ],
  },

  'custom': {
    id: 'custom',
    adapter: 'openai-compat',
    requiresApiKey: true,
    models: [], // user defines their own model IDs in config.customModels
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the exact CLI argument (or API "model" field) for a given model ID.
 * Falls back to the raw model ID if no cliArg override is defined.
 */
export function resolveModelArg(provider: SubscriptionProvider, modelId: string): string {
  const spec = PROVIDER_SPECS[provider]
  if (!spec) return modelId
  const m = spec.models.find(x => x.id === modelId)
  return m?.cliArg ?? modelId
}

/**
 * Map an effort level string to the provider-specific param value.
 * Returns undefined if the provider has no effort mapping.
 */
export function resolveEffort(
  provider: SubscriptionProvider,
  effort: string,
): number | string | undefined {
  const map = PROVIDER_SPECS[provider]?.effortMap
  if (!map) return undefined
  return map[effort as keyof EffortMapping] ?? map.medium
}

/**
 * Get the base URL for an API provider, with optional per-subscription override.
 */
export function resolveBaseUrl(
  provider: SubscriptionProvider,
  configOverride?: string,
): string {
  return configOverride?.trim() || PROVIDER_SPECS[provider]?.baseUrl || ''
}
