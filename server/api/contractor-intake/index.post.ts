import { useDb } from '~/server/db/index'
import { contractorIntakes } from '~/server/db/schema'
import { z } from 'zod'

const IntakeSchema = z.object({
  name:        z.string().min(1),
  companyName: z.string().optional(),
  phone:       z.string().min(6),
  email:       z.string().email().optional().or(z.literal('')),
  workTypes:   z.array(z.string()).optional().default([]),
  city:        z.string().optional(),
  notes:       z.string().optional(),
})

/**
 * Public endpoint — no auth required.
 * A contractor fills in the form on /contractor/apply.
 */
export default defineEventHandler(async (event) => {
  const body = await readValidatedNodeBody(event, IntakeSchema)
  const db = useDb()

  const [row] = await db.insert(contractorIntakes).values({
    name:        body.name,
    companyName: body.companyName ?? null,
    phone:       body.phone,
    email:       body.email || null,
    workTypes:   body.workTypes,
    city:        body.city ?? null,
    notes:       body.notes ?? null,
    status:      'new',
  }).returning()

  return { ok: true, id: row.id }
})
