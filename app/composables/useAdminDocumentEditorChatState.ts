import { nextTick, ref, type Ref } from 'vue'

interface ChatMsg {
  id: number
  role: 'user' | 'gemma'
  actionLabel: string
  text: string
  streaming: boolean
  done: boolean
  time: string
  charCount: number
  elapsed?: number
  _startedAt?: number
  _applyText?: string
}

type UseAdminDocumentEditorChatStateOptions = {
  editorContent: Ref<string>
  editorEl: Ref<HTMLDivElement | null>
}

export function useAdminDocumentEditorChatState(options: UseAdminDocumentEditorChatStateOptions) {
  const chatVisible = ref(true)
  const chatMessages = ref<ChatMsg[]>([])
  const chatEl = ref<HTMLElement | null>(null)
  const chatInputEl = ref<HTMLTextAreaElement | null>(null)
  const chatInput = ref('')
  let chatIdSeq = 0

  const chatChips = [
    { label: '✏️ замени слово', tpl: 'замени [старый текст] на [новый текст]' },
    { label: '💰 изменить сумму', tpl: 'замени [старая сумма] на [новая сумма]' },
    { label: '📅 изменить дату', tpl: 'замени [старая дата] на [новая дата]' },
    { label: '👤 изменить ФИО', tpl: 'замени [старое ФИО] на [новое ФИО]' },
    { label: '📍 изменить адрес', tpl: 'замени [старый адрес] на [новый адрес]' },
    { label: '➕ добавить пункт', tpl: 'добавь пункт: [текст нового пункта]' },
    { label: '🗑 удалить фрагмент', tpl: 'удали фрагмент: [точный текст для удаления]' },
    { label: '🔢 изменить номер', tpl: 'замени [старый номер/срок] на [новый номер/срок]' },
  ]

  function applyChip(template: string) {
    chatInput.value = template
    nextTick(() => {
      const input = chatInputEl.value
      if (!input) return

      input.focus()
      input.style.height = 'auto'
      input.style.height = `${Math.min(input.scrollHeight, 120)}px`

      const start = template.indexOf('[')
      const end = template.indexOf(']') + 1
      if (start !== -1 && end > start) {
        input.setSelectionRange(start, end)
      }
    })
  }

  function chatNow() {
    return new Date().toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  function chatScroll() {
    nextTick(() => {
      if (chatEl.value) chatEl.value.scrollTop = chatEl.value.scrollHeight
    })
  }

  function chatPushUser(actionLabel: string) {
    chatMessages.value.push({
      id: ++chatIdSeq,
      role: 'user',
      actionLabel,
      text: '',
      streaming: false,
      done: true,
      time: chatNow(),
      charCount: 0,
    })
    chatScroll()
  }

  function chatPushGemma(): ChatMsg {
    const message: ChatMsg = {
      id: ++chatIdSeq,
      role: 'gemma',
      actionLabel: '',
      text: '',
      streaming: true,
      done: false,
      time: chatNow(),
      charCount: 0,
      _startedAt: Date.now(),
    }
    chatMessages.value.push(message)
    chatScroll()
    return message
  }

  function chatToken(message: ChatMsg, token: string) {
    message.text += token
    message.charCount = message.text.length
    chatScroll()
  }

  function chatDone(message: ChatMsg) {
    message.streaming = false
    message.done = true
    if (message._startedAt) {
      message.elapsed = Math.round((Date.now() - message._startedAt) / 1000)
    }
    chatScroll()
  }

  function applyPatches(original: string, response: string) {
    const patchRegex = /<<<REPLACE>>>\n?([\s\S]*?)<<<WITH>>>\n?([\s\S]*?)<<<END>>>/g
    let result = original
    let count = 0
    let failed = 0
    let match: RegExpExecArray | null

    function normalizeWhitespace(value: string) {
      return value.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim()
    }

    function normalizeAggressive(value: string) {
      return value
        .replace(/\r\n/g, '\n')
        .replace(/[^\p{L}\p{N}\n]+/gu, ' ')
        .replace(/[ \t]+/g, ' ')
        .trim()
        .toLowerCase()
    }

    function findAndReplace(documentText: string, oldText: string, newText: string) {
      if (documentText.includes(oldText)) {
        return { doc: documentText.replace(oldText, newText), found: true }
      }

      const normalizedOld = normalizeWhitespace(oldText)
      if (normalizedOld.length < 3) return { doc: documentText, found: false }

      const lines = documentText.split('\n')
      const oldLines = normalizedOld.split('\n').filter(Boolean)
      if (oldLines.length === 1) {
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
          if (normalizeWhitespace(lines[lineIndex]).includes(normalizedOld)) {
            lines[lineIndex] = lines[lineIndex].replace(lines[lineIndex].trim(), newText.trim())
            return { doc: lines.join('\n'), found: true }
          }
        }

        const normalizedAggressive = normalizeAggressive(oldText)
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
          if (normalizeAggressive(lines[lineIndex]).includes(normalizedAggressive)) {
            lines[lineIndex] = newText.trim()
            return { doc: lines.join('\n'), found: true }
          }
        }
      } else {
        const firstLine = oldLines[0]
        for (let lineIndex = 0; lineIndex <= lines.length - oldLines.length; lineIndex++) {
          if (normalizeWhitespace(lines[lineIndex]).includes(firstLine)) {
            const chunk = lines.slice(lineIndex, lineIndex + oldLines.length)
            if (normalizeWhitespace(chunk.join('\n')).includes(normalizeWhitespace(oldLines.join('\n')))) {
              lines.splice(lineIndex, oldLines.length, ...newText.split('\n'))
              return { doc: lines.join('\n'), found: true }
            }
          }
        }

        const normalizedAggressive = normalizeAggressive(oldLines.join(' '))
        for (let lineIndex = 0; lineIndex <= lines.length - oldLines.length; lineIndex++) {
          const chunk = lines.slice(lineIndex, lineIndex + oldLines.length)
          if (normalizeAggressive(chunk.join(' ')).includes(normalizedAggressive)) {
            lines.splice(lineIndex, oldLines.length, ...newText.split('\n'))
            return { doc: lines.join('\n'), found: true }
          }
        }
      }

      return { doc: documentText, found: false }
    }

    while ((match = patchRegex.exec(response)) !== null) {
      const oldText = match[1].trim()
      const newText = match[2].trim()
      if (!oldText) {
        failed++
        continue
      }

      const { doc, found } = findAndReplace(result, oldText, newText)
      if (found) {
        result = doc
        count++
      } else {
        failed++
      }
    }

    return { result, count, failed }
  }

  function tryInstantEdit(instruction: string, documentText: string) {
    const none = { applied: false, result: documentText, oldText: '', newText: '' }
    if (!documentText.trim()) return none

    const patterns = [
      /^(?:замени(?:те)?|поменяй(?:те)?|измени(?:те)?|replace)\s+[«"'”](.+?)[»"'”]\s+на\s+[«"'”](.+?)[»"'”]/i,
      /^(?:замени(?:те)?|поменяй(?:те)?|измени(?:те)?)\s+(.+?)\s+на\s+(.+)$/i,
      /^[«"'”](.+?)[»"'”]\s*[→\->]+\s*[«"'”](.+?)[»"'”]/,
      /^(.+?)\s*→\s*(.+)$/,
    ]

    for (const pattern of patterns) {
      const match = instruction.trim().match(pattern)
      if (!match) continue

      const oldText = match[1].trim()
      const newText = match[2].trim()
      if (!oldText || oldText === newText) continue

      if (documentText.includes(oldText)) {
        return { applied: true, result: documentText.replace(oldText, newText), oldText, newText }
      }

      const lowerVariant = oldText[0].toLowerCase() + oldText.slice(1)
      const upperVariant = oldText[0].toUpperCase() + oldText.slice(1)
      for (const variant of [lowerVariant, upperVariant]) {
        if (documentText.includes(variant)) {
          return { applied: true, result: documentText.replace(variant, newText), oldText: variant, newText }
        }
      }
    }

    return none
  }

  function applyFromChat(text: string) {
    options.editorContent.value = text
    if (options.editorEl.value) options.editorEl.value.innerText = text
    chatMessages.value.forEach((message) => {
      message._applyText = undefined
    })
  }

  function clearChat() {
    chatMessages.value = []
  }

  return {
    chatVisible,
    chatMessages,
    chatEl,
    chatInputEl,
    chatInput,
    chatChips,
    applyChip,
    chatPushUser,
    chatPushGemma,
    chatToken,
    chatDone,
    applyPatches,
    tryInstantEdit,
    applyFromChat,
    clearChat,
  }
}