/**
 * Глобальный режим редактирования контента для администратора.
 * Используется в admin layout и всех компонентах с редактируемыми карточками.
 */
export const useEditMode = () => {
  const editMode = useState<boolean>('admin-edit-mode', () => false)

  function toggleEditMode() {
    editMode.value = !editMode.value
  }

  function enableEditMode() {
    editMode.value = true
  }

  function disableEditMode() {
    editMode.value = false
  }

  return { editMode, toggleEditMode, enableEditMode, disableEditMode }
}
