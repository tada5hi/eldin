# Architecture

## Core Concepts

The library implements a **service locator / IoC container** with three key abstractions:

1. **Container** -- Stores and resolves dependencies
2. **TypedToken** -- Provides type-safe keys for registration/resolution
3. **Providers** -- Define how values are created (value or factory)

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

Two provider variants supply values to the container:

```typescript
// Value provider -- stores a pre-built instance
container.register(token, { useValue: myInstance });

// Factory provider -- lazy creation with container access for nested resolution
container.register(token, {
    useFactory: (container) => new Service(container.resolve(depToken)),
});
```

## Lifetime Management

| Lifetime      | Behavior                                                   |
|---------------|------------------------------------------------------------|
| `'singleton'` | Created once, cached on first resolve (default)            |
| `'transient'` | New instance on every `resolve()` call                     |

Set via the optional third argument: `container.register(key, provider, { lifetime: 'transient' })`.

## Resolution Flow

1. `resolve(key)` normalizes the key (extracts `token.id` for TypedTokens)
2. Returns cached instance if it exists (singleton hit)
3. Looks up the provider; throws `ContainerError` if missing
4. Calls `useValue` or `useFactory(this)` to produce the instance
5. Caches the result if lifetime is `'singleton'`

`tryResolve(key)` wraps this in a `Result<T>` discriminated union (`{ success, data }` or `{ success, error }`) for error-safe resolution.

## Data Flow

```
register(key, provider, options?)
  --> normalizeKey(key) --> providers.set() + lifetimes.set()

resolve(key)
  --> normalizeKey(key) --> instances cache check
      --> provider lookup --> useValue / useFactory(this)
          --> cache if singleton --> return instance
```
