# Architecture

## Core Concepts

The library implements a **service locator / IoC container** with three key abstractions:

1. **Container** -- Stores and resolves dependencies
2. **TypedToken** -- Provides type-safe keys for registration/resolution
3. **Providers** -- Define how values are created (value, factory, or async factory)

## Container Key System

Registration keys (`ContainerKey<T>`) accept four forms:

| Key Type           | Example                              | Internal Storage |
|--------------------|--------------------------------------|------------------|
| `TypedToken<T>`    | `new TypedToken<Logger>('logger')`   | `token.id` (Symbol) |
| Class constructor  | `LoggerService`                      | The constructor itself |
| `symbol`           | `Symbol('logger')`                   | The symbol |
| `string`           | `'logger'`                           | The string |

`TypedToken<T>` is the preferred key type because it preserves the generic `T` through registration and resolution, giving full type inference.

## Provider Pattern

Three provider variants supply values to the container:

```typescript
// Value provider -- stores a pre-built instance
container.register(token, { useValue: myInstance });

// Factory provider -- lazy creation with container access for nested resolution
container.register(token, {
    useFactory: (container) => new Service(container.resolve(depToken)),
});

// Async factory provider -- for dependencies requiring async initialization
container.register(token, {
    useAsyncFactory: async (container) => {
        const db = new Database();
        await db.connect();
        return db;
    },
});
```

## Lifetime Management

| Lifetime      | Behavior                                                   |
|---------------|------------------------------------------------------------|
| `'singleton'` | Created once, cached on first resolve (default)            |
| `'transient'` | New instance on every `resolve()` / `resolveAsync()` call  |
| `'scoped'`    | Created once per scope, cached within that scope           |

Set via the optional third argument: `container.register(key, provider, { lifetime: 'transient' })`.

## Resolution Flow

### Sync (`resolve`)

1. `resolve(key)` normalizes the key (extracts `token.id` for TypedTokens)
2. Returns cached instance if it exists (singleton/scoped hit)
3. Looks up the provider; throws `ContainerError` if missing
4. Throws `ContainerError` if provider is async (must use `resolveAsync()`)
5. Calls `useValue` or `useFactory(this)` to produce the instance
6. Caches the result if lifetime is `'singleton'` or `'scoped'`

`tryResolve(key)` wraps this in a `Result<T>` discriminated union (`{ success, data }` or `{ success, error }`) for error-safe resolution.

### Async (`resolveAsync`)

1. `resolveAsync(key)` normalizes the key
2. Returns cached instance if it exists (singleton/scoped hit)
3. Returns in-flight promise if one exists (concurrent singleton dedup)
4. Looks up the provider; throws `ContainerError` if missing
5. Calls `useValue`, `useFactory(this)`, or `await useAsyncFactory(this)`
6. For singleton/scoped: caches the in-flight promise in `asyncResolving` map to prevent concurrent duplicate invocations, then caches the resolved instance
7. For transient: returns directly without caching

`tryResolveAsync(key)` wraps this in a `Promise<Result<T>>` for error-safe resolution.

## Data Flow

```
register(key, provider, options?)
  --> normalizeKey(key) --> providers.set() + lifetimes.set()

resolve(key)
  --> normalizeKey(key) --> instances cache check
      --> provider lookup --> throw if async --> useValue / useFactory(this)
          --> cache if singleton/scoped --> return instance

resolveAsync(key)
  --> normalizeKey(key) --> instances cache check
      --> asyncResolving check (concurrent dedup)
          --> provider lookup --> useValue / useFactory / await useAsyncFactory
              --> cache if singleton/scoped --> return instance
```
