import { computed, ref, type Ref } from 'vue'

type DiffSeg = { type: 'equal' | 'del' | 'ins'; text: string }

type SelectedTemplate = {
  name: string
} | null

type UseAdminDocumentEditorOutputOptions = {
  selectedTpl: Ref<SelectedTemplate>
  fieldValues: Ref<Record<string, string>>
  editorContent: Ref<string>
  editorEl: Ref<HTMLDivElement | null>
  computedRemaining: Ref<string>
  generateText: () => string
  copyMsg: Ref<string>
}

function computeWordDiff(oldText: string, newText: string): DiffSeg[] {
  const tokenize = (value: string) => value.match(/[^\s]+|\s+/g) ?? []
  const originalTokens = tokenize(oldText)
  const nextTokens = tokenize(newText)

  if (originalTokens.length * nextTokens.length > 150_000) {
    return [
      { type: 'del', text: oldText },
      { type: 'ins', text: newText },
    ]
  }

  const originalLength = originalTokens.length
  const nextLength = nextTokens.length
  const matrix: number[][] = Array.from({ length: originalLength + 1 }, () => new Array(nextLength + 1).fill(0))

  for (let originalIndex = originalLength - 1; originalIndex >= 0; originalIndex--) {
    for (let nextIndex = nextLength - 1; nextIndex >= 0; nextIndex--) {
      matrix[originalIndex][nextIndex] = originalTokens[originalIndex] === nextTokens[nextIndex]
        ? matrix[originalIndex + 1][nextIndex + 1] + 1
        : Math.max(matrix[originalIndex + 1][nextIndex], matrix[originalIndex][nextIndex + 1])
    }
  }

  const segments: DiffSeg[] = []
  let originalIndex = 0
  let nextIndex = 0
  while (originalIndex < originalLength || nextIndex < nextLength) {
    if (originalIndex < originalLength && nextIndex < nextLength && originalTokens[originalIndex] === nextTokens[nextIndex]) {
      segments.push({ type: 'equal', text: originalTokens[originalIndex++] })
      nextIndex++
    } else if (nextIndex < nextLength && (originalIndex >= originalLength || matrix[originalIndex][nextIndex + 1] >= (matrix[originalIndex + 1]?.[nextIndex] ?? 0))) {
      segments.push({ type: 'ins', text: nextTokens[nextIndex++] })
    } else {
      segments.push({ type: 'del', text: originalTokens[originalIndex++] })
    }
  }

  return segments.reduce<DiffSeg[]>((accumulator, segment) => {
    const last = accumulator[accumulator.length - 1]
    if (last && last.type === segment.type) {
      last.text += segment.text
      return accumulator
    }

    accumulator.push({ ...segment })
    return accumulator
  }, [])
}

function escHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function useAdminDocumentEditorOutput(options: UseAdminDocumentEditorOutputOptions) {
  const diffMode = ref<'' | 'streaming' | 'review'>('')
  const diffOriginal = ref('')
  const diffNew = ref('')
  const docxLoading = ref(false)

  const diffResult = computed<DiffSeg[]>(() => (
    diffMode.value === 'review' ? computeWordDiff(diffOriginal.value, diffNew.value) : []
  ))

  const diffStats = computed(() => ({
    added: diffResult.value
      .filter((segment) => segment.type === 'ins')
      .reduce((count, segment) => count + segment.text.split(/\s+/).filter(Boolean).length, 0),
    removed: diffResult.value
      .filter((segment) => segment.type === 'del')
      .reduce((count, segment) => count + segment.text.split(/\s+/).filter(Boolean).length, 0),
  }))

  function acceptDiff() {
    options.editorContent.value = diffNew.value
    if (options.editorEl.value) options.editorEl.value.innerText = options.editorContent.value
    diffMode.value = ''
    diffOriginal.value = ''
    diffNew.value = ''
  }

  function rejectDiff() {
    options.editorContent.value = diffOriginal.value
    if (options.editorEl.value) options.editorEl.value.innerText = options.editorContent.value
    diffMode.value = ''
    diffOriginal.value = ''
    diffNew.value = ''
  }

  function stripMarkdown(text: string) {
    return text
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/~~(.+?)~~/g, '$1')
      .replace(/`{1,3}[^`]*`{1,3}/g, (match) => match.replace(/`/g, ''))
      .replace(/^[-*_]{3,}\s*$/gm, '──────────────────────────────')
      .replace(/^[ \t]*[>][ \t]?/gm, '')
      .replace(/^[ \t]*[-*+]\s+/gm, '• ')
      .replace(/^\d+\.\s+/gm, (match) => match)
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .trim()
  }

  function buildPaymentTable(values: Record<string, string>) {
    const price = values.price || '__________'
    const advance = values.advance_amount || options.computedRemaining.value ? (values.advance_amount || '__________') : '__________'
    const remaining = options.computedRemaining.value || '__________'
    const advancePercent = values.advance || '50'
    const advancePercentNumber = parseFloat((values.advance || '50').replace('%', '').replace(',', '.'))
    const remainingPercent = Number.isNaN(advancePercentNumber) ? '50' : String(100 - advancePercentNumber)

    return `<table class="pay-table">
<thead><tr><th>№</th><th>Платёж</th><th>Сумма, руб.</th><th>Срок</th></tr></thead>
<tbody>
<tr><td>1</td><td>Аванс (${advancePercent}%)</td><td>${advance}</td><td>При подписании договора</td></tr>
<tr><td>2</td><td>Доплата (${remainingPercent}%)</td><td>${remaining}</td><td>По окончании работ</td></tr>
<tr class="total-row"><td colspan="2"><b>Итого</b></td><td colspan="2"><b>${price}</b></td></tr>
</tbody></table>`
  }

  function renderLinesToHtml(lines: string[], values: Record<string, string>) {
    const result: string[] = []
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) {
        result.push('<div class="doc-gap"></div>')
        continue
      }

      if (/^\d+(\.\d+)?\.\s+[А-ЯЁA-Z «»"\-–—\/]{4,}$/.test(trimmed)) {
        result.push(`<div class="doc-section">${escHtml(trimmed)}</div>`)
        continue
      }

      if (/^\d+\.\d+\./.test(trimmed)) {
        result.push(`<div class="doc-sub">${escHtml(line)}</div>`)
        continue
      }

      if (/^[•–—-]\s/.test(trimmed)) {
        result.push(`<div class="doc-bullet">${escHtml(trimmed)}</div>`)
        continue
      }

      if (/оплат|платёж|стоимость.*работ/i.test(trimmed) && trimmed.includes('{{')) {
        result.push(`<div class="doc-line">${escHtml(trimmed)}</div>`)
        result.push(buildPaymentTable(values))
        continue
      }

      if (trimmed.startsWith('|') || /^\+[-+]+\+$/.test(trimmed)) continue
      result.push(`<div class="doc-line">${escHtml(line)}</div>`)
    }

    return result.join('\n')
  }

  function printDocument() {
    const rawText = options.editorContent.value || options.generateText()
    const title = options.selectedTpl.value?.name || 'Документ'
    const lines = rawText.split('\n')
    const bodyHtml = renderLinesToHtml(lines, options.fieldValues.value)

    const htmlContent = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>${escHtml(title)}</title>
  <style>
    @page { size: A4; margin: 20mm 20mm 25mm 30mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 14pt;
      line-height: 1.6;
      color: #000;
      background: #fff;
    }
    .doc-gap    { height: 6pt; }
    .doc-line   { text-align: justify; white-space: pre-wrap; margin-bottom: 2pt; }
    .doc-sub    { text-align: justify; white-space: pre-wrap; margin-bottom: 2pt; padding-left: 18pt; }
    .doc-bullet { padding-left: 18pt; margin-bottom: 2pt; }
    .doc-section {
      font-weight: bold; text-transform: uppercase;
      margin-top: 16pt; margin-bottom: 4pt; text-align: center;
    }
    .pay-table {
      width: 100%; border-collapse: collapse; margin: 10pt 0;
      font-size: 12pt;
    }
    .pay-table th, .pay-table td {
      border: 1px solid #000; padding: 4pt 6pt; text-align: left;
    }
    .pay-table thead th { background: #e8e8e8; font-weight: bold; }
    .pay-table .total-row td { font-weight: bold; background: #f5f5f5; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
<div class="doc-body">
${bodyHtml}
</div>
<script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(htmlContent)
      printWindow.document.close()
    }
  }

  function downloadTxt() {
    const text = options.editorContent.value || options.generateText()
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${options.selectedTpl.value?.name || 'document'}.txt`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(options.editorContent.value)
      options.copyMsg.value = '✓ скопировано'
      setTimeout(() => {
        options.copyMsg.value = ''
      }, 2000)
    } catch {
      options.copyMsg.value = '✗ ошибка'
      setTimeout(() => {
        options.copyMsg.value = ''
      }, 2000)
    }
  }

  async function downloadDocx() {
    if (!options.editorContent.value || docxLoading.value) return

    docxLoading.value = true
    try {
      const title = options.selectedTpl.value?.name || 'Документ'
      const csrfToken = document.cookie
        .split(';')
        .map((cookie) => cookie.trim())
        .find((cookie) => cookie.startsWith('csrf_token='))
        ?.split('=')[1] ?? ''

      const response = await fetch('/api/documents/export-docx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': decodeURIComponent(csrfToken),
        },
        body: JSON.stringify({ text: options.editorContent.value, title }),
      })
      if (!response.ok) throw new Error(await response.text())

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${title}.docx`
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch (error: any) {
      alert(`Ошибка создания DOCX: ${error?.message || error}`)
    } finally {
      docxLoading.value = false
    }
  }

  return {
    diffMode,
    diffOriginal,
    diffNew,
    diffResult,
    diffStats,
    docxLoading,
    acceptDiff,
    rejectDiff,
    stripMarkdown,
    printDocument,
    downloadTxt,
    copyToClipboard,
    downloadDocx,
  }
}