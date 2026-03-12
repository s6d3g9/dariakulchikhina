import type { RouterConfig } from '@nuxt/schema'

export default <RouterConfig>{
  scrollBehavior(to: any, from: any, savedPosition: any) {
    if (savedPosition) return savedPosition
    return { top: 0, behavior: 'instant' }
  },
}
