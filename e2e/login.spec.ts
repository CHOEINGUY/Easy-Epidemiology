/**
 * login.spec.ts
 * E2E tests for login/logout flow using Playwright
 */

import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('should redirect to login page when not authenticated', async ({ page }) => {
    await page.goto('/input');
    
    // Should be redirected to login
    await expect(page).toHaveURL(/.*login/);
  });

  test('should display login form elements', async ({ page }) => {
    await page.goto('/login');

    // Check for essential login form elements
    await expect(page.getByRole('textbox').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /로그인|Login/i })).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill in invalid credentials
    await page.getByLabel(/아이디|username|email/i).fill('invaliduser');
    await page.getByLabel(/비밀번호|password/i).fill('wrongpassword');
    
    // Submit
    await page.getByRole('button', { name: /로그인|Login/i }).click();

    // Should show error message
    await expect(page.locator('text=/오류|error|실패|failed/i')).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to input page after successful login', async ({ page }) => {
    await page.goto('/login');

    // Note: This test requires a valid test account
    // Fill in valid credentials (test account)
    await page.getByLabel(/아이디|username|email/i).fill('testuser');
    await page.getByLabel(/비밀번호|password/i).fill('testpassword');
    
    // Submit
    await page.getByRole('button', { name: /로그인|Login/i }).click();

    // Should navigate to input page
    await expect(page).toHaveURL(/.*input/, { timeout: 10000 });
  });
});

test.describe('Logout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Login first
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'testToken');
      localStorage.setItem('user', JSON.stringify({ 
        username: 'testuser', 
        isApproved: true 
      }));
    });
  });

  test('should display logout button when authenticated', async ({ page }) => {
    await page.goto('/input');
    
    // Logout button should be visible
    await expect(page.getByRole('button', { name: /로그아웃|logout/i })).toBeVisible();
  });

  test('should show logout confirmation modal', async ({ page }) => {
    await page.goto('/input');
    
    // Click logout button
    await page.getByRole('button', { name: /로그아웃|logout/i }).click();

    // Confirmation modal should appear
    await expect(page.locator('text=/로그아웃 하시겠습니까|confirm logout/i')).toBeVisible();
  });

  test('should redirect to login after logout', async ({ page }) => {
    await page.goto('/input');
    
    // Click logout and confirm
    await page.getByRole('button', { name: /로그아웃|logout/i }).click();
    await page.getByRole('button', { name: /로그아웃|confirm|확인/i }).click();

    // Wait for redirect
    await expect(page).toHaveURL(/.*login/, { timeout: 10000 });
  });
});

test.describe('Public Routes Access', () => {
  test('should access info page without authentication', async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
    await page.goto('/info');

    // Should not redirect to login
    await expect(page).not.toHaveURL(/.*login/);
    await expect(page).toHaveURL(/.*info/);
  });

  test('should access manual page without authentication', async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
    await page.goto('/manual');

    // Should not redirect to login
    await expect(page).not.toHaveURL(/.*login/);
    await expect(page).toHaveURL(/.*manual/);
  });
});
