/**
 * packages/card-types/person-profile/index.ts
 *
 * Reference card-type v6 definition backed by a declarative schema.
 */

import type { CardTypeDefinition, CardTypeView } from '../_registry'
import { personProfileSchema, type ViewMode } from './schemas'

type SchemaSlot = 'view' | 'top' | 'left' | 'right' | 'bottom'

function schemaLoader(view: ViewMode, slot: SchemaSlot) {
  return async () => ({
    schema: personProfileSchema,
    slot,
    view,
  })
}

function cardTypeView(view: ViewMode): CardTypeView {
  return {
    view: schemaLoader(view, 'view'),
    top: schemaLoader(view, 'top'),
    left: schemaLoader(view, 'left'),
    right: schemaLoader(view, 'right'),
    bottom: schemaLoader(view, 'bottom'),
  }
}

const personProfile: CardTypeDefinition = {
  kind: 'person-profile',
  primitives: ['booking', 'reviews', 'messenger'],
  instance: cardTypeView('instance'),
  type: cardTypeView('type'),
  modes: [
    ...personProfileSchema.modes.instance,
    ...personProfileSchema.modes.type,
  ],
}

export default personProfile
