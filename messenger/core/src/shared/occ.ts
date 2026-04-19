export function throwIfVersionMismatch(expected: number, actual: number): void {
  if (expected !== actual) {
    const err = new Error('version mismatch') as Error & { statusCode: number; data: unknown }
    err.statusCode = 409
    err.data = { expected, actual }
    throw err
  }
}
