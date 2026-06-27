/**
 * Prompt injection detection for LLM inputs.
 * Rejects user text that attempts to override system instructions.
 */

const INJECTION_PATTERNS = [
  /(?:ignore|disregard|forget|override|bypass)\s+(?:all\s+)?(?:previous|above|prior|system|initial)\s+(?:instructions?|rules?|prompts?|guidelines?)/i,
  /(?:you\s+are\s+now|from\s+now\s+on|new\s+instructions?:)/i,
  /(?:system\s*prompt|system\s*message|assistant\s*instruction)\s*[:=]/i,
  /\[\s*(?:SYSTEM|INST|SYS)\s*\]/i,
  /<<<\s*(?:override|system|reset)/i,
  /```\s*system\b/i,
]

const MAX_USER_INSTRUCTION_LENGTH = 5_000

export interface PromptSanitizeResult {
  safe: boolean
  reason?: string
}

export function sanitizePromptInput(text: string | undefined | null): PromptSanitizeResult {
  if (!text) return { safe: true }

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      return { safe: false, reason: 'Обнаружена попытка модификации системных инструкций' }
    }
  }

  return { safe: true }
}

export function enforceInstructionLength(instruction: string | undefined | null): string {
  if (!instruction) return ''
  return instruction.slice(0, MAX_USER_INSTRUCTION_LENGTH)
}
