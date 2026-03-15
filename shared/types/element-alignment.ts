import { z } from 'zod'

export const ElementAlignmentScopeSchema = z.enum(['page', 'global'])

export const ElementAlignmentRuleSchema = z.object({
  id: z.string().min(1),
  selector: z.string().min(1),
  scope: ElementAlignmentScopeSchema,
  path: z.string().min(1).nullable().optional(),
  label: z.string().default(''),
  tag: z.string().default(''),
  classes: z.string().default(''),
  x: z.number().finite().default(0),
  y: z.number().finite().default(0),
  createdAt: z.string().default(''),
})

export const ElementAlignmentConfigSchema = z.object({
  rules: z.array(ElementAlignmentRuleSchema).default([]),
})

export type ElementAlignmentScope = z.infer<typeof ElementAlignmentScopeSchema>
export type ElementAlignmentRule = z.infer<typeof ElementAlignmentRuleSchema>
export type ElementAlignmentConfig = z.infer<typeof ElementAlignmentConfigSchema>

export function createDefaultElementAlignmentConfig(): ElementAlignmentConfig {
  return { rules: [] }
}

export function normalizeElementAlignmentConfig(value: unknown): ElementAlignmentConfig {
  const defaults = createDefaultElementAlignmentConfig()
  if (!value || typeof value !== 'object') {
    return defaults
  }

  const candidate = value as Partial<ElementAlignmentConfig>
  const rules = Array.isArray(candidate.rules)
    ? (candidate.rules as unknown[])
        .filter((rule): rule is Partial<ElementAlignmentRule> => Boolean(rule && typeof rule === 'object'))
        .map((rule) => ({
          id: typeof rule.id === 'string' && rule.id ? rule.id : `align_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          selector: typeof rule.selector === 'string' ? rule.selector.trim() : '',
          scope: (rule.scope === 'page' ? 'page' : 'global') as 'page' | 'global',
          path: typeof rule.path === 'string' && rule.path.trim() ? rule.path.trim() : null,
          label: typeof rule.label === 'string' ? rule.label : '',
          tag: typeof rule.tag === 'string' ? rule.tag : '',
          classes: typeof rule.classes === 'string' ? rule.classes : '',
          x: Number.isFinite(rule.x) ? Math.round(Number(rule.x)) : 0,
          y: Number.isFinite(rule.y) ? Math.round(Number(rule.y)) : 0,
          createdAt: typeof rule.createdAt === 'string' ? rule.createdAt : '',
        }))
        .filter((rule) => Boolean(rule.selector) && (rule.x !== 0 || rule.y !== 0))
    : []

  const seen = new Set<string>()

  return {
    rules: rules.filter((rule) => {
      const key = `${rule.scope}::${rule.path || '*'}::${rule.selector}`
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    }),
  }
}