import { test, expect } from '@playwright/test';

/**
 * E2E Test Suite - Easy Epidemiology Application
 * 이 테스트는 CI/CD 파이프라인에서 자동으로 실행됩니다.
 */

test.describe('Easy Epidemiology App', () => {
  
  test.beforeEach(async ({ page }) => {
    // 앱 로드
    await page.goto('/');
  });

  test('should load the application successfully', async ({ page }) => {
    // 페이지가 성공적으로 로드되었는지 확인
    await expect(page).toHaveTitle(/Easy/i);
  });

  test('should display the main navigation', async ({ page }) => {
    // 메인 네비게이션/콘텐츠 영역이 표시되는지 확인
    const mainContent = page.locator('#app');
    await expect(mainContent).toBeVisible();
  });

  test('should have no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 심각한 에러가 없어야 함 (일부 무시할 수 있는 에러 제외)
    const criticalErrors = errors.filter(
      (err) => !err.includes('favicon') && !err.includes('404')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // 모바일 뷰포트로 변경
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // 앱이 여전히 표시되는지 확인
    const app = page.locator('#app');
    await expect(app).toBeVisible();
  });

});
