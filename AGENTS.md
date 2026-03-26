<!-- NOTE: Keep this file and all corresponding files in the .agents directory updated as the project evolves. When making architectural changes, adding new patterns, or discovering important conventions, update the relevant sections. -->

# eldi -- Agent Guide

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

- **Node.js**: >=22.0.0
- **Package manager**: npm
- **Module system**: ESM only (`"type": "module"`)
- **Build tool**: tsdown (outputs to `dist/`)

## Detailed Guides

- **[Project Structure](.agents/structure.md)** -- Source layout and module responsibilities
- **[Architecture](.agents/architecture.md)** -- Design patterns, type system, and data flow
- **[Testing](.agents/testing.md)** -- Test runner, conventions, and coverage thresholds
- **[Conventions](.agents/conventions.md)** -- Code style, commit conventions, CI/CD, and release process
