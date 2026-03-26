# Testing

## Test Runner

- **Framework**: Vitest v4
- **Config**: `test/vitest.config.ts`
- **Test location**: `test/unit/**/*.{test,spec}.{js,ts}`

## Commands

```bash
npm test                # Run all tests once
npm run test:coverage   # Run with V8 coverage report
```

## Coverage Thresholds

All metrics require **80% minimum**:

| Metric     | Threshold |
|------------|-----------|
| Branches   | 80%       |
| Functions  | 80%       |
| Lines      | 80%       |
| Statements | 80%       |

## Conventions

- Test files use `.spec.ts` suffix
- Tests are organized under `test/unit/` mirroring the source structure
- Use `describe` blocks named after the source file (e.g., `describe('src/index.ts', ...)`)
- Import from the public API (`../../src`) rather than internal modules when testing exported behavior
