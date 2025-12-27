import { test as base, type Page, type BrowserContext } from '@playwright/test';

// Test credentials (use test accounts)
export const TEST_USER = {
  email: process.env.E2E_TEST_EMAIL || 'test@example.com',
  password: process.env.E2E_TEST_PASSWORD || 'testpassword123',
};

// Extend base test with authentication
export const test = base.extend<{
  authenticatedPage: Page;
  authenticatedContext: BrowserContext;
}>({
  authenticatedPage: async ({ browser }, use) => {
    // Create a new context with stored auth state if available
    const context = await browser.newContext({
      storageState: process.env.AUTH_STATE_PATH || undefined,
    });

    const page = await context.newPage();

    // If no stored state, perform login
    if (!process.env.AUTH_STATE_PATH) {
      await page.goto('/login');

      // Wait for the login form to be visible
      await page.waitForSelector('input[type="email"]', { timeout: 10000 });

      // Fill in credentials
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);

      // Submit form
      await page.click('button[type="submit"]');

      // Wait for navigation to dashboard
      await page.waitForURL('**/dashboard**', { timeout: 30000 });
    }

    await use(page);

    await context.close();
  },

  authenticatedContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: process.env.AUTH_STATE_PATH || undefined,
    });

    await use(context);

    await context.close();
  },
});

export { expect } from '@playwright/test';

// Helper function to login programmatically
export async function loginUser(page: Page, email?: string, password?: string) {
  await page.goto('/login');

  await page.waitForSelector('input[type="email"]');

  await page.fill('input[type="email"]', email || TEST_USER.email);
  await page.fill('input[type="password"]', password || TEST_USER.password);

  await page.click('button[type="submit"]');

  // Wait for successful login
  await page.waitForURL('**/dashboard**', { timeout: 30000 });
}

// Helper function to logout
export async function logoutUser(page: Page) {
  // Click on user menu or logout button
  const logoutButton = page.locator('[data-testid="logout-button"], button:has-text("Sign out")');

  if (await logoutButton.isVisible()) {
    await logoutButton.click();
  } else {
    // Navigate directly to logout
    await page.goto('/logout');
  }

  // Wait for redirect to login
  await page.waitForURL('**/login**', { timeout: 10000 });
}
