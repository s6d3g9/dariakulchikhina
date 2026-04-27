/**
 * Secrets module — public surface.
 *
 * `getSecret` and `getGlobalSecret` are the only paths that return
 * plaintext. They are NEVER wired to an HTTP handler — the service
 * layer reads them directly. HTTP API only sees masked views.
 */

export {
  listSecrets,
  writeSecret,
  deleteSecret,
  getSecret,
  getGlobalSecret,
  resolveSecretValue,
} from './secrets.service'

export {
  SecretWriteSchema,
  SecretScopeSchema,
} from './secrets.types'

export type {
  SecretView,
  SecretWrite,
  SecretScope,
  SecretMetadata,
} from './secrets.types'

export {
  encryptSecret,
  decryptSecret,
  maskValue,
  getMasterKey,
} from './secrets.crypto'
