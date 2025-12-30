import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Credentials
const HUB_EMAIL = 'hello@havenandhold.com';
const HUB_PASSWORD = 'uqp8XCD!bfx2xuk@pqn';
const FB_EMAIL = 'hello@havenandhold.com';
const FB_PASSWORD = 'WTM4cgq_qjh2eph!mvr';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('Starting Instagram Demo Recording...');

  // Launch browser with video recording
  const browser = await chromium.launch({
    headless: false,
    slowMo: 50,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: {
      dir: path.join(__dirname, '../recordings'),
      size: { width: 1280, height: 800 },
    },
  });

  const page = await context.newPage();

  try {
    // Step 1: Navigate to Haven Hub login
    console.log('Step 1: Navigating to Haven Hub login...');
    await page.goto('https://hub.havenandhold.com/login');
    await sleep(3000);

    // Step 2: Fill login form with visible typing
    console.log('Step 2: Logging into Haven Hub...');
    await page.locator('input[type="email"], input[placeholder*="email"]').click();
    await page.locator('input[type="email"], input[placeholder*="email"]').fill(HUB_EMAIL);
    await sleep(1000);

    await page.locator('input[type="password"], input[placeholder*="password"]').click();
    await page.locator('input[type="password"], input[placeholder*="password"]').fill(HUB_PASSWORD);
    await sleep(1000);

    // Click sign in
    await page.click('button:has-text("Sign in")');
    console.log('Waiting for login...');
    await sleep(4000);

    // Wait for dashboard to load
    try {
      await page.waitForURL('**/dashboard**', { timeout: 15000 });
    } catch (e) {
      console.log('May already be on dashboard or different page');
    }
    console.log('Logged into Haven Hub successfully');
    await sleep(3000);

    // Step 3: Navigate to Instagram Settings to show connection
    console.log('Step 3: Navigating to Instagram settings...');
    await page.goto('https://hub.havenandhold.com/dashboard/settings/instagram');
    await sleep(4000);

    // Check if Connect button exists
    const connectButton = page.locator('a:has-text("Connect Instagram")');
    const isConnectVisible = await connectButton.isVisible().catch(() => false);

    if (isConnectVisible) {
      console.log('Step 4: Instagram not connected, initiating OAuth...');
      await connectButton.click();
      await sleep(3000);

      // Handle Facebook login if we're there
      const currentUrl = page.url();
      if (currentUrl.includes('facebook.com')) {
        console.log('Step 5: Logging into Facebook...');

        // Fill Facebook login
        try {
          await page.fill('input[name="email"], input#email', FB_EMAIL);
          await sleep(1000);
          await page.fill('input[name="pass"], input#pass', FB_PASSWORD);
          await sleep(1000);

          // Click login button
          await page.click('button[name="login"], button:has-text("Log in"), button:has-text("Log In"), input[type="submit"]');
          await sleep(5000);
        } catch (e) {
          console.log('Facebook login fields not found, may be logged in');
        }

        // Handle permission dialogs
        console.log('Step 6: Handling permissions...');
        for (let i = 0; i < 5; i++) {
          const continueBtn = page.locator('button:has-text("Continue"), div[role="button"]:has-text("Continue"), button:has-text("Allow")').first();
          if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await continueBtn.click();
            await sleep(3000);
          } else {
            break;
          }
        }

        // Wait for redirect back
        console.log('Waiting for redirect back to Haven Hub...');
        try {
          await page.waitForURL('**/havenandhold.com/**', { timeout: 30000 });
        } catch (e) {
          console.log('Timeout waiting for redirect, continuing...');
        }
        await sleep(3000);
      }
    } else {
      console.log('Instagram already connected, showing connection status...');
      await sleep(3000);
    }

    // Step 7: Navigate to Account Overview page - THE KEY DEMO PAGE
    console.log('Step 7: Navigating to Instagram Account Overview...');
    await page.goto('https://hub.havenandhold.com/dashboard/instagram/account');
    await sleep(5000);

    // Scroll slowly to show all content
    console.log('Step 8: Scrolling to show profile and media list...');

    // Show profile section
    await sleep(3000);

    // Scroll to show connection info
    await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'smooth' }));
    await sleep(3000);

    // Scroll to show media list header
    await page.evaluate(() => window.scrollTo({ top: 700, behavior: 'smooth' }));
    await sleep(3000);

    // Scroll to show media grid
    await page.evaluate(() => window.scrollTo({ top: 1000, behavior: 'smooth' }));
    await sleep(3000);

    // Scroll back to top
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await sleep(4000);

    console.log('Demo recording complete!');

  } catch (error) {
    console.error('Error during recording:', error);
  } finally {
    // Close context to save video
    await context.close();
    await browser.close();

    console.log('Video saved to recordings/ directory');
  }
}

main().catch(console.error);
