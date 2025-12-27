import { test, expect } from '@playwright/test';

test.describe('Settings Pages', () => {
  test.skip(
    !process.env.E2E_TEST_EMAIL,
    'Skipping authenticated tests - no credentials provided'
  );

  test('should load setup page', async ({ page }) => {
    await page.goto('/dashboard/setup');

    await page.waitForLoadState('networkidle');

    // Check for setup page content
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    // Should have setup steps or integrations
    const setupContent = page.locator('text=Setup, text=Get Started, text=Connect');
    await expect(setupContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('should load data export page', async ({ page }) => {
    await page.goto('/dashboard/settings/data');

    await page.waitForLoadState('networkidle');

    // Check for data page content
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
  });

  test('should load mockups settings page', async ({ page }) => {
    await page.goto('/dashboard/settings/mockups');

    await page.waitForLoadState('networkidle');

    // Check for mockups settings content
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
  });

  test('should display integration status', async ({ page }) => {
    await page.goto('/dashboard/setup');

    await page.waitForLoadState('networkidle');

    // Look for integration cards or sections
    const integrationSections = page.locator(
      '[class*="integration"], [class*="card"], text=Shopify, text=Pinterest, text=Klaviyo'
    );

    await expect(integrationSections.first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Settings - Integrations', () => {
  test.skip(
    !process.env.E2E_TEST_EMAIL,
    'Skipping authenticated tests - no credentials provided'
  );

  test('should have Shopify integration option', async ({ page }) => {
    await page.goto('/dashboard/setup');

    const shopifySection = page.locator('text=Shopify');
    await expect(shopifySection.first()).toBeVisible({ timeout: 10000 });
  });

  test('should have Pinterest integration option', async ({ page }) => {
    await page.goto('/dashboard/setup');

    const pinterestSection = page.locator('text=Pinterest');
    await expect(pinterestSection.first()).toBeVisible({ timeout: 10000 });
  });

  test('should have Klaviyo integration option', async ({ page }) => {
    await page.goto('/dashboard/setup');

    const klaviyoSection = page.locator('text=Klaviyo');
    await expect(klaviyoSection.first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Settings - Operator Mode', () => {
  test.skip(
    !process.env.E2E_TEST_EMAIL,
    'Skipping authenticated tests - no credentials provided'
  );

  test('should access operator mode settings if available', async ({ page }) => {
    await page.goto('/dashboard');

    // Look for operator mode toggle or settings
    const operatorMode = page.locator(
      '[data-testid="operator-mode"], text=Operator Mode, text=Automation'
    );

    if (await operatorMode.first().isVisible().catch(() => false)) {
      await operatorMode.first().click();

      // Should see operator mode options
      await expect(
        page.locator('text=Guardrails, text=Rules, text=Settings')
      ).toBeVisible({ timeout: 5000 });
    }
  });
});
