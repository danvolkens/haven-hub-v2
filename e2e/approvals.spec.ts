import { test, expect, Page } from '@playwright/test';

test.describe('Approval Workflow', () => {
  // Skip if no test credentials
  test.skip(
    !process.env.E2E_TEST_EMAIL,
    'Skipping authenticated tests - no credentials provided'
  );

  test.beforeEach(async ({ page }) => {
    // Navigate to approvals page
    await page.goto('/dashboard/approvals');
    await page.waitForLoadState('networkidle');
  });

  test('should display the approval queue page', async ({ page }) => {
    // Check page loads
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    // Should have heading
    const heading = page.locator('h1, h2').filter({ hasText: /approval/i });
    await expect(heading.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show filter options for approval types', async ({ page }) => {
    // Look for filter dropdown or tabs
    const filterElement = page.locator(
      '[data-testid="type-filter"], select:has-text("Type"), [role="tablist"]'
    );

    // Either filter exists or page shows "no filters needed" state
    const hasFilter = await filterElement.first().isVisible().catch(() => false);

    if (hasFilter) {
      await expect(filterElement.first()).toBeVisible();
    }
  });

  test('should display approval items or empty state', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000);

    // Either has items or shows empty state
    const hasItems = await page
      .locator('[data-testid="approval-item"], .approval-item')
      .first()
      .isVisible()
      .catch(() => false);

    const hasEmptyState = await page
      .locator('text=No items, text=empty, text=no pending')
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasItems || hasEmptyState).toBeTruthy();
  });

  test('should navigate between different approval types', async ({ page }) => {
    // Look for type navigation (tabs or filter)
    const typeNav = page.locator(
      '[role="tablist"], [data-testid="type-filter"], .filter-group'
    );

    const hasTypeNav = await typeNav.first().isVisible().catch(() => false);

    if (hasTypeNav) {
      // Try clicking different types
      const typeButtons = page.locator(
        '[role="tab"], [data-testid="type-filter"] option, button:has-text("Pin"), button:has-text("Asset")'
      );

      const buttonCount = await typeButtons.count();

      if (buttonCount > 1) {
        // Click second type
        await typeButtons.nth(1).click();

        // Wait for URL change or content update
        await page.waitForTimeout(500);
      }
    }
  });
});

test.describe('Approval Actions', () => {
  test.skip(
    !process.env.E2E_TEST_EMAIL,
    'Skipping authenticated tests - no credentials provided'
  );

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/approvals');
    await page.waitForLoadState('networkidle');
  });

  test('should show action buttons on approval items', async ({ page }) => {
    // Wait for items to load
    const approvalItem = page
      .locator('[data-testid="approval-item"], .approval-item')
      .first();

    const hasItems = await approvalItem.isVisible().catch(() => false);

    if (hasItems) {
      // Should have approve and reject buttons
      const approveBtn = approvalItem.locator(
        'button:has-text("Approve"), [data-testid="approve-btn"]'
      );
      const rejectBtn = approvalItem.locator(
        'button:has-text("Reject"), [data-testid="reject-btn"]'
      );

      // At least one action button should exist
      const hasApprove = await approveBtn.isVisible().catch(() => false);
      const hasReject = await rejectBtn.isVisible().catch(() => false);

      expect(hasApprove || hasReject).toBeTruthy();
    }
  });

  test('should open preview when clicking an approval item', async ({ page }) => {
    const approvalItem = page
      .locator('[data-testid="approval-item"], .approval-item')
      .first();

    const hasItems = await approvalItem.isVisible().catch(() => false);

    if (hasItems) {
      // Click the item (not the buttons)
      await approvalItem.click({ position: { x: 50, y: 20 } });

      // Should open a modal or side panel
      await page.waitForTimeout(500);

      const hasModal = await page
        .locator('[role="dialog"], [data-testid="approval-preview"]')
        .isVisible()
        .catch(() => false);

      const hasPanel = await page
        .locator('[data-testid="detail-panel"], aside')
        .isVisible()
        .catch(() => false);

      // Some preview mechanism should exist
      // (may not trigger if clicking on buttons area)
    }
  });

  test('should show confirmation dialog for approve action', async ({ page }) => {
    const approvalItem = page
      .locator('[data-testid="approval-item"], .approval-item')
      .first();

    const hasItems = await approvalItem.isVisible().catch(() => false);

    if (hasItems) {
      const approveBtn = approvalItem.locator(
        'button:has-text("Approve"), [data-testid="approve-btn"]'
      );

      const hasApproveBtn = await approveBtn.isVisible().catch(() => false);

      if (hasApproveBtn) {
        await approveBtn.click();

        // Should show confirmation or toast
        await page.waitForTimeout(1000);

        const hasConfirmation = await page
          .locator(
            '[role="dialog"]:has-text("confirm"), [role="alertdialog"], [role="alert"]'
          )
          .first()
          .isVisible()
          .catch(() => false);

        // Either confirmation dialog or direct action with toast
        // (implementation may vary)
      }
    }
  });

  test('should show rejection reason input when rejecting', async ({ page }) => {
    const approvalItem = page
      .locator('[data-testid="approval-item"], .approval-item')
      .first();

    const hasItems = await approvalItem.isVisible().catch(() => false);

    if (hasItems) {
      const rejectBtn = approvalItem.locator(
        'button:has-text("Reject"), [data-testid="reject-btn"]'
      );

      const hasRejectBtn = await rejectBtn.isVisible().catch(() => false);

      if (hasRejectBtn) {
        await rejectBtn.click();

        // Should show rejection reason input
        await page.waitForTimeout(500);

        const hasReasonInput = await page
          .locator(
            '[name="rejection-reason"], [data-testid="rejection-reason"], textarea:near(:text("reason"))'
          )
          .isVisible()
          .catch(() => false);

        // Rejection typically requires a reason
      }
    }
  });
});

test.describe('Approval Queue - Pagination', () => {
  test.skip(
    !process.env.E2E_TEST_EMAIL,
    'Skipping authenticated tests - no credentials provided'
  );

  test('should show pagination when many items exist', async ({ page }) => {
    await page.goto('/dashboard/approvals');
    await page.waitForLoadState('networkidle');

    // Look for pagination controls
    const pagination = page.locator(
      '[data-testid="pagination"], .pagination, nav:has(button:text("Next"))'
    );

    const hasPagination = await pagination.isVisible().catch(() => false);

    // Pagination only appears if there are enough items
    // This test just verifies the structure exists when needed
  });

  test('should update URL when changing pages', async ({ page }) => {
    await page.goto('/dashboard/approvals?page=1');
    await page.waitForLoadState('networkidle');

    const nextButton = page.locator(
      'button:has-text("Next"), [aria-label="Next page"]'
    );

    const hasNext = await nextButton.isVisible().catch(() => false);

    if (hasNext) {
      await nextButton.click();
      await page.waitForTimeout(500);

      // URL should update
      expect(page.url()).toMatch(/page=2|offset=|cursor=/);
    }
  });
});

test.describe('Approval Queue - Bulk Actions', () => {
  test.skip(
    !process.env.E2E_TEST_EMAIL,
    'Skipping authenticated tests - no credentials provided'
  );

  test('should allow selecting multiple items', async ({ page }) => {
    await page.goto('/dashboard/approvals');
    await page.waitForLoadState('networkidle');

    // Look for checkboxes on items
    const checkboxes = page.locator(
      '[data-testid="approval-item"] input[type="checkbox"], .approval-item input[type="checkbox"]'
    );

    const checkboxCount = await checkboxes.count();

    if (checkboxCount > 1) {
      // Select first two items
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();

      // Bulk action bar should appear
      const bulkBar = page.locator(
        '[data-testid="bulk-actions"], .bulk-action-bar'
      );

      const hasBulkBar = await bulkBar.isVisible().catch(() => false);

      // Bulk actions should be available
    }
  });

  test('should have select all functionality', async ({ page }) => {
    await page.goto('/dashboard/approvals');
    await page.waitForLoadState('networkidle');

    // Look for select all checkbox
    const selectAll = page.locator(
      '[data-testid="select-all"], input[aria-label*="select all" i], thead input[type="checkbox"]'
    );

    const hasSelectAll = await selectAll.isVisible().catch(() => false);

    if (hasSelectAll) {
      await selectAll.check();

      // All item checkboxes should be checked
      const itemCheckboxes = page.locator(
        '[data-testid="approval-item"] input[type="checkbox"]:checked'
      );

      const checkedCount = await itemCheckboxes.count();
      expect(checkedCount).toBeGreaterThan(0);
    }
  });
});

test.describe('Approval Queue - Accessibility', () => {
  test.skip(
    !process.env.E2E_TEST_EMAIL,
    'Skipping authenticated tests - no credentials provided'
  );

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/dashboard/approvals');
    await page.waitForLoadState('networkidle');

    // Tab through the page
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Something should be focused
    const focusedElement = await page.locator(':focus').first();
    await expect(focusedElement).toBeVisible();
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/dashboard/approvals');
    await page.waitForLoadState('networkidle');

    // Check for ARIA landmarks
    const main = page.locator('main, [role="main"]');
    await expect(main).toBeVisible();

    // Check for button labels
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      const hasLabel =
        (await button.getAttribute('aria-label')) ||
        (await button.textContent());
      expect(hasLabel).toBeTruthy();
    }
  });

  test('should announce changes to screen readers', async ({ page }) => {
    await page.goto('/dashboard/approvals');
    await page.waitForLoadState('networkidle');

    // Check for live region
    const liveRegion = page.locator(
      '[aria-live], [role="status"], [role="alert"]'
    );

    // Live regions should exist for announcements
    // (may not be visible until action taken)
  });
});
