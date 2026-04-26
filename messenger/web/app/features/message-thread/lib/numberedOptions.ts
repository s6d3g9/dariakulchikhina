// Pure parsers for agent-message affordances surfaced below the bubble.
//
// `extractNumberedOptions` recognises a conservative tail-of-message numbered
// list (e.g. "1. force-push\n2. open PR ...") and returns the option strings
// so the renderer can show them as clickable chips alongside the existing
// <reply-suggestions> token chips. The detector is deliberately strict: a
// false positive turns a normal list-in-prose into surprise interactive UI,
// which is far worse than missing a marginal case.
//
// `shouldShowQuickLaunch` decides whether the "Запустить агентом" launcher
// button is worth offering for a given message — true when the message reads
// like a question/proposal a sub-agent could actually act on.

const NUMBERED_OPTIONS_MAX = 6
const NUMBERED_OPTIONS_MIN = 2
const NUMBERED_OPTION_MAX_LENGTH = 240

const REPLY_SUGGESTIONS_RE = /<reply-suggestions>[^<]*<\/reply-suggestions>/

// Captures one item: leading digits + dot + whitespace, then the rest of the
// line up to a newline. The g flag is used for iterative matching from a
// known offset, so /^...$/m anchors are not needed.
const NUMBERED_ITEM_RE = /^(\d+)\.\s+(.+?)\s*$/

export interface NumberedOptionsResult {
  options: string[]
  // Index into the original body where the numbered list starts. Useful when
  // a caller wants to render the prose-above + chips-below split (not used
  // currently — chips are drawn beneath the full markdown body — but kept
  // for future flexibility).
  startOffset: number
}

export function extractNumberedOptions(rawBody: string): NumberedOptionsResult | null {
  if (!rawBody) return null

  // Honour the explicit suggestions contract — when present, those win and
  // the message must NOT additionally surface auto-detected numbered chips,
  // otherwise a single message ends up with two competing chip rows.
  if (REPLY_SUGGESTIONS_RE.test(rawBody)) return null

  const trimmed = rawBody.replace(/\s+$/, '')
  const lines = trimmed.split('\n')

  // Walk backwards from the last line to find a contiguous run of numbered
  // items. The list must end the message, so any trailing non-empty line that
  // isn't itself a numbered item disqualifies the whole detection.
  const items: { index: number; text: string }[] = []
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i] ?? ''
    if (line.trim() === '') {
      // Blank lines break the run — anything before them is prose, not a
      // continuation of the trailing numbered block.
      break
    }
    const match = line.match(NUMBERED_ITEM_RE)
    if (!match) {
      // First non-list line above an in-progress run means the items are
      // mid-message rather than the closing block — bail.
      if (items.length === 0) return null
      break
    }
    const index = Number(match[1])
    const text = (match[2] ?? '').trim()
    if (!text) return null
    if (text.length > NUMBERED_OPTION_MAX_LENGTH) return null
    items.push({ index, text })
  }

  if (items.length < NUMBERED_OPTIONS_MIN) return null
  if (items.length > NUMBERED_OPTIONS_MAX) return null

  items.reverse()

  // Numbering must start at 1 and increase by 1. Anything else (starts at 3,
  // skips 4, repeats 2) is almost certainly prose, not an interactive list.
  for (let i = 0; i < items.length; i += 1) {
    if (items[i]!.index !== i + 1) return null
  }

  // Locate the byte offset of the first numbered line so callers know the
  // boundary between prose and list. We walked the array of split lines, so
  // joining the leading slice gives the offset directly.
  const firstItemLineIdx = lines.length - items.length
  const startOffset = lines.slice(0, firstItemLineIdx).join('\n').length

  return {
    options: items.map(it => it.text),
    startOffset,
  }
}

// True for messages that look like a question or a proposed-action prompt the
// operator might want to delegate to a fresh CLI agent run.
//
// The heuristic is intentionally permissive — a false positive here just
// shows an extra button, while a false negative hides a useful affordance.
export function shouldShowQuickLaunch(rawBody: string): boolean {
  if (!rawBody) return false
  const trimmed = rawBody.replace(REPLY_SUGGESTIONS_RE, '').trim()
  if (!trimmed) return false
  if (trimmed.endsWith('?')) return true
  if (/^какой выбираешь/i.test(trimmed)) return true
  if (extractNumberedOptions(rawBody) !== null) return true
  return false
}

// Strips the <reply-suggestions>...</reply-suggestions> block (if any) from
// the message body, leaving the part that should be carried into a quick-
// launch prompt. The numbered list at the tail is intentionally KEPT — it's
// part of the question the operator may want the launched agent to answer.
export function stripReplySuggestions(rawBody: string): string {
  return rawBody.replace(REPLY_SUGGESTIONS_RE, '').trim()
}
