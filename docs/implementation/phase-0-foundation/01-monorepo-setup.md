# Phase 0 / Week 1 / Monday: Monorepo setup

Цель: `pnpm-workspace.yaml` + Turborepo поверх v5.3 repo. Без разрушения v5.3.

## Prereq

- `pnpm` 9.x installed globally (`npm install -g pnpm@9`).
- Node 20 LTS.
- Git access к repo.
- Existing repo в рабочем состоянии (`pnpm dev` для v5.3 работает).

## Шаг 1: Backup ветка

```bash
git checkout -b archive/pre-phase-0
git push origin archive/pre-phase-0
git checkout main
git checkout -b phase-0/monorepo-setup
```

## Шаг 2: pnpm-workspace.yaml

Create в корне:

```yaml
# pnpm-workspace.yaml
packages:
  # v5.3 legacy (сохраняется до Phase 4 archive)
  - 'messenger/core'
  - 'messenger/web'
  - 'services/communications-service'

  # v6 new workspaces
  - 'apps/*'
  - 'packages/*'
  - 'packages/card-types/*'
  - 'services/*'

  # Exclude patterns
  - '!**/test-fixtures/**'
  - '!**/node_modules/**'
```

Test:
```bash
pnpm install
# Should complete without errors
```

## Шаг 3: Turborepo

```bash
pnpm add -D -w turbo
```

Create `turbo.json` в корне:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env", "**/.env.*"],
  "globalEnv": ["NODE_ENV", "CI"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**", "build/**"]
    },
    "lint": {
      "outputs": []
    },
    "lint:errors": {
      "outputs": []
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "test:fractal": {
      "outputs": []
    },
    "test:contract": {
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "clean": {
      "cache": false
    }
  }
}
```

## Шаг 4: Root package.json scripts

Update existing `package.json` — добавить turbo-прокси команды:

```json
{
  "scripts": {
    "turbo:build": "turbo run build",
    "turbo:lint": "turbo run lint",
    "turbo:typecheck": "turbo run typecheck",
    "turbo:test": "turbo run test",
    "turbo:clean": "turbo run clean",

    "dev:infra": "cd platform/docker-compose && docker compose up -d",
    "dev:infra:down": "cd platform/docker-compose && docker compose down",
    "dev:infra:logs": "cd platform/docker-compose && docker compose logs -f",

    "create": "plop",

    "// === existing v5.3 scripts below === //": "",
    "dev": "nuxt dev --port 3000",
    "// ... остальные уже существуют": ""
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "plop": "^4.0.0"
  }
}
```

## Шаг 5: Создать структуру директорий

```bash
mkdir -p apps
mkdir -p packages/card-types/_template
mkdir -p packages/contracts-platform/src
mkdir -p packages/contracts-domain/src
mkdir -p packages/contracts-governance/src
mkdir -p packages/events/src
mkdir -p packages/events/domains
mkdir -p packages/design-tokens/src
mkdir -p packages/shell-panels/src
mkdir -p packages/ui-react/src
mkdir -p packages/testing/fractal-harness
mkdir -p packages/testing/contract-harness
mkdir -p platform/docker-compose
mkdir -p platform/k8s
mkdir -p platform/terraform
mkdir -p platform/law-profiles
mkdir -p platform/policies
mkdir -p platform/notification-rules
mkdir -p scripts/codegen/plop
mkdir -p scripts/codegen/templates
```

Validate:
```bash
find packages -type d -maxdepth 2
# Should show all newly created
```

## Шаг 6: Placeholder package.json для каждого package

Для каждого нового package — создать минимальный `package.json`:

```bash
# packages/contracts-platform/package.json
cat > packages/contracts-platform/package.json <<EOF
{
  "name": "@daria/contracts-platform",
  "version": "0.0.1",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "build": "echo 'no build yet'",
    "test": "echo 'no tests yet'"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
EOF
```

Повторить для:
- `@daria/contracts-platform`
- `@daria/contracts-domain`
- `@daria/contracts-governance`
- `@daria/events`
- `@daria/design-tokens`
- `@daria/shell-panels`
- `@daria/ui-react`
- `@daria/testing-fractal-harness`
- `@daria/testing-contract-harness`

Также создать `src/index.ts` в каждом:
```bash
for pkg in contracts-platform contracts-domain contracts-governance events design-tokens shell-panels ui-react; do
  touch packages/$pkg/src/index.ts
  echo "// @daria/$pkg — bootstrapped in Phase 0" > packages/$pkg/src/index.ts
done
```

## Шаг 7: tsconfig.base.json

Create корневой shared TypeScript config:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "allowJs": false,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@daria/contracts-platform": ["./packages/contracts-platform/src"],
      "@daria/contracts-domain": ["./packages/contracts-domain/src"],
      "@daria/contracts-governance": ["./packages/contracts-governance/src"],
      "@daria/events": ["./packages/events/src"],
      "@daria/design-tokens": ["./packages/design-tokens/src"],
      "@daria/shell-panels": ["./packages/shell-panels/src"],
      "@daria/ui-react": ["./packages/ui-react/src"]
    }
  }
}
```

Each package's `tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src/**/*"]
}
```

## Шаг 8: Проверка

```bash
# Install (should complete)
pnpm install

# Turbo graph (should show packages)
pnpm turbo:typecheck --dry-run

# Typecheck (should pass on empty packages)
pnpm turbo:typecheck
```

Expected output:
- Dry-run shows all packages discovered by Turbo.
- Typecheck completes без errors (пустые packages pass).

## Шаг 9: Commit

```bash
git add -A
git commit -m "chore(phase-0): pnpm workspace + turborepo + package skeletons"
git push
```

Open PR с заголовком: `[Phase 0 / Week 1 / Mon] Monorepo bootstrap`.

## Checklist — перед переходом к Tuesday

- [ ] `pnpm install` проходит без errors
- [ ] `pnpm turbo:typecheck` проходит
- [ ] `pnpm-workspace.yaml` включает все новые paths + legacy
- [ ] Все 10 skeleton packages имеют `package.json` + `src/index.ts` + `tsconfig.json`
- [ ] Existing v5.3 scripts (`pnpm dev`, `pnpm lint:errors`) продолжают работать
- [ ] PR merged

## Троблшутинг

### `pnpm install` fails на peerDependencies

В `package.json` добавить:
```json
{
  "pnpm": {
    "overrides": {},
    "peerDependencyRules": {
      "ignoreMissing": ["react", "react-dom"]
    }
  }
}
```

### Turbo не находит packages

Проверить что `pnpm-workspace.yaml` включает `packages/*`. Запустить `pnpm install` снова.

### tsconfig paths не разрешаются в IDE

Restart VSCode TypeScript server: Cmd+Shift+P → "TypeScript: Restart TS Server".

## Next

Tuesday: Git + CI skeleton → `02-ci-skeleton.md` (не написано, см. следующий doc в папке).
