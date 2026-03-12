import { z } from 'zod'

export const ElementVisibilityScopeSchema = z.enum(['page', 'global'])

export const ElementVisibilityRuleSchema = z.object({
  id: z.string().min(1),
  selector: z.string().min(1),
  scope: ElementVisibilityScopeSchema,
  path: z.string().min(1).nullable().optional(),
  label: z.string().default(''),
  tag: z.string().default(''),
  classes: z.string().default(''),
  createdAt: z.string().default(''),
})

export const ElementVisibilityConfigSchema = z.object({
  rules: z.array(ElementVisibilityRuleSchema).default([]),
})

export type ElementVisibilityScope = z.infer<typeof ElementVisibilityScopeSchema>
export type ElementVisibilityRule = z.infer<typeof ElementVisibilityRuleSchema>
export type ElementVisibilityConfig = z.infer<typeof ElementVisibilityConfigSchema>

export function createDefaultElementVisibilityConfig(): ElementVisibilityConfig {
  return { rules: [] }
}

export function normalizeElementVisibilityConfig(value: unknown): ElementVisibilityConfig {
  const defaults = createDefaultElementVisibilityConfig()
  if (!value || typeof value !== 'object') {
    return defaults
  }

  const candidate = value as Partial<ElementVisibilityConfig>
  const rules = Array.isArray(candidate.rules)
    ? (candidate.rules as unknown[])
        .filter((rule): rule is Partial<ElementVisibilityRule> => Boolean(rule && typeof rule === 'object'))
        .map((rule) => ({
          id: typeof rule.id === 'string' && rule.id ? rule.id : `rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          selector: typeof rule.selector === 'string' ? rule.selector.trim() : '',
          scope: (rule.scope === 'page' ? 'page' : 'global') as 'page' | 'global',
          path: typeof rule.path === 'string' && rule.path.trim() ? rule.path.trim() : null,
          label: typeof rule.label === 'string' ? rule.label : '',
          tag: typeof rule.tag === 'string' ? rule.tag : '',
          classes: typeof rule.classes === 'string' ? rule.classes : '',
          createdAt: typeof rule.createdAt === 'string' ? rule.createdAt : '',
        }))
        .filter((rule) => Boolean(rule.selector))
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