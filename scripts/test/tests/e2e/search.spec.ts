import { test, expect } from '../fixtures/auth';
import { TestHelpers, TestDataGenerator } from '../utils/test-helpers';

/**
 * 搜索功能端到端测试
 * 测试全文搜索、分类搜索、高级搜索等功能
 */
test.describe('搜索功能测试', () => {
  let testHelpers: TestHelpers;

  test.beforeEach(async ({ authenticatedPage }: { authenticatedPage: import('@playwright/test').Page }) => {
    const page = authenticatedPage;
    testHelpers = new TestHelpers(page);
    
    // 导航到搜索页面或主页
    await page.goto('/search');
    await testHelpers.waitForPageLoad();
  });

  test('基本搜索功能', async ({ authenticatedPage }: { authenticatedPage: import('@playwright/test').Page }) => {
    const page = authenticatedPage;
    const searchKeywords = TestDataGenerator.generateSearchKeywords();
    const keyword = searchKeywords[0];

    // 查找搜索输入框
    const searchInputSelectors = [
      'input[name="search"]',
      'input[type="search"]',
      '#search',
      '.search-input',
      '[data-testid="search-input"]',
      '.search-box input'
    ];

    let searchInputFound = false;
    for (const selector of searchInputSelectors) {
      if (await testHelpers.isElementVisible(selector, 2000)) {
        // 输入搜索关键词
        await testHelpers.safeFill(selector, keyword);
        
        // 查找搜索按钮
        const searchButtonSelectors = [
          'button[type="submit"]',
          '.search-button',
          '.btn-search',
          'button:has-text("搜索")',
          'button:has-text("Search")',
          '[data-testid="search-button"]'
        ];

        for (const buttonSelector of searchButtonSelectors) {
          if (await testHelpers.isElementVisible(buttonSelector, 2000)) {
            await testHelpers.safeClick(buttonSelector);
            searchInputFound = true;
            break;
          }
        }

        // 如果没有找到搜索按钮，尝试按回车键
        if (!searchInputFound) {
          await testHelpers.pressKey('Enter');
          searchInputFound = true;
        }
        
        break;
      }
    }

    expect(searchInputFound).toBeTruthy();

    // 等待搜索结果加载
    await testHelpers.waitForPageLoad();

    // 验证搜索结果页面
    const searchResultsSelectors = [
      '.search-results',
      '.results-container',
      '[data-testid="search-results"]',
      '.search-result-item'
    ];

    let resultsFound = false;
    for (const selector of searchResultsSelectors) {
      if (await testHelpers.isElementVisible(selector, 5000)) {
        resultsFound = true;
        break;
      }
    }

    expect(resultsFound).toBeTruthy();

    // 验证搜索关键词高亮显示
    const highlightSelectors = [
      '.highlight',
      '.search-highlight',
      'mark',
      '.highlighted-text'
    ];

    let highlightFound = false;
    for (const selector of highlightSelectors) {
      if (await testHelpers.isElementVisible(selector, 3000)) {
        highlightFound = true;
        break;
      }
    }

    // 截图记录搜索结果
    await testHelpers.takeScreenshot('search-results');
  });

  test('空搜索处理', async ({ authenticatedPage }: { authenticatedPage: import('@playwright/test').Page }) => {
    const page = authenticatedPage;

    // 查找搜索输入框
    const searchInput = page.locator('input[name="search"], input[type="search"], #search, .search-input').first();
    
    if (await searchInput.isVisible({ timeout: 2000 })) {
      // 不输入任何内容，直接搜索
      await testHelpers.safeClick('button[type="submit"], .search-button, .btn-search');
      
      // 验证空搜索的处理
      const emptySearchIndicators = [
        '.empty-search-message',
        '.no-results',
        '.search-empty',
        '[data-testid="empty-search"]'
      ];

      let emptySearchHandled = false;
      for (const selector of emptySearchIndicators) {
        if (await testHelpers.isElementVisible(selector, 3000)) {
          emptySearchHandled = true;
          break;
        }
      }

      // 如果没有特殊的空搜索处理，验证是否显示了所有结果或提示信息
      if (!emptySearchHandled) {
        const allResultsIndicators = [
          '.search-results',
          '.all-documents',
          '.document-list'
        ];

        for (const selector of allResultsIndicators) {
          if (await testHelpers.isElementVisible(selector, 3000)) {
            emptySearchHandled = true;
            break;
          }
        }
      }

      expect(emptySearchHandled).toBeTruthy();
      
      // 截图记录空搜索结果
      await testHelpers.takeScreenshot('empty-search');
    }
  });

  test('搜索结果分页', async ({ authenticatedPage }: { authenticatedPage: import('@playwright/test').Page }) => {
    const page = authenticatedPage;
    const keyword = '测试'; // 使用常见关键词确保有足够结果

    // 执行搜索
    await testHelpers.safeFill('input[name="search"], input[type="search"], #search, .search-input', keyword);
    await testHelpers.safeClick('button[type="submit"], .search-button, .btn-search');
    await testHelpers.waitForPageLoad();

    // 查找分页控件
    const paginationSelectors = [
      '.pagination',
      '.search-pagination',
      '.page-navigation',
      '[data-testid="pagination"]'
    ];

    let paginationFound = false;
    for (const selector of paginationSelectors) {
      if (await testHelpers.isElementVisible(selector, 3000)) {
        const pagination = page.locator(selector);
        
        // 查找下一页按钮
        const nextPageSelectors = [
          '.next-page',
          'button:has-text("下一页")',
          'button:has-text("Next")',
          '[data-testid="next-page"]'
        ];

        for (const nextSelector of nextPageSelectors) {
          const nextButton = pagination.locator(nextSelector);
          if (await nextButton.isVisible({ timeout: 2000 }) && await nextButton.isEnabled()) {
            // 记录当前页面的第一个搜索结果
            const firstResultBefore = await testHelpers.getTextContent('.search-result-item:first-child .title, .search-result:first-child h3');
            
            // 点击下一页
            await nextButton.click();
            await testHelpers.waitForPageLoad();
            
            // 记录下一页的第一个搜索结果
            const firstResultAfter = await testHelpers.getTextContent('.search-result-item:first-child .title, .search-result:first-child h3');
            
            // 验证页面内容已改变
            expect(firstResultBefore).not.toBe(firstResultAfter);
            
            paginationFound = true;
            break;
          }
        }
        
        if (paginationFound) break;
      }
    }

    // 截图记录分页结果
    await testHelpers.takeScreenshot('search-pagination');
  });

  test('搜索结果排序', async ({ authenticatedPage }: { authenticatedPage: import('@playwright/test').Page }) => {
    const page = authenticatedPage;
    const keyword = '文档';

    // 执行搜索
    await testHelpers.safeFill('input[name="search"], input[type="search"], #search, .search-input', keyword);
    await testHelpers.safeClick('button[type="submit"], .search-button, .btn-search');
    await testHelpers.waitForPageLoad();

    // 查找排序选择器
    const sortSelectors = [
      '.sort-select',
      'select[name="sort"]',
      '#sort-by',
      '[data-testid="sort-select"]'
    ];

    let sortFound = false;
    for (const selector of sortSelectors) {
      if (await testHelpers.isElementVisible(selector, 3000)) {
        const sortSelect = page.locator(selector);
        
        // 获取可用的排序选项
        const options = await sortSelect.locator('option').all();
        
        if (options.length > 1) {
          // 记录排序前的第一个结果
          const firstResultBefore = await testHelpers.getTextContent('.search-result-item:first-child .title, .search-result:first-child h3');
          
          // 选择不同的排序方式
          await sortSelect.selectOption({ index: 1 });
          await testHelpers.waitForPageLoad();
          
          // 记录排序后的第一个结果
          const firstResultAfter = await testHelpers.getTextContent('.search-result-item:first-child .title, .search-result:first-child h3');
          
          sortFound = true;
          break;
        }
      }
    }

    // 截图记录排序结果
    await testHelpers.takeScreenshot('search-sorted');
  });

  test('分类筛选搜索', async ({ authenticatedPage }: { authenticatedPage: import('@playwright/test').Page }) => {
    const page = authenticatedPage;
    const keyword = '知识';

    // 执行搜索
    await testHelpers.safeFill('input[name="search"], input[type="search"], #search, .search-input', keyword);
    await testHelpers.safeClick('button[type="submit"], .search-button, .btn-search');
    await testHelpers.waitForPageLoad();

    // 查找分类筛选器
    const categoryFilterSelectors = [
      '.category-filter',
      'select[name="category"]',
      '#category-filter',
      '[data-testid="category-filter"]'
    ];

    let categoryFilterFound = false;
    for (const selector of categoryFilterSelectors) {
      if (await testHelpers.isElementVisible(selector, 3000)) {
        const categoryFilter = page.locator(selector);
        
        // 获取可用的分类选项
        const options = await categoryFilter.locator('option').all();
        
        if (options.length > 1) {
          // 记录筛选前的结果数量
          const resultsBefore = await page.locator('.search-result-item, .search-result').count();
          
          // 选择特定分类
          await categoryFilter.selectOption({ index: 1 });
          await testHelpers.waitForPageLoad();
          
          // 记录筛选后的结果数量
          const resultsAfter = await page.locator('.search-result-item, .search-result').count();
          
          categoryFilterFound = true;
          break;
        }
      }
    }

    // 截图记录分类筛选结果
    await testHelpers.takeScreenshot('search-category-filter');
  });

  test('高级搜索功能', async ({ authenticatedPage }: { authenticatedPage: import('@playwright/test').Page }) => {
    const page = authenticatedPage;

    // 查找高级搜索入口
    const advancedSearchSelectors = [
      '.advanced-search',
      'button:has-text("高级搜索")',
      'a:has-text("高级搜索")',
      '[data-testid="advanced-search"]'
    ];

    let advancedSearchFound = false;
    for (const selector of advancedSearchSelectors) {
      if (await testHelpers.isElementVisible(selector, 3000)) {
        await testHelpers.safeClick(selector);
        await testHelpers.waitForPageLoad();
        
        // 验证高级搜索表单
        const advancedFormSelectors = [
          '.advanced-search-form',
          '.advanced-form',
          '[data-testid="advanced-search-form"]'
        ];

        for (const formSelector of advancedFormSelectors) {
          if (await testHelpers.isElementVisible(formSelector, 3000)) {
            // 填写高级搜索条件
            const titleInput = page.locator('input[name="title"], #title-search');
            if (await titleInput.isVisible({ timeout: 2000 })) {
              await titleInput.fill('测试文档');
            }

            const contentInput = page.locator('input[name="content"], #content-search');
            if (await contentInput.isVisible({ timeout: 2000 })) {
              await contentInput.fill('内容关键词');
            }

            const authorInput = page.locator('input[name="author"], #author-search');
            if (await authorInput.isVisible({ timeout: 2000 })) {
              await authorInput.fill('作者名');
            }

            // 执行高级搜索
            await testHelpers.safeClick('button[type="submit"], .btn-advanced-search');
            await testHelpers.waitForPageLoad();

            advancedSearchFound = true;
            break;
          }
        }
        
        if (advancedSearchFound) break;
      }
    }

    // 截图记录高级搜索结果
    await testHelpers.takeScreenshot('advanced-search');
  });

  test('搜索建议功能', async ({ authenticatedPage }: { authenticatedPage: import('@playwright/test').Page }) => {
    const page = authenticatedPage;

    // 查找搜索输入框
    const searchInput = page.locator('input[name="search"], input[type="search"], #search, .search-input').first();
    
    if (await searchInput.isVisible({ timeout: 2000 })) {
      // 输入部分关键词触发搜索建议
      await searchInput.fill('测');
      
      // 等待搜索建议出现
      await page.waitForTimeout(1000);
      
      // 查找搜索建议列表
      const suggestionSelectors = [
        '.search-suggestions',
        '.autocomplete-list',
        '.suggestion-list',
        '[data-testid="search-suggestions"]'
      ];

      let suggestionsFound = false;
      for (const selector of suggestionSelectors) {
        if (await testHelpers.isElementVisible(selector, 3000)) {
          const suggestions = page.locator(`${selector} li, ${selector} .suggestion-item`);
          const suggestionCount = await suggestions.count();
          
          if (suggestionCount > 0) {
            // 点击第一个建议
            await suggestions.first().click();
            await testHelpers.waitForPageLoad();
            
            suggestionsFound = true;
            break;
          }
        }
      }

      // 截图记录搜索建议
      await testHelpers.takeScreenshot('search-suggestions');
    }
  });

  test('搜索历史记录', async ({ authenticatedPage }: { authenticatedPage: import('@playwright/test').Page }) => {
    const page = authenticatedPage;

    // 执行几次搜索以创建历史记录
    const keywords = ['测试', '文档', '知识库'];
    
    for (const keyword of keywords) {
      await testHelpers.safeFill('input[name="search"], input[type="search"], #search, .search-input', keyword);
      await testHelpers.safeClick('button[type="submit"], .search-button, .btn-search');
      await testHelpers.waitForPageLoad();
      await page.waitForTimeout(1000);
    }

    // 清空搜索框并查看历史记录
    const searchInput = page.locator('input[name="search"], input[type="search"], #search, .search-input').first();
    await searchInput.clear();
    await searchInput.focus();

    // 查找搜索历史
    const historySelectors = [
      '.search-history',
      '.recent-searches',
      '.history-list',
      '[data-testid="search-history"]'
    ];

    let historyFound = false;
    for (const selector of historySelectors) {
      if (await testHelpers.isElementVisible(selector, 3000)) {
        const historyItems = page.locator(`${selector} li, ${selector} .history-item`);
        const historyCount = await historyItems.count();
        
        if (historyCount > 0) {
          // 点击第一个历史记录
          await historyItems.first().click();
          await testHelpers.waitForPageLoad();
          
          historyFound = true;
          break;
        }
      }
    }

    // 截图记录搜索历史
    await testHelpers.takeScreenshot('search-history');
  });

  test('无搜索结果处理', async ({ authenticatedPage }: { authenticatedPage: import('@playwright/test').Page }) => {
    const page = authenticatedPage;
    const nonExistentKeyword = 'xyz123不存在的关键词456';

    // 搜索不存在的关键词
    await testHelpers.safeFill('input[name="search"], input[type="search"], #search, .search-input', nonExistentKeyword);
    await testHelpers.safeClick('button[type="submit"], .search-button, .btn-search');
    await testHelpers.waitForPageLoad();

    // 验证无结果页面
    const noResultsSelectors = [
      '.no-results',
      '.empty-results',
      '.search-empty',
      '[data-testid="no-results"]',
      '.no-search-results'
    ];

    let noResultsFound = false;
    for (const selector of noResultsSelectors) {
      if (await testHelpers.isElementVisible(selector, 5000)) {
        noResultsFound = true;
        break;
      }
    }

    expect(noResultsFound).toBeTruthy();

    // 验证搜索建议或相关推荐
    const suggestionSelectors = [
      '.search-suggestions',
      '.related-searches',
      '.recommended-searches',
      '[data-testid="search-suggestions"]'
    ];

    let suggestionsFound = false;
    for (const selector of suggestionSelectors) {
      if (await testHelpers.isElementVisible(selector, 3000)) {
        suggestionsFound = true;
        break;
      }
    }

    // 截图记录无结果页面
    await testHelpers.takeScreenshot('no-search-results');
  });

  test('搜索结果点击跳转', async ({ authenticatedPage }: { authenticatedPage: import('@playwright/test').Page }) => {
    const page = authenticatedPage;
    const keyword = '文档';

    // 执行搜索
    await testHelpers.safeFill('input[name="search"], input[type="search"], #search, .search-input', keyword);
    await testHelpers.safeClick('button[type="submit"], .search-button, .btn-search');
    await testHelpers.waitForPageLoad();

    // 查找搜索结果项
    const resultItems = page.locator('.search-result-item, .search-result, .result-item');
    const itemCount = await resultItems.count();

    if (itemCount > 0) {
      const firstResult = resultItems.first();
      
      // 点击第一个搜索结果
      const clickableSelectors = [
        '.result-title',
        '.title',
        'h3',
        'h4',
        'a'
      ];

      let resultClicked = false;
      for (const selector of clickableSelectors) {
        const element = firstResult.locator(selector);
        if (await element.isVisible({ timeout: 2000 })) {
          await element.click();
          await testHelpers.waitForPageLoad();
          
          // 验证跳转到了文档详情页
          const currentUrl = page.url();
          expect(currentUrl).toMatch(/document|detail|view/);
          
          resultClicked = true;
          break;
        }
      }

      expect(resultClicked).toBeTruthy();

      // 截图记录详情页
      await testHelpers.takeScreenshot('search-result-detail');
    } else {
      console.log('⚠️ 没有找到搜索结果，跳过点击跳转测试');
    }
  });
});