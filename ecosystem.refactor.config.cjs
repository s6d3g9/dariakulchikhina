module.exports = {
  apps: [
    {
      name: process.env.APP_NAME || 'daria-nuxt-refactor',
      script: '.output/server/index.mjs',
      instances: 1,
      exec_mode: 'fork',
      env: {
        DATABASE_URL: process.env.DATABASE_URL || 'postgresql://daria:daria_secret_2026@localhost:5433/daria_admin_refactor',
        REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6380/1',
        NUXT_SESSION_SECRET: process.env.NUXT_SESSION_SECRET || 'refactor-session-secret-change-me-2026',
        DESIGNER_INITIAL_EMAIL: process.env.DESIGNER_INITIAL_EMAIL || 'admin@dariakulchikhina.com',
        DESIGNER_INITIAL_PASSWORD: process.env.DESIGNER_INITIAL_PASSWORD || 'admin123',
        UPLOAD_DIR: process.env.UPLOAD_DIR || '/opt/daria-nuxt-refactor/public/uploads',
        NODE_ENV: process.env.NODE_ENV || 'production',
        PORT: process.env.PORT || '3018',
        HOST: process.env.HOST || '0.0.0.0',
      },
    },
  ],
}