<!-- NOTE: Keep this file and all corresponding files in the .agents directory updated as the project evolves. When making architectural changes, adding new patterns, or discovering important conventions, update the relevant sections. -->

# eldin -- Agent Guide

A lightweight, type-safe dependency injection container for TypeScript. Provides typed tokens, factory/value providers, lifetime management (singleton/transient), and a minimal API surface for IoC.

## Quick Reference

```bash
# Setup
npm install

# Development
npm run build
npm test
npm run lint
npm run lint:fix
```

- **Node.js**: >=20.0.0 to consume; >=22.0.0 to develop (test tooling)
- **Package manager**: npm
- **Module system**: ESM source (`"type": "module"`); ships both ESM and CJS builds
- **Build tool**: tsdown (outputs to `dist/`)

## Detailed Guides

- **[Project Structure](.agents/structure.md)** -- Source layout and module responsibilities
- **[Architecture](.agents/architecture.md)** -- Design patterns, type system, and data flow
- **[Testing](.agents/testing.md)** -- Test runner, conventions, and coverage thresholds
- **[Conventions](.agents/conventions.md)** -- Code style, commit conventions, CI/CD, and release process
