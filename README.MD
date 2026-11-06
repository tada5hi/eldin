<div align="center">
  <img src="https://raw.githubusercontent.com/tada5hi/eldin/088408f8a9421e22533d7f0f6ad65afcf918323a/.github/assets/logo.svg" width="144" height="144" alt="eldin logo">
  <h1>eldin</h1>
  <p><strong>A lightweight, type-safe dependency injection container for TypeScript with typed tokens, lifetime management, and modular application orchestration.</strong></p>
  <p><a href="https://www.npmjs.com/package/eldin"><img src="https://img.shields.io/npm/v/eldin" alt="npm version"></a> <a href="https://github.com/tada5hi/eldin/actions/workflows/main.yml"><img src="https://github.com/tada5hi/eldin/actions/workflows/main.yml/badge.svg" alt="CI status"></a> <a href="LICENSE"><img src="https://img.shields.io/github/license/tada5hi/eldin" alt="License"></a></p>
  <p><a href="#why-eldin">Why eldin?</a> · <a href="#installation">Install</a> · <a href="#usage">Usage</a> · <a href="#api">API</a></p>
</div>

---

## Why eldin?

Wire your services once, resolve them with typed keys, and choose how long each factory result lives.

| Concern | Without it | With eldin |
| --- | --- | --- |
| Wiring | Pass dependencies through each construction site | Register a factory that resolves its own dependencies |
| Types | Keep lookup keys and result types aligned yourself | `TypedToken<T>` carries the result type |
| Lifetimes | Maintain shared instances and request caches | Choose singleton, transient or scoped registrations |
| Async setup | Share and clear initialization promises yourself | Singleton and scoped async resolutions share pending work |
| Overrides | Rebuild the dependency graph for a test | Override a registration in a child container |

Manual construction works well for a small graph. A container becomes useful when you need the same wiring with different lifetimes or overrides:

```typescript
import { Container, TypedToken } from 'eldin';

const Config = new TypedToken<{ port: number }>('config');
const Endpoint = new TypedToken<string>('endpoint');
const container = new Container();
container.register(Config, { useValue: { port: 3000 } });
container.register(Endpoint, {
    useFactory: (c) => `http://localhost:${c.resolve(Config).port}`,
});
console.log(container.resolve(Endpoint)); // http://localhost:3000
```

<img src="https://raw.githubusercontent.com/tada5hi/eldin/088408f8a9421e22533d7f0f6ad65afcf918323a/.github/assets/mechanism.svg" width="960" alt="register() defaults to singleton. Singleton factories cache in the registration container, transient factories run on each resolution, and scoped factories cache in the resolving scope.">

## Installation

```sh
npm install eldin
```

Requires Node.js 20 or newer. ESM, CommonJS and TypeScript declarations are included. No decorators or reflection metadata are required.

## Usage

Start with the [quick start](#quick-start), then use the provider, lifetime and hierarchy sections for the full reference. [Safe resolution](#safe-resolution) and [error handling](#error-handling) cover failure paths.

## Quick Start

`Database` and `UserService` in the wiring examples are your application classes; eldin supplies the container and tokens. Provider examples reuse those tokens and classes.

```typescript
import { Container, TypedToken } from 'eldin';

// 1. Define typed tokens
const DatabaseToken = new TypedToken<Database>('Database');
const UserServiceToken = new TypedToken<UserService>('UserService');

// 2. Create a container and register dependencies
const container = new Container();

container.register(DatabaseToken, {
    useFactory: () => new Database('postgres://localhost/mydb'),
});

container.register(UserServiceToken, {
    useFactory: (c) => new UserService(c.resolve(DatabaseToken)),
});

// 3. Resolve — fully typed, no generics needed
const userService = container.resolve(UserServiceToken);
//    ^ type is UserService, inferred from the token
```

## Key Concepts

### Typed Tokens

`TypedToken<T>` carries a phantom type parameter that flows through `register()` and `resolve()`, giving you compile-time type safety without manual generic annotations.

```typescript
import { Container, TypedToken } from 'eldin';

type Config = { port: number };
const ConfigToken = new TypedToken<Config>('Config');
const LoggerToken = new TypedToken<typeof console>('Logger');
const container = new Container();
container.register(ConfigToken, { useValue: { port: 3000 } });
container.register(LoggerToken, { useValue: console });

const config = container.resolve(ConfigToken); // Config
const logger = container.resolve(LoggerToken); // typeof console
console.log(config.port); // 3000
logger.log('Ready'); // Ready
```

Each `TypedToken` instance has a unique `id` (a `Symbol`), so two tokens with the same name but different types will never collide:

```typescript
const tokenA = new TypedToken<Foo>('Service');
const tokenB = new TypedToken<Bar>('Service');
// tokenA and tokenB are distinct registrations
```

### Untyped Keys

You can also use plain `symbol`, `string`, or class constructor keys. These require a manual generic on `resolve()`:

```typescript
const MY_KEY = Symbol('MyKey');

container.register(MY_KEY, { useValue: 42 });
const value = container.resolve<number>(MY_KEY);
```

## Providers

### Value Provider

Registers a pre-constructed value. The container stores it as-is.

```typescript
container.register(ConfigToken, {
    useValue: { port: 3000, host: 'localhost' },
});
```

### Factory Provider

Registers a factory function. The container calls it when the dependency is first resolved (singleton) or every time (transient). The factory receives the container for recursive resolution.

```typescript
container.register(UserServiceToken, {
    useFactory: (container) => {
        const db = container.resolve(DatabaseToken);
        const logger = container.resolve(LoggerToken);
        return new UserService(db, logger);
    },
});
```

### Async Factory Provider

Registers an async factory for dependencies that require asynchronous initialization, such as database connections, remote config, or authenticated HTTP clients.

```typescript
const DatabaseToken = new TypedToken<Database>('Database');

container.register(DatabaseToken, {
    useAsyncFactory: async (container) => {
        const config = container.resolve(ConfigToken);
        const db = new Database(config.connectionString);
        await db.connect();
        return db;
    },
});

// Must use resolveAsync() — resolve() will throw
const db = await container.resolveAsync(DatabaseToken);
```

Async factories integrate with all lifetime modes. Singleton async factories are called once, and concurrent calls safely share the same in-flight promise:

```typescript
// Both calls await the same factory invocation
const [db1, db2] = await Promise.all([
    container.resolveAsync(DatabaseToken),
    container.resolveAsync(DatabaseToken),
]);
// db1 === db2
```

`resolveAsync()` also works with value providers and sync factory providers, making it suitable as a universal resolution method when your dependency graph contains a mix of sync and async providers.

## Lifetime Management

Control how often a factory is called via the `lifetime` option:

| Lifetime      | Behavior                                                   |
|---------------|------------------------------------------------------------|
| `'singleton'` | Created once, cached on first resolve (default)            |
| `'transient'` | New instance on every `resolve()` / `resolveAsync()` call  |
| `'scoped'`    | Created once per scope, cached within that scope           |

```typescript
// Singleton (default) — cached until re-registration or unregister
container.register(DatabaseToken, {
    useFactory: () => new Database(),
});

// Transient — new instance on every resolve()
container.register(RequestIdToken, {
    useFactory: () => crypto.randomUUID(),
}, { lifetime: 'transient' });

// Scoped — one instance per scope
container.register(SessionToken, {
    useFactory: () => new Session(),
}, { lifetime: 'scoped' });
```

Value providers return the same pre-constructed value regardless of lifetime. A scoped value provider still requires resolution inside a scope.

## Multi-Binding

Sometimes several implementations share a single key and you want *all* of them — plugin
registries, a list of validators, a chain of format converters. Use `registerMany()` to append
providers under one key and `resolveAll()` to resolve every one of them as an array, in
registration order.

```typescript
const HandlerToken = new TypedToken<Handler>('handler');

container.registerMany(HandlerToken, { useFactory: () => new JsonHandler() });
container.registerMany(HandlerToken, { useFactory: () => new XmlHandler() });
container.registerMany(HandlerToken, { useValue: new CsvHandler() });

const handlers = container.resolveAll(HandlerToken); // [JsonHandler, XmlHandler, CsvHandler]
```

Multi-bindings are independent from single bindings on the same key: `register()` / `resolve()`
address the single binding, while `registerMany()` / `resolveAll()` address the collection.
`resolveAll()` returns an empty array when nothing is registered, and — like `resolve()` — walks
the parent chain, appending inherited registrations after the local ones.

Each registration honours its own `'singleton'` (default) or `'transient'` lifetime. The
`'scoped'` lifetime is not supported for multi-bindings and throws a `ContainerError`. For
collections containing async factory providers, use `resolveAllAsync()`:

```typescript
container.registerMany(HandlerToken, { useAsyncFactory: async () => new RemoteHandler() });

const handlers = await container.resolveAllAsync(HandlerToken);
```

## Container Hierarchy

### Child Containers

Child containers inherit registrations from their parent but can override them locally. Resolution walks up the parent chain until a provider is found.

```typescript
const parent = new Container();
parent.register(LoggerToken, { useValue: console });

const child = parent.createChild();
child.register(LoggerToken, { useValue: customLogger });

child.resolve(LoggerToken);  // customLogger
parent.resolve(LoggerToken); // console
```

### Scoped Containers

Scoped containers are child containers that enable `'scoped'` lifetime registrations. Each scope maintains its own instance cache for scoped dependencies.

```typescript
container.register(SessionToken, {
    useFactory: () => new Session(),
}, { lifetime: 'scoped' });

const scope = container.createScope();
const s1 = scope.resolve(SessionToken);
const s2 = scope.resolve(SessionToken);
// s1 === s2 (same instance within the scope)
```

Resolving a scoped registration outside of a scope throws a `ContainerError`.

Register scoped services before creating scopes. Factories receive the originating container, allowing child overrides to participate in dependency resolution. Containers do not automatically dispose of resolved resources.

## API Reference

The `Container` class implements the `IContainer` interface. Program against the interface to decouple your application from the concrete implementation.

```typescript
import { Container } from 'eldin';
import type { IContainer } from 'eldin';

const container: IContainer = new Container();
```

### Sync Methods

| Method                                  | Description                                                                      |
|-----------------------------------------|----------------------------------------------------------------------------------|
| `register(key, provider, options?)`     | Register a dependency. Re-registering replaces the provider and clears cache.    |
| `registerMany(key, provider, options?)` | Append a provider to the collection under `key` (multi-binding).                 |
| `resolve(key)`                          | Resolve a dependency. Throws `ContainerError` if not found or if async.          |
| `resolveAll(key)`                       | Resolve all providers registered under `key` as an array (empty if none).        |
| `tryResolve(key)`                       | Safe resolve returning `Result<T>` (no throw).                                   |

### Async Methods

| Method                   | Description                                                                     |
|--------------------------|---------------------------------------------------------------------------------|
| `resolveAsync(key)`      | Resolve any provider type asynchronously. Throws `ContainerError` if not found. |
| `resolveAllAsync(key)`   | Resolve all providers under `key` (incl. async factories) as an array.          |
| `tryResolveAsync(key)`   | Safe async resolve returning `Promise<Result<T>>` (no throw).                   |

### Container Methods

| Method           | Description                                              |
|------------------|----------------------------------------------------------|
| `has(key)`       | Check if a key is registered (includes parent chain).    |
| `unregister(key)`| Remove a registration and its cached instance.           |
| `createChild()`  | Create a child container inheriting parent registrations.|
| `createScope()`  | Create a scoped child container for scoped lifetimes.    |

### Safe Resolution

Use `tryResolve()` when a missing registration or a factory error should be part of normal control flow. It returns a `Result<T>` discriminated union instead of throwing. Check `success` before accessing `data` or `error`:

```typescript
import { Container, TypedToken } from 'eldin';

const ConfigToken = new TypedToken<{ port: number }>('Config');
const container = new Container();
container.register(ConfigToken, { useValue: { port: 3000 } });

const result = container.tryResolve(ConfigToken);
if (result.success) {
    console.log(result.data.port); // 3000, inferred from the token
} else {
    console.error(result.error);
}
```

`tryResolveAsync()` awaits every provider kind and captures rejected initialization in the same result shape. A failure does not become a successful `undefined` value:

```typescript
import { Container, TypedToken } from 'eldin';

const RemoteConfigToken = new TypedToken<{ port: number }>('RemoteConfig');
const container = new Container();
container.register(RemoteConfigToken, {
    useAsyncFactory: async () => { throw new Error('Configuration unavailable'); },
});

const result = await container.tryResolveAsync(RemoteConfigToken);
if (result.success) {
    console.log(result.data.port);
} else {
    console.log(result.error.message); // Configuration unavailable
}
```

For singleton and scoped async providers, concurrent resolutions share pending initialization. A failed initialization clears the pending promise, so a later resolution can try again. `tryResolve()` does not turn an async provider into a synchronous one: use `tryResolveAsync()` for async factories.

### Re-registration

Calling `register()` with an existing key replaces the provider and clears any cached singleton:

```typescript
container.register(ConfigToken, { useValue: devConfig });
container.resolve(ConfigToken); // devConfig (cached)

container.register(ConfigToken, { useValue: prodConfig });
container.resolve(ConfigToken); // prodConfig (cache cleared)
```

## Error Handling

`resolve()` throws `ContainerError` for an unregistered key. `resolveAsync()` rejects for the same condition. Catch the error when failure should stop the current operation, or use [safe resolution](#safe-resolution) when you want a result value:

```typescript
import { Container, ContainerError, TypedToken } from 'eldin';

const UnknownToken = new TypedToken<string>('Unknown');
const container = new Container();
try {
    container.resolve(UnknownToken);
} catch (error) {
    if (error instanceof ContainerError) {
        console.log(error.message); // No registration found for: TypedToken(Unknown)
    } else {
        throw error;
    }
}
```

Synchronous resolution rejects an async factory rather than returning its promise. Resolve the same token asynchronously:

```typescript
import { Container, ContainerError, TypedToken } from 'eldin';

const AsyncToken = new TypedToken<number>('Async');
const container = new Container();
container.register(AsyncToken, { useAsyncFactory: async () => 42 });
try {
    container.resolve(AsyncToken);
} catch (error) {
    console.log(error instanceof ContainerError); // true
}
console.log(await container.resolveAsync(AsyncToken)); // 42
```

| Condition | Resolution behavior | Handling |
| --- | --- | --- |
| Missing single binding | `resolve()` throws; `resolveAsync()` rejects | Catch `ContainerError` or inspect a `tryResolve` result |
| Async factory through a sync method | `resolve()` / `resolveAll()` throw | Use `resolveAsync()` / `resolveAllAsync()` |
| Scoped binding outside a scope | Resolution fails with `ContainerError` | Resolve from `createScope()` |
| Scoped multi-binding | `registerMany()` throws immediately | Choose singleton or transient for collection entries |
| Factory throws or rejects | The original error propagates | Catch it or inspect a `tryResolve` result |
| No collection binding | `resolveAll()` returns `[]` | No missing-binding exception is raised |

The `tryResolve` methods capture resolution failures; they do not wrap errors from `registerMany()` or other operations. Application factories should throw `Error` objects so the declared `Result<T>` error shape matches the thrown value.

## Usage in Tests

eldin makes testing easy — just construct dependencies manually:

```typescript
const mockDb = { query: vi.fn() };
const service = new UserService(mockDb);
```

Or create a test container with overrides:

```typescript
const container = new Container();
container.register(DatabaseToken, { useValue: mockDb });
container.register(UserServiceToken, {
    useFactory: (c) => new UserService(c.resolve(DatabaseToken)),
});

const service = container.resolve(UserServiceToken);
```

## API

| Export | Kind | Purpose |
| --- | --- | --- |
| `Container` | Class | Registration, resolution and container hierarchy |
| `TypedToken<T>` | Class | Typed key with `id`, `name` and `toString()` |
| `Lifetime` | Enum | `SINGLETON`, `TRANSIENT`, `SCOPED` |
| `ContainerError` | Error class | Missing registration, invalid lifetime or sync/async misuse |
| `IContainer` | Interface | Container contract for factories and consumers |
| `ContainerKey<T>` | Type | Typed token, constructor, symbol or string |
| `RegistrationOptions` | Interface | Optional `lifetime` |
| `ValueProvider<T>`, `FactoryProvider<T>`, `AsyncFactoryProvider<T>` | Interfaces | The three provider shapes |
| `Provider<T>` | Type | Union of provider shapes |
| `Result<T, E>` | Type | `{ success: true, data }` or `{ success: false, error }` |

## Notes

- **Cleanup:** containers do not call disposal hooks. Close connections and other resources in your application.
- **Registration:** use shared token instances across modules. Recreating a token with the same name creates a different key.
- **Errors:** factory errors propagate through `resolve` methods and are captured by `tryResolve` methods.

## Contributing

Read the [contribution guidelines](CONTRIBUTING.md) and [code of conduct](CODE_OF_CONDUCT.md).

## License

Made with 💚

Published under the [MIT License](LICENSE).
