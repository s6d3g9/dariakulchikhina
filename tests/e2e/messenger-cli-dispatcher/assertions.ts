import { strict as assert } from 'node:assert'

export function assertWsEventOrder(expected: string[], actual: string[]): void {
  assert.equal(
    actual.length,
    expected.length,
    `Event count mismatch: expected ${expected.length}, got ${actual.length}. Actual: ${actual.join(', ')}`,
  )

  for (let i = 0; i < expected.length; i++) {
    assert.equal(
      actual[i],
      expected[i],
      `Event at index ${i} mismatch: expected '${expected[i]}', got '${actual[i]}'`,
    )
  }
}

export function assertRunStatus(
  status: string | undefined,
  expected: string,
): void {
  assert.equal(
    status,
    expected,
    `Run status mismatch: expected '${expected}', got '${status}'`,
  )
}

export function assertEventCount(eventCount: number, expected: number): void {
  assert.equal(
    eventCount,
    expected,
    `Event count mismatch: expected ${expected}, got ${eventCount}`,
  )
}

export function assertNoError(error?: Error, context?: string): void {
  if (error) {
    throw new Error(`${context ? context + ': ' : ''}${error.message}`)
  }
}
