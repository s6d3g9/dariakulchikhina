/**
 * Pure formatters shared by the designer-cabinet sections. No reactive
 * state — safe to import from any sub-component.
 */

/**
 * Russian noun pluralization for "проект" — used in pivot-banner count
 * badges (e.g. "3 проекта", "5 проектов").
 */
export function pluralProjects(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return 'проект'
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'проекта'
  return 'проектов'
}
