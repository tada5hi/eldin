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

Choose a provider when registering a key:

| Provider | Value |
| --- | --- |
| `{ useValue: value }` | An already constructed value, returned as supplied |
| `{ useFactory: (container) => value }` | A lazy synchronous factory |
| `{ useAsyncFactory: async (container) => value }` | A lazy asynchronous factory; resolve with `resolveAsync()` |

Keys can be `TypedToken<T>`, a class constructor, a symbol or a string. Each typed token owns a unique symbol, even when names match. A constructor key does not automatically construct a class: register its provider explicitly.

### Lifetimes and async initialization

```typescript
import { Container, TypedToken } from 'eldin';

const Session = new TypedToken<{ id: number }>('session');
const container = new Container();
let nextId = 0;
container.register(Session, {
    useAsyncFactory: async () => ({ id: ++nextId }),
}, { lifetime: 'scoped' });

const scope = container.createScope();
const [first, second] = await Promise.all([
    scope.resolveAsync(Session),
    scope.resolveAsync(Session),
]);
console.log(first === second); // true
console.log((await container.createScope().resolveAsync(Session)).id); // 2
```

| `RegistrationOptions.lifetime` | Default | Behavior |
| --- | --- | --- |
| `'singleton'` | Yes | Cache the first successful result in the registration container |
| `'transient'` | No | Invoke the factory on every resolution |
| `'scoped'` | No | Cache per resolving scope; resolution outside a scope throws |

`resolveAsync()` accepts every provider kind. Failed singleton/scoped initialization clears the pending promise, so a later call can try again. Synchronous resolution of an async factory throws. Value providers return the supplied value regardless of lifetime; a scoped value still requires a scope.

### Collections, children and errors

```typescript
import { Container, TypedToken } from 'eldin';

const Handler = new TypedToken<string>('handler');
const parent = new Container();
parent.registerMany(Handler, { useValue: 'parent' });
const child = parent.createChild();
child.registerMany(Handler, { useValue: 'child' });
console.log(child.resolveAll(Handler)); // ['child', 'parent']
console.log(child.tryResolve(Handler).success); // false: no single binding
```

`registerMany()` appends to an independent collection; `register()` sets a single binding. Collections resolve local registrations first, then parent registrations, in registration order. An empty collection resolves to `[]`. Use `resolveAllAsync()` if any member has an async factory. Collections support singleton and transient lifetimes; scoped multi-bindings throw `ContainerError`.

Child containers fall back to parent registrations. Factories receive the originating container, allowing child overrides to participate in dependency resolution. `createScope()` creates a child with scope caching enabled. Register scoped services before creating scopes.

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

| Container method | Behavior |
| --- | --- |
| `register(key, provider, options?)` | Replace a single provider and clear its cached instance/promise |
| `registerMany(key, provider, options?)` | Append a collection provider |
| `resolve(key)` / `resolveAsync(key)` | Resolve a single binding; missing bindings throw/reject |
| `tryResolve(key)` / `tryResolveAsync(key)` | Return a `Result` instead of throwing/rejecting |
| `resolveAll(key)` / `resolveAllAsync(key)` | Resolve a collection, including parent collections |
| `has(key)` | Check single/collection registrations through the parent chain |
| `unregister(key)` | Remove local single and collection registrations and caches |
| `createChild()` / `createScope()` | Create a child or a child with scoped resolution |

## Notes

- **Cleanup:** containers do not call disposal hooks. Close connections and other resources in your application.
- **Registration:** use shared token instances across modules. Recreating a token with the same name creates a different key.
- **Errors:** factory errors propagate through `resolve` methods and are captured by `tryResolve` methods.

## Contributing

Read the [contribution guidelines](CONTRIBUTING.md) and [code of conduct](CODE_OF_CONDUCT.md).

## License

Made with 💚

Published under the [MIT License](LICENSE).
