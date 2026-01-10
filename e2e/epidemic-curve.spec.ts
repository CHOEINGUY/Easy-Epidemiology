import { test, expect } from '@playwright/test';

test.describe('Epidemic Curve Page', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to Epidemic Curve page
    // Assuming the specific path
    await page.goto('/#/visual'); // or whatever the routing is. Let's try hash routing or history API.
    // If using router, we can also click the nav button.
    
    // Let's try clicking the nav button from home if URL is uncertain
    await page.goto('/');
    const navLink = page.getByRole('link', { name: '유행곡선' }).or(page.getByText('유행곡선'));
    if (await navLink.count() > 0) {
        await navLink.first().click();
    } else {
        // Fallback to URL assumption
        await page.goto('/visual'); 
    }
  });

  test('should display epidemic curve charts', async ({ page }) => {
    // Check for main title or unique element
    await expect(page.getByText('유행곡선 및 잠복기 분석')).toBeVisible();

    // Check for ECharts container (canvas)
    const chartCanvas = page.locator('canvas').first();
    await expect(chartCanvas).toBeVisible();
  });

  test('should have interaction controls', async ({ page }) => {
    // Check for interval buttons
    await expect(page.getByText('1시간')).toBeVisible();
    await expect(page.getByText('1일')).toBeVisible();
  });

});
