import { z } from 'zod'

export const designPanelTabIds = [
  'presets',
  'concept',
  'palette',
  'colors',
  'buttons',
  'type',
  'surface',
  'radii',
  'anim',
  'grid',
  'typeScale',
  'darkMode',
  'inputs',
  'tags',
  'nav',
  'statuses',
  'popups',
  'scrollbar',
  'tables',
  'badges',
  'arch',
] as const

export type DesignPanelTabId = typeof designPanelTabIds[number]

export const DesignModulesConfigSchema = z.object({
  adminLayout: z.object({
    designPanel: z.boolean(),
    header: z.boolean(),
    search: z.boolean(),
    notifications: z.boolean(),
    themeSwitch: z.boolean(),
    siteLink: z.boolean(),
    logoutLink: z.boolean(),
    sidebarMenu: z.boolean(),
    nestedNav: z.boolean(),
  }),
  designPanel: z.object({
    enabled: z.boolean(),
    inspect: z.boolean(),
    elementVisibility: z.boolean(),
    componentInspector: z.boolean(),
    exportImport: z.boolean(),
    tabs: z.object({
      presets: z.boolean(),
      concept: z.boolean(),
      palette: z.boolean(),
      colors: z.boolean(),
      buttons: z.boolean(),
      type: z.boolean(),
      surface: z.boolean(),
      radii: z.boolean(),
      anim: z.boolean(),
      grid: z.boolean(),
      typeScale: z.boolean(),
      darkMode: z.boolean(),
      inputs: z.boolean(),
      tags: z.boolean(),
      nav: z.boolean(),
      statuses: z.boolean(),
      popups: z.boolean(),
      scrollbar: z.boolean(),
      tables: z.boolean(),
      badges: z.boolean(),
      arch: z.boolean(),
    }),
  }),
})

export type DesignModulesConfig = z.infer<typeof DesignModulesConfigSchema>

export function createDefaultDesignModules(): DesignModulesConfig {
  return {
    adminLayout: {
      designPanel: true,
      header: true,
      search: true,
      notifications: true,
      themeSwitch: true,
      siteLink: true,
      logoutLink: true,
      sidebarMenu: true,
      nestedNav: true,
    },
    designPanel: {
      enabled: true,
      inspect: true,
      elementVisibility: true,
      componentInspector: true,
      exportImport: true,
      tabs: {
        presets: true,
        concept: true,
        palette: true,
        colors: true,
        buttons: true,
        type: true,
        surface: true,
        radii: true,
        anim: true,
        grid: true,
        typeScale: true,
        darkMode: true,
        inputs: true,
        tags: true,
        nav: true,
        statuses: true,
        popups: true,
        scrollbar: true,
        tables: true,
        badges: true,
        arch: true,
      },
    },
  }
}

export function normalizeDesignModulesConfig(value: unknown): DesignModulesConfig {
  const defaults = createDefaultDesignModules()
  if (!value || typeof value !== 'object') {
    return defaults
  }

  const candidate = value as Partial<DesignModulesConfig>

  return {
    adminLayout: {
      ...defaults.adminLayout,
      ...(candidate.adminLayout || {}),
    },
    designPanel: {
      ...defaults.designPanel,
      ...(candidate.designPanel || {}),
      tabs: {
        ...defaults.designPanel.tabs,
        ...(candidate.designPanel?.tabs || {}),
      },
    },
  }
}