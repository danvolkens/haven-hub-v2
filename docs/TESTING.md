# Haven Hub v2 Testing Strategy

This document outlines the comprehensive testing strategy for Haven Hub v2, a Pinterest-first marketing automation platform.

## Table of Contents

1. [Overview](#overview)
2. [Test Types](#test-types)
3. [Directory Structure](#directory-structure)
4. [Running Tests](#running-tests)
5. [Writing Tests](#writing-tests)
6. [Mocking Strategies](#mocking-strategies)
7. [CI/CD Integration](#cicd-integration)
8. [Best Practices](#best-practices)

---

## Overview

Haven Hub v2 uses a multi-layered testing approach:

- **Unit Tests**: Fast, isolated tests for utilities and business logic
- **Integration Tests**: API route tests with mocked dependencies
- **Component Tests**: React component tests with user interactions
- **E2E Tests**: Full user journey tests with Playwright

### Testing Stack

| Tool | Purpose |
|------|---------|
| Vitest | Unit, integration, and component tests |
| React Testing Library | Component testing |
| Playwright | End-to-end testing |
| jsdom | Browser environment simulation |

---

## Test Types

### 1. Unit Tests (`tests/unit/`)

Test individual functions, utilities, and hooks in isolation.

**What to test:**
- Utility functions (`lib/utils.ts`)
- Custom hooks (without side effects)
- Data transformations
- Validation logic
- Pure business logic

**Example:**
```typescript
import { formatCurrency, slugify } from '@/lib/utils';

describe('formatCurrency', () => {
  it('formats USD correctly', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });
});
```

### 2. Integration Tests (`tests/integration/`)

Test API routes with mocked Supabase and external services.

**What to test:**
- API route handlers (GET, POST, PUT, DELETE)
- Authentication checks
- Request validation
- Error handling
- Database interactions (mocked)

**Example:**
```typescript
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}));

describe('GET /api/leads', () => {
  it('returns leads for authenticated user', async () => {
    const { GET } = await import('@/app/api/leads/route');
    const request = new NextRequest('http://localhost:3000/api/leads');
    const response = await GET(request);
    expect(response.status).toBe(200);
  });
});
```

### 3. Component Tests (`tests/components/`, `tests/ui/`)

Test React components with user interactions and state changes.

**What to test:**
- Component rendering
- User interactions (click, type, focus)
- Form validation
- Loading and error states
- Accessibility (labels, roles, aria attributes)

**Example:**
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalled();
  });
});
```

### 4. E2E Tests (`e2e/`)

Test complete user journeys with Playwright.

**What to test:**
- Authentication flows (login, logout, signup)
- Critical user paths (dashboard navigation)
- Form submissions
- Page accessibility
- Cross-browser compatibility

**Example:**
```typescript
import { test, expect } from '@playwright/test';

test('user can login', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/dashboard/);
});
```

---

## Directory Structure

```
haven-hub-v2/
├── tests/
│   ├── setup.ts              # Global test setup
│   ├── utils/
│   │   └── test-utils.tsx    # Render helpers, QueryClient wrapper
│   ├── mocks/
│   │   ├── supabase.ts       # Supabase client mocks
│   │   └── next-request.ts   # NextRequest helpers
│   ├── unit/
│   │   ├── utils.test.ts     # Utility function tests
│   │   └── hooks.test.tsx    # Hook tests
│   ├── integration/
│   │   └── api/
│   │       ├── leads.test.ts
│   │       ├── coupons.test.ts
│   │       ├── approvals.test.ts
│   │       └── pinterest.test.ts
│   ├── components/
│   │   ├── button.test.tsx
│   │   ├── input.test.tsx
│   │   └── login-form.test.tsx
│   └── ui/
│       └── performance-rules.test.tsx
├── e2e/
│   ├── fixtures/
│   │   └── auth.fixture.ts   # Authentication helpers
│   ├── global.setup.ts       # E2E global setup
│   ├── auth.spec.ts          # Authentication tests
│   ├── dashboard.spec.ts     # Dashboard tests
│   ├── pinterest.spec.ts     # Pinterest integration tests
│   ├── settings.spec.ts      # Settings page tests
│   └── accessibility.spec.ts # Accessibility tests
├── vitest.config.ts          # Vitest configuration
└── playwright.config.ts      # Playwright configuration
```

---

## Running Tests

### Unit, Integration, and Component Tests (Vitest)

```bash
# Run all tests once
npm run test:run

# Run tests in watch mode
npm run test:watch

# Run with UI
npm run test:ui

# Run with coverage report
npm run test:coverage

# Run specific test types
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:components    # Component tests only
```

### E2E Tests (Playwright)

```bash
# Run all E2E tests
npm run e2e

# Run with UI mode
npm run e2e:ui

# Run with visible browser
npm run e2e:headed

# Debug mode
npm run e2e:debug

# View last test report
npm run e2e:report
```

### Run All Tests

```bash
npm run test:all
```

---

## Writing Tests

### Test File Naming

- Unit tests: `*.test.ts`
- Component tests: `*.test.tsx`
- E2E tests: `*.spec.ts`

### Test Structure (AAA Pattern)

```typescript
describe('Feature', () => {
  it('should do something', () => {
    // Arrange - Set up test data and conditions
    const input = 'test';

    // Act - Execute the code under test
    const result = myFunction(input);

    // Assert - Verify the expected outcome
    expect(result).toBe('expected');
  });
});
```

### Naming Conventions

- Use descriptive test names: "should return formatted date when given valid input"
- Group related tests with `describe` blocks
- Use `it` or `test` consistently

---

## Mocking Strategies

### Mocking Supabase

Use the provided mock utilities in `tests/mocks/supabase.ts`:

```typescript
import { createMockSupabaseClient, mockUser } from '../../mocks/supabase';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(createMockSupabaseClient())),
}));
```

### Mocking Next.js Navigation

The setup file (`tests/setup.ts`) includes global mocks for:
- `next/navigation` (useRouter, useSearchParams, etc.)
- `next/headers` (cookies, headers)

### Mocking Fetch

```typescript
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

fetchMock.mockResolvedValueOnce({
  ok: true,
  json: async () => ({ data: 'test' }),
});
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:run

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run E2E tests
        run: npm run e2e
        env:
          PLAYWRIGHT_BASE_URL: http://localhost:3000
```

---

## Best Practices

### General

1. **Keep tests focused**: Each test should verify one behavior
2. **Use meaningful names**: Test names should describe expected behavior
3. **Avoid test interdependence**: Each test should be independent
4. **Mock external dependencies**: Use mocks for APIs, databases, etc.
5. **Test edge cases**: Include boundary conditions and error states

### Component Tests

1. **Query by accessibility**: Use `getByRole`, `getByLabelText` over `getByTestId`
2. **Test user behavior**: Focus on what users do, not implementation details
3. **Include accessibility checks**: Verify labels, roles, and aria attributes
4. **Test loading and error states**: Ensure UI handles all states gracefully

### E2E Tests

1. **Test critical paths**: Focus on important user journeys
2. **Use page objects**: Abstract page interactions into reusable functions
3. **Handle network conditions**: Test with realistic network delays
4. **Clean up test data**: Ensure tests don't leave state behind

### Coverage Goals

- Unit tests: 80%+ coverage for utilities and business logic
- Integration tests: Cover all API routes
- Component tests: Cover all interactive components
- E2E tests: Cover critical user journeys

---

## Troubleshooting

### Common Issues

**Tests fail with "module not found":**
- Check path aliases in `vitest.config.ts`
- Ensure `@/` points to `./src`

**Supabase mock not working:**
- Verify mock is defined before importing the module under test
- Use dynamic imports: `const { GET } = await import('@/app/api/route')`

**E2E tests timeout:**
- Increase timeout in `playwright.config.ts`
- Check if dev server is running on correct port
- Verify selectors match actual page elements

**React component tests fail:**
- Ensure `@testing-library/jest-dom` is imported in setup
- Use `waitFor` for async updates
- Wrap with necessary providers (QueryClient, etc.)

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
