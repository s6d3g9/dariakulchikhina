import { computed, onBeforeUnmount, reactive, ref, type Ref } from 'vue'
import {
  DESIGNER_PACKAGE_TEMPLATES,
  type DesignerPackage,
} from '~~/shared/types/designer'

type InlineAutosaveState = '' | 'saving' | 'saved' | 'error'

type DesignerProjectStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived'

type DesignerProjectSummary = {
  id: number
  projectTitle?: string | null
  packageKey?: string | null
  pricePerSqm?: number | null
  area?: number | null
  status?: string | null
  notes?: string | null
}

type DesignerProjectEditDraft = {
  designerProjectId: number
  title: string
  packageKey: string
  pricePerSqm: number
  area: number
  status: DesignerProjectStatus
  notes: string
}

type NewDesignerProjectDraft = {
  title: string
  slug: string
  packageKey: string
  pricePerSqm: number
  area: number
  notes: string
}

type UpdateDesignerProjectPayload = {
  designerProjectId: number
  title?: string
  packageKey?: string | null
  pricePerSqm?: number | null
  area?: number | null
  status?: DesignerProjectStatus
  notes?: string | null
}

type UseDesignerCabinetProjectsOptions = {
  packages: Ref<DesignerPackage[]>
  newProject: NewDesignerProjectDraft
  createProject: () => Promise<void>
  updateDesignerProject: (payload: UpdateDesignerProjectPayload) => Promise<void>
  utils: {
    setAutosaveSettled: (state: Ref<InlineAutosaveState>, expected: InlineAutosaveState) => void
    getRequestErrorMessage: (error: any, fallback: string) => string
  }
}

export function useDesignerCabinetProjects(options: UseDesignerCabinetProjectsOptions) {
  const availablePackages = computed(() => {
    if (options.packages.value.length) return options.packages.value.filter((pkg) => pkg.enabled)
    return DESIGNER_PACKAGE_TEMPLATES.map((template) => ({
      key: template.key,
      title: template.title,
      pricePerSqm: template.suggestedPricePerSqm,
      enabled: true,
      description: template.description,
      serviceKeys: template.serviceKeys,
    }))
  })

  const showNewProjectModal = ref(false)
  const editingDesignerProjectId = ref<number | null>(null)
  const projectEditError = ref('')
  const projectEditSuccess = ref('')
  const projectEditState = ref<InlineAutosaveState>('')
  const projectEditSnapshot = ref('')
  let projectEditTimer: ReturnType<typeof setTimeout> | null = null

  const projectEdit = reactive<DesignerProjectEditDraft>({
    designerProjectId: 0,
    title: '',
    packageKey: '',
    pricePerSqm: 0,
    area: 0,
    status: 'draft',
    notes: '',
  })

  function clearProjectEditTimer() {
    if (!projectEditTimer) return
    clearTimeout(projectEditTimer)
    projectEditTimer = null
  }

  function serializeProjectEdit() {
    return JSON.stringify({
      designerProjectId: projectEdit.designerProjectId,
      title: projectEdit.title,
      packageKey: projectEdit.packageKey,
      pricePerSqm: projectEdit.pricePerSqm,
      area: projectEdit.area,
      status: projectEdit.status,
      notes: projectEdit.notes,
    })
  }

  async function doCreateProject() {
    await options.createProject()
    showNewProjectModal.value = false
  }

  function startEditDesignerProject(project: DesignerProjectSummary) {
    projectEditError.value = ''
    projectEditSuccess.value = ''
    projectEditState.value = ''
    editingDesignerProjectId.value = project.id
    projectEdit.designerProjectId = project.id
    projectEdit.title = String(project.projectTitle || '')
    projectEdit.packageKey = String(project.packageKey || '')
    projectEdit.pricePerSqm = Number(project.pricePerSqm || 0)
    projectEdit.area = Number(project.area || 0)
    projectEdit.status = (project.status || 'draft') as DesignerProjectStatus
    projectEdit.notes = String(project.notes || '')
    projectEditSnapshot.value = serializeProjectEdit()
  }

  function cancelEditDesignerProject() {
    clearProjectEditTimer()
    editingDesignerProjectId.value = null
    projectEditError.value = ''
    projectEditState.value = ''
  }

  async function saveDesignerProjectEdits() {
    clearProjectEditTimer()
    projectEditError.value = ''
    if (!projectEdit.title.trim()) {
      projectEditError.value = 'Укажите название проекта'
      projectEditState.value = 'error'
      return
    }

    projectEditState.value = 'saving'
    try {
      await options.updateDesignerProject({
        designerProjectId: projectEdit.designerProjectId,
        title: projectEdit.title.trim(),
        packageKey: projectEdit.packageKey || null,
        pricePerSqm: Number(projectEdit.pricePerSqm || 0),
        area: Number(projectEdit.area || 0),
        status: projectEdit.status,
        notes: projectEdit.notes || null,
      })
      projectEditSnapshot.value = serializeProjectEdit()
      projectEditState.value = 'saved'
      options.utils.setAutosaveSettled(projectEditState, 'saved')
    } catch (error: any) {
      projectEditError.value = options.utils.getRequestErrorMessage(error, 'Не удалось сохранить проект')
      projectEditState.value = 'error'
    }
  }

  function queueProjectEditSave() {
    if (!editingDesignerProjectId.value) return
    const nextSnapshot = serializeProjectEdit()
    if (nextSnapshot === projectEditSnapshot.value) return
    clearProjectEditTimer()
    projectEditTimer = setTimeout(() => {
      saveDesignerProjectEdits()
    }, 120)
  }

  onBeforeUnmount(() => {
    clearProjectEditTimer()
  })

  return {
    availablePackages,
    showNewProjectModal,
    editingDesignerProjectId,
    projectEdit,
    projectEditError,
    projectEditSuccess,
    projectEditState,
    doCreateProject,
    startEditDesignerProject,
    cancelEditDesignerProject,
    queueProjectEditSave,
  }
}