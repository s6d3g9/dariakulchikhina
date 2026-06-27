import { onBeforeUnmount, ref, type Ref } from 'vue'

type InlineAutosaveState = '' | 'saving' | 'saved' | 'error'

type UseSellerCabinetProfileStateOptions = {
  saveProfile: () => Promise<unknown>
  saveMsg: Ref<string>
  form: {
    categories: string[]
  }
}

export function useSellerCabinetProfileState(options: UseSellerCabinetProfileStateOptions) {
  const profileSaveState = ref<InlineAutosaveState>('')
  let profileSaveTimer: ReturnType<typeof setTimeout> | null = null

  function clearProfileSaveTimer() {
    if (!profileSaveTimer) return
    clearTimeout(profileSaveTimer)
    profileSaveTimer = null
  }

  function setAutosaveSettled(expected: InlineAutosaveState) {
    setTimeout(() => {
      if (profileSaveState.value === expected) profileSaveState.value = ''
    }, 1400)
  }

  async function autoSaveProfile() {
    clearProfileSaveTimer()
    profileSaveState.value = 'saving'
    try {
      await options.saveProfile()
      profileSaveState.value = 'saved'
      setAutosaveSettled('saved')
    } catch {
      profileSaveState.value = 'error'
    }
  }

  function queueProfileAutosave() {
    clearProfileSaveTimer()
    options.saveMsg.value = ''
    profileSaveTimer = setTimeout(() => {
      autoSaveProfile()
    }, 420)
  }

  function toggleCategory(category: string) {
    const index = options.form.categories.indexOf(category)
    if (index === -1) options.form.categories.push(category)
    else options.form.categories.splice(index, 1)
    queueProfileAutosave()
  }

  onBeforeUnmount(() => {
    clearProfileSaveTimer()
  })

  return {
    profileSaveState,
    queueProfileAutosave,
    toggleCategory,
  }
}