import { chromium, type FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const AUTH_STATE_PATH = path.join(__dirname, '.auth/user.json');

/**
 * Global setup for Playwright tests
 * This runs once before all tests to set up authentication state
 */
async function globalSetup(config: FullConfig) {
  // Skip setup if we don't have test credentials
  if (!process.env.E2E_TEST_EMAIL || !process.env.E2E_TEST_PASSWORD) {
    console.log('Skipping auth setup - no test credentials provided');
    console.log('Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD to enable authenticated tests');
    return;
  }

  // Ensure .auth directory exists
  const authDir = path.dirname(AUTH_STATE_PATH);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const baseURL = config.projects[0].use?.baseURL || 'http://localhost:3000';

  try {
    // Navigate to login page
    await page.goto(`${baseURL}/login`);

    // Wait for login form
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    // Fill in credentials
    await page.fill('input[type="email"]', process.env.E2E_TEST_EMAIL);
    await page.fill('input[type="password"]', process.env.E2E_TEST_PASSWORD);

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for successful login (redirect to dashboard)
    await page.waitForURL('**/dashboard**', { timeout: 30000 });

    // Save authentication state
    await context.storageState({ path: AUTH_STATE_PATH });

    // Set environment variable for tests to use
    process.env.AUTH_STATE_PATH = AUTH_STATE_PATH;

    console.log('Authentication setup complete');
  } catch (error) {
    console.error('Failed to set up authentication:', error);
    // Continue without auth state - tests requiring auth will fail
  } finally {
    await browser.close();
  }
}

export default globalSetup;
