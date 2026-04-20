// Auth module: shared bcrypt helpers (hash + verify). Used by all role auth services and chat-users.
// Deliberately thin — cryptographic details stay in bcryptjs, callers supply plaintext.
import bcrypt from 'bcryptjs'

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12)
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash)
}
