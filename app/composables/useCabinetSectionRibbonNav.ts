import { computed, watch, type Ref } from 'vue'

type UseCabinetSectionRibbonNavOptions = {
  contentViewMode: Ref<string>
  section: Ref<string>
  viewportRef: Ref<HTMLElement | null>
}

export function useCabinetSectionRibbonNav(options: UseCabinetSectionRibbonNavOptions) {
  const isWipe2Mode = computed(() => options.contentViewMode.value === 'wipe2')
  const showAll = computed(() => !isWipe2Mode.value)

  function scrollToSection(key: string) {
    if (typeof document === 'undefined') return
    const viewport = options.viewportRef.value
    const root = viewport ?? document.body
    const element = root.querySelector<HTMLElement>(`.cab-section[data-section="${key}"]`)
    if (!element) return
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function scheduleSectionScroll(key: string) {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => scrollToSection(key))
      return
    }
    scrollToSection(key)
  }

  function onNavClick(key: string) {
    options.section.value = key
    if (showAll.value) scheduleSectionScroll(key)
  }

  watch(options.section, (key) => {
    if (!showAll.value) return
    scheduleSectionScroll(key)
  }, { flush: 'post' })

  return {
    isWipe2Mode,
    showAll,
    onNavClick,
  }
}