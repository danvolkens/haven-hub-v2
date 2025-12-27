import { test, expect } from '@playwright/test';

test.describe('Pinterest Integration Pages', () => {
  test.skip(
    !process.env.E2E_TEST_EMAIL,
    'Skipping authenticated tests - no credentials provided'
  );

  test('should load Pinterest analytics page', async ({ page }) => {
    await page.goto('/dashboard/pinterest/analytics');

    // Wait for page load
    await page.waitForLoadState('networkidle');

    // Check for analytics content or loading state
    const pageContent = page.locator('main, [role="main"]');
    await expect(pageContent).toBeVisible({ timeout: 10000 });

    // Look for typical analytics elements
    const headings = page.locator('h1, h2, h3');
    await expect(headings.first()).toBeVisible({ timeout: 10000 });
  });

  test('should load content mix page', async ({ page }) => {
    await page.goto('/dashboard/pinterest/analytics/content-mix');

    await page.waitForLoadState('networkidle');

    // Page should load without error
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
  });

  test('should load A/B tests page', async ({ page }) => {
    await page.goto('/dashboard/pinterest/ab-tests');

    await page.waitForLoadState('networkidle');

    // Check page loaded
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
  });

  test('should load campaign wizard page', async ({ page }) => {
    await page.goto('/dashboard/pinterest/campaign-wizard');

    await page.waitForLoadState('networkidle');

    // Check for wizard content
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
  });

  test('should load performance rules page', async ({ page }) => {
    await page.goto('/dashboard/pinterest/settings/performance-rules');

    await page.waitForLoadState('networkidle');

    // Check for performance rules content
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    // Look for rules heading
    const heading = page.locator('text=Performance Rules');
    await expect(heading).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Pinterest - Board Management', () => {
  test.skip(
    !process.env.E2E_TEST_EMAIL,
    'Skipping authenticated tests - no credentials provided'
  );

  test('should display boards if Pinterest is connected', async ({ page }) => {
    await page.goto('/dashboard/pinterest/analytics');

    // Wait for page to stabilize
    await page.waitForLoadState('networkidle');

    // Either boards are shown or a connect prompt
    const hasBoardsOrPrompt = await Promise.race([
      page.locator('[class*="board"], text=Board').first().waitFor({ timeout: 5000 }).then(() => true),
      page.locator('text=Connect Pinterest, text=connect your Pinterest').first().waitFor({ timeout: 5000 }).then(() => true),
    ]).catch(() => false);

    expect(hasBoardsOrPrompt).toBeTruthy();
  });
});

test.describe('Pinterest - Pin Creation', () => {
  test.skip(
    !process.env.E2E_TEST_EMAIL,
    'Skipping authenticated tests - no credentials provided'
  );

  test('should have create pin functionality', async ({ page }) => {
    await page.goto('/dashboard');

    // Look for create pin button or link
    const createPinButton = page.locator(
      'button:has-text("Create Pin"), a:has-text("Create Pin"), [data-testid="create-pin"]'
    );

    // May or may not be visible depending on integration status
    const isVisible = await createPinButton.first().isVisible().catch(() => false);

    if (isVisible) {
      await createPinButton.first().click();

      // Should open a modal or navigate to creation page
      const hasDialog = await page.locator('[role="dialog"]').isVisible().catch(() => false);
      const hasNavigated = page.url().includes('create') || page.url().includes('new');

      expect(hasDialog || hasNavigated).toBeTruthy();
    }
  });
});
