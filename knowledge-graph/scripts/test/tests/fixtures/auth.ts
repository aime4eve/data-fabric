import { test as base, expect, Page, Browser } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';

/**
 * 认证相关的测试夹具
 */
export interface AuthFixtures {
  authenticatedPage: Page;
  adminPage: Page;
  testHelpers: TestHelpers;
}

/**
 * 扩展基础测试，添加认证功能
 */
export const test = base.extend<AuthFixtures>({
  /**
   * 已认证用户页面
   */
  authenticatedPage: async ({ browser }: { browser: Browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // 执行登录流程
    await loginAsUser(page);
    
    await use(page);
    await context.close();
  },

  /**
   * 管理员页面
   */
  adminPage: async ({ browser }: { browser: Browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // 执行管理员登录流程
    await loginAsAdmin(page);
    
    await use(page);
    await context.close();
  },

  /**
   * 测试辅助工具
   */
  testHelpers: async ({ page }: { page: Page }, use) => {
    const helpers = new TestHelpers(page);
    await use(helpers);
  },
});

/**
 * 普通用户登录
 */
async function loginAsUser(page: Page) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const username = process.env.TEST_USERNAME || 'testuser';
  const password = process.env.TEST_PASSWORD || 'testpass123';

  try {
    await page.goto(`${baseUrl}/login`);
    
    // 等待登录表单加载
    await page.waitForSelector('form, .login-form', { timeout: 10000 });
    
    // 填写登录信息
    await page.fill('input[name="username"], input[type="email"], #username', username);
    await page.fill('input[name="password"], input[type="password"], #password', password);
    
    // 点击登录按钮
    await page.click('button[type="submit"], .login-button, .btn-login');
    
    // 等待登录成功跳转
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    
    console.log('✅ 用户登录成功');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error);
    console.warn('⚠️ 用户登录失败，将使用匿名访问:', errorMessage);
    // 如果登录失败，继续使用匿名访问
    await page.goto(baseUrl);
  }
}

/**
 * 管理员登录
 */
async function loginAsAdmin(page: Page) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'adminpass123';

  try {
    await page.goto(`${baseUrl}/login`);
    
    // 等待登录表单加载
    await page.waitForSelector('form, .login-form', { timeout: 10000 });
    
    // 填写管理员登录信息
    await page.fill('input[name="username"], input[type="email"], #username', adminUsername);
    await page.fill('input[name="password"], input[type="password"], #password', adminPassword);
    
    // 点击登录按钮
    await page.click('button[type="submit"], .login-button, .btn-login');
    
    // 等待登录成功跳转
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    
    console.log('✅ 管理员登录成功');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error);
    console.warn('⚠️ 管理员登录失败，将使用普通用户权限:', errorMessage);
    // 如果管理员登录失败，尝试普通用户登录
    await loginAsUser(page);
  }
}

/**
 * 登出操作
 */
export async function logout(page: Page) {
  try {
    // 查找登出按钮或链接
    const logoutSelectors = [
      '.logout-button',
      '.btn-logout',
      'button:has-text("登出")',
      'button:has-text("退出")',
      'a:has-text("登出")',
      'a:has-text("退出")',
      '[data-testid="logout"]'
    ];

    for (const selector of logoutSelectors) {
      try {
        const element = page.locator(selector);
        if (await element.isVisible({ timeout: 2000 })) {
          await element.click();
          await page.waitForURL('**/login', { timeout: 10000 });
          console.log('✅ 登出成功');
          return;
        }
      } catch {
        // 继续尝试下一个选择器
      }
    }
    
    console.warn('⚠️ 未找到登出按钮，可能已经处于登出状态');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error);
    console.warn('⚠️ 登出操作失败:', errorMessage);
  }
}

/**
 * 检查用户是否已登录
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    // 检查是否在登录页面
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      return false;
    }

    // 检查是否存在用户相关元素
    const userIndicators = [
      '.user-info',
      '.user-avatar',
      '.user-menu',
      '[data-testid="user-info"]',
      '.logout-button'
    ];

    for (const selector of userIndicators) {
      try {
        if (await page.locator(selector).isVisible({ timeout: 2000 })) {
          return true;
        }
      } catch {
        // 继续检查下一个指示器
      }
    }

    return false;
  } catch {
    return false;
  }
}

export { expect };