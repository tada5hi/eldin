# Project Structure

## Directory Layout

```
src/
  index.ts          # Public API -- re-exports all public types and classes
  container.ts      # Container class -- core DI container implementation
  token.ts          # TypedToken class -- type-safe registration keys
  types.ts          # Type definitions -- interfaces, type aliases, providers
  error.ts          # ContainerError -- custom error class
  constants.ts      # Lifetime enum (singleton, transient, scoped)
test/
  unit/
    container.spec.ts       # Unit tests for sync container functionality
    container-async.spec.ts # Unit tests for async resolution
    container-child.spec.ts # Unit tests for child containers
    container-scope.spec.ts # Unit tests for scoped containers
    token.spec.ts           # Unit tests for TypedToken
    error.spec.ts           # Unit tests for ContainerError
    index.spec.ts           # Unit tests for public API exports
  vitest.config.ts  # Vitest configuration with coverage thresholds
dist/               # Build output (ESM + declarations + sourcemaps)
```

## Module Responsibilities

| Module         | Purpose                                                        |
|----------------|----------------------------------------------------------------|
| `container.ts`  | `Container` class implementing `IContainer` -- register, resolve, resolveAsync, unregister, lifetime management, child/scoped containers |
| `token.ts`      | `TypedToken<T>` -- symbol-backed typed key for type-safe DI lookups |
| `types.ts`      | All type definitions: `ContainerKey`, `Provider` (value, factory, async factory), `Result`, `IContainer` interface |
| `constants.ts`  | `Lifetime` enum (SINGLETON, TRANSIENT, SCOPED)                 |
| `error.ts`      | `ContainerError` extending `Error` for resolution failures     |
| `index.ts`      | Barrel export (`export *`) -- the only entry point consumers should import from |

## Key Dependencies

| Dependency               | Purpose                          |
|--------------------------|----------------------------------|
| `tsdown`                 | Build (ESM bundle + .d.mts)      |
| `vitest`                 | Test runner                      |
| `eslint` + `@tada5hi/eslint-config` | Linting               |
| `husky` + `@tada5hi/commitlint-config` | Git hooks + commit message validation |
| `typescript`             | Type checking (noEmit mode)      |
