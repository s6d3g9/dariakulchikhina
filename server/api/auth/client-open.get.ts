// Legacy endpoint — client portal moved to admin preview (?view=client)
export default defineEventHandler((event) => {
  event.node.res.statusCode = 302
  event.node.res.setHeader('Location', '/admin')
  event.node.res.end('')
})
