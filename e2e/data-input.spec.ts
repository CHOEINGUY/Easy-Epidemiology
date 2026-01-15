/**
 * data-input.spec.ts
 * E2E tests for data input functionality using Playwright
 */

import { test, expect } from '@playwright/test';

test.describe('Data Input Page', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'testToken');
      localStorage.setItem('user', JSON.stringify({ 
        username: 'testuser', 
        isApproved: true 
      }));
    });
    await page.goto('/input');
  });

  test('should display virtual grid component', async ({ page }) => {
    // Grid should be visible
    await expect(page.locator('[data-testid="virtual-grid"], .virtual-grid, table').first()).toBeVisible({ timeout: 10000 });
  });

  test('should display function bar', async ({ page }) => {
    // Function bar with buttons should be visible
    await expect(page.locator('.function-bar, [data-testid="function-bar"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('should be able to navigate to other pages via tabs', async ({ page }) => {
    // Click on patient characteristics tab
    await page.getByText(/환자 특성|Patient/i).click();
    
    // Should navigate
    await expect(page).toHaveURL(/.*patient/);
  });
});

test.describe('Data Import/Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'testToken');
      localStorage.setItem('user', JSON.stringify({ 
        username: 'testuser', 
        isApproved: true 
      }));
    });
    await page.goto('/input');
  });

  test('should have import button visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: /불러오기|import|열기/i })).toBeVisible({ timeout: 5000 });
  });

  test('should have export button visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: /저장|export|내보내기/i })).toBeVisible({ timeout: 5000 });
  });

  test('should have template download button visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: /템플릿|template/i })).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Row and Column Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'testToken');
      localStorage.setItem('user', JSON.stringify({ 
        username: 'testuser', 
        isApproved: true 
      }));
    });
    await page.goto('/input');
  });

  test('should have add row button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /행 추가|add row/i })).toBeVisible({ timeout: 5000 });
  });

  test('should have add column button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /열 추가|add column/i })).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Undo/Redo Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'testToken');
      localStorage.setItem('user', JSON.stringify({ 
        username: 'testuser', 
        isApproved: true 
      }));
    });
    await page.goto('/input');
  });

  test('should have undo button', async ({ page }) => {
    // Undo button (may be disabled initially)
    await expect(page.getByRole('button', { name: /undo|실행 취소/i }).or(page.locator('[aria-label*="undo"]'))).toBeVisible({ timeout: 5000 });
  });

  test('should have redo button', async ({ page }) => {
    // Redo button (may be disabled initially)
    await expect(page.getByRole('button', { name: /redo|다시 실행/i }).or(page.locator('[aria-label*="redo"]'))).toBeVisible({ timeout: 5000 });
  });
});
