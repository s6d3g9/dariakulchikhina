import { onBeforeUnmount, ref, type Ref } from 'vue'

type InlineAutosaveState = '' | 'saving' | 'saved' | 'error'

type UseContractorCabinetProfileStateOptions = {
  saveProfile: () => Promise<unknown>
  saveMsg: Ref<string>
  toggleArr: (target: string[], value: string) => void
  newCert: Ref<string>
  addCert: () => void
  removeCert: (index: number) => void
}

export function useContractorCabinetProfileState(options: UseContractorCabinetProfileStateOptions) {
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

  function toggleProfileArray(target: string[], value: string) {
    options.toggleArr(target, value)
    queueProfileAutosave()
  }

  function addCertification() {
    const hasValue = !!options.newCert.value.trim()
    options.addCert()
    if (!hasValue) return
    queueProfileAutosave()
  }

  function removeCertification(index: number) {
    options.removeCert(index)
    queueProfileAutosave()
  }

  onBeforeUnmount(() => {
    clearProfileSaveTimer()
  })

  return {
    profileSaveState,
    queueProfileAutosave,
    toggleProfileArray,
    addCertification,
    removeCertification,
  }
}