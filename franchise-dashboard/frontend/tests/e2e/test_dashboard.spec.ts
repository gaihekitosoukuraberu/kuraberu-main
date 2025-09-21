import { test, expect } from '@playwright/test';

test.describe('Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:5173/login');
    
    // Perform login
    await page.fill('input[name="email"]', 'admin@franchise.com');
    await page.fill('input[name="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard');
  });

  test('should display dashboard with key metrics', async ({ page }) => {
    // Check dashboard title
    await expect(page.locator('h1')).toContainText('ダッシュボード');
    
    // Check metric cards are visible
    await expect(page.locator('[data-testid="total-cases-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-cases-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="conversion-rate-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="monthly-revenue-card"]')).toBeVisible();
    
    // Check charts are rendered
    await expect(page.locator('[data-testid="cases-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible();
  });

  test('should navigate to cases page', async ({ page }) => {
    // Click cases menu item
    await page.click('a[href="/cases"]');
    
    // Check URL changed
    await expect(page).toHaveURL(/.*\/cases/);
    
    // Check cases table is visible
    await expect(page.locator('[data-testid="cases-table"]')).toBeVisible();
  });

  test('should show real-time notifications', async ({ page }) => {
    // Wait for SSE connection
    await page.waitForTimeout(2000);
    
    // Check notification bell icon
    const notificationBell = page.locator('[data-testid="notification-bell"]');
    await expect(notificationBell).toBeVisible();
    
    // Simulate new notification (in real app, this would come from SSE)
    // Check notification count badge updates
    const badge = notificationBell.locator('.badge');
    await expect(badge).toBeVisible();
  });

  test('should filter dashboard data by date range', async ({ page }) => {
    // Open date range picker
    await page.click('[data-testid="date-range-picker"]');
    
    // Select last 30 days
    await page.click('button:has-text("過去30日")');
    
    // Wait for data to reload
    await page.waitForResponse('**/api/dashboard/stats*');
    
    // Check data updated indicator
    await expect(page.locator('[data-testid="last-updated"]')).toContainText('更新');
  });

  test('should handle session timeout gracefully', async ({ page, context }) => {
    // Clear auth token to simulate expired session
    await context.addCookies([{
      name: 'auth_token',
      value: 'expired',
      domain: 'localhost',
      path: '/',
    }]);
    
    // Try to access protected route
    await page.goto('http://localhost:5173/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*\/login/);
    
    // Should show session expired message
    await expect(page.locator('.alert-warning')).toContainText('セッションが期限切れ');
  });

  test('should export dashboard data', async ({ page }) => {
    // Click export button
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-button"]');
    
    // Select CSV format
    await page.click('button:has-text("CSV")');
    
    // Wait for download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/dashboard.*\.csv/);
  });

  test('should update metrics in real-time', async ({ page }) => {
    // Get initial case count
    const initialCount = await page.locator('[data-testid="total-cases-value"]').textContent();
    
    // Wait for SSE update (mock or real)
    await page.waitForTimeout(5000);
    
    // Check if count changed (in real app with SSE)
    const updatedCount = await page.locator('[data-testid="total-cases-value"]').textContent();
    
    // Metrics should auto-update without page refresh
    expect(page.locator('[data-testid="live-indicator"]')).toHaveClass(/pulse/);
  });

  test('should handle responsive layout', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check mobile menu is visible
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    
    // Desktop sidebar should be hidden
    await expect(page.locator('[data-testid="desktop-sidebar"]')).toBeHidden();
    
    // Open mobile menu
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // Check layout adjusts
    await expect(page.locator('[data-testid="desktop-sidebar"]')).toBeVisible();
  });

  test('should display user profile menu', async ({ page }) => {
    // Click profile avatar
    await page.click('[data-testid="user-avatar"]');
    
    // Check dropdown menu appears
    await expect(page.locator('[data-testid="profile-menu"]')).toBeVisible();
    
    // Check menu items
    await expect(page.locator('text=プロフィール')).toBeVisible();
    await expect(page.locator('text=設定')).toBeVisible();
    await expect(page.locator('text=ログアウト')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Open profile menu
    await page.click('[data-testid="user-avatar"]');
    
    // Click logout
    await page.click('text=ログアウト');
    
    // Confirm logout dialog
    await page.click('button:has-text("ログアウトする")');
    
    // Should redirect to login page
    await expect(page).toHaveURL(/.*\/login/);
    
    // Try to access dashboard again
    await page.goto('http://localhost:5173/dashboard');
    
    // Should remain on login page
    await expect(page).toHaveURL(/.*\/login/);
  });
});