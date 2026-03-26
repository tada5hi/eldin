# eldin 💉

[![npm version][npm-version-src]][npm-version-href]
[![codecov][codecov-src]][codecov-href]
[![Master Workflow][workflow-src]][workflow-href]
[![Known Vulnerabilities][snyk-src]][snyk-href]
[![Conventional Commits][conventional-src]][conventional-href]

A lightweight, type-safe dependency injection container for TypeScript.

No decorators. No metadata reflection. No magic. Just typed tokens, factory/value providers, and lifetime management.

**Table of Contents**

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Key Concepts](#key-concepts)
  - [Typed Tokens](#typed-tokens)
  - [Untyped Keys](#untyped-keys)
- [Providers](#providers)
  - [Value Provider](#value-provider)
  - [Factory Provider](#factory-provider)
  - [Async Factory Provider](#async-factory-provider)
- [Lifetime Management](#lifetime-management)
- [Container Hierarchy](#container-hierarchy)
  - [Child Containers](#child-containers)
  - [Scoped Containers](#scoped-containers)
- [API Reference](#api-reference)
  - [Sync Methods](#sync-methods)
  - [Async Methods](#async-methods)
  - [Container Methods](#container-methods)
  - [Safe Resolution](#safe-resolution)
  - [Re-registration](#re-registration)
- [Error Handling](#error-handling)
- [Usage in Tests](#usage-in-tests)
- [Contributing](#contributing)
- [License](#license)

## Installation

```bash
npm install eldin --save
```

## Quick Start

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
import { TypedToken } from 'eldin';

// Each token encodes the type it resolves to
const ConfigToken = new TypedToken<Config>('Config');
const LoggerToken = new TypedToken<Logger>('Logger');

// resolve() infers the return type from the token
const config = container.resolve(ConfigToken);  // Config
const logger = container.resolve(LoggerToken);  // Logger
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

`resolveAsync()` also works with value providers and sync factory providers, making it safe to use as a universal resolution method when your dependency graph contains a mix of sync and async providers.

## Lifetime Management

Control how often a factory is called via the `lifetime` option:

| Lifetime      | Behavior                                                   |
|---------------|------------------------------------------------------------|
| `'singleton'` | Created once, cached on first resolve (default)            |
| `'transient'` | New instance on every `resolve()` / `resolveAsync()` call  |
| `'scoped'`    | Created once per scope, cached within that scope           |

```typescript
// Singleton (default) — created once, cached forever
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

Value providers are always singleton by nature (the value already exists).

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

## API Reference

The `Container` class implements the `IContainer` interface. Program against the interface to decouple your application from the concrete implementation.

```typescript
import { Container } from 'eldin';
import type { IContainer } from 'eldin';

const container: IContainer = new Container();
```

### Sync Methods

| Method                              | Description                                                                  |
|-------------------------------------|------------------------------------------------------------------------------|
| `register(key, provider, options?)` | Register a dependency. Re-registering replaces the provider and clears cache.|
| `resolve(key)`                      | Resolve a dependency. Throws `ContainerError` if not found or if async.      |
| `tryResolve(key)`                   | Safe resolve returning `Result<T>` (no throw).                               |

### Async Methods

| Method                   | Description                                                                     |
|--------------------------|---------------------------------------------------------------------------------|
| `resolveAsync(key)`      | Resolve any provider type asynchronously. Throws `ContainerError` if not found. |
| `tryResolveAsync(key)`   | Safe async resolve returning `Promise<Result<T>>` (no throw).                   |

### Container Methods

| Method           | Description                                              |
|------------------|----------------------------------------------------------|
| `has(key)`       | Check if a key is registered (includes parent chain).    |
| `unregister(key)`| Remove a registration and its cached instance.           |
| `createChild()`  | Create a child container inheriting parent registrations.|
| `createScope()`  | Create a scoped child container for scoped lifetimes.    |

### Safe Resolution

Both `tryResolve()` and `tryResolveAsync()` return a discriminated union instead of throwing:

```typescript
const result = container.tryResolve(DatabaseToken);

if (result.success) {
    console.log(result.data); // Database
} else {
    console.error(result.error); // Error
}

// Async variant
const asyncResult = await container.tryResolveAsync(RemoteConfigToken);

if (asyncResult.success) {
    console.log(asyncResult.data);
}
```

### Re-registration

Calling `register()` with an existing key replaces the provider and clears any cached singleton:

```typescript
container.register(ConfigToken, { useValue: devConfig });
container.resolve(ConfigToken); // devConfig (cached)

container.register(ConfigToken, { useValue: prodConfig });
container.resolve(ConfigToken); // prodConfig (cache cleared)
```

## Error Handling

When `resolve()` is called with an unregistered key, it throws a `ContainerError`:

```typescript
import { ContainerError } from 'eldin';

try {
    container.resolve(UnknownToken);
} catch (error) {
    if (error instanceof ContainerError) {
        console.error(error.message); // "No registration found for: ..."
    }
}
```

`resolve()` also throws if the provider is async — use `resolveAsync()` instead:

```typescript
// This throws: "Cannot resolve async provider synchronously ... Use resolveAsync()"
container.resolve(AsyncToken);

// This works
const value = await container.resolveAsync(AsyncToken);
```

To avoid exceptions entirely, use `tryResolve()` or `tryResolveAsync()`:

```typescript
const result = container.tryResolve(MaybeToken);
if (!result.success) {
    console.warn('Not registered:', result.error.message);
}
```

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

## Contributing

Before starting to work on a pull request, it is important to review the guidelines for
[contributing](./CONTRIBUTING.md) and the [code of conduct](./CODE_OF_CONDUCT.md).
These guidelines will help to ensure that contributions are made effectively and are accepted.

## License

Made with 💚

Published under [MIT License](./LICENSE).

[npm-version-src]: https://badge.fury.io/js/eldin.svg
[npm-version-href]: https://npmjs.com/package/eldin
[codecov-src]: https://codecov.io/gh/tada5hi/eldin/branch/master/graph/badge.svg?token=4KNSG8L13V
[codecov-href]: https://codecov.io/gh/tada5hi/eldin
[workflow-src]: https://github.com/tada5hi/eldin/workflows/CI/badge.svg
[workflow-href]: https://github.com/tada5hi/eldin
[snyk-src]: https://snyk.io/test/github/tada5hi/eldin/badge.svg?targetFile=package.json
[snyk-href]: https://snyk.io/test/github/tada5hi/eldin?targetFile=package.json
[conventional-src]: https://img.shields.io/badge/Conventional%20Commits-1.0.0-%23FE5196?logo=conventionalcommits&logoColor=white
[conventional-href]: https://conventionalcommits.org
