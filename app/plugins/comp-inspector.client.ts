/**
 * Stamps every Vue component's root DOM element with data-comp-name / data-comp-file
 * so the design-panel component inspector can read them in production builds
 * (where __vueParentComponent is not available).
 */
export default defineNuxtPlugin((nuxtApp) => {
  const SKIP = new Set([
    'App', 'Anonymous', 'NuxtPage', 'NuxtLayout', 'NuxtRoot',
    'Transition', 'TransitionGroup', 'KeepAlive', 'Suspense', 'Teleport',
    'RouterView', 'RouterLink', 'NuxtLink',
  ])

  nuxtApp.vueApp.mixin({
    mounted() {
      try {
        const name: string = (this as any).$.type?.__name || (this as any).$.type?.name || ''
        if (!name || SKIP.has(name)) return
        const el: Element | null = (this as any).$el
        if (!el || el.nodeType !== 1) return
        ;(el as HTMLElement).dataset.compName = name
        const file: string = (this as any).$.type?.__file || ''
        if (file) {
          (el as HTMLElement).dataset.compFile = file.replace(/^.*?(app\/.*)$/, '$1')
        }
      } catch (_) { /* non-critical */ }
    },
  })
})
