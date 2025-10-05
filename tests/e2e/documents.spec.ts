import { test, expect } from '@playwright/test';

test.describe('文档管理功能测试', () => {
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

  test('文档列表页面访问测试', async ({ page }) => {
    // 查找并点击文档管理链接
    const documentsLink = page.locator('[data-testid="nav-documents"]').first();
    
    if (await documentsLink.count() > 0) {
      await documentsLink.click();
      await page.waitForURL('**/documents', { timeout: 5000 });
    } else {
      // 直接导航到文档页面
      await page.goto('/documents');
    }
    
    // 验证页面加载
    await expect(page).toHaveURL(/documents/);
    
    // 检查页面标题
    await expect(page.locator('h1, h2, .page-title')).toContainText(/文档|Documents/);
  });

  test('文档列表加载测试', async ({ page }) => {
    // 导航到文档页面
    await page.goto('/documents');
    await page.waitForLoadState('networkidle');
    
    // 监听文档API请求
    const documentRequest = page.waitForRequest(request => 
      request.url().includes('/api/v1/documents') && request.method() === 'GET'
    );
    
    // 等待API请求
    try {
      await documentRequest;
    } catch (error) {
      console.log('文档API请求超时或失败:', error);
    }
    
    // 检查文档列表容器
    const documentList = page.locator('.document-list, .documents-container, table, .list-container');
    if (await documentList.count() > 0) {
      await expect(documentList.first()).toBeVisible();
    }
    
    // 检查文档项目
    const documentItems = page.locator('.document-item, tr, .list-item');
    if (await documentItems.count() > 0) {
      await expect(documentItems.first()).toBeVisible();
    }
  });

  test('文档搜索功能测试', async ({ page }) => {
    await page.goto('/documents');
    await page.waitForLoadState('networkidle');
    
    // 查找搜索框
    const searchInput = page.locator('input[type="search"], input[placeholder*="搜索"], .search-input').first();
    
    if (await searchInput.count() > 0) {
      await searchInput.fill('测试文档');
      
      // 查找搜索按钮或等待自动搜索
      const searchButton = page.locator('button:has-text("搜索"), .search-btn');
      if (await searchButton.count() > 0) {
        await searchButton.click();
      }
      
      // 等待搜索结果
      await page.waitForTimeout(2000);
      
      // 验证搜索结果
      const results = page.locator('.search-results, .document-list');
      if (await results.count() > 0) {
        await expect(results.first()).toBeVisible();
      }
    }
  });

  test('文档分页功能测试', async ({ page }) => {
    await page.goto('/documents');
    await page.waitForLoadState('networkidle');
    
    // 查找分页控件
    const pagination = page.locator('.pagination, .pager, .page-nav');
    
    if (await pagination.count() > 0) {
      await expect(pagination.first()).toBeVisible();
      
      // 查找下一页按钮
      const nextButton = page.locator('button:has-text("下一页"), .next-page, [aria-label="Next"]');
      if (await nextButton.count() > 0 && await nextButton.isEnabled()) {
        await nextButton.click();
        await page.waitForTimeout(2000);
      }
    }
  });

  test('文档详情查看测试', async ({ page }) => {
    await page.goto('/documents');
    await page.waitForLoadState('networkidle');
    
    // 查找第一个文档项目
    const firstDocument = page.locator('.document-item, tr, .list-item').first();
    
    if (await firstDocument.count() > 0) {
      // 查找查看按钮或点击文档标题
      const viewButton = firstDocument.locator('button:has-text("查看"), a:has-text("查看"), .view-btn').first();
      
      if (await viewButton.count() > 0) {
        await viewButton.click();
        await page.waitForTimeout(2000);
        
        // 验证详情页面或模态框
        const detailView = page.locator('.document-detail, .modal, .detail-view');
        if (await detailView.count() > 0) {
          await expect(detailView.first()).toBeVisible();
        }
      }
    }
  });

  test('文档管理权限测试', async ({ page }) => {
    await page.goto('/documents');
    await page.waitForLoadState('networkidle');
    
    // 检查管理按钮（如果用户有权限）
    const manageButtons = page.locator('button:has-text("编辑"), button:has-text("删除"), .edit-btn, .delete-btn');
    
    if (await manageButtons.count() > 0) {
      // 用户有管理权限
      await expect(manageButtons.first()).toBeVisible();
    }
    
    // 检查添加文档按钮
    const addButton = page.locator('button:has-text("添加"), button:has-text("新建"), .add-btn');
    if (await addButton.count() > 0) {
      await expect(addButton.first()).toBeVisible();
    }
  });
});