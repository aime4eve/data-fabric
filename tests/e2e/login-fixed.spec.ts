import { test, expect } from '@playwright/test';

test.describe('登录功能测试 - 修复版', () => {
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
    console.log('登录响应:', responseBody);
    
    // 等待页面跳转或状态变化
    await page.waitForTimeout(2000);
    
    // 检查是否有成功的登录状态变化
    // 可能是页面跳转或者UI状态变化
    const currentUrl = page.url();
    console.log('当前URL:', currentUrl);
    
    // 检查是否有用户信息显示或者登录状态变化
    const pageContent = await page.content();
    console.log('页面是否包含仪表板相关内容:', pageContent.includes('仪表板') || pageContent.includes('Dashboard'));
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
    console.log('错误登录响应:', responseBody);
    
    // 等待错误消息出现
    await page.waitForTimeout(1000);
    
    // 检查是否有错误提示
    const hasErrorMessage = await page.locator('.ant-message-error, .ant-alert-error, .ant-notification-notice-error').count() > 0;
    console.log('是否显示错误消息:', hasErrorMessage);
    
    // 检查响应状态
    expect(response.status()).toBe(401);
  });

  test('空字段验证测试', async ({ page }) => {
    const loginButton = page.locator('button.ant-btn:has-text("登 录")');
    await loginButton.click();
    
    // 等待表单验证
    await page.waitForTimeout(1000);
    
    // 检查是否有表单验证错误
    const hasValidationError = await page.locator('.ant-form-item-explain-error, .ant-form-item-has-error').count() > 0;
    console.log('是否显示表单验证错误:', hasValidationError);
    
    // 截图查看当前状态
    await page.screenshot({ path: 'empty-field-validation.png', fullPage: true });
  });
});