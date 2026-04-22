import { pgTable, uuid, text, integer, timestamp, index, customType } from 'drizzle-orm/pg-core'
import { messengerProjects } from './messenger-projects.ts'

const tstz = (name: string) => timestamp(name, { withTimezone: true })

const vector768 = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(768)'
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`
  },
  fromDriver(value: string): number[] {
    return JSON.parse(value) as number[]
  },
})

export const messengerProjectKnowledgeChunks = pgTable(
  'messenger_project_knowledge_chunks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => messengerProjects.id, { onDelete: 'cascade' }),
    sourceId: uuid('source_id').notNull(),
    sourceUri: text('source_uri').notNull(),
    chunkIndex: integer('chunk_index').notNull(),
    chunkText: text('chunk_text').notNull(),
    embedding: vector768('embedding').notNull(),
    tokenCount: integer('token_count').notNull().default(0),
    createdAt: tstz('created_at').defaultNow().notNull(),
    version: integer('version').default(1).notNull(),
  },
  (t) => [
    index('messenger_project_knowledge_chunks_project_source_idx').on(t.projectId, t.sourceId),
  ],
)
