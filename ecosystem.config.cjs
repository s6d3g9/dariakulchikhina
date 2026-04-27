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
    },
    {
      "name": "tenders-ingest",
      "script": "services/tenders-ingest/src/index.ts",
      "interpreter": "node",
      "interpreter_args": "--experimental-strip-types",
      "instances": 1,
      "exec_mode": "fork",
      "max_memory_restart": "512M",
      "kill_timeout": 10000,
      "env": {
        "NODE_ENV": "production",
        "MAIN_APP_URL": "http://localhost:3000",
        "TENDERS_INGEST_HEALTH_PORT": "3035",
        "TENDERS_INGEST_LOG_LEVEL": "info"
      }
    }
  ]
}
