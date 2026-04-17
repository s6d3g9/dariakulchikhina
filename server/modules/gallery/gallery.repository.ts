import { eq, asc, and, ilike, arrayContains } from 'drizzle-orm'
import { useDb } from '~/server/db/index'
import { galleryItems } from '~/server/db/schema'

export async function findGalleryItemById(id: number) {
  const db = useDb()
  const [item] = await db.select().from(galleryItems).where(eq(galleryItems.id, id)).limit(1)
  return item ?? null
}

export async function listGalleryItems(opts: {
  category?: string
  tag?: string
  featured?: string
  search?: string
} = {}) {
  const db = useDb()

  const conditions = []
  if (opts.category) conditions.push(eq(galleryItems.category, opts.category))
  if (opts.tag) conditions.push(arrayContains(galleryItems.tags, [opts.tag]))
  if (opts.featured === 'true') conditions.push(eq(galleryItems.featured, true))
  if (opts.search) {
    const escaped = opts.search.replace(/[%_\\]/g, (ch) => `\\${ch}`)
    conditions.push(ilike(galleryItems.title, `%${escaped}%`))
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  return db
    .select()
    .from(galleryItems)
    .where(where)
    .orderBy(asc(galleryItems.sortOrder), asc(galleryItems.createdAt))
}

export async function insertGalleryItem(values: {
  title: string
  category: string
  image: string | null
  images: string[]
  tags: string[]
  description: string | null
  featured: boolean
  width: number | null
  height: number | null
  sortOrder: number
  properties: Record<string, unknown>
}) {
  const db = useDb()
  const [row] = await db.insert(galleryItems).values(values).returning()
  return row
}

export async function updateGalleryItemRow(id: number, setData: Record<string, unknown>) {
  const db = useDb()
  const [row] = await db
    .update(galleryItems)
    .set(setData)
    .where(eq(galleryItems.id, id))
    .returning()
  return row ?? null
}

export async function deleteGalleryItemRow(id: number) {
  const db = useDb()
  const [item] = await db
    .select()
    .from(galleryItems)
    .where(eq(galleryItems.id, id))
    .limit(1)
  if (!item) return null
  await db.delete(galleryItems).where(eq(galleryItems.id, id))
  return item
}

export async function reorderGalleryItemsRows(
  items: Array<{ id: number; sortOrder: number }>,
) {
  const db = useDb()
  await db.transaction(async (tx) => {
    for (const item of items) {
      await tx
        .update(galleryItems)
        .set({ sortOrder: item.sortOrder })
        .where(eq(galleryItems.id, item.id))
    }
  })
}
