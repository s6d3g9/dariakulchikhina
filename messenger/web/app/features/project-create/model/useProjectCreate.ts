// Shared-state composable: every caller (trigger widget + dialog) must
// reference the same open/pending/form/error refs. `useState` keyed with a
// stable string gives us that; plain `ref`/`reactive` were scoped per call
// and produced the "click Create → nothing happens" symptom because the
// dialog listened to a different `open` than the trigger mutated.
export function useProjectCreate() {
  const projects = useMessengerProjects()
  const open = useState<boolean>('project-create-open', () => false)
  const pending = useState<boolean>('project-create-pending', () => false)
  const form = useState<{ name: string; description: string }>(
    'project-create-form',
    () => ({ name: '', description: '' }),
  )
  const error = useState<string>('project-create-error', () => '')

  function show() {
    form.value = { name: '', description: '' }
    error.value = ''
    open.value = true
  }

  function hide() {
    open.value = false
  }

  async function submit() {
    if (!form.value.name.trim() || pending.value) return null
    pending.value = true
    error.value = ''
    try {
      const project = await projects.create({
        name: form.value.name.trim(),
        description: form.value.description.trim() || undefined,
      })
      open.value = false
      return project
    }
    catch (e) {
      const msg = (e as Error)?.message || ''
      error.value = msg.includes('400') || msg.includes('INVALID')
        ? 'Некорректное название проекта.'
        : 'Не удалось создать проект. Попробуйте ещё раз.'
      return null
    }
    finally {
      pending.value = false
    }
  }

  return { open, pending, form, error, show, hide, submit }
}
