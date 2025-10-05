import { test, expect } from '@playwright/test';

test.describe('登录存储调试', () => {
  test('检查登录后localStorage状态', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
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
    console.log('登录响应:', responseBody);
    
    // 等待一段时间让JavaScript执行
    await page.waitForTimeout(1000);
    
    // 检查localStorage状态
    const storageState = await page.evaluate(() => {
      return {
        access_token: localStorage.getItem('access_token'),
        refresh_token: localStorage.getItem('refresh_token'),
        user: localStorage.getItem('user'),
        allKeys: Object.keys(localStorage)
      };
    });
    
    console.log('localStorage状态:', storageState);
    
    // 手动调用保存用户数据的函数
    await page.evaluate((loginResponse) => {
      localStorage.setItem('access_token', loginResponse.access_token);
      localStorage.setItem('refresh_token', loginResponse.refresh_token);
      localStorage.setItem('user', JSON.stringify(loginResponse.user));
    }, responseBody);
    
    // 再次检查localStorage状态
    const storageStateAfter = await page.evaluate(() => {
      return {
        access_token: localStorage.getItem('access_token'),
        refresh_token: localStorage.getItem('refresh_token'),
        user: localStorage.getItem('user')
      };
    });
    
    console.log('手动保存后localStorage状态:', storageStateAfter);
  });
});