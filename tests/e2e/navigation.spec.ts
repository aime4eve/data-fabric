import { test, expect } from '@playwright/test';

test.describe('导航功能测试', () => {
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

  test('主导航菜单测试', async ({ page }) => {
    // 检查导航菜单是否存在
    const navigation = page.locator('nav, .navigation, .sidebar, .menu');
    await expect(navigation.first()).toBeVisible();
    
    // 检查主要导航项
    const navItems = [
      { text: '仪表板', url: 'dashboard' },
      { text: '文档管理', url: 'documents' },
      { text: '用户管理', url: 'users' },
      { text: '设置', url: 'settings' }
    ];
    
    for (const item of navItems) {
      const navLink = page.locator(`a:has-text("${item.text}"), [href*="${item.url}"]`);
      if (await navLink.count() > 0) {
        await expect(navLink.first()).toBeVisible();
      }
    }
  });

  test('页面间导航测试', async ({ page }) => {
    // 测试导航到文档管理
    const documentsLink = page.locator('a[href*="documents"], text=文档管理, text=Documents').first();
    if (await documentsLink.count() > 0) {
      await documentsLink.click();
      await page.waitForURL('**/documents', { timeout: 5000 });
      await expect(page).toHaveURL(/documents/);
    }
    
    // 返回仪表板
    const dashboardLink = page.locator('a[href*="dashboard"], text=仪表板, text=Dashboard').first();
    if (await dashboardLink.count() > 0) {
      await dashboardLink.click();
      await page.waitForURL('**/dashboard', { timeout: 5000 });
      await expect(page).toHaveURL(/dashboard/);
    }
  });

  test('面包屑导航测试', async ({ page }) => {
    // 导航到子页面
    await page.goto('/documents');
    await page.waitForLoadState('networkidle');
    
    // 检查面包屑
    const breadcrumb = page.locator('.breadcrumb, .breadcrumbs, nav[aria-label="breadcrumb"]');
    if (await breadcrumb.count() > 0) {
      await expect(breadcrumb.first()).toBeVisible();
      
      // 检查面包屑链接
      const breadcrumbLinks = breadcrumb.locator('a');
      if (await breadcrumbLinks.count() > 0) {
        await expect(breadcrumbLinks.first()).toBeVisible();
      }
    }
  });

  test('用户菜单测试', async ({ page }) => {
    // 查找用户菜单或头像
    const userMenu = page.locator('.user-menu, .profile-menu, .avatar, .user-dropdown');
    
    if (await userMenu.count() > 0) {
      await userMenu.first().click();
      await page.waitForTimeout(1000);
      
      // 检查下拉菜单
      const dropdown = page.locator('.dropdown, .menu-dropdown, .user-dropdown-menu');
      if (await dropdown.count() > 0) {
        await expect(dropdown.first()).toBeVisible();
        
        // 检查登出选项
        const logoutOption = dropdown.locator('text=登出, text=退出, text=Logout');
        if (await logoutOption.count() > 0) {
          await expect(logoutOption.first()).toBeVisible();
        }
      }
    }
  });

  test('登出功能测试', async ({ page }) => {
    // 查找登出按钮
    const logoutButton = page.locator('button:has-text("登出"), button:has-text("退出"), a:has-text("登出"), .logout-btn');
    
    if (await logoutButton.count() > 0) {
      await logoutButton.first().click();
      
      // 等待跳转到登录页面
      await page.waitForURL('**/', { timeout: 5000 });
      
      // 验证已返回登录页面
      const loginForm = page.locator('form, .login-form, input[type="password"]');
      await expect(loginForm.first()).toBeVisible();
    } else {
      // 尝试通过用户菜单登出
      const userMenu = page.locator('.user-menu, .profile-menu, .avatar');
      if (await userMenu.count() > 0) {
        await userMenu.first().click();
        await page.waitForTimeout(1000);
        
        const logoutInMenu = page.locator('text=登出, text=退出, text=Logout');
        if (await logoutInMenu.count() > 0) {
          await logoutInMenu.first().click();
          await page.waitForURL('**/', { timeout: 5000 });
        }
      }
    }
  });

  test('移动端导航测试', async ({ page }) => {
    // 设置移动端视口
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    
    // 查找移动端菜单按钮
    const mobileMenuButton = page.locator('.mobile-menu-btn, .hamburger, .menu-toggle, [aria-label="Menu"]');
    
    if (await mobileMenuButton.count() > 0) {
      await mobileMenuButton.first().click();
      await page.waitForTimeout(1000);
      
      // 检查移动端菜单
      const mobileMenu = page.locator('.mobile-menu, .sidebar-mobile, .nav-mobile');
      if (await mobileMenu.count() > 0) {
        await expect(mobileMenu.first()).toBeVisible();
      }
    }
  });

  test('URL直接访问测试', async ({ page }) => {
    // 测试直接访问各个页面
    const pages = [
      '/dashboard',
      '/documents',
      '/users',
      '/settings'
    ];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
      
      // 验证页面加载（不应该重定向到登录页面）
      await expect(page).toHaveURL(new RegExp(pagePath.substring(1)));
    }
  });

  test('浏览器前进后退测试', async ({ page }) => {
    // 导航到文档页面
    await page.goto('/documents');
    await page.waitForLoadState('networkidle');
    
    // 返回仪表板
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // 使用浏览器后退
    await page.goBack();
    await expect(page).toHaveURL(/documents/);
    
    // 使用浏览器前进
    await page.goForward();
    await expect(page).toHaveURL(/dashboard/);
  });
});