/**
 * Smoke tests for server/modules/uploads.
 * Validates pure upload-validation helpers without filesystem I/O.
 *
 * Usage:
 *   node --experimental-strip-types \
 *     server/modules/uploads/__tests__/uploads.service.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { validateUploadedFile, sanitizeFilename, MAX_FILE_SIZE } from '../upload-validation.service.ts'

describe('uploads.service', () => {
  it('MAX_FILE_SIZE is 20 MB', () => {
    assert.equal(MAX_FILE_SIZE, 20 * 1024 * 1024)
  })

  it('validateUploadedFile accepts a valid PNG by magic bytes', () => {
    const png = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
    const result = validateUploadedFile(png, 'photo.png', 'image/png')
    assert.equal(result.valid, true)
    assert.equal(result.error, undefined)
  })

  it('validateUploadedFile rejects a blocked extension (.exe)', () => {
    const result = validateUploadedFile(Buffer.alloc(10), 'malware.exe', 'application/octet-stream')
    assert.equal(result.valid, false)
    assert.ok(result.error?.includes('.exe'))
  })

  it('validateUploadedFile rejects a file exceeding MAX_FILE_SIZE', () => {
    const big = Buffer.alloc(MAX_FILE_SIZE + 1)
    const result = validateUploadedFile(big, 'large.pdf', 'application/pdf')
    assert.equal(result.valid, false)
    assert.ok(result.error?.includes('MB'))
  })

  it('sanitizeFilename strips path traversal and returns safe name', () => {
    const clean = sanitizeFilename('../../etc/passwd.txt')
    assert.ok(!clean.includes('/'))
    assert.ok(!clean.includes('..'))
    assert.ok(clean.endsWith('.txt'))
  })

  it('sanitizeFilename returns fallback for empty input', () => {
    assert.equal(sanitizeFilename(undefined), 'file.bin')
    assert.equal(sanitizeFilename(''), 'file.bin')
  })
})
