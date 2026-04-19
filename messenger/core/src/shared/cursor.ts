export type Cursor = { createdAt: string; id: string } | null

export function encodeCursor(c: NonNullable<Cursor>): string {
  return Buffer.from(JSON.stringify(c)).toString('base64url')
}

export function decodeCursor(s: string | null | undefined): Cursor {
  if (!s) {
    return null
  }
  try {
    const parsed = JSON.parse(Buffer.from(s, 'base64url').toString('utf8')) as unknown
    if (
      parsed
      && typeof parsed === 'object'
      && 'createdAt' in parsed
      && 'id' in parsed
      && typeof (parsed as Record<string, unknown>).createdAt === 'string'
      && typeof (parsed as Record<string, unknown>).id === 'string'
    ) {
      return parsed as Cursor
    }
    return null
  } catch {
    return null
  }
}
