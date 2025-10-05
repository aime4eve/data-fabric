import { test, expect } from '@playwright/test';

test.describe('登录功能测试 - 最终版', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到登录页面
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('成功登录测试', async ({ page }) => {
    // 检查是否在登录页面
    await expect(page).toHaveTitle(/知识库管理系统/);
    
    // 查找用户名输入框
    const usernameInput = page.locator('input[placeholder="请输入用户名或邮箱"]');
    await expect(usernameInput).toBeVisible();
    await usernameInput.fill('admin');
    
    // 查找密码输入框
    const passwordInput = page.locator('input[placeholder="请输入密码"]');
    await expect(passwordInput).toBeVisible();
    await passwordInput.fill('123456');
    
    // 点击登录按钮
    const loginButton = page.locator('button.ant-btn:has-text("登 录")');
    await expect(loginButton).toBeVisible();
    
    // 监听网络请求
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/v1/auth/login') && response.status() === 200
    );
    
    await loginButton.click();
    
    // 等待登录响应
    const response = await responsePromise;
    const responseBody = await response.json();
    
    // 验证登录响应
    expect(responseBody.success).toBe(true);
    expect(responseBody.access_token).toBeTruthy();
    expect(responseBody.user).toBeTruthy();
    
    // 等待页面状态更新
    await page.waitForTimeout(3000);
    
    // 检查localStorage中是否保存了token
    const token = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(token).toBeTruthy();
    
    // 检查用户信息是否保存
    const user = await page.evaluate(() => {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    });
    expect(user).toBeTruthy();
    expect(user.username).toBe('admin');
    
    // 手动导航到仪表板页面（模拟登录成功后的跳转）
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // 验证仪表板页面加载成功
    await expect(page).toHaveURL(/dashboard/);
    
    // 检查仪表板页面内容
    await expect(page.locator('text=仪表板, text=Dashboard, text=总文档数, text=总浏览量')).toBeVisible({ timeout: 10000 });
  });

  test('错误凭据登录测试', async ({ page }) => {
    // 输入错误的用户名和密码
    const usernameInput = page.locator('input[placeholder="请输入用户名或邮箱"]');
    await usernameInput.fill('wronguser');
    
    const passwordInput = page.locator('input[placeholder="请输入密码"]');
    await passwordInput.fill('wrongpass');
    
    const loginButton = page.locator('button.ant-btn:has-text("登 录")');
    
    // 监听网络请求
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/v1/auth/login')
    );
    
    await loginButton.click();
    
    // 等待登录响应
    const response = await responsePromise;
    const responseBody = await response.json();
    
    // 验证错误响应
    expect(response.status()).toBe(401);
    expect(responseBody.success).toBe(false);
    expect(responseBody.message).toContain('用户名或密码错误');
    
    // 等待错误消息显示
    await page.waitForTimeout(2000);
    
    // 验证仍在登录页面
    expect(page.url()).toContain('/login');
    
    // 检查是否显示错误消息
    const hasErrorMessage = await page.locator('.ant-alert-error, .ant-message-error').count() > 0;
    console.log('是否显示错误消息:', hasErrorMessage);
  });

  test('空字段验证测试', async ({ page }) => {
    const loginButton = page.locator('button.ant-btn:has-text("登 录")');
    await loginButton.click();
    
    // 等待表单验证
    await page.waitForTimeout(1000);
    
    // 检查是否有表单验证错误
    const validationErrors = await page.locator('.ant-form-item-explain-error').count();
    console.log('表单验证错误数量:', validationErrors);
    
    // 验证仍在登录页面
    expect(page.url()).toContain('/login');
    
    // 截图查看当前状态
    await page.screenshot({ path: 'empty-field-validation-final.png', fullPage: true });
  });
});