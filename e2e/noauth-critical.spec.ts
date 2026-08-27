import { test, expect } from '@playwright/test';

const criticalRoutes = [
  '/input',
  '/patient',
  '/curve',
  '/symptoms',
  '/case-control',
  '/cohort',
  '/case-series',
  '/report',
  '/info',
  '/manual'
];

test.describe('No-auth critical smoke', () => {
  test('boots into the input workflow without authentication', async ({ page }) => {
    const response = await page.goto('/#/input');

    expect(response?.ok()).toBe(true);
    await expect(page.locator('#app')).toBeVisible();
    await expect(page).toHaveURL(/#\/input/);
  });

  for (const route of criticalRoutes) {
    test(`${route} renders a non-empty application surface`, async ({ page }) => {
      const response = await page.goto(`/#${route}`);

      expect(response?.ok()).toBe(true);
      await expect(page.locator('#app')).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`#${route.replace('/', '\\/')}`));

      const visibleText = (await page.locator('#app').innerText()).trim();
      expect(visibleText.length).toBeGreaterThan(10);
    });
  }
});
