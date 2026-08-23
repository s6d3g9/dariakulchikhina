import assert from 'node:assert/strict'
import test from 'node:test'

import {
  loadDevelopmentProviderPolicy,
  validateDevelopmentProviderPolicy,
} from './verify-development-provider-policy.mjs'

const clonePolicy = () => structuredClone(loadDevelopmentProviderPolicy())

test('canonical Z.AI implementation and Qwen review routing policy is valid', () => {
  assert.deepEqual(validateDevelopmentProviderPolicy(clonePolicy()), [])
})

test('Anthropic fallback is rejected', () => {
  const policy = clonePolicy()
  policy.fallbackPolicy.mode = 'provider-fallback'
  policy.fallbackPolicy.allowedProviderIds.push('anthropic')

  const errors = validateDevelopmentProviderPolicy(policy)
  assert.ok(errors.some(({ path }) => path === 'fallbackPolicy.mode'))
  assert.ok(errors.some(({ path }) => path === 'fallbackPolicy.allowedProviderIds'))
})

test('a non-V model cannot satisfy the vision route', () => {
  const policy = clonePolicy()
  policy.models.vision.upstreamModelId = 'glm-5.3'
  policy.models.vision.capabilities = policy.models.vision.capabilities.filter((value) => value !== 'image-input')

  const errors = validateDevelopmentProviderPolicy(policy)
  assert.ok(errors.some(({ path }) => path === 'models.vision.upstreamModelId'))
  assert.ok(errors.some(({ path }) => path === 'models.vision'))
})

test('an undeclared local credential is rejected', () => {
  const policy = clonePolicy()
  policy.accounts[0].credentialRef = '/Users/oxo/.config/zai/key'

  const errors = validateDevelopmentProviderPolicy(policy)
  assert.ok(errors.some(({ path }) => path === 'accounts.0.credentialRef'))
})

test('vision must remain blocked without an eligible account', () => {
  const policy = clonePolicy()
  policy.models.vision.availability = 'available'
  delete policy.models.vision.blockedReason

  const errors = validateDevelopmentProviderPolicy(policy)
  assert.ok(errors.some(({ path }) => path === 'models.vision.availability'))
})
test('Qwen review roles cannot be silently downgraded to the implementation model', () => {
  const policy = clonePolicy()
  policy.roleRoutes.find(route => route.roleId === 'fast-independent-critic').modelRef = 'text'
  policy.models.qwenReview.upstreamModelId = 'qwen3.7-max'

  const errors = validateDevelopmentProviderPolicy(policy)
  assert.ok(errors.some(({ path }) => path === 'roleRoutes.fast-independent-critic'))
  assert.ok(errors.some(({ path }) => path === 'models.qwenReview.upstreamModelId'))
})

test('an unapproved provider cannot enter the active routing set', () => {
  const policy = clonePolicy()
  policy.providers.push({
    providerId: 'untrusted',
    codingPlanEndpoint: 'https://example.invalid/v1',
  })
  policy.fallbackPolicy.allowedProviderIds.push('untrusted')

  const errors = validateDevelopmentProviderPolicy(policy)
  assert.ok(errors.some(({ path, message }) => (
    path === 'providers' && message.includes('unapproved provider')
  )))
  assert.ok(errors.some(({ path }) => path === 'fallbackPolicy.allowedProviderIds'))
})

test('Qwen account must use its isolated service worker', () => {
  const policy = clonePolicy()
  const account = policy.accounts.find(candidate => candidate.providerId === 'alibaba-maas')
  account.runtimeUser = 'glm-worker'

  const errors = validateDevelopmentProviderPolicy(policy)
  assert.ok(errors.some(({ path, message }) => (
    path.endsWith('.runtimeUser') && message.includes('isolated')
  )))
  assert.ok(errors.some(({ path, message }) => (
    path === 'accounts' && message.includes('Qwen 3.8 Max')
  )))
})

test('Qwen review profile disables unbounded thinking latency', () => {
  const policy = clonePolicy()
  policy.models.qwenReview.requestProfile.enable_thinking = true
  policy.models.qwenReview.requestProfile.parameterPlacement = 'nested-extra-body'
  policy.models.qwenReview.requestProfile.timeoutSeconds = 10

  const errors = validateDevelopmentProviderPolicy(policy)
  assert.ok(errors.some(({ path }) => path === 'models.qwenReview.requestProfile.enable_thinking'))
  assert.ok(errors.some(({ path }) => path === 'models.qwenReview.requestProfile.parameterPlacement'))
  assert.ok(errors.some(({ path }) => path === 'models.qwenReview.requestProfile.timeoutSeconds'))
})
