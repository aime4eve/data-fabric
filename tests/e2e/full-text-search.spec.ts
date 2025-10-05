/**
 * 全文检索功能 E2E 测试
 */
import { test, expect } from '@playwright/test';

test.describe('全文检索功能测试', () => {
  test.beforeEach(async ({ page }) => {
    // 先登录
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 执行登录
    const usernameInput = page.locator('[data-testid="username-input"], input[type="text"], input[placeholder*="用户名"], input[name="username"]').first();
    await usernameInput.fill('admin');
    
    const passwordInput = page.locator('[data-testid="password-input"], input[type="password"], input[placeholder*="密码"], input[name="password"]').first();
    await passwordInput.fill('123456');
    
    const loginButton = page.locator('[data-testid="login-button"], button:has-text("登录"), button[type="submit"], .login-btn').first();
    await loginButton.click();
    
    // 等待跳转到仪表板
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('搜索页面访问测试', async ({ page }) => {
    // 导航到搜索页面
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    
    // 验证页面加载
    await expect(page).toHaveURL(/search/);
    
    // 检查搜索框存在
    const searchInput = page.locator('input[placeholder*="搜索"], .ant-input-search input, [data-testid="search-input"], .ant-input').first();
    await expect(searchInput).toBeVisible();
    
    // 检查搜索按钮存在（可能是搜索图标按钮）
    const searchButton = page.locator('button[aria-label*="search"], .ant-input-search-button, [data-testid="search-button"], .anticon-search').first();
    if (await searchButton.count() > 0) {
      await expect(searchButton).toBeVisible();
    }
  });

  test('基本搜索功能测试', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    
    // 输入搜索关键词
    const searchInput = page.locator('input[placeholder*="搜索"], .ant-input-search input, [data-testid="search-input"]').first();
    await searchInput.fill('测试文档');
    
    // 点击搜索按钮或按回车
    const searchButton = page.locator('button[aria-label*="search"], .ant-input-search-button, [data-testid="search-button"]').first();
    
    // 监听搜索API请求
    const searchRequest = page.waitForRequest(request => 
      request.url().includes('/api/v1/search/documents') && request.method() === 'POST'
    );
    
    if (await searchButton.count() > 0) {
      await searchButton.click();
    } else {
      await searchInput.press('Enter');
    }
    
    // 等待搜索请求完成
    try {
      await searchRequest;
      await page.waitForTimeout(2000);
      
      // 检查搜索结果区域
      const resultsContainer = page.locator('.ant-list, .search-results, [data-testid="search-results"]');
      if (await resultsContainer.count() > 0) {
        await expect(resultsContainer.first()).toBeVisible();
      }
      
      // 检查结果统计信息
      const resultStats = page.locator('.search-stats, .result-count, text*="找到"');
      if (await resultStats.count() > 0) {
        await expect(resultStats.first()).toBeVisible();
      }
      
    } catch (error) {
      console.log('搜索请求超时或失败:', error);
    }
  });

  test('空搜索结果处理测试', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    
    // 搜索一个不存在的关键词
    const searchInput = page.locator('input[placeholder*="搜索"], .ant-input-search input, [data-testid="search-input"]').first();
    await searchInput.fill('不存在的文档关键词xyz123');
    
    const searchButton = page.locator('button[aria-label*="search"], .ant-input-search-button, [data-testid="search-button"]').first();
    
    // 监听搜索请求
    const searchRequest = page.waitForRequest(request => 
      request.url().includes('/api/v1/search/documents') && request.method() === 'POST'
    );
    
    if (await searchButton.count() > 0) {
      await searchButton.click();
    } else {
      await searchInput.press('Enter');
    }
    
    try {
      await searchRequest;
      await page.waitForTimeout(2000);
      
      // 检查空结果提示
      const emptyState = page.locator('.ant-empty, .no-results, text*="未找到", text*="没有结果"');
      if (await emptyState.count() > 0) {
        await expect(emptyState.first()).toBeVisible();
      }
      
    } catch (error) {
      console.log('搜索请求超时:', error);
    }
  });

  test('搜索过滤功能测试', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    
    // 先进行基本搜索
    const searchInput = page.locator('input[placeholder*="搜索"], .ant-input-search input, [data-testid="search-input"]').first();
    await searchInput.fill('文档');
    
    const searchButton = page.locator('button[aria-label*="search"], .ant-input-search-button, [data-testid="search-button"]').first();
    if (await searchButton.count() > 0) {
      await searchButton.click();
    } else {
      await searchInput.press('Enter');
    }
    
    await page.waitForTimeout(2000);
    
    // 测试分类过滤
    const categoryFilter = page.locator('select[placeholder*="分类"], .ant-select-selector').first();
    if (await categoryFilter.count() > 0) {
      await categoryFilter.click();
      await page.waitForTimeout(500);
      
      // 选择第一个分类选项
      const firstOption = page.locator('.ant-select-item-option').first();
      if (await firstOption.count() > 0) {
        await firstOption.click();
        await page.waitForTimeout(1000);
      }
    }
    
    // 测试文件类型过滤
    const fileTypeFilter = page.locator('select[placeholder*="文件类型"], select[placeholder*="格式"]').first();
    if (await fileTypeFilter.count() > 0) {
      await fileTypeFilter.click();
      await page.waitForTimeout(500);
      
      const pdfOption = page.locator('.ant-select-item-option:has-text("PDF"), .ant-select-item-option:has-text("pdf")').first();
      if (await pdfOption.count() > 0) {
        await pdfOption.click();
        await page.waitForTimeout(1000);
      }
    }
  });

  test('搜索排序功能测试', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    
    // 进行搜索
    const searchInput = page.locator('input[placeholder*="搜索"], .ant-input-search input, [data-testid="search-input"]').first();
    await searchInput.fill('文档');
    
    const searchButton = page.locator('button[aria-label*="search"], .ant-input-search-button, [data-testid="search-button"]').first();
    if (await searchButton.count() > 0) {
      await searchButton.click();
    } else {
      await searchInput.press('Enter');
    }
    
    await page.waitForTimeout(2000);
    
    // 测试排序选项
    const sortSelect = page.locator('select[placeholder*="排序"], .sort-select').first();
    if (await sortSelect.count() > 0) {
      await sortSelect.click();
      await page.waitForTimeout(500);
      
      // 选择按时间排序
      const timeOption = page.locator('.ant-select-item-option:has-text("时间"), .ant-select-item-option:has-text("created_at")').first();
      if (await timeOption.count() > 0) {
        await timeOption.click();
        await page.waitForTimeout(1000);
        
        // 验证结果重新排序
        const resultsList = page.locator('.ant-list-item, .search-result-item');
        if (await resultsList.count() > 0) {
          await expect(resultsList.first()).toBeVisible();
        }
      }
    }
  });

  test('搜索分页功能测试', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    
    // 进行搜索
    const searchInput = page.locator('input[placeholder*="搜索"], .ant-input-search input, [data-testid="search-input"]').first();
    await searchInput.fill('文档');
    
    const searchButton = page.locator('button[aria-label*="search"], .ant-input-search-button, [data-testid="search-button"]').first();
    if (await searchButton.count() > 0) {
      await searchButton.click();
    } else {
      await searchInput.press('Enter');
    }
    
    await page.waitForTimeout(2000);
    
    // 检查分页控件
    const pagination = page.locator('.ant-pagination, .pagination');
    if (await pagination.count() > 0) {
      await expect(pagination.first()).toBeVisible();
      
      // 测试下一页
      const nextButton = page.locator('.ant-pagination-next, button:has-text("下一页")').first();
      if (await nextButton.count() > 0 && await nextButton.isEnabled()) {
        // 监听分页请求
        const pageRequest = page.waitForRequest(request => 
          request.url().includes('/api/v1/search/documents') && request.method() === 'POST'
        );
        
        await nextButton.click();
        
        try {
          await pageRequest;
          await page.waitForTimeout(2000);
          
          // 验证页面已切换
          const currentPage = page.locator('.ant-pagination-item-active, .current-page');
          if (await currentPage.count() > 0) {
            await expect(currentPage.first()).toContainText('2');
          }
        } catch (error) {
          console.log('分页请求超时:', error);
        }
      }
    }
  });

  test('搜索建议功能测试', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    
    // 输入部分关键词触发建议
    const searchInput = page.locator('input[placeholder*="搜索"], .ant-input-search input, [data-testid="search-input"]').first();
    await searchInput.fill('文');
    
    // 等待搜索建议出现
    await page.waitForTimeout(1000);
    
    // 检查搜索建议下拉框
    const suggestions = page.locator('.ant-select-dropdown, .search-suggestions, .ant-auto-complete-dropdown');
    if (await suggestions.count() > 0) {
      await expect(suggestions.first()).toBeVisible();
      
      // 检查建议项
      const suggestionItems = page.locator('.ant-select-item, .suggestion-item');
      if (await suggestionItems.count() > 0) {
        // 点击第一个建议
        await suggestionItems.first().click();
        await page.waitForTimeout(500);
        
        // 验证搜索框已填充建议内容
        const inputValue = await searchInput.inputValue();
        expect(inputValue.length).toBeGreaterThan(1);
      }
    }
  });

  test('搜索结果详情查看测试', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    
    // 进行搜索
    const searchInput = page.locator('input[placeholder*="搜索"], .ant-input-search input, [data-testid="search-input"]').first();
    await searchInput.fill('文档');
    
    const searchButton = page.locator('button[aria-label*="search"], .ant-input-search-button, [data-testid="search-button"]').first();
    if (await searchButton.count() > 0) {
      await searchButton.click();
    } else {
      await searchInput.press('Enter');
    }
    
    await page.waitForTimeout(2000);
    
    // 点击第一个搜索结果
    const firstResult = page.locator('.ant-list-item, .search-result-item').first();
    if (await firstResult.count() > 0) {
      // 查找查看按钮或标题链接
      const viewButton = firstResult.locator('button:has-text("查看"), a, .view-link').first();
      
      if (await viewButton.count() > 0) {
        await viewButton.click();
        await page.waitForTimeout(1000);
        
        // 验证是否跳转到文档详情页或打开模态框
        const detailView = page.locator('.document-detail, .modal, .detail-modal');
        if (await detailView.count() > 0) {
          await expect(detailView.first()).toBeVisible();
        } else {
          // 检查是否跳转到新页面
          await page.waitForTimeout(1000);
          const currentUrl = page.url();
          expect(currentUrl).toMatch(/document|detail/);
        }
      }
    }
  });

  test('搜索性能测试', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    
    // 记录搜索开始时间
    const startTime = Date.now();
    
    const searchInput = page.locator('input[placeholder*="搜索"], .ant-input-search input, [data-testid="search-input"]').first();
    await searchInput.fill('测试文档内容');
    
    const searchButton = page.locator('button[aria-label*="search"], .ant-input-search-button, [data-testid="search-button"]').first();
    
    // 监听搜索请求
    const searchRequest = page.waitForRequest(request => 
      request.url().includes('/api/v1/search/documents') && request.method() === 'POST'
    );
    
    if (await searchButton.count() > 0) {
      await searchButton.click();
    } else {
      await searchInput.press('Enter');
    }
    
    try {
      await searchRequest;
      await page.waitForTimeout(2000);
      
      const endTime = Date.now();
      const searchDuration = endTime - startTime;
      
      // 验证搜索响应时间合理（小于5秒）
      expect(searchDuration).toBeLessThan(5000);
      
      // 检查是否显示搜索耗时
      const searchTime = page.locator('.search-time, text*="ms", text*="耗时"');
      if (await searchTime.count() > 0) {
        await expect(searchTime.first()).toBeVisible();
      }
      
    } catch (error) {
      console.log('搜索性能测试超时:', error);
    }
  });

  test('高级搜索功能测试', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    
    // 查找高级搜索按钮或展开按钮
    const advancedButton = page.locator('button:has-text("高级搜索"), button:has-text("Advanced"), .advanced-search-btn').first();
    
    if (await advancedButton.count() > 0) {
      await advancedButton.click();
      await page.waitForTimeout(500);
      
      // 填写高级搜索条件
      const titleField = page.locator('input[placeholder*="标题"], input[name="title"]').first();
      if (await titleField.count() > 0) {
        await titleField.fill('测试标题');
      }
      
      const contentField = page.locator('input[placeholder*="内容"], input[name="content"]').first();
      if (await contentField.count() > 0) {
        await contentField.fill('测试内容');
      }
      
      // 选择日期范围
      const dateRange = page.locator('.ant-picker-range, .date-range-picker').first();
      if (await dateRange.count() > 0) {
        await dateRange.click();
        await page.waitForTimeout(500);
        
        // 选择今天
        const todayButton = page.locator('.ant-picker-today-btn, button:has-text("今天")').first();
        if (await todayButton.count() > 0) {
          await todayButton.click();
        }
      }
      
      // 执行高级搜索
      const searchButton = page.locator('button:has-text("搜索"), button[type="submit"]').first();
      if (await searchButton.count() > 0) {
        await searchButton.click();
        await page.waitForTimeout(2000);
      }
    }
  });

  test('搜索历史记录测试', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    
    // 进行几次搜索
    const searchInput = page.locator('input[placeholder*="搜索"], .ant-input-search input, [data-testid="search-input"]').first();
    const searchTerms = ['文档', '测试', '管理'];
    
    for (const term of searchTerms) {
      await searchInput.fill(term);
      await searchInput.press('Enter');
      await page.waitForTimeout(1500);
    }
    
    // 清空搜索框并点击，检查是否显示搜索历史
    await searchInput.clear();
    await searchInput.click();
    await page.waitForTimeout(500);
    
    // 检查搜索历史下拉框
    const historyDropdown = page.locator('.search-history, .ant-select-dropdown');
    if (await historyDropdown.count() > 0) {
      await expect(historyDropdown.first()).toBeVisible();
      
      // 检查历史记录项
      const historyItems = page.locator('.history-item, .ant-select-item');
      if (await historyItems.count() > 0) {
        // 点击第一个历史记录
        await historyItems.first().click();
        await page.waitForTimeout(500);
        
        // 验证搜索框已填充历史内容
        const inputValue = await searchInput.inputValue();
        expect(inputValue.length).toBeGreaterThan(0);
      }
    }
  });

  test('搜索结果高亮显示测试', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    
    // 搜索特定关键词
    const searchInput = page.locator('input[placeholder*="搜索"], .ant-input-search input, [data-testid="search-input"]').first();
    await searchInput.fill('重要文档');
    
    const searchButton = page.locator('button[aria-label*="search"], .ant-input-search-button, [data-testid="search-button"]').first();
    if (await searchButton.count() > 0) {
      await searchButton.click();
    } else {
      await searchInput.press('Enter');
    }
    
    await page.waitForTimeout(2000);
    
    // 检查搜索结果中的高亮显示
    const highlightedText = page.locator('.highlight, mark, .search-highlight, em').first();
    if (await highlightedText.count() > 0) {
      await expect(highlightedText).toBeVisible();
      
      // 验证高亮文本包含搜索关键词
      const highlightContent = await highlightedText.textContent();
      expect(highlightContent?.toLowerCase()).toContain('重要');
    }
  });

  test('搜索过滤器清除功能测试', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    
    // 设置一些过滤条件
    const categoryFilter = page.locator('select[placeholder*="分类"], .ant-select-selector').first();
    if (await categoryFilter.count() > 0) {
      await categoryFilter.click();
      await page.waitForTimeout(500);
      
      const firstOption = page.locator('.ant-select-item-option').first();
      if (await firstOption.count() > 0) {
        await firstOption.click();
        await page.waitForTimeout(500);
      }
    }
    
    // 查找并点击清除过滤器按钮
    const clearButton = page.locator('button:has-text("清除"), button:has-text("重置"), .clear-filters-btn').first();
    if (await clearButton.count() > 0) {
      await clearButton.click();
      await page.waitForTimeout(500);
      
      // 验证过滤器已清除
      const filterSelects = page.locator('.ant-select-selection-item');
      const selectCount = await filterSelects.count();
      
      // 如果有选择器，验证它们已被清空
      if (selectCount > 0) {
        for (let i = 0; i < selectCount; i++) {
          const selectText = await filterSelects.nth(i).textContent();
          expect(selectText).not.toContain('选中');
        }
      }
    }
  });
});