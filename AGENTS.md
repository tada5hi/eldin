<!-- NOTE: Keep this file and all corresponding files in the .agents directory updated as the project evolves. When making architectural changes, adding new patterns, or discovering important conventions, update the relevant sections. -->

Use this guide as the entry point. Read linked guides on demand before changing their areas.

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

- **Node.js (package runtime)**: `>=20.0.0`
- **Node.js (development tooling)**: `^24.11.0 || >=26.0.0`; `.nvmrc` selects Node 24.
- **Package manager**: npm
- **Module system**: ESM source (`"type": "module"`); ships both ESM and CJS builds
- **Build tool**: tsdown (outputs to `dist/`)

## Detailed Guides

- **[Project Structure](.agents/structure.md)** -- Source layout and module responsibilities
- **[Architecture](.agents/architecture.md)** -- Design patterns, type system, and data flow
- **[Testing](.agents/testing.md)** -- Test runner, conventions, and coverage thresholds
- **[Conventions](.agents/conventions.md)** -- Code style, commit conventions, CI/CD, and release process

### Writing agent docs

Keep existing commands, paths and factual descriptions current. Add guide content only for an invariant or a cross-cutting rule. Edit the existing statement and describe current behavior. Defect stories, test inventories and change history belong in PRs or commits. `npm run lint` enforces agent-doc size and history checks through the shared ESLint config.
