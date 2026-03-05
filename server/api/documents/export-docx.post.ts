/**
 * POST /api/documents/export-docx
 * Конвертирует текст документа в .docx (Word) с юридическим форматированием
 * Times New Roman 14pt, поля A4, выравнивание по ширине, жирные заголовки
 */

import type { ServerResponse } from 'node:http'
import {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  convertMillimetersToTwip, LineRuleType,
} from 'docx'

// Распознавание типа строки
type LineType = 'title' | 'heading1' | 'heading2' | 'blank' | 'body'

function detectLineType(line: string, lineIndex: number): LineType {
  if (!line.trim()) return 'blank'

  const t = line.trim()

  // Главный заголовок: первые строки полностью в верхнем регистре / типичные слова
  if (lineIndex < 4 && /^[А-ЯЁ «»\-–—№]/u.test(t) && t === t.toUpperCase() && t.length < 80) {
    return 'title'
  }

  // Раздел 1., 2., 3. (основные разделы)
  if (/^\d{1,2}\.\s{1,4}[А-ЯЁA-Z]/u.test(t)) return 'heading1'

  // Подраздел 1.1., 1.2. и т.д.
  if (/^\d{1,2}\.\d{1,2}\.?\s/.test(t)) return 'heading2'

  // Строка полностью в верхнем регистре (заголовок секции)
  if (t.length > 3 && t.length < 80 && t === t.toUpperCase() && /[А-ЯЁ]/u.test(t)) {
    return 'heading1'
  }

  return 'body'
}

function makeSpacing(before = 0, after = 0) {
  return {
    before,
    after,
    line: 360, // 1.5 межстрочный (240 = одинарный)
    lineRule: LineRuleType.AUTO,
  }
}

function textToParagraphs(text: string): Paragraph[] {
  const lines = text.split('\n')
  const paragraphs: Paragraph[] = []

  // Шрифты
  const FONT = 'Times New Roman'
  const SIZE = 28 // half-points: 28 = 14pt
  const SIZE_TITLE = 32 // 16pt для главного названия

  for (const [i, raw] of lines.entries()) {
    const line = raw.trimEnd()
    const type = detectLineType(line, i)

    if (type === 'blank') {
      paragraphs.push(new Paragraph({
        spacing: { before: 0, after: 100 },
      }))
      continue
    }

    const trimmed = line.trim()

    if (type === 'title') {
      paragraphs.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: makeSpacing(200, 200),
        children: [new TextRun({
          text: trimmed,
          bold: true,
          font: FONT,
          size: SIZE_TITLE,
        })],
      }))
      continue
    }

    if (type === 'heading1') {
      paragraphs.push(new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: makeSpacing(280, 100),
        children: [new TextRun({
          text: trimmed,
          bold: true,
          font: FONT,
          size: SIZE,
        })],
      }))
      continue
    }

    if (type === 'heading2') {
      paragraphs.push(new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: makeSpacing(160, 60),
        indent: { left: convertMillimetersToTwip(5) },
        children: [new TextRun({
          text: trimmed,
          bold: true,
          font: FONT,
          size: SIZE,
        })],
      }))
      continue
    }

    // Обычный абзац: выравнивание по ширине, красная строка 1.25 см
    paragraphs.push(new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: makeSpacing(0, 80),
      indent: { firstLine: convertMillimetersToTwip(12.5) },
      children: [new TextRun({
        text: trimmed,
        font: FONT,
        size: SIZE,
      })],
    }))
  }

  return paragraphs
}

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const body = await readBody<{ text: string; title?: string }>(event)
  const text = body?.text || ''
  const docTitle = body?.title || 'Документ'

  // Поля страницы: левое 2.5см, остальные 2см (стандарт РФ для юр. документов)
  const marginLeft  = convertMillimetersToTwip(25)
  const marginRight = convertMillimetersToTwip(20)
  const marginTop   = convertMillimetersToTwip(25)
  const marginBot   = convertMillimetersToTwip(20)

  const doc = new Document({
    creator: 'Daria Kulchikhina CRM',
    title: docTitle,
    description: 'Сгенерировано в системе управления проектами',
    styles: {
      default: {
        document: {
          run: {
            font: 'Times New Roman',
            size: 28,
          },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: {
            left:   marginLeft,
            right:  marginRight,
            top:    marginTop,
            bottom: marginBot,
          },
        },
      },
      children: textToParagraphs(text),
    }],
  })

  const buffer = await Packer.toBuffer(doc)

  const res = event.node!.res as ServerResponse
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(docTitle)}.docx`)
  res.setHeader('Content-Length', buffer.length)
  res.end(buffer)

  return null
})
