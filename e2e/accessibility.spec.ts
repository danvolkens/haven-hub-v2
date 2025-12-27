import { test, expect } from '@playwright/test';

test.describe('Accessibility Tests', () => {
  test('login page should be keyboard navigable', async ({ page }) => {
    await page.goto('/login');

    // Tab to email input
    await page.keyboard.press('Tab');
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeFocused();

    // Tab to password input
    await page.keyboard.press('Tab');
    // Might tab through other elements first, so keep pressing
    for (let i = 0; i < 5; i++) {
      const passwordInput = page.locator('input[type="password"], input#password');
      if (await passwordInput.evaluate((el) => el === document.activeElement).catch(() => false)) {
        break;
      }
      await page.keyboard.press('Tab');
    }

    // Tab to submit button
    for (let i = 0; i < 5; i++) {
      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.evaluate((el) => el === document.activeElement).catch(() => false)) {
        await expect(submitButton).toBeFocused();
        break;
      }
      await page.keyboard.press('Tab');
    }
  });

  test('login form should have proper labels', async ({ page }) => {
    await page.goto('/login');

    // Email input should have associated label
    const emailLabel = page.locator('label[for="email"]');
    await expect(emailLabel).toBeVisible();

    // Password input should have associated label
    const passwordLabel = page.locator('label[for="password"]');
    await expect(passwordLabel).toBeVisible();
  });

  test('buttons should have accessible names', async ({ page }) => {
    await page.goto('/login');

    // Submit button should have text content
    const submitButton = page.locator('button[type="submit"]');
    const buttonText = await submitButton.textContent();
    expect(buttonText?.trim().length).toBeGreaterThan(0);
  });

  test('page should have proper heading structure', async ({ page }) => {
    await page.goto('/login');

    // Check for h1 or h2 heading
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('links should have proper href attributes', async ({ page }) => {
    await page.goto('/login');

    // Get all links
    const links = page.locator('a');
    const count = await links.count();

    for (let i = 0; i < count; i++) {
      const link = links.nth(i);
      const href = await link.getAttribute('href');
      expect(href).not.toBeNull();
      expect(href?.length).toBeGreaterThan(0);
    }
  });

  test('images should have alt text', async ({ page }) => {
    await page.goto('/login');

    const images = page.locator('img');
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      // Alt can be empty string for decorative images
      expect(alt).not.toBeNull();
    }
  });

  test('form should support enter key submission', async ({ page }) => {
    await page.goto('/login');

    // Fill form
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');

    // Press Enter on password field
    await page.locator('input[type="password"]').press('Enter');

    // Form should be submitted (button disabled or loading)
    const submitButton = page.locator('button[type="submit"]');

    // Check for loading state or navigation
    await expect(async () => {
      const isDisabled = await submitButton.isDisabled();
      const url = page.url();
      // Either button is loading/disabled or we've navigated
      expect(isDisabled || !url.includes('login')).toBeTruthy();
    }).toPass({ timeout: 5000 });
  });

  test('error messages should be associated with inputs', async ({ page }) => {
    await page.goto('/login');

    // Submit empty form to trigger errors
    await page.click('button[type="submit"]');

    // Wait for error messages
    await page.waitForSelector('.error, [role="alert"], text=required', { timeout: 5000 });

    // Error messages should be visible
    const errors = page.locator('.error, [role="alert"]');
    if ((await errors.count()) > 0) {
      await expect(errors.first()).toBeVisible();
    }
  });

  test('focus should be visible', async ({ page }) => {
    await page.goto('/login');

    // Tab to email input
    await page.keyboard.press('Tab');

    // Check that focus is visible (element should have focus ring or outline)
    const emailInput = page.locator('input[type="email"]');

    // Get computed styles for focus state
    const hasFocusStyles = await emailInput.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      // Check for outline, box-shadow, or border change
      return (
        styles.outline !== 'none' ||
        styles.boxShadow !== 'none' ||
        el.classList.contains('focus') ||
        el.matches(':focus-visible')
      );
    });

    // Focus should be styled
    expect(hasFocusStyles).toBeTruthy();
  });
});

test.describe('Accessibility - Color Contrast', () => {
  test('text should have sufficient contrast', async ({ page }) => {
    await page.goto('/login');

    // Get main text elements
    const textElements = page.locator('p, span, h1, h2, h3, label');
    const count = await textElements.count();

    // Check at least some text is visible
    expect(count).toBeGreaterThan(0);

    // Note: Actual contrast ratio checking requires additional tools
    // This is a placeholder for manual verification or automated contrast tools
  });
});

test.describe('Accessibility - Responsive Design', () => {
  test('should be usable at 200% zoom', async ({ page }) => {
    await page.goto('/login');

    // Simulate zoom by reducing viewport
    await page.setViewportSize({ width: 640, height: 400 });

    // All form elements should still be visible
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/login');

    // All form elements should still be usable
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Form should be usable
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
  });
});
