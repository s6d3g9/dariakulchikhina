import { z } from 'zod'
import { designPanelTabIds } from '~~/shared/types/design-modules'

export type MenuBlockType = 'node' | 'leaf'

export type MenuBlockCategory =
  | 'root'
  | 'entity-registry'
  | 'cabinet'
  | 'project'
  | 'project-phase'
  | 'document'
  | 'gallery'

export const appScopeValues = [
  'admin',
  'designer-cabinet',
  'client-cabinet',
  'contractor-cabinet',
  'seller-cabinet',
  'manager-cabinet',
  'project',
] as const

export type AppScope = typeof appScopeValues[number]

export interface MenuBlockDef {
  id: string
  title: string
  type: MenuBlockType
  category: MenuBlockCategory
  family: string
  description: string
  configurable: boolean
  tags: string[]
  appScopes: AppScope[]
}

export interface MenuBlockGroupDef {
  id: string
  title: string
  category: MenuBlockCategory
  description: string
  items: MenuBlockDef[]
}

export interface AppBlueprintDef {
  id: string
  title: string
  description: string
  scopes: AppScope[]
  menuGroupIds: string[]
  featuredBlockIds: string[]
  modules?: AppBlueprintModulesOverride
}

export interface AppBlueprintModulesOverride {
  adminLayout?: Partial<{
    designPanel: boolean
    header: boolean
    search: boolean
    notifications: boolean
    themeSwitch: boolean
    siteLink: boolean
    logoutLink: boolean
    sidebarMenu: boolean
    nestedNav: boolean
  }>
  designPanel?: Partial<{
    enabled: boolean
    inspect: boolean
    elementVisibility: boolean
    componentInspector: boolean
    exportImport: boolean
    tabs: Partial<Record<typeof designPanelTabIds[number], boolean>>
  }>
}

export interface AppBlueprintCatalogConfig {
  activeBlueprintId: string
  custom: AppBlueprintDef[]
}

export type LayoutBlockCategory =
  | 'public'
  | 'private'
  | 'service'
  | 'utility'
  | 'circulation'
  | 'outdoor'
  | 'custom'

export type LayoutBlockPresetKey = 'S' | 'M' | 'L' | 'XL'

export interface LayoutBlockPresetDef {
  key: LayoutBlockPresetKey
  cellsX: number
  cellsY: number
}

export interface LayoutBlockTemplateDef {
  id: string
  title: string
  defaultLabel: string
  category: LayoutBlockCategory
  preset: LayoutBlockPresetKey
  color: string
  description: string
}

export interface LayoutBlockConfig {
  id: string
  templateId: string
  category: LayoutBlockCategory
  label: string
  x: number
  y: number
  w: number
  h: number
  color: string
}

export const AppScopeSchema = z.enum(appScopeValues)
const BlueprintPanelTabsOverrideSchema = z.object(
  Object.fromEntries(designPanelTabIds.map(tabId => [tabId, z.boolean().optional()])) as Record<typeof designPanelTabIds[number], z.ZodOptional<z.ZodBoolean>>,
).partial()

export const AppBlueprintModulesOverrideSchema = z.object({
  adminLayout: z.object({
    designPanel: z.boolean().optional(),
    header: z.boolean().optional(),
    search: z.boolean().optional(),
    notifications: z.boolean().optional(),
    themeSwitch: z.boolean().optional(),
    siteLink: z.boolean().optional(),
    logoutLink: z.boolean().optional(),
    sidebarMenu: z.boolean().optional(),
    nestedNav: z.boolean().optional(),
  }).partial().optional(),
  designPanel: z.object({
    enabled: z.boolean().optional(),
    inspect: z.boolean().optional(),
    elementVisibility: z.boolean().optional(),
    componentInspector: z.boolean().optional(),
    exportImport: z.boolean().optional(),
    tabs: BlueprintPanelTabsOverrideSchema.optional(),
  }).partial().optional(),
}).partial()

export const AppBlueprintSchema = z.object({
  id: z.string().min(1).max(120),
  title: z.string().min(1).max(160),
  description: z.string().min(1).max(2000),
  scopes: z.array(AppScopeSchema).default([]),
  menuGroupIds: z.array(z.string().min(1).max(120)).default([]),
  featuredBlockIds: z.array(z.string().min(1).max(120)).default([]),
  modules: AppBlueprintModulesOverrideSchema.optional(),
})

export const AppBlueprintCatalogConfigSchema = z.object({
  activeBlueprintId: z.string().min(1).max(120).default('design-studio'),
  custom: z.array(AppBlueprintSchema).default([]),
})

export const AppBlueprintImportPayloadSchema = z.union([
  AppBlueprintSchema,
  z.object({
    blueprint: AppBlueprintSchema,
  }),
])

export function createDefaultAppBlueprintCatalogConfig(): AppBlueprintCatalogConfig {
  return {
    activeBlueprintId: 'design-studio',
    custom: [],
  }
}

export function normalizeAppBlueprintCatalogConfig(value: unknown): AppBlueprintCatalogConfig {
  const parsed = AppBlueprintCatalogConfigSchema.safeParse(value)
  if (parsed.success) {
    return parsed.data
  }

  return createDefaultAppBlueprintCatalogConfig()
}