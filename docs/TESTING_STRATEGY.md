# Haven Hub v2 - Comprehensive Testing Strategy

## Executive Summary

This document outlines a complete testing strategy for Haven Hub v2, covering automation testing, API testing, E2E testing, UI testing, and additional testing recommendations. The strategy is designed to be implemented incrementally while maximizing coverage of critical paths.

**Current State:**
- Vitest configured with 60% coverage thresholds
- Playwright configured for E2E tests
- 5 E2E test files (auth, dashboard, pinterest, settings, accessibility)
- 4 API integration tests (approvals, leads, coupons, pinterest)
- 5 component/unit tests
- No CI/CD pipeline configured

**Target State:**
- 80%+ unit test coverage on critical paths
- 100% API route coverage
- E2E coverage for all critical user journeys
- Automated testing in CI/CD pipeline
- Performance and load testing for key endpoints

---

## 1. Testing Architecture Overview

### 1.1 Testing Pyramid

```
                    /\
                   /  \
                  / E2E \         (5-10% - Critical flows only)
                 /--------\
                /Integration\     (20-30% - API + DB + Services)
               /--------------\
              /   Unit Tests   \  (60-70% - Components, hooks, utils)
             /------------------\
```

### 1.2 Testing Tools Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| Unit Tests | Vitest + React Testing Library | Components, hooks, utilities |
| Integration Tests | Vitest + node-mocks-http | API routes, service layer |
| E2E Tests | Playwright | Critical user journeys |
| Background Jobs | Vitest + Trigger.dev Test Mode | Scheduled tasks |
| Database | Supabase Local + pg-tap | Migration validation |
| Performance | k6 or Artillery | Load testing |

### 1.3 Test Environment Strategy

| Environment | Purpose | Data Source |
|-------------|---------|-------------|
| Local Development | Developer testing | Supabase local, mock data |
| CI Environment | Automated pipeline | Test containers, fixtures |
| Staging | Pre-production validation | Sanitized prod copy |
| Production Smoke | Post-deploy validation | Read-only checks |

---

## 2. Test Coverage Matrix

### 2.1 API Routes (100+ routes identified)

#### Priority 1: Critical Path (Must Have)
| Route | Methods | Current Tests | Priority | Complexity |
|-------|---------|---------------|----------|------------|
| `/api/approvals` | GET, POST, PATCH | YES | P1 | Medium |
| `/api/auth/pinterest/*` | GET | NO | P1 | High |
| `/api/pins/*` | GET, POST, PATCH | NO | P1 | High |
| `/api/pinterest/pins/publish` | POST | NO | P1 | High |
| `/api/products` | GET, POST | NO | P1 | Medium |
| `/api/leads` | GET, POST | YES | P1 | Low |
| `/api/boards` | GET | NO | P1 | Low |
| `/api/integrations/*` | GET, POST, DELETE | NO | P1 | High |
| `/api/mockups/*` | GET, POST | NO | P1 | High |

#### Priority 2: Business Critical (Should Have)
| Route | Methods | Current Tests | Priority | Complexity |
|-------|---------|---------------|----------|------------|
| `/api/coupons/*` | GET, POST, PATCH, DELETE | YES | P2 | Medium |
| `/api/customers/*` | GET | NO | P2 | Medium |
| `/api/intelligence/*` | GET | NO | P2 | High |
| `/api/pinterest/analytics/*` | GET | YES | P2 | Medium |
| `/api/pinterest/campaigns/*` | GET, POST, PATCH | NO | P2 | High |
| `/api/pinterest/creative-health/*` | GET, POST | NO | P2 | Medium |
| `/api/content-pillars/*` | GET, POST | NO | P2 | Medium |
| `/api/ab-tests/*` | GET, POST, PATCH | NO | P2 | High |

#### Priority 3: Supporting Features (Nice to Have)
| Route | Methods | Current Tests | Priority | Complexity |
|-------|---------|---------------|----------|------------|
| `/api/cron/*` (14 endpoints) | GET | NO | P3 | Medium |
| `/api/calendar` | GET | NO | P3 | Low |
| `/api/export` | POST | NO | P3 | Medium |
| `/api/links` | GET, POST | NO | P3 | Low |
| `/api/quiz/*` | GET, POST | NO | P3 | Medium |
| `/api/popups/*` | GET, POST, PATCH | NO | P3 | Medium |
| `/api/gifts/*` | GET, POST | NO | P3 | Medium |

### 2.2 Background Jobs (Trigger.dev)

| Task | Schedule | Current Tests | Priority | Test Approach |
|------|----------|---------------|----------|---------------|
| `pin-publisher` | Every 15 min | NO | P1 | Unit + Integration |
| `pin-retry` | Every 6 hours | NO | P1 | Unit |
| `daily-digest` | Hourly | NO | P2 | Unit + Integration |
| `daily-analysis` | 4 AM UTC | NO | P2 | Unit |
| `mockup-generator` | On-demand | NO | P1 | Unit + Integration |
| `design-engine` | On-demand | NO | P2 | Unit |
| `winner-refresh` | Scheduled | NO | P2 | Unit |
| `export-generator` | On-demand | NO | P3 | Unit |
| `auto-mockup-queue` | On-demand | NO | P2 | Unit |
| `instagram-*` (4 tasks) | Various | NO | P2 | Unit + Integration |

### 2.3 React Components (80+ components)

#### Priority 1: Core UI Components
| Component | Current Tests | Priority | Test Focus |
|-----------|---------------|----------|------------|
| `Button` | YES | P1 | Variants, states, accessibility |
| `Input` | YES | P1 | Validation, states |
| `Modal` | NO | P1 | Open/close, accessibility |
| `Select` | NO | P1 | Options, keyboard nav |
| `Tabs` | NO | P1 | Navigation, accessibility |
| `Card` | NO | P2 | Rendering |
| `Sheet` | NO | P2 | Open/close, accessibility |
| `Toast` | NO | P2 | Show/hide, variants |

#### Priority 2: Feature Components
| Component | Current Tests | Priority | Test Focus |
|-----------|---------------|----------|------------|
| `approval-queue/*` | NO | P1 | List rendering, actions |
| `dashboard/*` (8 widgets) | NO | P1 | Data display, interactions |
| `pinterest/*` (12 components) | NO | P1 | Charts, analytics display |
| `mockups/*` | NO | P2 | Credit display, generation |
| `customers/*` | NO | P2 | Journey visualization |
| `calendar/*` | NO | P2 | Event display, interactions |
| `landing-pages/builder/*` | NO | P3 | Drag-drop, editing |
| `instagram/*` | NO | P2 | Post creation, scheduling |

### 2.4 Custom Hooks (13 hooks)

| Hook | Current Tests | Priority | Test Focus |
|------|---------------|----------|------------|
| `use-auth` | Partial | P1 | Session management |
| `use-approval-queue` | NO | P1 | CRUD operations |
| `use-approval-realtime` | NO | P1 | Real-time updates |
| `use-toast` | NO | P1 | Show/hide, variants |
| `use-quotes` | NO | P2 | CRUD operations |
| `use-calendar` | NO | P2 | Event management |
| `use-content-pillars` | NO | P2 | Data fetching |
| `use-popups` | NO | P3 | Display logic |
| `use-referrals` | NO | P3 | Stats tracking |
| `use-export` | NO | P3 | Export operations |
| `use-announcer` | NO | P2 | Accessibility |
| `use-winner-notifications` | NO | P2 | Alert system |
| `use-operator-mode-helpers` | NO | P3 | Mode switching |

### 2.5 E2E User Journeys

| Journey | Current Tests | Priority | Steps |
|---------|---------------|----------|-------|
| Authentication | YES | P1 | Login, signup, logout, password reset |
| Dashboard | YES | P1 | Load, widgets, navigation |
| Pinterest Integration | Partial | P1 | Connect, create pin, schedule, analytics |
| Approval Workflow | NO | P1 | View queue, approve, reject, bulk actions |
| Mockup Generation | NO | P1 | Select template, generate, approve |
| Settings | YES | P2 | Update settings, integrations |
| Email Workflows | NO | P2 | Create, test, activate |
| Accessibility | YES | P2 | Keyboard nav, screen reader |
| Lead Capture | NO | P3 | Quiz, popup, form submission |
| Customer Journey | NO | P3 | View customers, journey stages |

---

## 3. Test File Structure

### 3.1 Directory Organization

```
haven-hub-v2/
├── tests/                          # Unit + Integration tests
│   ├── setup.ts                    # Global test setup
│   ├── mocks/                      # Shared mocks
│   │   ├── supabase.ts            # Supabase client mock
│   │   ├── next-request.ts        # NextRequest mock
│   │   ├── trigger.ts             # Trigger.dev mock
│   │   ├── pinterest-api.ts       # Pinterest API mock
│   │   ├── klaviyo-api.ts         # Klaviyo API mock
│   │   └── dynamic-mockups-api.ts # Dynamic Mockups mock
│   ├── fixtures/                   # Test data
│   │   ├── users.ts               # User fixtures
│   │   ├── pins.ts                # Pin fixtures
│   │   ├── approvals.ts           # Approval fixtures
│   │   └── products.ts            # Product fixtures
│   ├── utils/                      # Test utilities
│   │   ├── test-utils.tsx         # React testing utilities
│   │   ├── api-utils.ts           # API testing utilities
│   │   └── db-utils.ts            # Database test utilities
│   ├── unit/                       # Pure unit tests
│   │   ├── utils.test.ts          # Utility functions
│   │   ├── hooks.test.tsx         # React hooks
│   │   └── services/              # Service layer tests
│   │       ├── coupon-service.test.ts
│   │       ├── campaign-service.test.ts
│   │       └── ...
│   ├── components/                 # Component tests
│   │   ├── ui/                    # Base UI components
│   │   │   ├── button.test.tsx
│   │   │   ├── input.test.tsx
│   │   │   ├── modal.test.tsx
│   │   │   └── ...
│   │   ├── dashboard/             # Dashboard components
│   │   ├── pinterest/             # Pinterest components
│   │   └── approval-queue/        # Approval components
│   ├── integration/                # Integration tests
│   │   ├── api/                   # API route tests
│   │   │   ├── approvals.test.ts
│   │   │   ├── pins.test.ts
│   │   │   ├── products.test.ts
│   │   │   └── ...
│   │   └── services/              # Service integration
│   │       ├── pinterest-client.test.ts
│   │       └── klaviyo-client.test.ts
│   └── trigger/                    # Trigger.dev task tests
│       ├── pin-publisher.test.ts
│       ├── daily-digest.test.ts
│       └── mockup-generator.test.ts
├── e2e/                            # End-to-end tests
│   ├── global.setup.ts            # Auth setup
│   ├── fixtures/                   # E2E fixtures
│   │   └── auth.fixture.ts
│   ├── auth.spec.ts               # Auth flows
│   ├── dashboard.spec.ts          # Dashboard tests
│   ├── pinterest.spec.ts          # Pinterest flows
│   ├── approvals.spec.ts          # Approval workflow
│   ├── mockups.spec.ts            # Mockup generation
│   ├── email-workflows.spec.ts    # Email workflows
│   ├── settings.spec.ts           # Settings tests
│   └── accessibility.spec.ts      # A11y tests
└── coverage/                       # Coverage reports
```

### 3.2 Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Unit test | `*.test.ts(x)` | `button.test.tsx` |
| Integration test | `*.test.ts` | `approvals.test.ts` |
| E2E test | `*.spec.ts` | `auth.spec.ts` |
| Test fixture | `*.fixture.ts` | `auth.fixture.ts` |
| Mock file | `*-mock.ts` or inside `mocks/` | `supabase.ts` |

---

## 4. Implementation Plan

### Phase 1: Foundation (Week 1-2)

**Goals:** Establish testing infrastructure and cover critical paths

**Tasks:**
1. Create comprehensive mock files:
   - [ ] `/tests/mocks/pinterest-api.ts`
   - [ ] `/tests/mocks/klaviyo-api.ts`
   - [ ] `/tests/mocks/dynamic-mockups-api.ts`
   - [ ] `/tests/mocks/trigger.ts`

2. Create test fixtures:
   - [ ] `/tests/fixtures/users.ts`
   - [ ] `/tests/fixtures/pins.ts`
   - [ ] `/tests/fixtures/approvals.ts`
   - [ ] `/tests/fixtures/products.ts`

3. Add P1 API tests:
   - [ ] `/tests/integration/api/pins.test.ts`
   - [ ] `/tests/integration/api/products.test.ts`
   - [ ] `/tests/integration/api/boards.test.ts`
   - [ ] `/tests/integration/api/integrations.test.ts`
   - [ ] `/tests/integration/api/mockups.test.ts`

4. Add P1 component tests:
   - [ ] `/tests/components/ui/modal.test.tsx`
   - [ ] `/tests/components/ui/select.test.tsx`
   - [ ] `/tests/components/ui/tabs.test.tsx`
   - [ ] `/tests/components/approval-queue/approval-queue-list.test.tsx`

**Estimated Effort:** 40 hours

### Phase 2: Business Logic (Week 3-4)

**Goals:** Cover business-critical services and background jobs

**Tasks:**
1. Add Trigger.dev task tests:
   - [ ] `/tests/trigger/pin-publisher.test.ts`
   - [ ] `/tests/trigger/mockup-generator.test.ts`
   - [ ] `/tests/trigger/daily-digest.test.ts`

2. Add service layer tests:
   - [ ] `/tests/unit/services/coupon-service.test.ts`
   - [ ] `/tests/unit/services/campaign-service.test.ts`
   - [ ] `/tests/unit/services/intelligence-service.test.ts`
   - [ ] `/tests/unit/services/pinterest-analytics.test.ts`

3. Add P2 API tests:
   - [ ] `/tests/integration/api/customers.test.ts`
   - [ ] `/tests/integration/api/intelligence.test.ts`
   - [ ] `/tests/integration/api/pinterest-campaigns.test.ts`
   - [ ] `/tests/integration/api/ab-tests.test.ts`

4. Add hook tests:
   - [ ] `/tests/unit/hooks/use-approval-queue.test.ts`
   - [ ] `/tests/unit/hooks/use-toast.test.ts`
   - [ ] `/tests/unit/hooks/use-quotes.test.ts`

**Estimated Effort:** 40 hours

### Phase 3: E2E Coverage (Week 5-6)

**Goals:** Complete E2E coverage for critical user journeys

**Tasks:**
1. Expand E2E tests:
   - [ ] `/e2e/approvals.spec.ts` - Full approval workflow
   - [ ] `/e2e/mockups.spec.ts` - Mockup generation flow
   - [ ] `/e2e/email-workflows.spec.ts` - Email workflow management
   - [ ] `/e2e/instagram.spec.ts` - Instagram posting flow

2. Add visual regression testing:
   - [ ] Configure Playwright screenshots
   - [ ] Set up baseline images
   - [ ] Add visual diff assertions

3. Performance testing setup:
   - [ ] Install k6 or Artillery
   - [ ] Create load test scripts for critical APIs
   - [ ] Set performance baselines

**Estimated Effort:** 30 hours

### Phase 4: CI/CD Integration (Week 7)

**Goals:** Automate testing in deployment pipeline

**Tasks:**
1. Create GitHub Actions workflow:
   - [ ] Unit test job
   - [ ] Integration test job
   - [ ] E2E test job
   - [ ] Coverage reporting

2. Configure test environments:
   - [ ] Supabase local for CI
   - [ ] Environment variables
   - [ ] Test database seeding

3. Add pre-commit hooks:
   - [ ] Lint-staged configuration
   - [ ] Pre-commit test running

**Estimated Effort:** 16 hours

---

## 5. CI/CD Integration

### 5.1 GitHub Actions Workflow

Create `.github/workflows/test.yml`:

```yaml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.TEST_SUPABASE_SERVICE_KEY }}

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check

  unit-tests:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:unit -- --coverage
      - uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          flags: unit

  integration-tests:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:integration -- --coverage
      - uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          flags: integration

  e2e-tests:
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run build
      - run: npm run e2e
        env:
          E2E_TEST_EMAIL: ${{ secrets.E2E_TEST_EMAIL }}
          E2E_TEST_PASSWORD: ${{ secrets.E2E_TEST_PASSWORD }}
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7

  coverage-report:
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests]
    steps:
      - uses: actions/checkout@v4
      - run: echo "Coverage threshold check"
      # Add coverage threshold enforcement
```

### 5.2 Pre-commit Configuration

Create `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx lint-staged
```

Create `.lintstagedrc.js`:

```javascript
module.exports = {
  '*.{ts,tsx}': [
    'eslint --fix',
    'vitest related --run'
  ],
  '*.{json,md}': [
    'prettier --write'
  ]
};
```

### 5.3 Coverage Thresholds

Update `vitest.config.ts` coverage thresholds by phase:

| Phase | Statements | Branches | Functions | Lines |
|-------|------------|----------|-----------|-------|
| Current | 60% | 60% | 60% | 60% |
| Phase 2 | 70% | 65% | 70% | 70% |
| Phase 3 | 75% | 70% | 75% | 75% |
| Target | 80% | 75% | 80% | 80% |

---

## 6. Testing Best Practices

### 6.1 API Testing Patterns

```typescript
// tests/integration/api/example.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { TEST_USER_ID } from '../../setup';
import { createMockQueryBuilder } from '../../mocks/supabase';

// Mock auth first
vi.mock('@/lib/auth/session', () => ({
  getApiUserId: vi.fn(() => Promise.resolve(TEST_USER_ID)),
}));

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: { getUser: () => Promise.resolve({ data: { user: { id: TEST_USER_ID } } }) },
    from: vi.fn((table) => createMockQueryBuilder(mockData[table])),
  })),
}));

describe('Example API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 for unauthenticated requests', async () => {
    // Override auth mock for this test
    vi.mocked(getApiUserId).mockResolvedValueOnce(null);

    const { GET } = await import('@/app/api/example/route');
    const response = await GET(new NextRequest('http://localhost/api/example'));

    expect(response.status).toBe(401);
  });

  it('returns expected data for authenticated requests', async () => {
    const { GET } = await import('@/app/api/example/route');
    const response = await GET(new NextRequest('http://localhost/api/example'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('items');
  });
});
```

### 6.2 Component Testing Patterns

```typescript
// tests/components/example.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, waitFor } from '../utils/test-utils';
import { ExampleComponent } from '@/components/example';

// Mock fetch for data loading
global.fetch = vi.fn();

describe('ExampleComponent', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    } as Response);
  });

  it('renders loading state initially', () => {
    renderWithProviders(<ExampleComponent />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders data after loading', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [{ id: '1', name: 'Test' }] }),
    } as Response);

    renderWithProviders(<ExampleComponent />);

    await waitFor(() => {
      expect(screen.getByText('Test')).toBeInTheDocument();
    });
  });

  it('renders error state on failure', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Failed'));

    renderWithProviders(<ExampleComponent />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
```

### 6.3 Trigger.dev Testing Patterns

```typescript
// tests/trigger/pin-publisher.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
  auth: { admin: { getUserById: vi.fn() } },
  rpc: vi.fn(),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabase,
}));

// Mock the logger
vi.mock('@trigger.dev/sdk/v3', () => ({
  schedules: {
    task: vi.fn((config) => ({ ...config, run: config.run })),
  },
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('Pin Publisher Task', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns early when no pins are scheduled', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    const { pinPublisherTask } = await import('@/trigger/pin-publisher');
    const result = await pinPublisherTask.run();

    expect(result).toEqual({ published: 0, failed: 0, total: 0 });
  });

  it('publishes scheduled pins successfully', async () => {
    const mockPins = [
      { id: '1', user_id: 'user-1', board_id: 'board-1', /* ... */ },
    ];

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: mockPins, error: null }),
      update: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { pinterest_board_id: 'pb-1' } }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    });

    mockSupabase.rpc.mockResolvedValue({ data: 'mock-access-token', error: null });

    // Mock Pinterest API
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'pinterest-pin-id' }),
    });

    const { pinPublisherTask } = await import('@/trigger/pin-publisher');
    const result = await pinPublisherTask.run();

    expect(result.published).toBe(1);
    expect(result.failed).toBe(0);
  });
});
```

### 6.4 E2E Testing Patterns

```typescript
// e2e/approvals.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Approval Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure authenticated
    await page.goto('/dashboard/approvals');
    await page.waitForLoadState('networkidle');
  });

  test('should display approval queue', async ({ page }) => {
    // Wait for content to load
    const queue = page.locator('[data-testid="approval-queue"]');
    await expect(queue).toBeVisible({ timeout: 10000 });
  });

  test('should approve an item', async ({ page }) => {
    // Find first approval item
    const firstItem = page.locator('[data-testid="approval-item"]').first();

    // Click approve button
    await firstItem.locator('button:has-text("Approve")').click();

    // Confirm approval
    await page.locator('[data-testid="confirm-approve"]').click();

    // Verify success toast
    await expect(page.locator('[role="alert"]')).toContainText('approved');
  });

  test('should reject an item with reason', async ({ page }) => {
    const firstItem = page.locator('[data-testid="approval-item"]').first();

    await firstItem.locator('button:has-text("Reject")').click();

    // Fill in rejection reason
    await page.fill('[name="rejection-reason"]', 'Quality does not meet standards');
    await page.click('[data-testid="confirm-reject"]');

    await expect(page.locator('[role="alert"]')).toContainText('rejected');
  });

  test('should filter by type', async ({ page }) => {
    await page.selectOption('[data-testid="type-filter"]', 'pin');

    // Wait for filtered results
    await page.waitForResponse(response =>
      response.url().includes('/api/approvals') &&
      response.url().includes('type=pin')
    );

    // Verify all visible items are pins
    const items = page.locator('[data-testid="approval-item"]');
    const count = await items.count();

    for (let i = 0; i < count; i++) {
      await expect(items.nth(i)).toHaveAttribute('data-type', 'pin');
    }
  });
});
```

---

## 7. Additional Testing Recommendations

### 7.1 Database Migration Testing

Create a migration test script:

```bash
#!/bin/bash
# scripts/test-migrations.sh

echo "Testing database migrations..."

# Reset local database
npx supabase db reset

# Run migrations
npx supabase db push

# Verify tables exist
npx supabase db lint

# Run pg-tap tests if configured
# psql -f tests/db/run-tests.sql

echo "Migration tests complete!"
```

### 7.2 Security Testing

Add security-focused tests:

1. **Authentication Tests:**
   - Token expiration handling
   - Session invalidation
   - Protected route access

2. **Authorization Tests:**
   - User can only access own data
   - Admin-only endpoints
   - Rate limiting enforcement

3. **Input Validation Tests:**
   - SQL injection prevention
   - XSS prevention
   - File upload validation

### 7.3 Performance Testing

Create k6 load test scripts:

```javascript
// tests/performance/api-load.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up
    { duration: '1m', target: 20 },   // Sustain
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],   // Error rate under 1%
  },
};

export default function () {
  const response = http.get('http://localhost:3000/api/approvals', {
    headers: { Authorization: `Bearer ${__ENV.AUTH_TOKEN}` },
  });

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

### 7.4 Accessibility Testing

Extend Playwright tests with axe-core:

```typescript
// e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  const pages = [
    '/login',
    '/dashboard',
    '/dashboard/approvals',
    '/dashboard/pinterest/analytics',
  ];

  for (const url of pages) {
    test(`${url} should have no accessibility violations`, async ({ page }) => {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }
});
```

---

## 8. Metrics and Monitoring

### 8.1 Coverage Targets by Phase

| Metric | Phase 1 | Phase 2 | Phase 3 | Target |
|--------|---------|---------|---------|--------|
| Line Coverage | 65% | 72% | 78% | 80% |
| Branch Coverage | 60% | 67% | 72% | 75% |
| API Route Coverage | 40% | 70% | 90% | 100% |
| Component Coverage | 30% | 55% | 75% | 80% |
| E2E Journey Coverage | 3/10 | 6/10 | 9/10 | 10/10 |

### 8.2 Test Performance Benchmarks

| Test Type | Max Duration | Target |
|-----------|--------------|--------|
| Unit Tests (all) | 60s | 45s |
| Integration Tests (all) | 120s | 90s |
| E2E Tests (all) | 300s | 240s |
| Full Suite | 480s | 360s |

### 8.3 Flaky Test Monitoring

Track and address flaky tests:

1. Configure test retries in CI
2. Tag flaky tests for investigation
3. Set threshold: < 2% flaky rate
4. Review weekly and fix or quarantine

---

## 9. Appendix

### A. NPM Scripts Reference

```json
{
  "test": "vitest",
  "test:run": "vitest run",
  "test:watch": "vitest --watch",
  "test:coverage": "vitest run --coverage",
  "test:ui": "vitest --ui",
  "test:unit": "vitest run tests/unit",
  "test:integration": "vitest run tests/integration",
  "test:components": "vitest run tests/components",
  "test:trigger": "vitest run tests/trigger",
  "e2e": "playwright test",
  "e2e:ui": "playwright test --ui",
  "e2e:headed": "playwright test --headed",
  "e2e:debug": "playwright test --debug",
  "e2e:report": "playwright show-report",
  "test:all": "npm run test:run && npm run e2e",
  "test:ci": "npm run test:run -- --reporter=junit && npm run e2e -- --reporter=junit"
}
```

### B. Required Environment Variables for Testing

```env
# Test Supabase (local or dedicated test project)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key
SUPABASE_SERVICE_ROLE_KEY=test-service-role-key

# E2E Test Credentials
E2E_TEST_EMAIL=test@example.com
E2E_TEST_PASSWORD=test-password

# Mock API Keys (for integration tests)
PINTEREST_CLIENT_ID=test-pinterest-id
PINTEREST_CLIENT_SECRET=test-pinterest-secret
KLAVIYO_API_KEY=test-klaviyo-key
DYNAMIC_MOCKUPS_API_KEY=test-mockups-key
```

### C. Test Data Seeding

```sql
-- scripts/seed-test-data.sql
-- Run after database reset for testing

-- Create test user
INSERT INTO auth.users (id, email)
VALUES ('test-user-id', 'test@example.com');

-- Create user settings
INSERT INTO user_settings (user_id, store_name)
VALUES ('test-user-id', 'Test Store');

-- Create test pins
INSERT INTO pins (id, user_id, board_id, title, status)
VALUES
  ('pin-1', 'test-user-id', 'board-1', 'Test Pin 1', 'scheduled'),
  ('pin-2', 'test-user-id', 'board-1', 'Test Pin 2', 'published');

-- Create test approval items
INSERT INTO approval_items (id, user_id, type, status, content)
VALUES
  ('approval-1', 'test-user-id', 'pin', 'pending', '{"title": "Test"}'),
  ('approval-2', 'test-user-id', 'asset', 'pending', '{"subject": "Test"}');
```

---

## 10. Next Steps

1. **Immediate (This Week):**
   - Review and approve this testing strategy
   - Set up mock files for external APIs
   - Create test fixtures

2. **Short Term (Next 2 Weeks):**
   - Implement Phase 1 tests (P1 APIs and components)
   - Set up GitHub Actions workflow
   - Establish coverage baseline

3. **Medium Term (Month 1-2):**
   - Complete Phase 2 and 3
   - Reach 80% coverage target
   - Add performance testing

4. **Long Term (Ongoing):**
   - Maintain coverage levels
   - Monitor test health
   - Continuous improvement

---

**Document Version:** 1.0
**Last Updated:** December 29, 2024
**Author:** Claude Code (Chief Architect)
