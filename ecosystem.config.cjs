module.exports = {
  "apps": [
    {
      "name": "daria-nuxt",
      "script": ".output/server/index.mjs",
      "instances": 1,
      "exec_mode": "fork",
      "env": {
        "DATABASE_URL": "postgresql://daria:daria_secret_2026@localhost:5433/daria_admin",
        "REDIS_URL": "redis://localhost:6380",
        "NUXT_SESSION_SECRET": "daria2026supersecretkeyatleast32chars!!",
        "DESIGNER_INITIAL_EMAIL": "admin@dariakulchikhina.com",
        "DESIGNER_INITIAL_PASSWORD": "admin123",
        "UPLOAD_DIR": "/opt/daria-nuxt/public/uploads",
        "NODE_ENV": "production",
        "PORT": "3000",
        "HOST": "0.0.0.0"
      }
    }
  ]
}