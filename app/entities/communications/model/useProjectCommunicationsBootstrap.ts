import type { ProjectCommunicationBootstrap } from '~~/shared/types/communications/communications'

export function useProjectCommunicationsBootstrap(projectSlug: MaybeRefOrGetter<string | null | undefined>) {
	const slug = computed(() => toValue(projectSlug)?.trim() || '')
	const state = useFetch<ProjectCommunicationBootstrap>(() => `/api/projects/${slug.value}/communications/bootstrap`, {
		server: false,
		immediate: false,
	})

	watch(slug, async (value) => {
		if (!value) {
			state.clear()
			return
		}

		await state.execute()
	}, { immediate: true })

	return state
}
