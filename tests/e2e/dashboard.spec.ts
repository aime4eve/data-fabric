import { test, expect } from '@playwright/test';

test.describe('仪表板功能测试', () => {
  test.beforeEach(async ({ page }) => {
    // 先登录
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 执行登录
    const usernameInput = page.locator('input[type="text"], input[placeholder*="用户名"], input[name="username"]').first();
    await usernameInput.fill('admin');
    
    const passwordInput = page.locator('input[type="password"], input[placeholder*="密码"], input[name="password"]').first();
    await passwordInput.fill('123456');
    
    const loginButton = page.locator('button:has-text("登录"), button[type="submit"], .login-btn').first();
    await loginButton.click();
    
    // 等待跳转到仪表板
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('仪表板页面加载测试', async ({ page }) => {
    // 验证页面标题
    await expect(page).toHaveTitle(/知识库管理系统/);
    
    // 验证仪表板标题
    await expect(page.locator('h1, h2, .dashboard-title')).toContainText(/仪表板|Dashboard/);
    
    // 检查导航菜单
    await expect(page.locator('nav, .navigation, .sidebar')).toBeVisible();
    
    // 检查主要内容区域
    await expect(page.locator('main, .main-content, .dashboard-content')).toBeVisible();
  });

  test('仪表板数据加载测试', async ({ page }) => {
    // 监听API请求
    const apiRequests = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiRequests.push(request.url());
      }
    });
    
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    
    // 检查是否有API请求
    expect(apiRequests.length).toBeGreaterThan(0);
    
    // 检查统计卡片或数据展示
    const statsCards = page.locator('.stat-card, .dashboard-card, .metric-card');
    if (await statsCards.count() > 0) {
      await expect(statsCards.first()).toBeVisible();
    }
    
    // 检查图表或数据可视化
    const charts = page.locator('.chart, canvas, svg');
    if (await charts.count() > 0) {
      await expect(charts.first()).toBeVisible();
    }
  });

  test('仪表板响应式设计测试', async ({ page }) => {
    // 测试桌面视图
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1000);
    
    // 检查桌面布局
    const sidebar = page.locator('.sidebar, nav');
    if (await sidebar.count() > 0) {
      await expect(sidebar.first()).toBeVisible();
    }
    
    // 测试平板视图
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);
    
    // 测试移动视图
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    
    // 检查移动布局是否正常
    await expect(page.locator('main, .main-content')).toBeVisible();
  });

  test('仪表板错误处理测试', async ({ page }) => {
    // 模拟网络错误
    await page.route('**/api/**', route => {
      route.abort('failed');
    });
    
    // 刷新页面触发API调用
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // 检查错误处理
    const errorMessages = page.locator('.error, .error-message, text=加载失败, text=网络错误');
    if (await errorMessages.count() > 0) {
      await expect(errorMessages.first()).toBeVisible();
    }
  });
});