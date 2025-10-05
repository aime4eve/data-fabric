import { test, expect } from '@playwright/test';

test.describe('登录调试测试', () => {
  test('详细登录流程调试', async ({ page }) => {
    // 监听所有网络请求
    page.on('request', request => {
      console.log('请求:', request.method(), request.url());
    });
    
    page.on('response', response => {
      console.log('响应:', response.status(), response.url());
    });

    // 导航到登录页面
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    console.log('初始URL:', page.url());
    
    // 检查localStorage初始状态
    const initialToken = await page.evaluate(() => localStorage.getItem('access_token'));
    console.log('初始token:', initialToken);
    
    // 输入登录信息
    await page.fill('input[placeholder="请输入用户名或邮箱"]', 'admin');
    await page.fill('input[placeholder="请输入密码"]', '123456');
    
    // 监听登录响应
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/v1/auth/login')
    );
    
    // 点击登录按钮
    await page.click('button.ant-btn:has-text("登 录")');
    
    // 等待登录响应
    const response = await responsePromise;
    const responseBody = await response.json();
    console.log('登录响应状态:', response.status());
    console.log('登录响应内容:', responseBody);
    
    // 等待一段时间让状态更新
    await page.waitForTimeout(2000);
    
    // 检查localStorage状态
    const token = await page.evaluate(() => localStorage.getItem('access_token'));
    const user = await page.evaluate(() => localStorage.getItem('user'));
    console.log('登录后token:', token ? '存在' : '不存在');
    console.log('登录后用户信息:', user ? JSON.parse(user) : '不存在');
    
    // 检查当前URL
    console.log('登录后URL:', page.url());
    
    // 检查页面内容
    const pageTitle = await page.title();
    console.log('页面标题:', pageTitle);
    
    // 检查是否有错误信息
    const errorElements = await page.locator('.ant-alert-error, .ant-message-error').count();
    console.log('错误信息数量:', errorElements);
    
    // 手动触发页面刷新看看状态
    await page.reload();
    await page.waitForLoadState('networkidle');
    console.log('刷新后URL:', page.url());
    
    // 截图保存当前状态
    await page.screenshot({ path: 'login-debug-final.png', fullPage: true });
  });
});