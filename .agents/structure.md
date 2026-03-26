# Project Structure

## Directory Layout

```
src/
  index.ts          # Public API -- re-exports all public types and classes
  container.ts      # Container class -- core DI container implementation
  token.ts          # TypedToken class -- type-safe registration keys
  types.ts          # Type definitions -- interfaces, type aliases, providers
  error.ts          # ContainerError -- custom error class
test/
  unit/
    index.spec.ts   # Unit tests for container functionality
  vitest.config.ts  # Vitest configuration with coverage thresholds
dist/               # Build output (ESM + declarations + sourcemaps)
```

## Module Responsibilities

| Module         | Purpose                                                        |
|----------------|----------------------------------------------------------------|
| `container.ts` | `Container` class implementing `IContainer` -- register, resolve, unregister, lifetime management |
| `token.ts`     | `TypedToken<T>` -- symbol-backed typed key for type-safe DI lookups |
| `types.ts`     | All type definitions: `ContainerKey`, `Provider`, `Lifetime`, `Result`, `IContainer` interface |
| `error.ts`     | `ContainerError` extending `Error` for resolution failures     |
| `index.ts`     | Barrel export -- the only entry point consumers should import from |

## Key Dependencies

| Dependency               | Purpose                          |
|--------------------------|----------------------------------|
| `tsdown`                 | Build (ESM bundle + .d.mts)      |
| `vitest`                 | Test runner                      |
| `eslint` + `@tada5hi/eslint-config` | Linting               |
| `husky` + `@tada5hi/commitlint-config` | Git hooks + commit message validation |
| `typescript`             | Type checking (noEmit mode)      |
