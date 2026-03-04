# ─────────────────────────────────────────────
# LIZA — runtime-only image (build happens outside via pnpm)
# The .output directory must exist before docker build is called.
# ─────────────────────────────────────────────
FROM node:22-alpine AS runtime

WORKDIR /app

# Copy pre-built Nuxt output
COPY .output ./

# Nuxt SSR server entry
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "server/index.mjs"]
