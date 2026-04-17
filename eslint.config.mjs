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

      // LLM-friendly authorship
      'no-default-export': 'off',

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
  {
    files: [
      '**/*.config.{ts,js,mjs,cjs}',
      'nuxt.config.ts',
      'drizzle.config.ts',
      'ecosystem*.config.cjs',
      'app/middleware/**/*.ts',
      'app/plugins/**/*.ts',
      'server/middleware/**/*.ts',
      'server/plugins/**/*.ts',
      'app/layouts/**/*.vue',
      'app/pages/**/*.vue',
      'app/app.vue',
    ],
    rules: {
      'max-lines-per-function': 'off',
    },
  },

  // Scripts — relax size limits; they are intentional data-migration helpers.
  {
    files: ['scripts/**/*.{ts,js,mjs,cjs}'],
    rules: {
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      complexity: 'off',
      '@typescript-eslint/no-explicit-any': 'off',
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
