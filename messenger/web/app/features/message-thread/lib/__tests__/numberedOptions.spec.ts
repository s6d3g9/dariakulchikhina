import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  extractNumberedOptions,
  shouldShowQuickLaunch,
  stripReplySuggestions,
} from '../numberedOptions.ts'

test('extracts a clean trailing numbered list', () => {
  const body = 'Какой выбираешь?\n1. force-push\n2. open PR from -recovered branch'
  const result = extractNumberedOptions(body)
  assert.ok(result, 'expected options to be detected')
  assert.deepEqual(result!.options, ['force-push', 'open PR from -recovered branch'])
})

test('returns null when the numbered list is mid-message', () => {
  const body = '1. force-push\n2. open PR\nЧто-то после списка.'
  assert.equal(extractNumberedOptions(body), null)
})

test('returns null for a single-item list', () => {
  const body = 'Готово\n1. force-push'
  assert.equal(extractNumberedOptions(body), null)
})

test('returns null when an item exceeds 240 chars', () => {
  const longText = 'a'.repeat(241)
  const body = `Какой выбираешь?\n1. ok\n2. ${longText}`
  assert.equal(extractNumberedOptions(body), null)
})

test('returns null when message already contains <reply-suggestions>', () => {
  const body = '1. force-push\n2. open PR\n<reply-suggestions>да|нет</reply-suggestions>'
  assert.equal(extractNumberedOptions(body), null)
})

test('returns null when numbering does not start at 1', () => {
  const body = 'Какой выбираешь?\n2. force-push\n3. open PR'
  assert.equal(extractNumberedOptions(body), null)
})

test('returns null when more than 6 items', () => {
  const body = 'Список\n' + Array.from({ length: 7 }, (_, i) => `${i + 1}. opt ${i + 1}`).join('\n')
  assert.equal(extractNumberedOptions(body), null)
})

test('accepts exactly 6 items', () => {
  const body = 'Список\n' + Array.from({ length: 6 }, (_, i) => `${i + 1}. opt ${i + 1}`).join('\n')
  const result = extractNumberedOptions(body)
  assert.ok(result)
  assert.equal(result!.options.length, 6)
})

test('returns null when items are non-consecutive', () => {
  const body = 'Список\n1. a\n3. b'
  assert.equal(extractNumberedOptions(body), null)
})

test('shouldShowQuickLaunch is true for a trailing question', () => {
  assert.equal(shouldShowQuickLaunch('Куда катимся, сэр?'), true)
})

test('shouldShowQuickLaunch is true for "Какой выбираешь" prefix', () => {
  assert.equal(shouldShowQuickLaunch('Какой выбираешь вариант'), true)
})

test('shouldShowQuickLaunch is true when numbered options are detected', () => {
  assert.equal(shouldShowQuickLaunch('Готово\n1. ok\n2. cancel'), true)
})

test('shouldShowQuickLaunch is false for a plain statement', () => {
  assert.equal(shouldShowQuickLaunch('Тесты прошли. Можно мерджить.'), false)
})

test('stripReplySuggestions removes the token block', () => {
  const body = 'Что делаем?\n<reply-suggestions>да|нет</reply-suggestions>'
  assert.equal(stripReplySuggestions(body), 'Что делаем?')
})
