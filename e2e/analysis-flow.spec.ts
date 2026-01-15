/**
 * analysis-flow.spec.ts
 * E2E tests for analysis flow (Case-Control, Cohort, Epidemic Curve)
 */

import { test, expect } from '@playwright/test';

test.describe('Case-Control Analysis Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'testToken');
      localStorage.setItem('user', JSON.stringify({ 
        username: 'testuser', 
        isApproved: true 
      }));
    });
  });

  test('should navigate to case-control page', async ({ page }) => {
    await page.goto('/case-control');
    await expect(page).toHaveURL(/.*case-control/);
  });

  test('should display analysis table', async ({ page }) => {
    await page.goto('/case-control');
    
    // Should show analysis table headers (OR, CI, p-value)
    await expect(page.locator('text=/OR|Odds Ratio|오즈비/i')).toBeVisible({ timeout: 10000 });
  });

  test('should have Yates correction toggle', async ({ page }) => {
    await page.goto('/case-control');
    
    // Yates correction toggle should exist
    await expect(page.locator('text=/Yates|보정/i')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Cohort Analysis Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'testToken');
      localStorage.setItem('user', JSON.stringify({ 
        username: 'testuser', 
        isApproved: true 
      }));
    });
  });

  test('should navigate to cohort page', async ({ page }) => {
    await page.goto('/cohort');
    await expect(page).toHaveURL(/.*cohort/);
  });

  test('should display RR column', async ({ page }) => {
    await page.goto('/cohort');
    
    // Should show RR (Relative Risk)
    await expect(page.locator('text=/RR|Relative Risk|상대위험도/i')).toBeVisible({ timeout: 10000 });
  });

  test('should display attack rate columns', async ({ page }) => {
    await page.goto('/cohort');
    
    // Should show attack rate
    await expect(page.locator('text=/발병률|Attack Rate|발생률/i')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Epidemic Curve Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'testToken');
      localStorage.setItem('user', JSON.stringify({ 
        username: 'testuser', 
        isApproved: true 
      }));
    });
  });

  test('should navigate to epidemic curve page', async ({ page }) => {
    await page.goto('/curve');
    await expect(page).toHaveURL(/.*curve/);
  });

  test('should display chart area', async ({ page }) => {
    await page.goto('/curve');
    
    // Should show chart canvas or container
    await expect(page.locator('canvas, .chart-container, [data-testid="epidemic-chart"]').first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Clinical Symptoms Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'testToken');
      localStorage.setItem('user', JSON.stringify({ 
        username: 'testuser', 
        isApproved: true 
      }));
    });
  });

  test('should navigate to symptoms page', async ({ page }) => {
    await page.goto('/symptoms');
    await expect(page).toHaveURL(/.*symptoms/);
  });

  test('should display attack rate information', async ({ page }) => {
    await page.goto('/symptoms');
    
    // Should show attack rate or symptom frequency
    await expect(page.locator('text=/발현율|발현 빈도|Attack Rate|발생률/i')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Report Writer Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'testToken');
      localStorage.setItem('user', JSON.stringify({ 
        username: 'testuser', 
        isApproved: true 
      }));
    });
  });

  test('should navigate to report page', async ({ page }) => {
    await page.goto('/report');
    await expect(page).toHaveURL(/.*report/);
  });

  test('should have generate report button', async ({ page }) => {
    await page.goto('/report');
    
    // Should have report generation button
    await expect(page.getByRole('button', { name: /보고서 생성|Generate|다운로드/i })).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Patient Characteristics Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'testToken');
      localStorage.setItem('user', JSON.stringify({ 
        username: 'testuser', 
        isApproved: true 
      }));
    });
  });

  test('should navigate to patient characteristics page', async ({ page }) => {
    await page.goto('/patient');
    await expect(page).toHaveURL(/.*patient/);
  });

  test('should display demographic charts', async ({ page }) => {
    await page.goto('/patient');
    
    // Should show chart for demographics
    await expect(page.locator('canvas, .chart-container').first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Navigation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'testToken');
      localStorage.setItem('user', JSON.stringify({ 
        username: 'testuser', 
        isApproved: true 
      }));
    });
  });

  test('should navigate through all main pages', async ({ page }) => {
    const pages = [
      { url: '/input', name: 'Data Input' },
      { url: '/patient', name: 'Patient Characteristics' },
      { url: '/curve', name: 'Epidemic Curve' },
      { url: '/symptoms', name: 'Clinical Symptoms' },
      { url: '/case-control', name: 'Case Control' },
      { url: '/cohort', name: 'Cohort Study' }
    ];

    for (const p of pages) {
      await page.goto(p.url);
      await expect(page).toHaveURL(new RegExp(p.url.replace('/', '.*')));
    }
  });
});
