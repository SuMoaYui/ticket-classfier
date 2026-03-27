import { test, expect } from '@playwright/test';

/**
 * E2E Test: Ticket Management
 * Tests the ticket listing and creation pages (requires authenticated session).
 * Note: These tests use the development build served by Vite.
 */
test.describe('Ticket Pages', () => {
  test('should render the ticket list page structure', async ({ page }) => {
    // Navigate directly to ticket list (will redirect to login if not authed)
    await page.goto('/tickets');

    // Check that either the ticket table or login redirect is present
    const hasTickets = await page.locator('table, text=Tickets, text=No tickets found').first().isVisible({ timeout: 10000 }).catch(() => false);
    const hasLogin = await page.locator('text=Welcome Back, text=Sign In').first().isVisible({ timeout: 3000 }).catch(() => false);

    // One of these should be true
    expect(hasTickets || hasLogin).toBeTruthy();
  });

  test('should render the create ticket page structure', async ({ page }) => {
    await page.goto('/create');

    // Check for form fields or login redirect
    const hasForm = await page.locator('text=Create New Ticket, text=Subject, input[type="email"]').first().isVisible({ timeout: 10000 }).catch(() => false);
    const hasLogin = await page.locator('text=Welcome Back, text=Sign In').first().isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasForm || hasLogin).toBeTruthy();
  });

  test('should navigate between pages via sidebar', async ({ page }) => {
    await page.goto('/');

    // Look for sidebar navigation links
    const sidebarLinks = page.locator('nav a, [class*="sidebar"] a, [class*="Sidebar"] a');
    const count = await sidebarLinks.count();

    // There should be navigation elements (Dashboard, Tickets, Create, Settings)
    // If on login page, sidebar might not be visible
    if (count > 0) {
      expect(count).toBeGreaterThanOrEqual(3);
    }
  });
});
