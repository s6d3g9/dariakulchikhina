/**
 * app/composables/useUpload.ts
 * Composable для загрузки файлов на сервер.
 * Заменяет 5+ дублей FormData + $fetch('/api/upload') в компонентах.
 * Имя useUpload (не useFileUpload) — во избежание конфликта с @nuxt/ui.
 */

export function useUpload() {
  const uploading = ref(false)
  const uploadError = ref('')

  async function upload(file: File): Promise<string | null> {
    uploading.value = true
    uploadError.value = ''
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await $fetch<{ filename: string }>('/api/upload', {
        method: 'POST',
        body: fd,
      })
      return res.filename
    } catch (e: any) {
      uploadError.value = e?.data?.message || e?.message || 'Ошибка загрузки'
      return null
    } finally {
      uploading.value = false
    }
  }

  async function uploadMultiple(files: FileList | File[]): Promise<string[]> {
    const results: string[] = []
    for (const file of Array.from(files)) {
      const filename = await upload(file)
      if (filename) results.push(filename)
    }
    return results
  }

  return { uploading, uploadError, upload, uploadMultiple }
}
