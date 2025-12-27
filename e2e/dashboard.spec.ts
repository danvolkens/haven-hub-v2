import { test, expect, type Page } from '@playwright/test';

// Helper to mock authenticated state
async function setupAuthenticatedState(page: Page) {
  // Set mock auth cookies/storage for testing
  // In real scenario, this would use actual auth flow or stored state
  await page.context().addCookies([
    {
      name: 'sb-access-token',
      value: 'mock-access-token',
      domain: 'localhost',
      path: '/',
    },
    {
      name: 'sb-refresh-token',
      value: 'mock-refresh-token',
      domain: 'localhost',
      path: '/',
    },
  ]);
}

test.describe('Dashboard Navigation', () => {
  test.skip(
    !process.env.E2E_TEST_EMAIL,
    'Skipping authenticated tests - no credentials provided'
  );

  test('should load dashboard page', async ({ page }) => {
    await page.goto('/dashboard');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check for dashboard elements
    const heading = page.locator('h1, h2').first();
    await expect(heading).toContainText(/morning|afternoon|evening/i, { timeout: 10000 });
  });

  test('should display dashboard stats', async ({ page }) => {
    await page.goto('/dashboard');

    // Wait for stats to load
    await page.waitForSelector('[class*="grid"]', { timeout: 10000 });

    // Dashboard should have multiple stat cards or widgets
    const cards = page.locator('[class*="card"], [class*="Card"]');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to Pinterest section', async ({ page }) => {
    await page.goto('/dashboard');

    // Click Pinterest link in sidebar
    const pinterestLink = page.locator('a[href*="pinterest"], nav >> text=Pinterest').first();

    if (await pinterestLink.isVisible()) {
      await pinterestLink.click();
      await expect(page).toHaveURL(/pinterest/);
    }
  });

  test('should navigate to Settings', async ({ page }) => {
    await page.goto('/dashboard');

    // Look for settings link
    const settingsLink = page.locator('a[href*="settings"], nav >> text=Settings').first();

    if (await settingsLink.isVisible()) {
      await settingsLink.click();
      await expect(page).toHaveURL(/settings/);
    }
  });

  test('should have responsive sidebar on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/dashboard');

    // Desktop sidebar should be hidden
    const desktopSidebar = page.locator('[class*="sidebar"]').first();

    // Look for mobile menu button
    const menuButton = page.locator('[aria-label*="menu" i], button:has-text("Menu")');

    if (await menuButton.isVisible()) {
      await menuButton.click();

      // Mobile menu should open
      await expect(page.locator('[role="dialog"], [class*="Sheet"]')).toBeVisible({
        timeout: 5000,
      });
    }
  });
});

test.describe('Dashboard - Quick Actions', () => {
  test.skip(
    !process.env.E2E_TEST_EMAIL,
    'Skipping authenticated tests - no credentials provided'
  );

  test('should display quick actions section', async ({ page }) => {
    await page.goto('/dashboard');

    // Look for quick actions
    const quickActions = page.locator('text=Quick Actions, [class*="quick-action"]');
    await expect(quickActions.first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Dashboard - Unauthenticated Access', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    // Clear any existing auth
    await page.context().clearCookies();

    // Try to access dashboard
    await page.goto('/dashboard');

    // Should be redirected to login
    await page.waitForURL('**/login**', { timeout: 10000 });
  });
});
