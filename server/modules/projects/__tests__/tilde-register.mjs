/**
 * Registers the tilde-hooks loader before the test entry-point is evaluated.
 * Loaded via: node --import=./server/modules/projects/__tests__/tilde-register.mjs
 */
import { register } from 'node:module'

register(new URL('./tilde-hooks.mjs', import.meta.url))
