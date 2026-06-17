const { test, expect } = require('@playwright/test');

test.describe('YTIq Sanity Check', () => {
  test('should load the platform successfully with dark theme', async ({ page }) => {
    // Navigate to the base URL
    await page.goto('/');

    // Check if the main heading is visible
    const heading = page.locator('h1');
    await expect(heading).toContainText('YTIq Platform');

    // Check if the scaffolding text is visible
    const subtitle = page.locator('p:has-text("Scaffolding & DB Setup")');
    await expect(subtitle).toBeVisible();

    // Verify dark theme by checking the container's background class (bg-slate-950)
    const container = page.locator('div.min-h-screen');
    await expect(container).toHaveClass(/bg-slate-950/);

    // Verify frontend status section is visible
    const frontendStatus = page.locator('text=Frontend Status');
    await expect(frontendStatus).toBeVisible();

    // Verify backend and DB status section is visible
    const backendStatus = page.locator('text=Backend & DB Status');
    await expect(backendStatus).toBeVisible();
  });

  test('should pass backend health and database verification tests', async ({ request }) => {
    // Check health endpoint
    const healthResponse = await request.get('http://localhost:5000/api/health');
    expect(healthResponse.ok()).toBeTruthy();
    const healthData = await healthResponse.json();
    expect(healthData.status).toBe('UP');
    expect(healthData.database).toBe('CONNECTED');

    // Check test-db endpoint
    const testDbResponse = await request.get('http://localhost:5000/api/test-db');
    expect(testDbResponse.ok()).toBeTruthy();
    const testDbData = await testDbResponse.json();
    expect(testDbData.success).toBe(true);
  });
});
