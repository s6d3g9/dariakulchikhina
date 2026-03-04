/**
 * Auto-resize all .u-ta textareas so they grow when text wraps.
 *
 * Uses native `field-sizing: content` where supported (Chrome 123+).
 * Falls back to a lightweight JS observer for other browsers.
 */
export default defineNuxtPlugin(() => {
  /* ── feature detect ──────────────────────────────────────── */
  const supportsFieldSizing = CSS.supports?.('field-sizing', 'content')
  if (supportsFieldSizing) return            // CSS handles it natively

  /* ── helpers ─────────────────────────────────────────────── */
  function resize(el: HTMLTextAreaElement) {
    el.style.height = 'auto'                 // reset first
    el.style.height = el.scrollHeight + 'px' // expand to content
  }

  function attach(el: HTMLTextAreaElement) {
    if ((el as any).__autosized) return
    ;(el as any).__autosized = true
    el.style.overflowY = 'hidden'
    el.addEventListener('input', () => resize(el))
    resize(el)                               // initial fit
  }

  function scan(root: ParentNode = document) {
    root.querySelectorAll<HTMLTextAreaElement>('textarea.u-ta').forEach(attach)
  }

  /* ── initial scan + MutationObserver for SPA navigations ── */
  const ready = () => {
    scan()
    new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const n of m.addedNodes) {
          if (!(n instanceof HTMLElement)) continue
          if (n.matches?.('textarea.u-ta')) attach(n as HTMLTextAreaElement)
          else n.querySelectorAll?.<HTMLTextAreaElement>('textarea.u-ta').forEach(attach)
        }
      }
    }).observe(document.body, { childList: true, subtree: true })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready)
  } else {
    ready()
  }
})
