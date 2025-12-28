# Testing Guide

## Running Tests

Run the test suite locally:

```bash
npm test
```

Run tests in watch mode during development:

```bash
npm test -- --watch
```

Run a specific test file:

```bash
npm test -- src/tests/safety.test.ts
```

## Test Organization

Tests are located in `src/tests/`:

```
src/tests/
├── setupTests.ts           # Jest setup (imports jest-dom)
├── sample.test.ts          # Sanity test
├── decompress.test.ts      # Decompression utilities
├── vendor.test.ts          # Vendor detection
├── normalize.test.ts       # Genotype normalization
├── parsers.test.ts         # DNA parsing functions
├── storage.test.ts         # IndexedDB operations
├── progress.test.ts        # Worker progress reporting
├── plannerPrompt.test.ts   # Planner prompt construction
├── queryPlanValidation.test.ts  # QueryPlan validation
├── match.test.ts           # SNP matching
├── interpreterPrompt.test.ts    # Interpreter prompt construction
├── chat.test.tsx           # Chat component UI
├── preferences.test.ts     # Preferences storage
├── safety.test.ts          # Safety classifier
└── integration.test.tsx    # End-to-end flow
```

### Test File Naming

- Unit tests: `*.test.ts`
- Component tests: `*.test.tsx`
- Integration tests: `integration.test.tsx`

## Continuous Integration

Tests run automatically on GitHub Actions for every push and pull request.

### Workflow Configuration

Located in `.github/workflows/test.yml`:

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
```

### CI Status

Check the "Actions" tab in GitHub to see test results for each commit.

## Writing Tests

### Unit Tests

Test pure functions in isolation:

```typescript
import { normalizeGenotype } from '../utils/normalize'

describe('normalizeGenotype', () => {
  it('should sort alleles alphabetically', () => {
    expect(normalizeGenotype('TA')).toBe('AT')
  })

  it('should return null for empty input', () => {
    expect(normalizeGenotype('')).toBeNull()
  })
})
```

### Component Tests

Use React Testing Library for component tests:

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MyComponent from '../components/MyComponent'

describe('MyComponent', () => {
  it('should render button', () => {
    render(<MyComponent />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('should handle click', async () => {
    const user = userEvent.setup()
    render(<MyComponent />)

    await user.click(screen.getByRole('button'))

    expect(screen.getByText('Clicked')).toBeInTheDocument()
  })
})
```

### Mocking Services

Mock LLM services to avoid network requests:

```typescript
jest.mock('../services/llm', () => ({
  callPlanner: jest.fn().mockResolvedValue({
    version: '1.0',
    intent: 'test',
    topic: 'test',
    snps: [],
    includeNotes: [],
    safety: { diagnosis: false, medicalAdvice: false, disclaimerLevel: 'low' },
  }),
  callInterpreter: jest.fn().mockResolvedValue({
    answer_markdown: 'Test response',
    key_points: [],
    uncertainty: 'low',
    used_snps: [],
    what_this_does_not_mean: '',
    follow_up_questions: [],
  }),
}))
```

### Mocking IndexedDB

IndexedDB is not available in Node.js. Mock storage functions:

```typescript
jest.mock('../storage', () => ({
  loadSNPIndex: jest.fn().mockResolvedValue({
    index: new Map([['rs123', 'AT']]),
    metadata: { vendor: '23andme', fileName: 'test.txt', count: 1 },
  }),
  saveSNPIndex: jest.fn().mockResolvedValue(undefined),
}))
```

For full IndexedDB testing, install `fake-indexeddb`:

```bash
npm install fake-indexeddb --save-dev
```

Then in `setupTests.ts`:

```typescript
import 'fake-indexeddb/auto'
```

### Async Testing

Use `waitFor` for async operations:

```typescript
import { waitFor } from '@testing-library/react'

it('should load data', async () => {
  render(<MyComponent />)

  await waitFor(() => {
    expect(screen.getByText('Loaded')).toBeInTheDocument()
  })
})
```

## Best Practices

1. **Test behavior, not implementation** - Test what the component does, not how it does it
2. **Use meaningful assertions** - Be specific about what you're testing
3. **Avoid testing framework code** - Don't test React or third-party libraries
4. **Keep tests isolated** - Each test should be independent
5. **Mock external dependencies** - Network requests, IndexedDB, etc.
6. **Use descriptive names** - `it('should display error when input is invalid')`

## Adding Tests for New Features

When adding a new feature:

1. **Write tests first** (TDD) or alongside the feature
2. **Test the happy path** - Normal expected behavior
3. **Test edge cases** - Empty inputs, null values, errors
4. **Test error handling** - Invalid inputs, network failures
5. **Update integration tests** if the feature affects the main flow

## Test Coverage (Optional)

To generate a coverage report:

```bash
npm test -- --coverage
```

This creates a `coverage/` directory with HTML reports.

Configure coverage thresholds in `jest.config.js`:

```javascript
module.exports = {
  // ...
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
}
```
