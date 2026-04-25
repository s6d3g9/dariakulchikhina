import MarkdownIt from 'markdown-it'

const FILE_PATH_RE = /(?<![:/@])\b([a-zA-Z0-9_@\-]+(?:[/.][a-zA-Z0-9_@\-]+)*\.(?:ts|tsx|js|jsx|vue|md|json|sql|yml|yaml|css|scss|html|htm|sh|py|rs|go|java|kt|swift)(?::\d+(?::\d+)?)?)\b/g

interface PathSegment { isPath: boolean; text: string }

function splitByFilePath(text: string): PathSegment[] {
  const parts: PathSegment[] = []
  let last = 0
  for (const m of text.matchAll(FILE_PATH_RE)) {
    const path = m[1]
    if (!path) continue
    const idx = m.index ?? 0
    if (idx > last) parts.push({ isPath: false, text: text.slice(last, idx) })
    parts.push({ isPath: true, text: path })
    last = idx + path.length
  }
  if (last < text.length) parts.push({ isPath: false, text: text.slice(last) })
  return parts
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

let cachedRenderer: MarkdownIt | null = null

function getRenderer(): MarkdownIt {
  if (cachedRenderer) return cachedRenderer

  const md = new MarkdownIt({
    html: false,
    breaks: false,
    linkify: true,
    typographer: false,
  })

  md.core.ruler.push('messenger_file_paths', (state) => {
    for (const token of state.tokens) {
      if (token.type !== 'inline' || !token.children) continue
      let linkDepth = 0
      const out = []
      for (const child of token.children) {
        if (child.type === 'link_open') linkDepth++
        else if (child.type === 'link_close') linkDepth--

        if (child.type === 'text' && linkDepth === 0) {
          const segments = splitByFilePath(child.content)
          const hasPath = segments.some(s => s.isPath)
          if (hasPath) {
            for (const seg of segments) {
              if (seg.isPath) {
                const t = new state.Token('html_inline', '', 0)
                const escaped = escapeHtml(seg.text)
                t.content = `<button type="button" class="md-file-chip" data-file-path="${escaped}">${escaped}</button>`
                out.push(t)
              } else if (seg.text) {
                const t = new state.Token('text', '', 0)
                t.content = seg.text
                out.push(t)
              }
            }
            continue
          }
        }
        out.push(child)
      }
      token.children = out
    }
  })

  const defaultFence = md.renderer.rules.fence ?? function (tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options)
  }
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const inner = defaultFence(tokens, idx, options, env, self)
    const code = tokens[idx]?.content ?? ''
    const lang = (tokens[idx]?.info ?? '').trim()
    const langLabel = lang ? escapeHtml(lang) : ''
    const encoded = encodeURIComponent(code)
    const langSpan = langLabel
      ? `<span class="md-code-block__lang">${langLabel}</span>`
      : '<span class="md-code-block__lang md-code-block__lang--muted">code</span>'
    return (
      '<div class="md-code-block">'
      + '<div class="md-code-block__bar">'
      + langSpan
      + '<div class="md-code-block__actions">'
      + `<button type="button" class="md-code-block__btn" data-action="copy-code" data-code="${encoded}" title="Скопировать код">Копировать</button>`
      + `<button type="button" class="md-code-block__btn" data-action="quote-code" data-code="${encoded}" title="Цитировать в композере">Цитировать</button>`
      + '</div>'
      + '</div>'
      + inner
      + '</div>'
    )
  }

  md.renderer.rules.table_open = () => '<div class="md-table-wrap"><table class="md-table">'
  md.renderer.rules.table_close = () => '</table></div>'

  // Markdown-rendered links open in a new tab with safe relationship to keep
  // the messenger SPA context intact and block tab-nabbing on opener.
  const defaultLinkOpen = md.renderer.rules.link_open ?? function (tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options)
  }
  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const tk = tokens[idx]
    if (tk) {
      const setAttr = (name: string, value: string) => {
        const i = tk.attrIndex(name)
        if (i < 0) {
          tk.attrPush([name, value])
        } else {
          const pair = tk.attrs?.[i]
          if (pair) pair[1] = value
        }
      }
      setAttr('target', '_blank')
      setAttr('rel', 'noopener noreferrer')
    }
    return defaultLinkOpen(tokens, idx, options, env, self)
  }

  cachedRenderer = md
  return md
}

export function useMessengerMarkdown() {
  const md = getRenderer()
  function render(input: string): string {
    if (!input) return ''
    return md.render(input)
  }
  return { render }
}
