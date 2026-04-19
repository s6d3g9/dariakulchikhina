/**
 * Registers the tilde-hooks loader before the test entry-point is evaluated.
 * Loaded via: node --import=./server/modules/auth/__tests__/tilde-register.mjs
 */
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

register('./tilde-hooks.mjs', pathToFileURL(import.meta.url))
