#!/usr/bin/env node

import { readFileSync, realpathSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptPath = fileURLToPath(import.meta.url)
const repositoryRoot = realpathSync(resolve(dirname(scriptPath), '..'))
const manifestPath = resolve(repositoryRoot, 'docs/architecture-v6/schemas/development-provider-routing.json')

const requiredRoleModels = new Map([
  ['fast-independent-critic', 'qwenReview'],
  ['bounded-implementer', 'text'],
  ['architecture-synthesizer', 'text'],
  ['adversarial-falsifier', 'qwenReview'],
])

const expectedProviderEndpoints = new Map([
  ['zai', new Map([
    ['codingPlanEndpoint', 'https://api.z.ai/api/coding/paas/v4'],
    ['multimodalEndpoint', 'https://api.z.ai/api/paas/v4'],
  ])],
  ['alibaba-maas', new Map([
    ['codingPlanEndpoint', 'https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1'],
  ])],
])

export function validateDevelopmentProviderPolicy(manifest) {
  const errors = []
  const add = (path, message) => errors.push({ path, message })

  if (manifest?.executionPolicy !== 'shell-v6-nl-development-runtime-v1') {
    add('executionPolicy', 'must reference the canonical NL-only runtime policy')
  }
  const providers = Array.isArray(manifest?.providers) ? manifest.providers : []
  const providerIds = new Set(providers.map(provider => provider.providerId))
  if (providerIds.size !== providers.length) {
    add('providers', 'providerId values must be unique')
  }
  for (const provider of providers) {
    if (!expectedProviderEndpoints.has(provider.providerId)) {
      add('providers', `unapproved provider ${provider.providerId}`)
    }
  }
  for (const [providerId, endpoints] of expectedProviderEndpoints) {
    const provider = providers.find(candidate => candidate.providerId === providerId)
    if (!provider) {
      add('providers', `missing required provider ${providerId}`)
      continue
    }
    for (const [name, expected] of endpoints) {
      try {
        const url = new URL(provider[name])
        if (url.protocol !== 'https:' || url.toString() !== expected) {
          add(`providers.${providerId}.${name}`, `must equal ${expected}`)
        }
      } catch {
        add(`providers.${providerId}.${name}`, 'must be a valid HTTPS URL')
      }
    }
  }

  const textModel = manifest?.models?.text
  if (textModel?.upstreamModelId !== 'glm-5.3') {
    add('models.text.upstreamModelId', 'must be glm-5.3')
  }
  if (textModel?.routeModelId !== 'zai-coding-plan/glm-5.3') {
    add('models.text.routeModelId', 'must use the Z.AI Coding Plan GLM-5.3 route')
  }

  const qwenReviewModel = manifest?.models?.qwenReview
  if (qwenReviewModel?.upstreamModelId !== 'qwen3.8-max') {
    add('models.qwenReview.upstreamModelId', 'must be qwen3.8-max')
  }
  if (qwenReviewModel?.routeModelId !== 'alibaba-maas/qwen3.8-max') {
    add('models.qwenReview.routeModelId', 'must use the Alibaba MaaS Qwen 3.8 Max route')
  }
  for (const capability of ['code', 'reasoning', 'structured-output']) {
    if (!qwenReviewModel?.capabilities?.includes(capability)) {
      add('models.qwenReview.capabilities', `must include ${capability}`)
    }
  }
  if (qwenReviewModel?.availability !== 'available') {
    add('models.qwenReview.availability', 'must be available')
  }
  if (qwenReviewModel?.requestProfile?.enable_thinking !== false) {
    add('models.qwenReview.requestProfile.enable_thinking', 'must be false for bounded review latency')
  }
  if (qwenReviewModel?.requestProfile?.parameterPlacement !== 'top-level') {
    add('models.qwenReview.requestProfile.parameterPlacement', 'must send provider parameters at the top level')
  }
  if (!Number.isInteger(qwenReviewModel?.requestProfile?.timeoutSeconds) || qwenReviewModel.requestProfile.timeoutSeconds < 30) {
    add('models.qwenReview.requestProfile.timeoutSeconds', 'must be an integer of at least 30 seconds')
  }

  const visionModel = manifest?.models?.vision
  if (visionModel?.upstreamModelId !== 'glm-5v-turbo') {
    add('models.vision.upstreamModelId', 'must be glm-5v-turbo')
  }
  if (!visionModel?.capabilities?.includes('image-input') || !visionModel?.modalities?.includes('image')) {
    add('models.vision', 'must explicitly support image input')
  }
  if (!/glm-[\w.-]*v[\w.-]*/u.test(visionModel?.upstreamModelId ?? '')) {
    add('models.vision.upstreamModelId', 'multimodal route must use a V model')
  }

  const roleIds = new Set()
  for (const [index, route] of (manifest?.roleRoutes ?? []).entries()) {
    roleIds.add(route.roleId)
    const model = manifest?.models?.[route.modelRef]
    if (!model) {
      add(`roleRoutes.${index}.modelRef`, 'references an unknown model')
      continue
    }
    for (const capability of route.requiredCapabilities ?? []) {
      if (!model.capabilities?.includes(capability)) {
        add(`roleRoutes.${index}.requiredCapabilities`, `${capability} is absent from the selected model`)
      }
    }
  }
  for (const [roleId, modelRef] of requiredRoleModels) {
    const route = (manifest?.roleRoutes ?? []).find((candidate) => candidate.roleId === roleId)
    if (!route) add('roleRoutes', `missing required role ${roleId}`)
    else if (route.modelRef !== modelRef) {
      add(`roleRoutes.${roleId}`, `must route to ${modelRef}`)
    }
  }
  if (roleIds.size !== (manifest?.roleRoutes ?? []).length) {
    add('roleRoutes', 'roleId values must be unique')
  }

  const runtimeUsers = new Set()
  for (const [index, account] of (manifest?.accounts ?? []).entries()) {
    if (!providerIds.has(account.providerId)) {
      add(`accounts.${index}.providerId`, 'must reference an approved provider')
    }
    if (!account.credentialRef?.startsWith('secret://nl/')) {
      add(`accounts.${index}.credentialRef`, 'must be an opaque NL secret reference')
    }
    if (!Number.isInteger(account.concurrencyLimit) || account.concurrencyLimit < 1) {
      add(`accounts.${index}.concurrencyLimit`, 'must be a positive integer')
    }
    if (!account.runtimeUser || account.runtimeUser === 'root') {
      add(`accounts.${index}.runtimeUser`, 'must use a non-root isolated server account')
    } else if (runtimeUsers.has(account.runtimeUser)) {
      add(`accounts.${index}.runtimeUser`, 'each provider account requires an isolated runtime user')
    } else {
      runtimeUsers.add(account.runtimeUser)
    }
    for (const modelRef of account.modelRefs ?? []) {
      if (!manifest?.models?.[modelRef]) {
        add(`accounts.${index}.modelRefs`, `references unknown model ${modelRef}`)
      }
    }
  }

  if (manifest?.fallbackPolicy?.mode !== 'deny') {
    add('fallbackPolicy.mode', 'must fail closed')
  }
  const allowedProviderIds = [...expectedProviderEndpoints.keys()]
  if (JSON.stringify(manifest?.fallbackPolicy?.allowedProviderIds) !== JSON.stringify(allowedProviderIds)) {
    add('fallbackPolicy.allowedProviderIds', 'must contain only explicitly approved providers')
  }
  for (const forbidden of ['anthropic', 'openai', 'ollama', 'local']) {
    if (!manifest?.fallbackPolicy?.forbiddenProviderIds?.includes(forbidden)) {
      add('fallbackPolicy.forbiddenProviderIds', `must forbid ${forbidden}`)
    }
  }

  const serialized = JSON.stringify(manifest).toLowerCase()
  for (const marker of ['claude-', 'gpt-', 'openai/', 'ollama/']) {
    if (serialized.includes(marker)) add('$', `forbidden active model marker: ${marker}`)
  }
  if (/[\w.+-]+@[\w.-]+\.[a-z]{2,}/iu.test(serialized)) {
    add('$', 'account emails must not be stored in the routing manifest')
  }

  const healthyTextAccount = (manifest?.accounts ?? []).some((account) => (
    account.providerId === 'zai'
    && account.runtimeUser === 'glm-worker'
    && account.healthState === 'healthy'
    && account.modelRefs?.includes('text')
  ))
  if (!healthyTextAccount) add('accounts', 'at least one healthy isolated GLM-5.3 account is required')

  const healthyQwenAccount = (manifest?.accounts ?? []).some((account) => (
    account.providerId === 'alibaba-maas'
    && account.runtimeUser === 'qwen-worker'
    && account.healthState === 'healthy'
    && account.modelRefs?.includes('qwenReview')
  ))
  if (!healthyQwenAccount) add('accounts', 'at least one healthy isolated Qwen 3.8 Max account is required')

  const healthyVisionAccount = (manifest?.accounts ?? []).some((account) => (
    account.providerId === 'zai'
    && account.healthState === 'healthy'
    && account.modelRefs?.includes('vision')
  ))
  if (!healthyVisionAccount && visionModel?.availability !== 'blocked') {
    add('models.vision.availability', 'must be blocked while no healthy vision account exists')
  }
  if (visionModel?.availability === 'blocked' && !visionModel?.blockedReason) {
    add('models.vision.blockedReason', 'blocked route requires an explicit reason')
  }

  return errors
}

export function loadDevelopmentProviderPolicy() {
  return JSON.parse(readFileSync(manifestPath, 'utf8'))
}

if (process.argv[1] && realpathSync(process.argv[1]) === scriptPath) {
  const manifest = loadDevelopmentProviderPolicy()
  const errors = validateDevelopmentProviderPolicy(manifest)
  if (errors.length > 0) {
    console.error('[DEVELOPMENT_PROVIDER_POLICY_INVALID]')
    for (const error of errors) console.error(`- ${error.path}: ${error.message}`)
    process.exitCode = 1
  } else {
    console.log(JSON.stringify({
      ok: true,
      policyId: manifest.policyId,
      textModel: manifest.models.text.routeModelId,
      reviewModel: manifest.models.qwenReview.routeModelId,
      visionModel: manifest.models.vision.routeModelId,
      visionAvailability: manifest.models.vision.availability,
      activeAccounts: manifest.accounts.map(({ accountId, runtimeUser, healthState }) => ({
        accountId,
        runtimeUser,
        healthState,
      })),
      fallback: manifest.fallbackPolicy.mode,
    }, null, 2))
  }
}
