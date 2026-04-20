import {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  convertMillimetersToTwip, LineRuleType,
} from 'docx'

type LineType = 'title' | 'heading1' | 'heading2' | 'blank' | 'body'

function detectLineType(line: string, lineIndex: number): LineType {
  if (!line.trim()) return 'blank'
  const t = line.trim()
  if (lineIndex < 4 && /^[А-ЯЁ «»\-–—№]/u.test(t) && t === t.toUpperCase() && t.length < 80) return 'title'
  if (/^\d{1,2}\.\s{1,4}[А-ЯЁA-Z]/u.test(t)) return 'heading1'
  if (/^\d{1,2}\.\d{1,2}\.?\s/.test(t)) return 'heading2'
  if (t.length > 3 && t.length < 80 && t === t.toUpperCase() && /[А-ЯЁ]/u.test(t)) return 'heading1'
  return 'body'
}

function makeSpacing(before = 0, after = 0) {
  return { before, after, line: 360, lineRule: LineRuleType.AUTO }
}

function textToParagraphs(text: string): Paragraph[] {
  const FONT = 'Times New Roman'
  const SIZE = 28
  const SIZE_TITLE = 32
  return text.split('\n').map((raw, i) => {
    const line = raw.trimEnd()
    const type = detectLineType(line, i)
    if (type === 'blank') return new Paragraph({ spacing: { before: 0, after: 100 } })
    const trimmed = line.trim()
    if (type === 'title') return new Paragraph({ alignment: AlignmentType.CENTER, spacing: makeSpacing(200, 200), children: [new TextRun({ text: trimmed, bold: true, font: FONT, size: SIZE_TITLE })] })
    if (type === 'heading1') return new Paragraph({ alignment: AlignmentType.LEFT, spacing: makeSpacing(280, 100), children: [new TextRun({ text: trimmed, bold: true, font: FONT, size: SIZE })] })
    if (type === 'heading2') return new Paragraph({ alignment: AlignmentType.LEFT, spacing: makeSpacing(160, 60), indent: { left: convertMillimetersToTwip(5) }, children: [new TextRun({ text: trimmed, bold: true, font: FONT, size: SIZE })] })
    return new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: makeSpacing(0, 80), indent: { firstLine: convertMillimetersToTwip(12.5) }, children: [new TextRun({ text: trimmed, font: FONT, size: SIZE })] })
  })
}

export async function generateDocxBuffer(text: string, docTitle: string): Promise<Buffer> {
  const margin = {
    left:   convertMillimetersToTwip(25),
    right:  convertMillimetersToTwip(20),
    top:    convertMillimetersToTwip(25),
    bottom: convertMillimetersToTwip(20),
  }
  const doc = new Document({
    creator: 'Daria Kulchikhina CRM',
    title: docTitle,
    description: 'Сгенерировано в системе управления проектами',
    styles: { default: { document: { run: { font: 'Times New Roman', size: 28 } } } },
    sections: [{ properties: { page: { margin } }, children: textToParagraphs(text) }],
  })
  return Packer.toBuffer(doc)
}
