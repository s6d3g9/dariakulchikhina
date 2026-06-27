import { onBeforeUnmount, ref, type Ref } from 'vue'

type InlineAutosaveState = '' | 'saving' | 'saved' | 'error'

type UseManagerCabinetProfileStateOptions = {
  saveProfile: () => Promise<unknown>
  saveMsg: Ref<string>
}

export function useManagerCabinetProfileState(options: UseManagerCabinetProfileStateOptions) {
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

  onBeforeUnmount(() => {
    clearProfileSaveTimer()
  })

  return {
    profileSaveState,
    queueProfileAutosave,
  }
}