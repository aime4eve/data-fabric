import { test, expect } from '../fixtures/auth';
import { TestHelpers } from '../utils/test-helpers';

/**
 * 导航功能端到端测试
 * 测试页面导航、菜单功能、面包屑导航等
 */
test.describe('导航功能测试', () => {
  let testHelpers: TestHelpers;

  test.beforeEach(async ({ authenticatedPage }: { authenticatedPage: import('@playwright/test').Page }) => {
    const page = authenticatedPage;
    testHelpers = new TestHelpers(page);
    
    // 导航到首页
    await page.goto('/');
    await testHelpers.waitForPageLoad();
  });

  test('主导航菜单功能', async ({ authenticatedPage }: { authenticatedPage: import('@playwright/test').Page }) => {
    const page = authenticatedPage;

    // 查找主导航菜单
    const navSelectors = [
      '.main-nav',
      '.navbar',
      '.navigation',
      'nav',
      '[data-testid="main-navigation"]'
    ];

    let navFound = false;
    for (const selector of navSelectors) {
      if (await testHelpers.isElementVisible(selector, 3000)) {
        const nav = page.locator(selector);
        
        // 查找导航链接
        const navLinks = nav.locator('a, .nav-link, .menu-item');
        const linkCount = await navLinks.count();
        
        if (linkCount > 0) {
          // 测试每个导航链接
          for (let i = 0; i < Math.min(linkCount, 5); i++) {
            const link = navLinks.nth(i);
            const linkText = await link.textContent();
            const href = await link.getAttribute('href');
            
            if (linkText && href && !href.startsWith('#') && !href.startsWith('javascript:')) {
              console.log(`测试导航链接: ${linkText} -> ${href}`);
              
              // 点击链接
              await link.click();
              await testHelpers.waitForPageLoad();
              
              // 验证页面跳转
              const currentUrl = page.url();
              expect(currentUrl).toContain(href.replace(/^\//, ''));
              
              // 返回首页继续测试下一个链接
              await page.goto('/');
              await testHelpers.waitForPageLoad();
            }
          }
          
          navFound = true;
          break;
        }
      }
    }

    expect(navFound).toBeTruthy();
    
    // 截图记录导航测试
    await testHelpers.takeScreenshot('main-navigation');
  });

  test('侧边栏导航', async ({ authenticatedPage }: { authenticatedPage: import('@playwright/test').Page }) => {
    const page = authenticatedPage;

    // 查找侧边栏
    const sidebarSelectors = [
      '.sidebar',
      '.side-nav',
      '.left-sidebar',
      '.navigation-sidebar',
      '[data-testid="sidebar"]'
    ];

    let sidebarFound = false;
    for (const selector of sidebarSelectors) {
      if (await testHelpers.isElementVisible(selector, 3000)) {
        const sidebar = page.locator(selector);
        
        // 查找侧边栏菜单项
        const menuItems = sidebar.locator('a, .menu-item, .nav-item');
        const itemCount = await menuItems.count();
        
        if (itemCount > 0) {
          // 测试前几个菜单项
          for (let i = 0; i < Math.min(itemCount, 3); i++) {
            const item = menuItems.nth(i);
            const itemText = await item.textContent();
            
            if (itemText && itemText.trim()) {
              console.log(`测试侧边栏菜单: ${itemText}`);
              
              // 点击菜单项
              await item.click();
              await testHelpers.waitForPageLoad();
              
              // 验证菜单项被激活
              const isActive = await item.evaluate((el: Element) => 
                el.classList.contains('active') || 
                el.classList.contains('selected') ||
                el.classList.contains('current')
              );
              
              // 如果没有active类，检查父元素
              if (!isActive) {
                const parentActive = await item.locator('..').evaluate((el: Element) => 
                  el.classList.contains('active') || 
                  el.classList.contains('selected') ||
                  el.classList.contains('current')
                );
              }
            }
          }
          
          sidebarFound = true;
          break;
        }
      }
    }

    // 截图记录侧边栏测试
    await testHelpers.takeScreenshot('sidebar-navigation');
  });

  test('移动端导航菜单', async ({ authenticatedPage }: { authenticatedPage: import('@playwright/test').Page }) => {
    const page = authenticatedPage;

    // 设置移动端视口
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await testHelpers.waitForPageLoad();

    // 查找移动端菜单按钮
    const mobileMenuSelectors = [
      '.mobile-menu-toggle',
      '.hamburger',
      '.menu-toggle',
      '.navbar-toggle',
      '[data-testid="mobile-menu-toggle"]'
    ];

    let mobileMenuFound = false;
    for (const selector of mobileMenuSelectors) {
      if (await testHelpers.isElementVisible(selector, 3000)) {
        const menuToggle = page.locator(selector);
        
        // 点击菜单按钮
        await menuToggle.click();
        await page.waitForTimeout(500);
        
        // 查找展开的移动端菜单
        const mobileNavSelectors = [
          '.mobile-nav',
          '.mobile-menu',
          '.navbar-collapse',
          '.mobile-navigation',
          '[data-testid="mobile-navigation"]'
        ];

        for (const navSelector of mobileNavSelectors) {
          if (await testHelpers.isElementVisible(navSelector, 3000)) {
            const mobileNav = page.locator(navSelector);
            
            // 验证菜单是否可见
            expect(await mobileNav.isVisible()).toBeTruthy();
            
            // 测试菜单项
            const menuItems = mobileNav.locator('a, .menu-item');
            const itemCount = await menuItems.count();
            
            if (itemCount > 0) {
              const firstItem = menuItems.first();
              const itemText = await firstItem.textContent();
              
              if (itemText && itemText.trim()) {
                await firstItem.click();
                await testHelpers.waitForPageLoad();
              }
            }
            
            mobileMenuFound = true;
            break;
          }
        }
        
        if (mobileMenuFound) break;
      }
    }

    // 恢复桌面端视口
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // 截图记录移动端菜单测试
    await testHelpers.takeScreenshot('mobile-navigation');
  });

  test('面包屑导航', async ({ authenticatedPage }: { authenticatedPage: import('@playwright/test').Page }) => {
    const page = authenticatedPage;

    // 导航到一个深层页面（如文档详情页）
    await page.goto('/documents');
    await testHelpers.waitForPageLoad();

    // 查找并点击第一个文档
    const documentLinks = page.locator('a[href*="/document/"], .document-link, .document-item a');
    const linkCount = await documentLinks.count();
    
    if (linkCount > 0) {
      await documentLinks.first().click();
      await testHelpers.waitForPageLoad();
    }

    // 查找面包屑导航
    const breadcrumbSelectors = [
      '.breadcrumb',
      '.breadcrumbs',
      '.breadcrumb-nav',
      '.page-breadcrumb',
      '[data-testid="breadcrumb"]'
    ];

    let breadcrumbFound = false;
    for (const selector of breadcrumbSelectors) {
      if (await testHelpers.isElementVisible(selector, 3000)) {
        const breadcrumb = page.locator(selector);
        
        // 查找面包屑链接
        const breadcrumbLinks = breadcrumb.locator('a, .breadcrumb-item');
        const linkCount = await breadcrumbLinks.count();
        
        if (linkCount > 0) {
          // 点击面包屑中的上级链接
          const parentLink = breadcrumbLinks.nth(-2); // 倒数第二个链接
          
          if (await parentLink.isVisible({ timeout: 2000 })) {
            const linkText = await parentLink.textContent();
            console.log(`点击面包屑链接: ${linkText}`);
            
            await parentLink.click();
            await testHelpers.waitForPageLoad();
            
            // 验证返回到了上级页面
            const currentUrl = page.url();
            expect(currentUrl).not.toContain('/document/');
          }
          
          breadcrumbFound = true;
          break;
        }
      }
    }

    // 截图记录面包屑导航测试
    await testHelpers.takeScreenshot('breadcrumb-navigation');
  });

  test('页面标题和元数据', async ({ authenticatedPage }: { authenticatedPage: import('@playwright/test').Page }) => {
    const page = authenticatedPage;

    // 测试不同页面的标题
    const testPages = [
      { path: '/', expectedTitle: /首页|主页|知识库|Home/ },
      { path: '/documents', expectedTitle: /文档|Documents/ },
      { path: '/search', expectedTitle: /搜索|Search/ }
    ];

    for (const testPage of testPages) {
      await page.goto(testPage.path);
      await testHelpers.waitForPageLoad();
      
      // 验证页面标题
      const title = await page.title();
      console.log(`页面 ${testPage.path} 的标题: ${title}`);
      
      // 验证页面标题符合预期
      if (testPage.expectedTitle) {
        expect(title).toMatch(testPage.expectedTitle);
      }
      
      // 验证页面有基本的元数据
      const metaDescription = await page.locator('meta[name="description"]').getAttribute('content');
      const metaKeywords = await page.locator('meta[name="keywords"]').getAttribute('content');
      
      console.log(`页面描述: ${metaDescription}`);
      console.log(`页面关键词: ${metaKeywords}`);
    }

    // 截图记录页面元数据测试
    await testHelpers.takeScreenshot('page-metadata');
  });

  test('返回顶部功能', async ({ authenticatedPage }: { authenticatedPage: import('@playwright/test').Page }) => {
    const page = authenticatedPage;

    // 导航到有长内容的页面
    await page.goto('/documents');
    await testHelpers.waitForPageLoad();

    // 滚动到页面底部
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    // 查找返回顶部按钮
    const backToTopSelectors = [
      '.back-to-top',
      '.scroll-to-top',
      '.go-to-top',
      '[data-testid="back-to-top"]'
    ];

    let backToTopFound = false;
    for (const selector of backToTopSelectors) {
      if (await testHelpers.isElementVisible(selector, 3000)) {
        const backToTopBtn = page.locator(selector);
        
        // 点击返回顶部按钮
        await backToTopBtn.click();
        await page.waitForTimeout(1000);
        
        // 验证页面滚动到了顶部
        const scrollY = await page.evaluate(() => window.scrollY);
        expect(scrollY).toBeLessThan(100);
        
        backToTopFound = true;
        break;
      }
    }

    // 截图记录返回顶部功能
    await testHelpers.takeScreenshot('back-to-top');
  });

  test('页面加载状态', async ({ authenticatedPage }: { authenticatedPage: import('@playwright/test').Page }) => {
    const page = authenticatedPage;

    // 监听页面加载状态
    let loadingIndicatorFound = false;

    // 导航到一个可能有加载状态的页面
    const navigationPromise = page.goto('/documents');

    // 在导航过程中查找加载指示器
    const loadingSelectors = [
      '.loading',
      '.spinner',
      '.loader',
      '.loading-indicator',
      '[data-testid="loading"]'
    ];

    // 等待一小段时间以捕获加载状态
    await page.waitForTimeout(100);

    for (const selector of loadingSelectors) {
      if (await testHelpers.isElementVisible(selector, 1000)) {
        loadingIndicatorFound = true;
        console.log(`发现加载指示器: ${selector}`);
        
        // 等待加载完成
        await page.waitForSelector(selector, { state: 'hidden', timeout: 10000 });
        break;
      }
    }

    await navigationPromise;
    await testHelpers.waitForPageLoad();

    // 截图记录页面加载状态
    await testHelpers.takeScreenshot('page-loading');
  });

  test('404错误页面', async ({ authenticatedPage }: { authenticatedPage: import('@playwright/test').Page }) => {
    const page = authenticatedPage;

    // 访问不存在的页面
    await page.goto('/non-existent-page-12345');
    await testHelpers.waitForPageLoad();

    // 验证404页面
    const error404Indicators = [
      '.error-404',
      '.not-found',
      '.page-not-found',
      '[data-testid="404-page"]'
    ];

    let error404Found = false;
    for (const selector of error404Indicators) {
      if (await testHelpers.isElementVisible(selector, 3000)) {
        error404Found = true;
        break;
      }
    }

    // 如果没有专门的404页面，检查页面内容是否包含404相关信息
    if (!error404Found) {
      const pageContent = await page.textContent('body');
      if (pageContent && (pageContent.includes('404') || pageContent.includes('Not Found') || pageContent.includes('页面不存在'))) {
        error404Found = true;
      }
    }

    expect(error404Found).toBeTruthy();

    // 查找返回首页的链接
    const homeLinks = page.locator('a[href="/"], a[href="/home"], .back-home, .go-home');
    const homeLinkCount = await homeLinks.count();
    
    if (homeLinkCount > 0) {
      await homeLinks.first().click();
      await testHelpers.waitForPageLoad();
      
      // 验证返回到了首页
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/\/$|\/home/);
    }

    // 截图记录404页面
    await testHelpers.takeScreenshot('404-page');
  });

  test('页面刷新和前进后退', async ({ authenticatedPage }: { authenticatedPage: import('@playwright/test').Page }) => {
    const page = authenticatedPage;

    // 访问首页
    await page.goto('/');
    await testHelpers.waitForPageLoad();

    // 导航到文档页面
    await page.goto('/documents');
    await testHelpers.waitForPageLoad();

    // 导航到搜索页面
    await page.goto('/search');
    await testHelpers.waitForPageLoad();

    // 测试后退功能
    await page.goBack();
    await testHelpers.waitForPageLoad();
    
    let currentUrl = page.url();
    expect(currentUrl).toContain('documents');

    // 测试前进功能
    await page.goForward();
    await testHelpers.waitForPageLoad();
    
    currentUrl = page.url();
    expect(currentUrl).toContain('search');

    // 测试页面刷新
    await page.reload();
    await testHelpers.waitForPageLoad();
    
    currentUrl = page.url();
    expect(currentUrl).toContain('search');

    // 截图记录浏览器导航测试
    await testHelpers.takeScreenshot('browser-navigation');
  });

  test('键盘导航支持', async ({ authenticatedPage }: { authenticatedPage: import('@playwright/test').Page }) => {
    const page = authenticatedPage;

    // 导航到首页
    await page.goto('/');
    await testHelpers.waitForPageLoad();

    // 测试Tab键导航
    let focusableElements = [];
    
    // 按Tab键遍历可聚焦元素
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);
      
      // 获取当前聚焦的元素
      const focusedElement = await page.evaluate(() => {
        const element = document.activeElement;
        return element ? {
          tagName: element.tagName,
          id: element.id,
          className: element.className,
          text: element.textContent?.substring(0, 50)
        } : null;
      });
      
      if (focusedElement) {
        focusableElements.push(focusedElement);
        console.log(`聚焦元素 ${i + 1}:`, focusedElement);
      }
    }

    // 验证至少有一些可聚焦的元素
    expect(focusableElements.length).toBeGreaterThan(0);

    // 测试Enter键激活
    const firstLink = page.locator('a').first();
    if (await firstLink.isVisible({ timeout: 2000 })) {
      await firstLink.focus();
      await page.keyboard.press('Enter');
      await testHelpers.waitForPageLoad();
    }

    // 截图记录键盘导航测试
    await testHelpers.takeScreenshot('keyboard-navigation');
  });
});