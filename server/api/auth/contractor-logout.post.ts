export default defineEventHandler((event) => {
  clearContractorSession(event)
  return { ok: true }
})
