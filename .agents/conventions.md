# Conventions

## Code Style

- **ESLint**: `@tada5hi/eslint-config` (extends shared config)
- **TypeScript**: Strict mode via `@tada5hi/tsconfig`, target ES2022, ESNext modules, bundler resolution
- **Module system**: ESM only -- use `.ts` extensions in imports (e.g., `import { Foo } from './foo.ts'`)
- Run `npm run lint` to check, `npm run lint:fix` to auto-fix

## Commit Messages

- **Commitlint** enforced via Husky pre-commit hook
- **Format**: [Conventional Commits](https://www.conventionalcommits.org/) via `@tada5hi/commitlint-config`
- Examples: `feat: add scoped containers`, `fix: resolve transient lifetime bug`, `chore: update deps`

## CI/CD

GitHub Actions workflows on push/PR to `develop`, `master`, `next`, `beta`, `alpha`:

| Job     | Depends On | Runs              |
|---------|------------|-------------------|
| Install | --         | `npm ci`          |
| Build   | Install    | `npm run build`   |
| Lint    | Build      | `npm run lint`    |
| Test    | Build      | `npm test`        |

## Release Process

- **Tool**: [release-please](https://github.com/googleapis/release-please) on push to `master`
- **Config**: `release-please-config.json` + `.release-please-manifest.json`
- Automates version bumps, changelogs, and GitHub releases based on conventional commit history
- npm publish step is present but currently commented out in the release workflow

## Build

- **Tool**: tsdown
- **Entry**: `src/index.ts`
- **Output**: `dist/index.mjs` (ESM) + `dist/index.d.mts` (declarations) + sourcemaps
- **Exported paths**: `.` (main) and `./package.json`
