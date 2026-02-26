import { useDb } from '~/server/db/index'
import { pageConfigs } from '~/server/db/schema'

const DEFAULT_PAGES = [
  { slug: 'materials', title: 'материалы', pageTitle: '', fontSize: 16, sortOrder: 0 },
  { slug: 'tz', title: 'техническое задание', pageTitle: '', fontSize: 16, sortOrder: 1 },
  { slug: 'profile_customer', title: 'профиль клиента', pageTitle: 'Профиль клиента', fontSize: 16, sortOrder: 2 },
  { slug: 'profile_contractors', title: 'профиль подрядчиков', pageTitle: 'Профиль подрядчиков', fontSize: 16, sortOrder: 3 },
  { slug: 'work_status', title: 'статусы работ', pageTitle: 'Статусы работ', fontSize: 16, sortOrder: 4 },
  { slug: 'project_roadmap', title: 'дорожная карта', pageTitle: 'Дорожная карта проекта', fontSize: 16, sortOrder: 5 },
]

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = useDb()
  let rows = await db.select().from(pageConfigs).orderBy(pageConfigs.sortOrder, pageConfigs.id)

  if (rows.length === 0) {
    await db.insert(pageConfigs).values(DEFAULT_PAGES)
    rows = await db.select().from(pageConfigs).orderBy(pageConfigs.sortOrder, pageConfigs.id)
  }

  return rows
})
