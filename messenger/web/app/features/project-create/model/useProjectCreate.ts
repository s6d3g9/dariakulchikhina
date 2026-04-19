export function useProjectCreate() {
  const projects = useMessengerProjects()
  const open = ref(false)
  const pending = ref(false)
  const form = reactive({ name: '', description: '' })
  const error = ref('')

  function show() {
    form.name = ''
    form.description = ''
    error.value = ''
    open.value = true
  }

  function hide() {
    open.value = false
  }

  async function submit() {
    if (!form.name.trim() || pending.value) return null
    pending.value = true
    error.value = ''
    try {
      const project = await projects.create({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
      })
      open.value = false
      return project
    }
    catch {
      error.value = 'Не удалось создать проект. Попробуйте ещё раз.'
      return null
    }
    finally {
      pending.value = false
    }
  }

  return { open, pending, form, error, show, hide, submit }
}
