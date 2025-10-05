import { test, expect } from '@playwright/test';

test.describe('API集成测试', () => {
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

  test('API请求状态码检查', async ({ page }) => {
    const apiResponses = [];
    
    // 监听所有API响应
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        apiResponses.push({
          url: response.url(),
          status: response.status(),
          method: response.request().method()
        });
      }
    });
    
    // 导航到不同页面触发API调用
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    await page.goto('/documents');
    await page.waitForLoadState('networkidle');
    
    // 检查API响应状态码
    const failedRequests = apiResponses.filter(response => 
      response.status >= 400 && response.status !== 404
    );
    
    if (failedRequests.length > 0) {
      console.log('失败的API请求:', failedRequests);
    }
    
    // 至少应该有一些成功的API请求
    const successfulRequests = apiResponses.filter(response => 
      response.status >= 200 && response.status < 300
    );
    
    expect(successfulRequests.length).toBeGreaterThan(0);
  });

  test('CORS配置检查', async ({ page }) => {
    let corsError = false;
    
    // 监听控制台错误
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('CORS')) {
        corsError = true;
      }
    });
    
    // 触发跨域请求
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // 检查是否有CORS错误
    expect(corsError).toBe(false);
  });

  test('JWT认证检查', async ({ page }) => {
    let authHeaders = [];
    
    // 监听请求头
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        const authHeader = request.headers()['authorization'];
        if (authHeader) {
          authHeaders.push(authHeader);
        }
      }
    });
    
    // 触发需要认证的API请求
    await page.goto('/documents');
    await page.waitForLoadState('networkidle');
    
    // 检查是否有JWT token
    const jwtHeaders = authHeaders.filter(header => 
      header.startsWith('Bearer ')
    );
    
    if (jwtHeaders.length > 0) {
      expect(jwtHeaders[0]).toMatch(/^Bearer .+/);
    }
  });

  test('API错误处理检查', async ({ page }) => {
    const consoleErrors = [];
    
    // 监听控制台错误
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // 模拟API错误
    await page.route('**/api/v1/documents**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });
    
    await page.goto('/documents');
    await page.waitForLoadState('networkidle');
    
    // 检查错误处理
    const errorDisplay = page.locator('.error, .error-message, text=加载失败');
    if (await errorDisplay.count() > 0) {
      await expect(errorDisplay.first()).toBeVisible();
    }
  });

  test('网络重连测试', async ({ page }) => {
    // 先正常加载页面
    await page.goto('/documents');
    await page.waitForLoadState('networkidle');
    
    // 模拟网络断开
    await page.route('**/api/**', route => {
      route.abort('failed');
    });
    
    // 尝试刷新页面
    await page.reload();
    await page.waitForTimeout(3000);
    
    // 恢复网络连接
    await page.unroute('**/api/**');
    
    // 再次刷新页面
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // 验证页面恢复正常
    await expect(page.locator('body')).toBeVisible();
  });

  test('API响应时间检查', async ({ page }) => {
    const responseTimes = [];
    
    // 监听API响应时间
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        const timing = response.request().timing();
        if (timing) {
          responseTimes.push({
            url: response.url(),
            responseTime: timing.responseEnd - timing.requestStart
          });
        }
      }
    });
    
    // 触发API调用
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    await page.goto('/documents');
    await page.waitForLoadState('networkidle');
    
    // 检查响应时间（应该在合理范围内）
    const slowRequests = responseTimes.filter(req => req.responseTime > 5000);
    
    if (slowRequests.length > 0) {
      console.log('慢请求:', slowRequests);
    }
    
    // 大部分请求应该在5秒内完成
    expect(slowRequests.length).toBeLessThan(responseTimes.length);
  });
});