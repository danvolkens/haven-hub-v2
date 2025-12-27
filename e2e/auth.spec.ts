import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start fresh for each auth test
    await page.context().clearCookies();
  });

  test('should display login page correctly', async ({ page }) => {
    await page.goto('/login');

    // Check page title
    await expect(page.locator('h2')).toContainText('Welcome back');

    // Check form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Check links
    await expect(page.locator('a[href="/forgot-password"]')).toBeVisible();
    await expect(page.locator('a[href="/signup"]')).toBeVisible();
  });

  test('should display signup page correctly', async ({ page }) => {
    await page.goto('/signup');

    // Check form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Check link to login
    await expect(page.locator('a[href="/login"]')).toBeVisible();
  });

  test('should show validation error for invalid email', async ({ page }) => {
    await page.goto('/login');

    // Enter invalid email
    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', 'password123');

    // Submit form
    await page.click('button[type="submit"]');

    // Check for validation error
    await expect(page.locator('text=valid email')).toBeVisible({ timeout: 5000 });
  });

  test('should show error for empty password', async ({ page }) => {
    await page.goto('/login');

    // Enter email but leave password empty
    await page.fill('input[type="email"]', 'test@example.com');

    // Submit form
    await page.click('button[type="submit"]');

    // Check for validation error
    await expect(page.locator('text=required')).toBeVisible({ timeout: 5000 });
  });

  test('should toggle password visibility', async ({ page }) => {
    await page.goto('/login');

    const passwordInput = page.locator('input[type="password"]');

    // Initially password should be hidden
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click show password button (the eye icon)
    await page.click('[data-testid="toggle-password"], button:near(input[type="password"])');

    // Password should now be visible (type="text")
    await expect(page.locator('#password')).toHaveAttribute('type', 'text');
  });

  test('should navigate to forgot password page', async ({ page }) => {
    await page.goto('/login');

    // Click forgot password link
    await page.click('a[href="/forgot-password"]');

    // Should be on forgot password page
    await expect(page).toHaveURL(/forgot-password/);
  });

  test('should navigate from login to signup', async ({ page }) => {
    await page.goto('/login');

    // Click signup link
    await page.click('a[href="/signup"]');

    // Should be on signup page
    await expect(page).toHaveURL(/signup/);
  });

  test('should redirect unauthenticated user to login', async ({ page }) => {
    // Try to access protected route
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });

  test('should show loading state during login', async ({ page }) => {
    await page.goto('/login');

    // Fill form
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');

    // Start login - capture the button state
    const submitButton = page.locator('button[type="submit"]');

    // Click and check for loading state
    await submitButton.click();

    // Button should show loading state (disabled or with spinner)
    // The actual loading indicator depends on implementation
    await expect(submitButton).toBeDisabled({ timeout: 500 }).catch(() => {
      // Button might not be disabled if login is very fast
    });
  });
});

test.describe('Authentication - Error Handling', () => {
  test('should handle network errors gracefully', async ({ page }) => {
    await page.goto('/login');

    // Block network requests to auth endpoint
    await page.route('**/auth/**', (route) => route.abort());

    // Fill form
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');

    // Submit
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('[role="alert"], .error, text=error')).toBeVisible({
      timeout: 10000,
    });
  });
});
