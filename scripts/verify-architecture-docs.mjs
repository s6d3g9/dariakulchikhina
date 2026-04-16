import { readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join } from 'node:path'

const docsDir = join(process.cwd(), 'docs', 'architecture-v5')

function getMarkdownFiles(dirPath) {
  return readdirSync(dirPath)
    .map((name) => join(dirPath, name))
    .filter((path) => statSync(path).isFile() && path.endsWith('.md'))
    .sort((a, b) => a.localeCompare(b))
}

function validateFile(filePath) {
  const issues = []
  const fileName = basename(filePath)
  const content = readFileSync(filePath, 'utf8')
  const lines = content.split(/\r?\n/)

  const firstH1Index = lines.findIndex((line) => line.trim().startsWith('# '))
  if (firstH1Index >= 0) {
    const firstH1 = lines[firstH1Index].trim()
    for (let i = firstH1Index + 1; i < lines.length; i += 1) {
      if (lines[i].trim() === firstH1) {
        issues.push(`${fileName}: duplicate root heading '${firstH1}' at line ${i + 1}`)
      }
    }
  }

  const statusBlockLines = lines
    .map((line, index) => ({ line: line.trim(), lineNumber: index + 1 }))
    .filter(({ line }) => line.startsWith('## Current Status vs Target'))

  if (statusBlockLines.length > 1) {
    issues.push(
      `${fileName}: duplicate 'Current Status vs Target' blocks at lines ${statusBlockLines
        .map(({ lineNumber }) => String(lineNumber))
        .join(',')}`
    )
  }

  const isNumberedDoc = /^\d{2}-.+\.md$/.test(fileName)
  if (isNumberedDoc) {
    const numberedH1Count = lines.filter((line) => /^#\s+\d+\./.test(line.trim())).length
    if (numberedH1Count !== 1) {
      issues.push(`${fileName}: expected exactly 1 numbered root heading, found ${numberedH1Count}`)
    }
  }

  return issues
}

const allFiles = getMarkdownFiles(docsDir)
const allIssues = allFiles.flatMap((filePath) => validateFile(filePath))

if (allIssues.length > 0) {
  console.error('Architecture docs validation failed:')
  for (const issue of allIssues) {
    console.error(`- ${issue}`)
  }
  process.exit(2)
}

console.log(`Architecture docs validation passed (${allFiles.length} files checked).`)
