import { onBeforeUnmount, ref, type Ref } from 'vue'
import {
  type DesignerPackage,
} from '~~/shared/types/designer'
import {
  normalizeDesignerPackages,
} from '~~/shared/utils/designer/designer-catalogs'

type InlineAutosaveState = '' | 'saving' | 'saved' | 'error'

type SavePricingCatalogPayload = {
  packages: DesignerPackage[]
  clearProjectPackageKeysForIds?: number[]
}

type PackageEditorUtilities = {
  cloneDraft: <T>(value: T) => T
  makeEditorId: () => string
  getRequestErrorMessage: (error: any, fallback: string) => string
  showTransientMessage: (target: Ref<string>, message: string) => void
  setAutosaveSettled: (state: Ref<InlineAutosaveState>, expected: InlineAutosaveState) => void
}

type UseDesignerCabinetPackagesOptions = {
  packages: Ref<DesignerPackage[]>
  designerProjects: Ref<Array<{ id: number; packageKey?: string | null }>>
  savePackages: (packages: DesignerPackage[]) => Promise<unknown>
  savePricingCatalog: (payload: SavePricingCatalogPayload) => Promise<unknown>
  initPackagesFromTemplates: () => DesignerPackage[]
  getValidServiceSelectionKeys: () => Set<string>
  getPackageActionKey: (pkg: DesignerPackage, index?: number) => string
  findPackageByActionKey: (actionKey: string) => DesignerPackage | null
  closePeerEditors: () => void
  utils: PackageEditorUtilities
}

export function useDesignerCabinetPackages(options: UseDesignerCabinetPackagesOptions) {
  const pkgEditError = ref('')
  const pkgEditSuccess = ref('')

  const packageCardEditorKey = ref<string | null>(null)
  const packageCardDraft = ref<DesignerPackage | null>(null)
  const packageCardSaving = ref(false)
  const packageCardError = ref('')
  const packageCardSaveState = ref<InlineAutosaveState>('')
  const packageCardSnapshot = ref('')
  let packageCardTimer: ReturnType<typeof setTimeout> | null = null

  function clearPackageCardTimer() {
    if (!packageCardTimer) return
    clearTimeout(packageCardTimer)
    packageCardTimer = null
  }

  function normalizePackagesForSave(
    list: DesignerPackage[],
  ): { ok: true; list: DesignerPackage[] } | { ok: false; error: string } {
    const cleaned = normalizeDesignerPackages(list, { validServiceKeys: options.getValidServiceSelectionKeys() })
      .filter((pkg) => pkg.title || pkg.pricePerSqm > 0 || pkg.serviceKeys.length > 0)

    if (!cleaned.length) {
      return { ok: false, error: 'Добавьте хотя бы один пакет' }
    }

    const seen = new Set<string>()
    for (const pkg of cleaned) {
      if (!pkg.title) return { ok: false, error: 'У всех пакетов должно быть заполнено название' }
      if (seen.has(pkg.key)) return { ok: false, error: 'Найдены дубли пакетов, удалите повторения' }
      seen.add(pkg.key)
    }

    return { ok: true, list: cleaned }
  }

  function buildCustomPackageDraft(): DesignerPackage {
    const id = options.utils.makeEditorId()
    return {
      key: `custom_package_${id}`,
      title: 'Новый пакет',
      description: '',
      serviceKeys: [],
      pricePerSqm: 0,
      enabled: true,
    }
  }

  async function initPackages() {
    const packages = options.initPackagesFromTemplates()
    await options.savePackages(packages)
  }

  function closePackageCardEditor() {
    clearPackageCardTimer()
    packageCardEditorKey.value = null
    packageCardDraft.value = null
    packageCardError.value = ''
    packageCardSaveState.value = ''
    packageCardSnapshot.value = ''
  }

  function openPackageCardEditor(pkg: DesignerPackage) {
    clearPackageCardTimer()
    options.closePeerEditors()
    packageCardEditorKey.value = options.getPackageActionKey(pkg)
    packageCardDraft.value = {
      ...options.utils.cloneDraft(pkg),
      key: options.getPackageActionKey(pkg),
      serviceKeys: Array.isArray(pkg.serviceKeys) ? [...pkg.serviceKeys] : [],
    }
    packageCardError.value = ''
    packageCardSaveState.value = ''
    packageCardSnapshot.value = JSON.stringify(packageCardDraft.value)
  }

  function togglePackageCardEditor(pkg: DesignerPackage) {
    if (packageCardEditorKey.value === options.getPackageActionKey(pkg)) {
      closePackageCardEditor()
      return
    }
    openPackageCardEditor(pkg)
  }

  function togglePackageCardDraftService(key: string) {
    if (!packageCardDraft.value) return
    const index = packageCardDraft.value.serviceKeys.indexOf(key)
    if (index >= 0) packageCardDraft.value.serviceKeys.splice(index, 1)
    else packageCardDraft.value.serviceKeys.push(key)
  }

  async function savePackageCardEditor() {
    if (!packageCardDraft.value) return
    clearPackageCardTimer()
    packageCardError.value = ''
    const activeKey = packageCardEditorKey.value
    const draft = options.utils.cloneDraft(packageCardDraft.value)
    const updatedList = options.packages.value.map((item) => (
      options.getPackageActionKey(item) === activeKey
        ? draft
        : options.utils.cloneDraft(item)
    ))
    const normalized = normalizePackagesForSave(updatedList)
    if (!normalized.ok) {
      packageCardError.value = normalized.error
      packageCardSaveState.value = 'error'
      return
    }
    packageCardSaving.value = true
    packageCardSaveState.value = 'saving'
    try {
      await options.savePackages(normalized.list)
      packageCardSnapshot.value = JSON.stringify(packageCardDraft.value)
      packageCardSaveState.value = 'saved'
      options.utils.setAutosaveSettled(packageCardSaveState, 'saved')
    } catch (error: any) {
      packageCardError.value = options.utils.getRequestErrorMessage(error, 'Не удалось сохранить пакет')
      packageCardSaveState.value = 'error'
    } finally {
      packageCardSaving.value = false
    }
  }

  function queuePackageCardSave() {
    if (!packageCardDraft.value || !packageCardEditorKey.value) return
    const nextSnapshot = JSON.stringify(packageCardDraft.value)
    if (nextSnapshot === packageCardSnapshot.value) return
    clearPackageCardTimer()
    packageCardTimer = setTimeout(() => {
      savePackageCardEditor()
    }, 120)
  }

  async function createPackageCard() {
    pkgEditError.value = ''
    const draft = buildCustomPackageDraft()
    packageCardSaving.value = true
    try {
      await options.savePackages([...options.packages.value.map((item) => options.utils.cloneDraft(item)), draft])
      options.utils.showTransientMessage(pkgEditSuccess, 'Пакет добавлен')
      openPackageCardEditor(options.findPackageByActionKey(draft.key) || draft)
    } catch (error: any) {
      pkgEditError.value = options.utils.getRequestErrorMessage(error, 'Не удалось добавить пакет')
    } finally {
      packageCardSaving.value = false
    }
  }

  async function duplicatePackageCard(pkg: DesignerPackage) {
    pkgEditError.value = ''
    const source = packageCardDraft.value && packageCardEditorKey.value === options.getPackageActionKey(pkg)
      ? options.utils.cloneDraft(packageCardDraft.value)
      : options.utils.cloneDraft(pkg)
    const list = options.packages.value.map((item) => options.utils.cloneDraft(item))
    const index = options.packages.value.findIndex((item) => options.getPackageActionKey(item) === options.getPackageActionKey(pkg))
    if (index < 0) return
    source.key = `${pkg.key || 'package'}_copy_${options.utils.makeEditorId()}`
    source.title = source.title ? `${source.title} (копия)` : 'Новый пакет'
    packageCardSaving.value = true
    try {
      list.splice(index + 1, 0, source)
      await options.savePackages(list)
      options.utils.showTransientMessage(pkgEditSuccess, 'Пакет продублирован')
      openPackageCardEditor(options.findPackageByActionKey(source.key) || source)
    } catch (error: any) {
      pkgEditError.value = options.utils.getRequestErrorMessage(error, 'Не удалось продублировать пакет')
    } finally {
      packageCardSaving.value = false
    }
  }

  async function movePackageCard(pkg: DesignerPackage, direction: -1 | 1) {
    pkgEditError.value = ''
    const index = options.packages.value.findIndex((item) => options.getPackageActionKey(item) === options.getPackageActionKey(pkg))
    const targetIndex = index + direction
    if (index < 0 || targetIndex < 0 || targetIndex >= options.packages.value.length) return
    const list = options.packages.value.map((item) => options.utils.cloneDraft(item))
    const [moved] = list.splice(index, 1)
    list.splice(targetIndex, 0, moved)
    packageCardSaving.value = true
    try {
      await options.savePackages(list)
      options.utils.showTransientMessage(pkgEditSuccess, 'Порядок пакетов обновлён')
      openPackageCardEditor(options.findPackageByActionKey(options.getPackageActionKey(pkg)) || moved)
    } catch (error: any) {
      pkgEditError.value = options.utils.getRequestErrorMessage(error, 'Не удалось изменить порядок пакетов')
    } finally {
      packageCardSaving.value = false
    }
  }

  async function removePackageCard(pkg: DesignerPackage) {
    pkgEditError.value = ''
    packageCardSaving.value = true
    try {
      const removedKey = options.getPackageActionKey(pkg)
      const nextPackages = options.packages.value
        .filter((item) => options.getPackageActionKey(item) !== removedKey)
        .map((item) => options.utils.cloneDraft(item))
      const affectedProjectIds = options.designerProjects.value
        .filter((project) => project.packageKey === removedKey)
        .map((project) => project.id)

      await options.savePricingCatalog({
        packages: nextPackages,
        clearProjectPackageKeysForIds: affectedProjectIds,
      })
      closePackageCardEditor()
      options.utils.showTransientMessage(
        pkgEditSuccess,
        affectedProjectIds.length ? 'Пакет удалён и убран из связанных проектов' : 'Пакет удалён',
      )
    } catch (error: any) {
      pkgEditError.value = options.utils.getRequestErrorMessage(error, 'Не удалось удалить пакет')
    } finally {
      packageCardSaving.value = false
    }
  }

  onBeforeUnmount(() => {
    clearPackageCardTimer()
  })

  return {
    pkgEditError,
    pkgEditSuccess,
    packageCardEditorKey,
    packageCardDraft,
    packageCardSaving,
    packageCardError,
    packageCardSaveState,
    initPackages,
    closePackageCardEditor,
    openPackageCardEditor,
    togglePackageCardEditor,
    togglePackageCardDraftService,
    queuePackageCardSave,
    createPackageCard,
    duplicatePackageCard,
    movePackageCard,
    removePackageCard,
  }
}