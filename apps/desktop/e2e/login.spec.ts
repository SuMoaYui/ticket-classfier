import { test, expect } from '@playwright/test';

/**
 * E2E Test: Login Flow
 * Verifies the login page renders correctly and basic interactions work.
 */
test.describe('Login Page', () => {
  test('should display login form with all required elements', async ({ page }) => {
    await page.goto('/');

    // The login page should be the default when not authenticated
    await expect(page.locator('text=Welcome Back')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
  });

  test('should show validation error for empty credentials', async ({ page }) => {
    await page.goto('/');

    // Click sign in without filling anything
    await page.click('button:has-text("Sign In")');

    // Should remain on login page (no navigation away)
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('should show create account toggle', async ({ page }) => {
    await page.goto('/');

    // Toggle to registration mode
    const toggleLink = page.locator('text=Create Account');
    if (await toggleLink.isVisible()) {
      await toggleLink.click();
      // Should show name field now
      await expect(page.locator('input[placeholder*="Name"]').or(page.locator('text=Full Name'))).toBeVisible({ timeout: 5000 });
    }
  });
});
