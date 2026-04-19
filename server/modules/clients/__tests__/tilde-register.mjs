/**
 * Registers the tilde-hooks loader before the test entry-point is evaluated.
 * Loaded via: node --import=./server/modules/clients/__tests__/tilde-register.mjs
 */
import { register } from 'node:module'

register('./tilde-hooks.mjs', import.meta.url)
