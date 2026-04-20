/**
 * Smoke tests for server/modules/uploads.
 * Validates file validation logic without filesystem I/O.
 *
 * Usage:
 *   node --experimental-strip-types --test \
 *     server/modules/uploads/__tests__/uploads.service.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('uploads.service', async () => {
  const { validateUploadedFile, sanitizeFilename, MAX_FILE_SIZE } = await import('../upload-validation.service.ts')

  it('rejects files exceeding size limit', () => {
    const oversized = Buffer.alloc(MAX_FILE_SIZE + 1)
    const result = validateUploadedFile(oversized, 'file.pdf', 'application/pdf')
    assert.equal(result.valid, false)
    assert.ok(result.error?.includes('MB'))
  })

  it('rejects blocked extensions', () => {
    const buf = Buffer.from('data')
    const result = validateUploadedFile(buf, 'malware.exe', 'application/octet-stream')
    assert.equal(result.valid, false)
    assert.ok(result.error?.includes('.exe'))
  })

  it('accepts a valid PDF', () => {
    const buf = Buffer.from('PDF content')
    const result = validateUploadedFile(buf, 'contract.pdf', 'application/pdf')
    assert.equal(result.valid, true)
  })

  it('sanitizeFilename strips unsafe characters', () => {
    const safe = sanitizeFilename('my file (1).pdf')
    assert.doesNotMatch(safe, /[ ()]/u)
    assert.ok(safe.endsWith('.pdf'))
  })

  it('sanitizeFilename returns fallback for empty input', () => {
    assert.equal(sanitizeFilename(undefined), 'file.bin')
  })
})
