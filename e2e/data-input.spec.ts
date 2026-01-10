import { test, expect } from '@playwright/test';

test.describe('Data Input Layout', () => {

  test.beforeEach(async ({ page }) => {
    // Go to root (which should redirect to DataInputVirtualScroll or similar)
    // Adjust path if necessary. Assuming home page is the data input page.
    await page.goto('/');
  });

  test('should display key elements of the grid', async ({ page }) => {
    // Check if the grid container exists
    const grid = page.locator('.grid-body-virtual');
    await expect(grid).toBeVisible({ timeout: 10000 });

    // Check for headers (VirtualGridHeader renders columns)
    // Headers might be in a separate header component, so looking for text is safer
    await expect(page.getByText('일련번호', { exact: true })).toBeVisible();
    await expect(page.getByText('환자여부')).toBeVisible();
  });

  test('should allow entering data into cells', async ({ page }) => {
    // Find a cell in the first row, 'isPatient' column (usually index 1)
    // Note: This depends on the DOM structure.
    // Based on knowledge, cells might be divs with input or contenteditable.
    // Let's assume we click a cell and type.

    // Using a more generic selector for the first data row's patient column
    // Adjust selector based on actual class names from code audit
    // Assuming .grid-row and .cell structure
    
    // data-row="0", data-col="1" (Assuming isPatient is col 1. Check allColumnsMeta if fails)
    // col 0 is usually Serial, col 1 is isPatient
    const firstCell = page.locator('td[data-row="0"][data-col="1"]');
    await expect(firstCell).toBeVisible();

    await firstCell.click();
    
    // Type '1' directly (assuming keyboard editing handles it)
    await page.keyboard.type('1');
    await page.keyboard.press('Enter');

    // Verify value is saved (rendered text) or check temporary value behavior
    // If confirms immediately, text should match.
    await expect(firstCell).toContainText('1');
  });

  test('context menu should appear on right click', async ({ page }) => {
    const firstCell = page.locator('td[data-row="0"][data-col="2"]');
    await firstCell.click({ button: 'right' });

    // Check for context menu
    // ContextMenu.vue uses fixed positioning, might not have a specific class on root?
    // Looking for text content of menu items
    await expect(page.getByText('행 추가')).toBeVisible();
  });

});
