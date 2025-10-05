import { test, expect } from '@playwright/test';

test.describe('登录功能测试', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到登录页面
    await page.goto('/');
  });

  test('成功登录测试', async ({ page }) => {
    // 等待页面加载
    await page.waitForLoadState('networkidle');
    
    // 检查是否在登录页面
    await expect(page).toHaveTitle(/知识库管理系统/);
    
    // 查找用户名输入框 - 使用更精确的选择器
    const usernameInput = page.locator('input[placeholder="请输入用户名或邮箱"]');
    await expect(usernameInput).toBeVisible();
    await usernameInput.fill('admin');
    
    // 查找密码输入框 - Ant Design的Password组件
    const passwordInput = page.locator('input[placeholder="请输入密码"]');
    await expect(passwordInput).toBeVisible();
    await passwordInput.fill('123456');
    
    // 点击登录按钮 - Ant Design Button组件
    const loginButton = page.locator('button.ant-btn:has-text("登 录")');
    await expect(loginButton).toBeVisible();
    
    // 监听网络请求
    const loginRequest = page.waitForRequest(request => 
      request.url().includes('/api/v1/auth/login') && request.method() === 'POST'
    );
    
    await loginButton.click();
    
    // 等待登录请求完成
    await loginRequest;
    
    // 等待页面跳转到仪表板
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // 验证登录成功
    await expect(page).toHaveURL(/dashboard/);
    
    // 检查仪表板页面元素
    await expect(page.locator('text=仪表板, text=Dashboard')).toBeVisible({ timeout: 5000 });
  });

  test('错误凭据登录测试', async ({ page }) => {
    // 输入错误的用户名和密码
    const usernameInput = page.locator('input[placeholder="请输入用户名或邮箱"]');
    await usernameInput.fill('wronguser');
    
    const passwordInput = page.locator('input[placeholder="请输入密码"]');
    await passwordInput.fill('wrongpass');
    
    const loginButton = page.locator('button.ant-btn:has-text("登 录")');
    await loginButton.click();
    
    // 等待错误消息出现 - Ant Design Alert组件
    await expect(page.locator('.ant-alert-error, text=用户名或密码错误, text=登录失败')).toBeVisible({ timeout: 5000 });
  });

  test('空字段验证测试', async ({ page }) => {
    const loginButton = page.locator('button.ant-btn:has-text("登 录")');
    await loginButton.click();
    
    // 检查验证消息 - Ant Design Form验证
    await expect(page.locator('.ant-form-item-explain-error, text=请输入用户名或邮箱')).toBeVisible({ timeout: 3000 });
  });
});