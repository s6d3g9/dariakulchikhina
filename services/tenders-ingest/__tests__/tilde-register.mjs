/**
 * Registers the tilde-hooks loader before tests are evaluated.
 * Loaded via `node --import=./__tests__/tilde-register.mjs`.
 */
import { register } from 'node:module'

register('./tilde-hooks.mjs', import.meta.url)
