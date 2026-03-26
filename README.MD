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
- [Typed Tokens](#typed-tokens)
- [Untyped Keys](#untyped-keys)
- [Providers](#providers)
- [Lifetime Management](#lifetime-management)
- [Container API](#container-api)
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

## Typed Tokens

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

## Untyped Keys

You can also use plain `symbol`, `string`, or class constructor keys. These require a manual generic on `resolve()`:

```typescript
const MY_KEY = Symbol('MyKey');

container.register(MY_KEY, { useValue: 42 });
const value = container.resolve<number>(MY_KEY);
```

## Providers

Two provider types keep the API unambiguous:

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

## Lifetime Management

Control how often a factory is called:

```typescript
// Singleton (default) — created once, cached forever
container.register(DatabaseToken, {
    useFactory: () => new Database(),
});

// Transient — new instance on every resolve()
container.register(RequestIdToken, {
    useFactory: () => crypto.randomUUID(),
}, { lifetime: 'transient' });
```

Value providers are always singleton by nature (the value already exists).

## Container API

The `Container` class implements the `IContainer` interface. Program against the interface to decouple your application from the concrete implementation — useful for dependency inversion and testing seams.

```typescript
import { Container } from 'eldin';
import type { IContainer } from 'eldin';

const container: IContainer = new Container();
```

| Method                              | Description                                                          |
|-------------------------------------|----------------------------------------------------------------------|
| `register(key, provider, options?)` | Register a dependency with optional lifetime. Re-registering an existing key replaces the provider and clears any cached singleton. |
| `resolve(key)`                      | Resolve a dependency. Throws `ContainerError` if not found.          |
| `tryResolve(key)`                   | Safe resolve returning `Result<T>` (no throw).                       |
| `has(key)`                          | Check if a key is registered.                                        |
| `unregister(key)`                   | Remove a registration and its cached instance.                       |

### Safe Resolution

```typescript
const result = container.tryResolve(DatabaseToken);

if (result.success) {
    console.log(result.data); // Database
} else {
    console.error(result.error); // Error
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

To avoid exceptions, use `tryResolve()` which returns a discriminated union instead:

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
