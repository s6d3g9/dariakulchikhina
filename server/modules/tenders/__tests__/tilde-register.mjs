/**
 * Registers the tilde-hooks loader before the test entry-point is
 * evaluated. Use with: node --import=./tilde-register.mjs <test.ts>.
 */
import { register } from 'node:module'

register('./tilde-hooks.mjs', import.meta.url)
