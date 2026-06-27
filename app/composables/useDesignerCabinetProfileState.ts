import { computed, nextTick, onBeforeUnmount, ref, watch, type Ref } from 'vue'

type InlineAutosaveState = '' | 'saving' | 'saved' | 'error'

type DesignerProfileForm = {
  name: string
  companyName: string
  phone: string
  email: string
  telegram: string
  website: string
  city: string
  experience: string
  about: string
  specializations: string[]
}

type UseDesignerCabinetProfileStateOptions = {
  designer: Ref<{ specializations?: string[] | null } | null | undefined>
  designerId: Ref<number>
  form: DesignerProfileForm
  saveProfile: () => Promise<unknown>
  utils: {
    setAutosaveSettled: (state: Ref<InlineAutosaveState>, expected: InlineAutosaveState) => void
  }
}

export function useDesignerCabinetProfileState(options: UseDesignerCabinetProfileStateOptions) {
  const profileSpecDirty = ref(false)
  const profileSaveState = ref<InlineAutosaveState>('')
  const profileSnapshot = ref('')
  let profileSaveTimer: ReturnType<typeof setTimeout> | null = null

  const renderedProfileSpecializations = computed(() => (
    profileSpecDirty.value
      ? options.form.specializations
      : (Array.isArray(options.designer.value?.specializations)
          ? options.designer.value?.specializations
          : options.form.specializations)
  ))

  function clearProfileSaveTimer() {
    if (!profileSaveTimer) return
    clearTimeout(profileSaveTimer)
    profileSaveTimer = null
  }

  function serializeProfileForm() {
    return JSON.stringify({
      name: options.form.name,
      companyName: options.form.companyName,
      phone: options.form.phone,
      email: options.form.email,
      telegram: options.form.telegram,
      website: options.form.website,
      city: options.form.city,
      experience: options.form.experience,
      about: options.form.about,
      specializations: [...options.form.specializations],
    })
  }

  async function autoSaveProfile() {
    clearProfileSaveTimer()
    profileSaveState.value = 'saving'
    try {
      const nextSnapshot = serializeProfileForm()
      await options.saveProfile()
      profileSnapshot.value = nextSnapshot
      profileSaveState.value = 'saved'
      options.utils.setAutosaveSettled(profileSaveState, 'saved')
    } catch {
      profileSaveState.value = 'error'
    }
  }

  function queueProfileAutosave() {
    if (!options.designer.value) return
    const nextSnapshot = serializeProfileForm()
    if (nextSnapshot === profileSnapshot.value) return
    clearProfileSaveTimer()
    profileSaveTimer = setTimeout(() => {
      autoSaveProfile()
    }, 120)
  }

  function toggleSpec(specialization: string) {
    profileSpecDirty.value = true
    const index = options.form.specializations.indexOf(specialization)
    if (index >= 0) options.form.specializations.splice(index, 1)
    else options.form.specializations.push(specialization)
    queueProfileAutosave()
  }

  watch(() => options.designer.value?.specializations, () => {
    profileSpecDirty.value = false
  }, { immediate: true, deep: true })

  watch(options.designerId, async () => {
    clearProfileSaveTimer()
    await nextTick()
    profileSnapshot.value = serializeProfileForm()
    profileSaveState.value = ''
  }, { immediate: true })

  onBeforeUnmount(() => {
    clearProfileSaveTimer()
  })

  return {
    renderedProfileSpecializations,
    profileSaveState,
    toggleSpec,
    queueProfileAutosave,
  }
}
