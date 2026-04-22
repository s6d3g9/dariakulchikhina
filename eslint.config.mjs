// Flat ESLint config for Daria Design Studio monorepo.
//
// Scope:
//   - Architectural invariants (v5.3): runtime isolation, DDD layering,
//     FSD direction, shared/ purity. Enforced via no-restricted-imports.
//   - Code-quality budgets: file/function size, complexity. Warn-level
//     so existing monoliths are flagged but do not block commits yet.
//   - LLM-friendly authorship: no-default-export for .ts files outside
//     Nuxt plumbing; promotes stable named imports.
//
// Not in scope (on purpose):
//   - Stylistic rules (formatting). Use Prettier or a dedicated formatter.
//   - Per-file Drizzle usage audits — we rely on module/api separation.
//
// Upgrade path: once the v5 refactor catches up, flip size/complexity
// rules from "warn" to "error" in the Governance block at the bottom.

import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import vue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'
import globals from 'globals'

const CROSS_RUNTIME_MSG =
  'Cross-runtime import detected. Isolated runtimes may only depend on `shared/**`. See docs/architecture-v5/02-monorepo-structure.md and 05-architectural-patterns.md §5.9.'

const SHARED_PURITY_MSG =
  '`shared/**` is the contract layer and must not depend on any runtime (app/, server/, messenger/, services/) or DB driver.'

const API_THICKNESS_MSG =
  '`server/api/**` handlers must be thin. Put DB/Drizzle access behind `server/modules/<domain>/`.'

const FSD_UPWARD_MSG =
  'FSD direction violation. Imports flow pages → widgets → features → entities → shared/core. Never the reverse.'

export default tseslint.config(
  {
    ignores: [
      '.nuxt/**',
      '.output/**',
      'dist/**',
      'node_modules/**',
      'drizzle/**',
      'builds/**',
      'public/**',
      'cityfarm/**',
      'messenger/web/.nuxt/**',
      'messenger/web/.output/**',
      'messenger/core/dist/**',
      '.claude/worktrees/**',
      '**/*.d.ts',
      // Legacy one-off scripts at repo root
      'tmp_*',
      'patch_*',
      'fix.js',
      'temp_fix.js',
      'test.js',
      'rewrite_theme.js',
      'server.d.ts',
    ],
  },

  // Base JS rules
  js.configs.recommended,

  // TypeScript rules (non-type-checked for speed; upgrade to type-checked
  // once we fix the existing error backlog).
  ...tseslint.configs.recommended,

  // Vue 3 + <script setup>
  ...vue.configs['flat/recommended'],

  {
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
      },
      globals: {
        ...globals.node,
        ...globals.browser,
        defineNuxtConfig: 'readonly',
        defineNuxtPlugin: 'readonly',
        defineNuxtRouteMiddleware: 'readonly',
        defineEventHandler: 'readonly',
        defineNitroPlugin: 'readonly',
        defineCachedEventHandler: 'readonly',
        navigateTo: 'readonly',
        useRoute: 'readonly',
        useRouter: 'readonly',
        useState: 'readonly',
        useFetch: 'readonly',
        useAsyncData: 'readonly',
        useRuntimeConfig: 'readonly',
        useCookie: 'readonly',
        useHead: 'readonly',
        useSeoMeta: 'readonly',
        useNuxtApp: 'readonly',
        $fetch: 'readonly',
        computed: 'readonly',
        ref: 'readonly',
        reactive: 'readonly',
        watch: 'readonly',
        watchEffect: 'readonly',
        onMounted: 'readonly',
        onUnmounted: 'readonly',
        onBeforeMount: 'readonly',
        onBeforeUnmount: 'readonly',
        nextTick: 'readonly',
        definePageMeta: 'readonly',
        defineProps: 'readonly',
        defineEmits: 'readonly',
        defineExpose: 'readonly',
        defineModel: 'readonly',
        defineSlots: 'readonly',
        withDefaults: 'readonly',
      },
    },
  },

  // Vue SFC parser
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: 'latest',
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
      },
    },
    rules: {
      // Component names relaxed — project uses mixed conventions; revisit later.
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'warn',
    },
  },

  // ----------------------------------------------------------------
  // Governance / code-quality budgets (WARN during stabilization).
  // Flip to "error" once the refactor has landed the biggest monoliths.
  // ----------------------------------------------------------------
  {
    rules: {
      'max-lines': [
        'warn',
        { max: 500, skipBlankLines: true, skipComments: true },
      ],
      'max-lines-per-function': [
        'warn',
        { max: 120, skipBlankLines: true, skipComments: true, IIFEs: true },
      ],
      complexity: ['warn', { max: 15 }],
      'max-depth': ['warn', { max: 4 }],
      'max-params': ['warn', { max: 5 }],

      // LLM-friendly authorship: ban default exports in regular .ts files.
      // Default exports erase the symbol name at the import site, which
      // breaks reference-by-name tooling (agents, IDE go-to). Nuxt/Nitro
      // plumbing (middleware, plugins, api routes, pages, layouts, vue
      // SFCs, config files, scripts) is excluded via the overrides block
      // below — those paths REQUIRE default export to satisfy framework
      // contracts.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportDefaultDeclaration',
          message:
            'Default exports are reserved for Nuxt/Nitro plumbing and Vue SFCs. Use a named export here (see docs/architecture-v5/17-coding-standards.md §17.7.1).',
        },
        {
          // Ban `process.env.X` reads outside the central config module.
          // See docs/architecture-v5/20-config-and-logging.md §1.
          selector:
            "MemberExpression[object.type='MemberExpression'][object.object.name='process'][object.property.name='env']",
          message:
            'Read environment variables through `config` from `~/server/config`, not `process.env` directly. This keeps fail-fast validation centralized. See docs/architecture-v5/20-config-and-logging.md §1.',
        },
      ],

      // TypeScript sanity
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/ban-ts-comment': [
        'warn',
        { 'ts-ignore': 'allow-with-description' },
      ],

      // Nitro/Nuxt ergonomics
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-case-declarations': 'warn',
      'no-useless-escape': 'warn',
      'prefer-const': 'warn',

      // Noisy rules disabled during stabilization
      'no-useless-assignment': 'off',
      'no-undef': 'off',           // TS / Nuxt auto-imports handle this
      'no-unused-vars': 'off',     // superseded by @typescript-eslint/no-unused-vars
      '@typescript-eslint/no-require-imports': 'off', // legacy scripts use CJS require

      // Vue-specific
      'vue/no-mutating-props': 'warn',
      'vue/require-default-prop': 'off',
    },
  },

  // ----------------------------------------------------------------
  // Architectural invariants (ERROR — these should never regress).
  // ----------------------------------------------------------------

  // shared/** — no runtime or driver dependencies
  {
    files: ['shared/**/*.{ts,js,mjs}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/app/**',
                '**/server/**',
                '**/messenger/**',
                '**/services/**',
                '~/app/**',
                '~/server/**',
                '~/messenger/**',
                '~/services/**',
                'postgres',
                'drizzle-orm',
                'drizzle-orm/*',
                'ioredis',
                'h3',
                'nuxt',
                '#imports',
              ],
              message: SHARED_PURITY_MSG,
            },
          ],
        },
      ],
    },
  },

  // server/api/** — thin controllers, no Drizzle or direct DB driver
  {
    files: ['server/api/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'drizzle-orm',
                'drizzle-orm/*',
                'postgres',
                '~/server/db/schema',
                '~/server/db/schema/**',
                '**/server/db/schema',
                '**/server/db/schema/**',
              ],
              message: API_THICKNESS_MSG,
            },
          ],
        },
      ],
    },
  },

  // messenger/** — isolated runtime, only shared/ allowed
  {
    files: ['messenger/**/*.{ts,js,mjs,vue}'],
    ignores: ['messenger/**/*.config.{ts,js,mjs,cjs}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/app/**',
                '**/server/**',
                '**/services/**',
                '~/app/**',
                '~/server/**',
                '~/services/**',
                'postgres',
                'drizzle-orm',
                'drizzle-orm/*',
              ],
              message: CROSS_RUNTIME_MSG,
            },
          ],
        },
      ],
    },
  },

  // messenger/core/** — Sprint 1.1 gives the messenger core its own Drizzle layer.
  // drizzle-orm and postgres are allowed here (messenger/core/src/db/ is the boundary).
  // Cross-runtime imports from app/, server/, services/ remain blocked by the rule above.
  {
    files: ['messenger/core/**/*.{ts,js}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/app/**',
                '**/server/**',
                '**/services/**',
                '~/app/**',
                '~/server/**',
                '~/services/**',
              ],
              message: CROSS_RUNTIME_MSG,
            },
          ],
        },
      ],
    },
  },

  // services/communications-service/** — isolated runtime, only shared/
  {
    files: ['services/communications-service/**/*.{ts,js,mjs}'],
    ignores: ['services/communications-service/**/*.config.{ts,js,mjs,cjs}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/app/**',
                '**/server/**',
                '**/messenger/**',
                '~/app/**',
                '~/server/**',
                '~/messenger/**',
                'postgres',
                'drizzle-orm',
                'drizzle-orm/*',
              ],
              message: CROSS_RUNTIME_MSG,
            },
          ],
        },
      ],
    },
  },

  // FSD direction: entities cannot import from widgets/features/pages
  {
    files: ['app/entities/**/*.{ts,js,mjs,vue}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/app/widgets/**',
                '**/app/features/**',
                '**/app/pages/**',
                '~/widgets/**',
                '~/features/**',
                '~/pages/**',
                '@/widgets/**',
                '@/features/**',
                '@/pages/**',
              ],
              message: FSD_UPWARD_MSG,
            },
          ],
        },
      ],
    },
  },

  // FSD direction: widgets cannot import from pages
  {
    files: ['app/widgets/**/*.{ts,js,mjs,vue}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/app/pages/**',
                '~/pages/**',
                '@/pages/**',
              ],
              message: FSD_UPWARD_MSG,
            },
          ],
        },
      ],
    },
  },

  // FSD direction: features cannot import from widgets/pages
  {
    files: ['app/features/**/*.{ts,js,mjs,vue}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/app/widgets/**',
                '**/app/pages/**',
                '~/widgets/**',
                '~/pages/**',
                '@/widgets/**',
                '@/pages/**',
              ],
              message: FSD_UPWARD_MSG,
            },
          ],
        },
      ],
    },
  },

  // ----------------------------------------------------------------
  // Overrides for Nuxt / Vue / tooling files where default-export
  // and certain patterns are part of the framework contract.
  // ----------------------------------------------------------------

  // Framework-contract files: default export is REQUIRED here.
  // - Nuxt routes/middleware/plugins/layouts/pages expect default export.
  // - Nitro h3 event handlers use `export default defineEventHandler(...)`.
  // - Nuxt/drizzle/pm2 config files export config objects by default.
  // - Vue SFCs always emit a default export via <script setup>.
  {
    files: [
      '**/*.config.{ts,js,mjs,cjs}',
      '**/*.options.{ts,js,mjs}',
      'nuxt.config.ts',
      'drizzle.config.ts',
      'ecosystem*.config.cjs',
      'eslint.config.mjs',
      'app/middleware/**/*.ts',
      'app/plugins/**/*.ts',
      'app/layouts/**/*.vue',
      'app/pages/**/*.vue',
      'app/app.vue',
      'server/api/**/*.ts',
      'server/middleware/**/*.ts',
      'server/plugins/**/*.ts',
      'server/routes/**/*.ts',
      'messenger/**/*.vue',
      'messenger/web/app/pages/**/*.ts',
      'messenger/web/app/middleware/**/*.ts',
      'messenger/web/app/plugins/**/*.ts',
      'messenger/web/app/layouts/**/*.vue',
      '**/*.vue',
    ],
    rules: {
      'max-lines-per-function': 'off',
      'no-restricted-syntax': 'off',
    },
  },

  // Scripts — relax size limits and default-export ban; they are
  // intentional data-migration helpers invoked by shell or node directly.
  {
    files: ['scripts/**/*.{ts,js,mjs,cjs}'],
    rules: {
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      complexity: 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-restricted-syntax': 'off',
    },
  },

  // Tests — relax rules for test harnesses and helpers; they are one-off
  // testing utilities not subject to production architecture constraints.
  {
    files: ['tests/**/*.{ts,js,mjs,cjs}', 'server/modules/**/__tests__/**/*.{ts,js,mjs,cjs}'],
    rules: {
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      'no-restricted-syntax': 'off',
    },
  },

  // Central config files — allowed to read process.env directly. Each
  // runtime has exactly one: main Nuxt app -> server/config.ts,
  // messenger -> messenger/core/src/config.ts, communications relay ->
  // services/communications-service/src/config.ts.
  {
    files: [
      'server/config.ts',
      'messenger/core/src/config.ts',
      'services/communications-service/src/config.ts',
    ],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },

  // messenger/core/src/mcp/** — standalone stdio MCP server processes.
  // These are child processes with their own env/config; they are NOT part of
  // the messenger HTTP runtime, so cross-runtime and process.env rules are relaxed.
  {
    files: ['messenger/core/src/mcp/**/*.ts'],
    rules: {
      'no-restricted-syntax': 'off',
      'no-restricted-imports': 'off',
    },
  },

  // server/utils/** — infrastructure-only utilities (body, errors, logger, etc.)
  // Must not import the DB layer or domain modules. If you need domain logic,
  // put it in server/modules/<domain>/ and call it from there.
  {
    files: ['server/utils/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'drizzle-orm',
                'drizzle-orm/*',
                'postgres',
                '~/server/db/schema',
                '~/server/db/schema/**',
                '~/server/db/schema/*',
                '**/server/db/schema',
                '**/server/db/schema/**',
                '~/server/modules/**',
                '~/server/modules/*',
                '**/server/modules/**',
              ],
              message:
                '`server/utils/` is infrastructure-only (body parsing, error helpers, logger, etc.). It must not depend on the DB layer or domain modules. Move domain logic into `server/modules/<domain>/`.',
            },
          ],
        },
      ],
    },
  },

  // server/modules/**/*.service.ts — business logic. The DB layer
  // (drizzle-orm, schema tables, postgres client) is forbidden here;
  // it belongs in the paired *.repository.ts. See
  // docs/architecture-v5/18-repository-layer.md.
  {
    files: ['server/modules/**/*.service.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'drizzle-orm',
                'drizzle-orm/*',
                'postgres',
                '~/server/db',
                '~/server/db/index',
                '~/server/db/schema',
                '~/server/db/schema/**',
                '~/server/db/schema/*',
                '**/server/db/schema',
                '**/server/db/schema/**',
              ],
              message:
                'Services must not access the DB directly. Put Drizzle queries in a paired `*.repository.ts` and call it via `import * as repo from "./<domain>.repository"`. See docs/architecture-v5/18-repository-layer.md.',
            },
          ],
        },
      ],
    },
  },

  // Test files (when they arrive)
  {
    files: ['**/*.{test,spec}.{ts,js,mjs}'],
    rules: {
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
)
