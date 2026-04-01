/**
 * Nitro plugin: nonce-based CSP.
 *
 * Generates a cryptographically random nonce per request,
 * injects it into all inline <script> tags in rendered HTML,
 * and sets the Content-Security-Policy header with that nonce.
 *
 * This eliminates the need for 'unsafe-inline' in script-src.
 */
import { randomBytes } from 'crypto'
import { buildContentSecurityPolicy } from '~/server/utils/security-headers'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html, { event }) => {
    // Generate a unique nonce per request
    const nonce = randomBytes(16).toString('base64')

    // Store nonce on event so security-headers middleware can read it
    ;(event as any).__cspNonce = nonce

    // Add nonce to all inline scripts in every HTML section
    const sections: (keyof typeof html)[] = ['head', 'bodyAppend', 'bodyPrepend']
    for (const section of sections) {
      const arr = html[section]
      if (!Array.isArray(arr)) continue
      for (let i = 0; i < arr.length; i++) {
        // Add nonce to <script> tags that don't already have it
        arr[i] = arr[i].replace(
          /<script(?![^>]*\bnonce=)/gi,
          `<script nonce="${nonce}"`
        )
      }
    }
  })

  // After HTML is rendered, update the CSP header with the nonce
  nitroApp.hooks.hook('render:response', (response, { event }) => {
    const nonce = (event as any).__cspNonce
    if (!nonce) return

    // Override the CSP header set by middleware
    response.headers = response.headers || {}
    response.headers['content-security-policy'] = buildContentSecurityPolicy(event, nonce)
  })
})
