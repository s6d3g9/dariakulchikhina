import type { DesignTokens } from '~/composables/useDesignSystem'

/* ── Option lists ────────────────────────────────── */
export const btnStyles = [
  { id: 'filled'  as const, label: 'залитый' },
  { id: 'outline' as const, label: 'контур' },
  { id: 'ghost'   as const, label: 'призрак' },
  { id: 'soft'    as const, label: 'мягкий' },
]
export const btnSizes = [
  { id: 'xs' as const, label: 'XS' },
  { id: 'sm' as const, label: 'S' },
  { id: 'md' as const, label: 'M' },
  { id: 'lg' as const, label: 'L' },
]
export const textTransforms = [
  { id: 'none'       as const, label: 'обычный' },
  { id: 'uppercase'  as const, label: 'ВЕРХНИЙ' },
  { id: 'capitalize' as const, label: 'С Заглавной' },
]
export const btnHoverAnims = [
  { id: 'none'  as const, label: 'нет' },
  { id: 'ripple'  as const, label: 'm3 ripple' },
  { id: 'lift'  as const, label: 'парение' },
  { id: 'scale' as const, label: 'масштаб' },
  { id: 'glow'  as const, label: 'свечение' },
  { id: 'fill'  as const, label: 'заливка' },
  { id: 'sheen' as const, label: 'блик' },
  { id: 'pulse' as const, label: 'импульс' },
  { id: 'shutter' as const, label: 'шторки' },
  { id: 'magnet' as const, label: 'магнит' },
  { id: 'scan' as const, label: 'скан' },
]
export const cardHoverAnims = [
  { id: 'none'   as const, label: 'нет' },
  { id: 'lift'   as const, label: 'парение' },
  { id: 'scale'  as const, label: 'масштаб' },
  { id: 'dim'    as const, label: 'затемнение' },
  { id: 'border' as const, label: 'рамка' },
  { id: 'reveal' as const, label: 'открытие' },
]
export const archDensities = [
  { id: 'dense'  as const, label: 'плотно' },
  { id: 'normal' as const, label: 'норма' },
  { id: 'airy'   as const, label: 'просторно' },
  { id: 'grand'  as const, label: 'гранд' },
]
export const archHeadingCases = [
  { id: 'none'       as const, label: 'обычный' },
  { id: 'uppercase'  as const, label: 'КАПС' },
  { id: 'lowercase'  as const, label: 'строчные' },
  { id: 'capitalize' as const, label: 'С Заглавной' },
]
export const archDividers = [
  { id: 'none'     as const, label: 'нет' },
  { id: 'line'     as const, label: 'линия' },
  { id: 'gradient' as const, label: 'градиент' },
]
export const archPageEnters = [
  { id: 'none'     as const, label: 'нет' },
  { id: 'fade'     as const, label: 'плавно' },
  { id: 'scale-fade' as const, label: 'scale fade' },
  { id: 'zoom'     as const, label: 'масштаб' },
  { id: 'blur'     as const, label: 'размытие' },
  { id: 'flip'     as const, label: 'переворот' },
  { id: 'slide-r'  as const, label: '→ слайд' },
  { id: 'slide-l'  as const, label: '← слайд' },
  { id: 'slide-t'  as const, label: '↑ слайд' },
  { id: 'slide-b'  as const, label: '↓ слайд' },
  { id: 'drift-r'  as const, label: '→ дрейф' },
  { id: 'drift-l'  as const, label: '← дрейф' },
  { id: 'clip-x'   as const, label: 'клип x' },
  { id: 'clip-y'   as const, label: 'клип y' },
  { id: 'skew'     as const, label: 'скос' },
  { id: 'curtain'  as const, label: 'занавес ↓' },
  { id: 'curtain-b' as const, label: 'занавес ↑' },
]
export const archLinkAnims = [
  { id: 'none'      as const, label: 'нет' },
  { id: 'underline' as const, label: 'подчёркивание' },
  { id: 'arrow'     as const, label: 'стрелка' },
]
export const contentViewModes = [
  { id: 'scroll' as const, label: 'скролл', description: 'Непрерывная прокрутка как сейчас.' },
  { id: 'paged' as const, label: 'экраны', description: 'Листание контента по высоте видимой зоны.' },
  { id: 'flow' as const, label: 'поток', description: 'Экранное листание и переход к следующему пункту активного меню.' },
  { id: 'wipe' as const, label: 'wipe', description: 'Фиксированное окно и последовательное открытие частей контента через вайп-переход.' },
  { id: 'wipe2' as const, label: 'wipe 2', description: 'Алгоритм 2×8: данные компонента превращаются в карточки по 16 полей.' },
]
export const wipeTransitions = [
  { id: 'slide' as const, label: 'шторка' },
  { id: 'fade' as const, label: 'затухание' },
  { id: 'curtain' as const, label: 'занавес' },
  { id: 'blur' as const, label: 'размытие' },
]
export const archSectionStyles = [
  { id: 'flat'    as const, label: 'плоский' },
  { id: 'card'    as const, label: 'карточки' },
  { id: 'striped' as const, label: 'полосы' },
]
export const archNavStyles = [
  { id: 'full'    as const, label: 'полный' },
  { id: 'minimal' as const, label: 'минимальный' },
  { id: 'hidden'  as const, label: 'скрытый' },
]
export const archCardChromes = [
  { id: 'visible' as const, label: 'видимый' },
  { id: 'subtle'  as const, label: 'тонкий' },
  { id: 'ghost'   as const, label: 'призрак' },
]
export const archHeroScales = [
  { id: 'compact'    as const, label: 'компактный' },
  { id: 'normal'     as const, label: 'нормальный' },
  { id: 'large'      as const, label: 'крупный' },
  { id: 'cinematic'  as const, label: 'кинематограф' },
]
export const archContentReveals = [
  { id: 'none'     as const, label: 'нет' },
  { id: 'fade-up'  as const, label: 'плавный подъём' },
  { id: 'fade'     as const, label: 'плавно' },
  { id: 'slide-up' as const, label: 'подъём' },
  { id: 'blur'     as const, label: 'размытие' },
]
export const archTextReveals = [
  { id: 'none'        as const, label: 'нет' },
  { id: 'clip'        as const, label: 'обрезка' },
  { id: 'blur-in'     as const, label: 'из размытия' },
  { id: 'letter-fade' as const, label: 'побуквенно' },
]
export const archNavTransitions = [
  { id: 'none'  as const, label: 'нет' },
  { id: 'fade'  as const, label: 'плавно' },
  { id: 'slide' as const, label: 'слайд' },
  { id: 'push'  as const, label: 'вытеснение' },
  { id: 'stack' as const, label: 'слои' },
  { id: 'blur'  as const, label: 'размытие' },
]
export const archTransitionPresets = [
  {
    id: 'instant' as const,
    label: 'мгновенно',
    description: 'Без анимации для рабочих режимов и быстрых переключений.',
    tokens: {
      archPageEnter: 'none' as const,
      pageTransitDuration: 0,
      archNavTransition: 'none' as const,
      navTransitDuration: 0,
      archContentReveal: 'none' as const,
      archTextReveal: 'none' as const,
    },
  },
  {
    id: 'calm' as const,
    label: 'спокойно',
    description: 'Нейтральный fade для повседневной админки.',
    tokens: {
      archPageEnter: 'fade' as const,
      pageTransitDuration: 280,
      archNavTransition: 'slide' as const,
      navTransitDuration: 220,
      archContentReveal: 'fade-up' as const,
      archTextReveal: 'none' as const,
    },
  },
  {
    id: 'editorial' as const,
    label: 'редакция',
    description: 'Медленнее, со сдвигом и более длинным ритмом.',
    tokens: {
      archPageEnter: 'slide-l' as const,
      pageTransitDuration: 760,
      archNavTransition: 'push' as const,
      navTransitDuration: 320,
      archContentReveal: 'fade' as const,
      archTextReveal: 'clip' as const,
    },
  },
  {
    id: 'spatial' as const,
    label: 'пространство',
    description: 'Масштаб и дрейф для более объёмной смены сцен.',
    tokens: {
      archPageEnter: 'drift-r' as const,
      pageTransitDuration: 1100,
      archNavTransition: 'stack' as const,
      navTransitDuration: 380,
      archContentReveal: 'blur' as const,
      archTextReveal: 'blur-in' as const,
    },
  },
  {
    id: 'cinematic' as const,
    label: 'кино',
    description: 'Большой занавес и длинный драматический тайминг.',
    tokens: {
      archPageEnter: 'curtain' as const,
      pageTransitDuration: 1800,
      archNavTransition: 'stack' as const,
      navTransitDuration: 420,
      archContentReveal: 'fade-up' as const,
      archTextReveal: 'letter-fade' as const,
    },
  },
]
export const contentLayoutPresets = [
  { id: 'balanced' as const, label: 'баланс', description: 'Универсальная двухколоночная раскладка с ровным ритмом.' },
  { id: 'registry' as const, label: 'реестр', description: 'Плотная матрица для таблиц, статусов и списков.' },
  { id: 'matrix' as const, label: 'матрица', description: 'Равномерная сетка для модульных карточек и обзорных экранов.' },
  { id: 'editorial' as const, label: 'редакция', description: 'Шире контейнер, меньше карточного хрома, больше воздуха.' },
  { id: 'studio' as const, label: 'студия', description: 'Широкая рабочая сцена для проектных разворотов и мудбордов.' },
  { id: 'dashboard' as const, label: 'дашборд', description: 'Более плотная сетка с компактными аналитическими карточками.' },
  { id: 'showcase' as const, label: 'витрина', description: 'Крупные hero-карточки и широкий межсекционный ритм.' },
  { id: 'storyboard' as const, label: 'сториборд', description: 'Крупные блоки и длинный ритм для презентационных страниц.' },
]
export const contentCardPresets = [
  { id: 'flat' as const, label: 'плоские', description: 'Строгие карточки без лишнего объёма.' },
  { id: 'soft' as const, label: 'мягкие', description: 'Скруглённые блоки с мягкой тенью.' },
  { id: 'glass' as const, label: 'стекло', description: 'Полупрозрачные карточки с живой кромкой.' },
  { id: 'brutal' as const, label: 'брутализм', description: 'Контрастные панели с жёсткой рамкой.' },
]
export const contentScenePresets = [
  { id: 'workbench' as const, label: 'workbench', description: 'Рабочая сцена: ровная сетка и строгие панели.' },
  { id: 'registry' as const, label: 'registry', description: 'Операционный реестр для документов, задач и контроллинга.' },
  { id: 'magazine' as const, label: 'magazine', description: 'Редакционный разворот с мягкими крупными блоками.' },
  { id: 'atelier' as const, label: 'atelier', description: 'Студийная сцена для концептов, коллажей и презентаций.' },
  { id: 'ops' as const, label: 'ops', description: 'Плотная операционная панель для аналитики и статусов.' },
  { id: 'gallery' as const, label: 'gallery', description: 'Витринная сцена с воздухом и стеклянными карточками.' },
  { id: 'cinematic' as const, label: 'cinematic', description: 'Медленная презентационная сцена с драматичными переходами.' },
]
export const contentLayoutRecipes: Record<(typeof contentLayoutPresets)[number]['id'], Partial<DesignTokens>> = {
  balanced: {
    containerWidth: 1180,
    gridColumns: 12,
    gridGap: 16,
    archDensity: 'normal',
    archVerticalRhythm: 1,
    archSectionStyle: 'flat',
    archCardChrome: 'visible',
  },
  registry: {
    containerWidth: 1160,
    gridColumns: 12,
    gridGap: 10,
    archDensity: 'dense',
    archVerticalRhythm: 0.75,
    archSectionStyle: 'card',
    archCardChrome: 'visible',
  },
  matrix: {
    containerWidth: 1260,
    gridColumns: 12,
    gridGap: 18,
    archDensity: 'normal',
    archVerticalRhythm: 1.1,
    archSectionStyle: 'card',
    archCardChrome: 'subtle',
  },
  editorial: {
    containerWidth: 1320,
    gridColumns: 10,
    gridGap: 24,
    archDensity: 'airy',
    archVerticalRhythm: 1.5,
    archSectionStyle: 'flat',
    archCardChrome: 'ghost',
  },
  studio: {
    containerWidth: 1360,
    gridColumns: 9,
    gridGap: 26,
    archDensity: 'airy',
    archVerticalRhythm: 1.7,
    archSectionStyle: 'flat',
    archCardChrome: 'subtle',
  },
  dashboard: {
    containerWidth: 1240,
    gridColumns: 12,
    gridGap: 12,
    archDensity: 'dense',
    archVerticalRhythm: 0.8,
    archSectionStyle: 'card',
    archCardChrome: 'visible',
  },
  showcase: {
    containerWidth: 1380,
    gridColumns: 8,
    gridGap: 28,
    archDensity: 'grand',
    archVerticalRhythm: 1.8,
    archSectionStyle: 'striped',
    archCardChrome: 'subtle',
  },
  storyboard: {
    containerWidth: 1400,
    gridColumns: 6,
    gridGap: 30,
    archDensity: 'grand',
    archVerticalRhythm: 2,
    archSectionStyle: 'striped',
    archCardChrome: 'ghost',
  },
}
export const contentCardRecipes: Record<(typeof contentCardPresets)[number]['id'], Partial<DesignTokens>> = {
  flat: {
    cardRadius: 0,
    borderWidth: 1,
    glassOpacity: 0.96,
    glassBorderOpacity: 0.08,
    shadowOffsetY: 0,
    shadowBlurRadius: 0,
    shadowOpacity: 0,
    archCardChrome: 'visible',
    cardHoverAnim: 'border',
  },
  soft: {
    cardRadius: 18,
    borderWidth: 0,
    glassOpacity: 0.84,
    glassBorderOpacity: 0.03,
    shadowOffsetY: 10,
    shadowBlurRadius: 24,
    shadowOpacity: 0.1,
    archCardChrome: 'subtle',
    cardHoverAnim: 'lift',
  },
  glass: {
    cardRadius: 24,
    borderWidth: 1,
    glassBlur: 32,
    glassSaturation: 200,
    glassOpacity: 0.25,
    glassBorderOpacity: 0.35,
    shadowOffsetY: 12,
    shadowBlurRadius: 32,
    shadowOpacity: 0.15,
    archCardChrome: 'visible',
    cardHoverAnim: 'reveal',
  },
  brutal: {
    cardRadius: 0,
    borderWidth: 2,
    glassBlur: 0,
    glassOpacity: 0.98,
    glassBorderOpacity: 0.22,
    shadowOffsetY: 0,
    shadowBlurRadius: 0,
    shadowOpacity: 0,
    archCardChrome: 'visible',
    cardHoverAnim: 'border',
  },
}
export const contentSceneRecipes: Record<(typeof contentScenePresets)[number]['id'], {
  layout: (typeof contentLayoutPresets)[number]['id']
  card: (typeof contentCardPresets)[number]['id']
  nav: DesignTokens['navLayoutPreset']
  pageEnter: DesignTokens['archPageEnter']
  pageDuration: number
  navTransition: DesignTokens['archNavTransition']
  navDuration: number
  extras?: Partial<DesignTokens>
}> = {
  workbench: {
    layout: 'balanced',
    card: 'flat',
    nav: 'balanced',
    pageEnter: 'fade',
    pageDuration: 260,
    navTransition: 'slide',
    navDuration: 220,
    extras: {
      archContentReveal: 'fade-up',
      btnHoverAnim: 'fill',
    },
  },
  registry: {
    layout: 'registry',
    card: 'flat',
    nav: 'compact',
    pageEnter: 'none',
    pageDuration: 0,
    navTransition: 'fade',
    navDuration: 160,
    extras: {
      archContentReveal: 'none',
      archTextReveal: 'none',
      btnHoverAnim: 'shutter',
    },
  },
  magazine: {
    layout: 'editorial',
    card: 'soft',
    nav: 'showcase',
    pageEnter: 'slide-l',
    pageDuration: 760,
    navTransition: 'push',
    navDuration: 320,
    extras: {
      archContentReveal: 'fade',
      archTextReveal: 'clip',
      btnHoverAnim: 'magnet',
    },
  },
  atelier: {
    layout: 'studio',
    card: 'glass',
    nav: 'rail',
    pageEnter: 'drift-r',
    pageDuration: 980,
    navTransition: 'blur',
    navDuration: 360,
    extras: {
      archContentReveal: 'blur',
      archTextReveal: 'blur-in',
      btnHoverAnim: 'sheen',
    },
  },
  ops: {
    layout: 'dashboard',
    card: 'brutal',
    nav: 'compact',
    pageEnter: 'none',
    pageDuration: 0,
    navTransition: 'none',
    navDuration: 0,
    extras: {
      archContentReveal: 'none',
      archTextReveal: 'none',
    },
  },
  gallery: {
    layout: 'showcase',
    card: 'glass',
    nav: 'rail',
    pageEnter: 'zoom',
    pageDuration: 860,
    navTransition: 'blur',
    navDuration: 340,
    extras: {
      archContentReveal: 'blur',
      archTextReveal: 'blur-in',
      btnHoverAnim: 'pulse',
    },
  },
  cinematic: {
    layout: 'storyboard',
    card: 'soft',
    nav: 'showcase',
    pageEnter: 'curtain',
    pageDuration: 1800,
    navTransition: 'stack',
    navDuration: 420,
    extras: {
      archContentReveal: 'fade-up',
      archTextReveal: 'letter-fade',
      btnHoverAnim: 'scan',
    },
  },
}
export const navLayoutPresets = [
  { id: 'compact' as const, label: 'компактно', description: 'Плотная и быстрая вертикаль для длинных деревьев.' },
  { id: 'balanced' as const, label: 'баланс', description: 'Нейтральная раскладка для повседневной работы.' },
  { id: 'showcase' as const, label: 'витрина', description: 'Больше воздуха, крупнее блоки и выраженный ритм.' },
  { id: 'rail' as const, label: 'рейл', description: 'Собранная колонка с акцентом на компактную навигацию.' },
]
export const navLayoutRecipes: Record<DesignTokens['navLayoutPreset'], Partial<DesignTokens>> = {
  compact: {
    navLayoutPreset: 'compact',
    sidebarWidth: 232,
    navItemPaddingH: 10,
    navItemPaddingV: 7,
    navPanelGap: 6,
    navListGap: 1,
    navItemRadius: 6,
    navTransitDistance: 12,
    navItemStagger: 6,
  },
  balanced: {
    navLayoutPreset: 'balanced',
    sidebarWidth: 260,
    navItemPaddingH: 16,
    navItemPaddingV: 12,
    navPanelGap: 8,
    navListGap: 2,
    navItemRadius: 0,
    navTransitDistance: 18,
    navItemStagger: 12,
  },
  showcase: {
    navLayoutPreset: 'showcase',
    sidebarWidth: 304,
    navItemPaddingH: 18,
    navItemPaddingV: 15,
    navPanelGap: 14,
    navListGap: 7,
    navItemRadius: 14,
    navTransitDistance: 24,
    navItemStagger: 18,
  },
  rail: {
    navLayoutPreset: 'rail',
    sidebarWidth: 216,
    navItemPaddingH: 12,
    navItemPaddingV: 10,
    navPanelGap: 10,
    navListGap: 6,
    navItemRadius: 999,
    navTransitDistance: 14,
    navItemStagger: 10,
  },
}
export const BORDER_STYLE_OPTIONS = [
  { id: 'solid' as const, label: 'solid' },
  { id: 'dashed' as const, label: 'dashed' },
  { id: 'none' as const, label: 'none' },
]

