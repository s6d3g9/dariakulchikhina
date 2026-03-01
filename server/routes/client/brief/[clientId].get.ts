export default defineEventHandler(async (event) => {
  await sendRedirect(event, '/client/login', 302)
})
