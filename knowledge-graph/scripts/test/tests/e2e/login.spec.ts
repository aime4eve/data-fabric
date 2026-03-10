import { test, expect } from '../fixtures/auth';
import { TestHelpers, TestDataGenerator } from '../utils/test-helpers';

/**
 * 登录功能端到端测试
 * 测试用户登录、登出和认证相关功能
 */
test.describe('登录功能测试', () => {
  let testHelpers: TestHelpers;

  test.beforeEach(async ({ page }: { page: import('@playwright/test').Page }) => {
    testHelpers = new TestHelpers(page);
    // 确保从登录页面开始
    await page.goto('/login');
  });

  test('成功登录 - 有效凭据', async ({ page }: { page: import('@playwright/test').Page }) => {
    const username = process.env.TEST_USERNAME || 'testuser';
    const password = process.env.TEST_PASSWORD || 'testpass123';

    // 等待登录页面加载
    await testHelpers.waitForPageLoad();
    
    // 验证登录页面元素存在
    await expect(page.locator('form, .login-form')).toBeVisible();
    
    // 填写登录信息
    await testHelpers.safeFill('[data-testid="username-input"], input[name="username"], input[type="email"], #username', username);
    await testHelpers.safeFill('[data-testid="password-input"], input[name="password"], input[type="password"], #password', password);
    
    // 点击登录按钮
    await testHelpers.safeClick('[data-testid="login-button"], button[type="submit"], .login-button, .btn-login');
    
    // 验证登录成功 - 跳转到仪表板
    await testHelpers.waitForUrlChange(/dashboard|home|main/);
    
    // 验证用户已登录的指示器
    const userIndicators = [
      '[data-testid="user-info"]',
      '.user-info',
      '.user-avatar', 
      '.user-menu',
      '.logout-button'
    ];
    
    let userIndicatorFound = false;
    for (const selector of userIndicators) {
      if (await testHelpers.isElementVisible(selector, 2000)) {
        userIndicatorFound = true;
        break;
      }
    }
    
    expect(userIndicatorFound).toBeTruthy();
    
    // 截图记录成功状态
    await testHelpers.takeScreenshot('login-success');
  });

  test('登录失败 - 无效凭据', async ({ page }: { page: import('@playwright/test').Page }) => {
    const invalidUsername = 'invaliduser';
    const invalidPassword = 'wrongpassword';

    // 等待登录页面加载
    await testHelpers.waitForPageLoad();
    
    // 填写无效登录信息
    await testHelpers.safeFill('[data-testid="username-input"], input[name="username"], input[type="email"], #username', invalidUsername);
    await testHelpers.safeFill('[data-testid="password-input"], input[name="password"], input[type="password"], #password', invalidPassword);
    
    // 点击登录按钮
    await testHelpers.safeClick('[data-testid="login-button"], button[type="submit"], .login-button, .btn-login');
    
    // 验证错误消息显示
    const errorSelectors = [
      '[data-testid="error-message"]',
      '.error-message',
      '.alert-error',
      '.login-error',
      '.text-red-500',
      '.text-danger'
    ];
    
    let errorFound = false;
    for (const selector of errorSelectors) {
      if (await testHelpers.isElementVisible(selector, 5000)) {
        errorFound = true;
        break;
      }
    }
    
    expect(errorFound).toBeTruthy();
    
    // 验证仍在登录页面
    expect(page.url()).toMatch(/login/);
    
    // 截图记录错误状态
    await testHelpers.takeScreenshot('login-failure');
  });

  test('登录表单验证', async ({ page }: { page: import('@playwright/test').Page }) => {
    // 等待登录页面加载
    await testHelpers.waitForPageLoad();
    
    // 测试空用户名
    await testHelpers.safeFill('[data-testid="password-input"], input[name="password"], input[type="password"], #password', 'somepassword');
    await testHelpers.safeClick('[data-testid="login-button"], button[type="submit"], .login-button, .btn-login');
    
    // 验证用户名必填提示
    const usernameError = await testHelpers.isElementVisible('.username-error, .email-error, [data-testid="username-error"]', 3000);
    expect(usernameError).toBeTruthy();
    
    // 清空密码，测试空密码
    await testHelpers.safeFill('[data-testid="username-input"], input[name="username"], input[type="email"], #username', 'testuser');
    await testHelpers.safeFill('[data-testid="password-input"], input[name="password"], input[type="password"], #password', '');
    await testHelpers.safeClick('[data-testid="login-button"], button[type="submit"], .login-button, .btn-login');
    
    // 验证密码必填提示
    const passwordError = await testHelpers.isElementVisible('.password-error, [data-testid="password-error"]', 3000);
    expect(passwordError).toBeTruthy();
  });

  test('记住我功能', async ({ page }: { page: import('@playwright/test').Page }) => {
    const username = process.env.TEST_USERNAME || 'testuser';
    const password = process.env.TEST_PASSWORD || 'testpass123';

    // 等待登录页面加载
    await testHelpers.waitForPageLoad();
    
    // 填写登录信息
    await testHelpers.safeFill('[data-testid="username-input"], input[name="username"], input[type="email"], #username', username);
    await testHelpers.safeFill('[data-testid="password-input"], input[name="password"], input[type="password"], #password', password);
    
    // 勾选记住我选项（如果存在）
    const rememberMeCheckbox = page.locator('input[name="remember"], input[type="checkbox"]:has-text("记住我"), #remember');
    if (await rememberMeCheckbox.isVisible({ timeout: 2000 })) {
      await rememberMeCheckbox.check();
    }
    
    // 点击登录按钮
    await testHelpers.safeClick('[data-testid="login-button"], button[type="submit"], .login-button, .btn-login');
    
    // 验证登录成功
    await testHelpers.waitForUrlChange(/dashboard|home|main/);
    
    // 刷新页面验证会话保持
    await page.reload();
    await testHelpers.waitForPageLoad();
    
    // 验证用户仍然登录
    const currentUrl = page.url();
    expect(currentUrl).not.toMatch(/login/);
  });

  test('登出功能', async ({ authenticatedPage }: { authenticatedPage: import('@playwright/test').Page }) => {
    const page = authenticatedPage;
    testHelpers = new TestHelpers(page);
    
    // 确保用户已登录
    await page.goto('/dashboard');
    await testHelpers.waitForPageLoad();
    
    // 查找并点击登出按钮
    const logoutSelectors = [
      '[data-testid="logout-menu-item"]',
      '[data-testid="logout"]',
      '.logout-button',
      '.btn-logout',
      'button:has-text("登出")',
      'button:has-text("退出")',
      'a:has-text("登出")',
      'a:has-text("退出")'
    ];

    // 首先点击用户信息区域打开下拉菜单
    const userInfoSelector = '[data-testid="user-info"], .user-info';
    if (await testHelpers.isElementVisible(userInfoSelector, 2000)) {
      await testHelpers.safeClick(userInfoSelector);
      await page.waitForTimeout(1000); // 等待下拉菜单展开
    }

    let logoutSuccess = false;
    for (const selector of logoutSelectors) {
      if (await testHelpers.isElementVisible(selector, 2000)) {
        await testHelpers.safeClick(selector);
        
        // 等待跳转到登录页面
        try {
          await testHelpers.waitForUrlChange(/login/, 10000);
          logoutSuccess = true;
          break;
        } catch {
          // 继续尝试下一个选择器
        }
      }
    }
    
    expect(logoutSuccess).toBeTruthy();
    
    // 验证已跳转到登录页面
    expect(page.url()).toMatch(/login/);
    
    // 截图记录登出状态
    await testHelpers.takeScreenshot('logout-success');
  });

  test('会话超时处理', async ({ authenticatedPage }: { authenticatedPage: import('@playwright/test').Page }) => {
    const page = authenticatedPage;
    testHelpers = new TestHelpers(page);
    
    // 模拟会话超时（清除所有存储）
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // 尝试访问需要认证的页面
    await page.goto('/dashboard');
    
    // 验证被重定向到登录页面
    await page.waitForURL(/login/, { timeout: 10000 });
    expect(page.url()).toMatch(/login/);
  });

  test('密码可见性切换', async ({ page }: { page: import('@playwright/test').Page }) => {
    // 等待登录页面加载
    await testHelpers.waitForPageLoad();
    
    const passwordInput = page.locator('[data-testid="password-input"], input[name="password"], input[type="password"], #password');
    const toggleButton = page.locator('.password-toggle, .show-password, [data-testid="password-toggle"]');
    
    // 填写密码
    await testHelpers.safeFill('[data-testid="password-input"], input[name="password"], input[type="password"], #password', 'testpassword');
    
    // 检查密码切换按钮是否存在
    if (await toggleButton.isVisible({ timeout: 2000 })) {
      // 验证初始状态为密码类型
      expect(await passwordInput.getAttribute('type')).toBe('password');
      
      // 点击切换按钮
      await toggleButton.click();
      
      // 验证切换为文本类型
      expect(await passwordInput.getAttribute('type')).toBe('text');
      
      // 再次点击切换回密码类型
      await toggleButton.click();
      expect(await passwordInput.getAttribute('type')).toBe('password');
    }
  });
});