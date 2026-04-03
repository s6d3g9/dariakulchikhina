import { setResponseStatus } from 'h3'

import { applyMessengerCors } from '~/server/utils/messenger-cors'

export default defineEventHandler((event) => {
  applyMessengerCors(event, { methods: ['POST', 'OPTIONS'] })
  setResponseStatus(event, 204)
  return ''
})