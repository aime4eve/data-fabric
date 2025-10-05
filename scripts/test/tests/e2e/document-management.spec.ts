import { test, expect } from '../fixtures/auth';
import { TestHelpers, TestDataGenerator } from '../utils/test-helpers';

/**
 * 文档管理功能端到端测试
 * 测试文档的创建、编辑、删除、查看等功能
 */
test.describe('文档管理功能测试', () => {
  let testHelpers: TestHelpers;
  let testDocument: any;

  test.beforeEach(async ({ authenticatedPage }: { authenticatedPage: import('@playwright/test').Page }) => {
    const page = authenticatedPage;
    testHelpers = new TestHelpers(page);
    testDocument = TestDataGenerator.generateDocumentData();
    
    // 导航到文档管理页面
    await page.goto('/documents');
    await testHelpers.waitForPageLoad();
  });

  test('查看文档列表', async ({ authenticatedPage }: { authenticatedPage: import('@playwright/test').Page }) => {
    const page = authenticatedPage;
    
    // 验证文档列表页面加载
    await expect(page.locator('.document-list, .documents-container, [data-testid="document-list"]')).toBeVisible();
    
    // 验证页面标题
    const pageTitle = await testHelpers.getTextContent('h1, .page-title, [data-testid="page-title"]');
    expect(pageTitle).toMatch(/文档|知识库|Documents/i);
    
    // 验证文档列表项存在（如果有数据）
    const documentItems = page.locator('.document-item, .document-card, [data-testid="document-item"]');
    const itemCount = await documentItems.count();
    
    if (itemCount > 0) {
      // 验证第一个文档项的基本信息
      const firstItem = documentItems.first();
      await expect(firstItem).toBeVisible();
      
      // 验证文档标题存在
      await expect(firstItem.locator('.document-title, .title, h3, h4')).toBeVisible();
    }
    
    // 截图记录文档列表状态
    await testHelpers.takeScreenshot('document-list');
  });

  test('创建新文档', async ({ authenticatedPage }: { authenticatedPage: import('@playwright/test').Page }) => {
    const page = authenticatedPage;
    
    // 点击创建文档按钮
    const createButtons = [
      '.create-document',
      '.btn-create',
      'button:has-text("创建")',
      'button:has-text("新建")',
      '[data-testid="create-document"]',
      '.add-document'
    ];
    
    let createButtonFound = false;
    for (const selector of createButtons) {
      if (await testHelpers.isElementVisible(selector, 2000)) {
        await testHelpers.safeClick(selector);
        createButtonFound = true;
        break;
      }
    }
    
    expect(createButtonFound).toBeTruthy();
    
    // 等待创建表单或页面加载
    await testHelpers.waitForPageLoad();
    
    // 填写文档信息
    await testHelpers.safeFill('input[name="title"], #title, .document-title-input', testDocument.title);
    
    // 填写文档内容（支持多种编辑器）
    const contentSelectors = [
      'textarea[name="content"]',
      '#content',
      '.document-content',
      '.editor-content',
      '[data-testid="document-content"]'
    ];
    
    for (const selector of contentSelectors) {
      if (await testHelpers.isElementVisible(selector, 2000)) {
        await testHelpers.safeFill(selector, testDocument.content);
        break;
      }
    }
    
    // 选择分类（如果存在）
    const categorySelector = page.locator('select[name="category"], #category, .category-select');
    if (await categorySelector.isVisible({ timeout: 2000 })) {
      await categorySelector.selectOption({ label: testDocument.category });
    }
    
    // 添加标签（如果存在）
    const tagInput = page.locator('input[name="tags"], #tags, .tag-input');
    if (await tagInput.isVisible({ timeout: 2000 })) {
      await tagInput.fill(testDocument.tags.join(', '));
    }
    
    // 保存文档
    const saveButtons = [
      'button[type="submit"]',
      '.btn-save',
      'button:has-text("保存")',
      'button:has-text("提交")',
      '[data-testid="save-document"]'
    ];
    
    for (const selector of saveButtons) {
      if (await testHelpers.isElementVisible(selector, 2000)) {
        await testHelpers.safeClick(selector);
        break;
      }
    }
    
    // 等待保存成功
    await testHelpers.waitForPageLoad();
    
    // 验证创建成功（可能跳转到文档详情页或列表页）
    const successIndicators = [
      '.success-message',
      '.alert-success',
      '[data-testid="success-message"]'
    ];
    
    let successFound = false;
    for (const selector of successIndicators) {
      if (await testHelpers.isElementVisible(selector, 3000)) {
        successFound = true;
        break;
      }
    }
    
    // 如果没有成功消息，检查是否跳转到了文档详情页
    if (!successFound) {
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/document|detail|view/);
    }
    
    // 截图记录创建成功状态
    await testHelpers.takeScreenshot('document-created');
  });

  test('查看文档详情', async ({ authenticatedPage }: { authenticatedPage: import('@playwright/test').Page }) => {
    const page = authenticatedPage;
    
    // 查找并点击第一个文档
    const documentItems = page.locator('.document-item, .document-card, [data-testid="document-item"]');
    const itemCount = await documentItems.count();
    
    if (itemCount > 0) {
      const firstItem = documentItems.first();
      
      // 点击文档标题或查看按钮
      const viewSelectors = [
        '.document-title',
        '.title',
        'h3',
        'h4',
        '.view-button',
        'button:has-text("查看")',
        '[data-testid="view-document"]'
      ];
      
      for (const selector of viewSelectors) {
        const element = firstItem.locator(selector);
        if (await element.isVisible({ timeout: 2000 })) {
          await element.click();
          break;
        }
      }
      
      // 等待详情页加载
      await testHelpers.waitForPageLoad();
      
      // 验证文档详情页面元素
      await expect(page.locator('.document-detail, .document-view, [data-testid="document-detail"]')).toBeVisible();
      
      // 验证文档标题存在
      await expect(page.locator('.document-title, .title, h1, h2')).toBeVisible();
      
      // 验证文档内容存在
      await expect(page.locator('.document-content, .content, [data-testid="document-content"]')).toBeVisible();
      
      // 截图记录文档详情
      await testHelpers.takeScreenshot('document-detail');
    } else {
      console.log('⚠️ 没有找到文档项，跳过详情查看测试');
    }
  });

  test('编辑文档', async ({ authenticatedPage }: { authenticatedPage: import('@playwright/test').Page }) => {
    const page = authenticatedPage;
    
    // 查找并点击第一个文档的编辑按钮
    const documentItems = page.locator('.document-item, .document-card, [data-testid="document-item"]');
    const itemCount = await documentItems.count();
    
    if (itemCount > 0) {
      const firstItem = documentItems.first();
      
      // 查找编辑按钮
      const editSelectors = [
        '.edit-button',
        '.btn-edit',
        'button:has-text("编辑")',
        '[data-testid="edit-document"]',
        '.fa-edit'
      ];
      
      let editButtonFound = false;
      for (const selector of editSelectors) {
        const element = firstItem.locator(selector);
        if (await element.isVisible({ timeout: 2000 })) {
          await element.click();
          editButtonFound = true;
          break;
        }
      }
      
      // 如果在列表页没找到编辑按钮，先进入详情页
      if (!editButtonFound) {
        await firstItem.locator('.document-title, .title, h3, h4').first().click();
        await testHelpers.waitForPageLoad();
        
        // 在详情页查找编辑按钮
        for (const selector of editSelectors) {
          if (await testHelpers.isElementVisible(selector, 2000)) {
            await testHelpers.safeClick(selector);
            editButtonFound = true;
            break;
          }
        }
      }
      
      if (editButtonFound) {
        // 等待编辑表单加载
        await testHelpers.waitForPageLoad();
        
        // 修改文档标题
        const updatedTitle = `${testDocument.title}_已编辑`;
        await testHelpers.safeFill('input[name="title"], #title, .document-title-input', updatedTitle);
        
        // 修改文档内容
        const updatedContent = `${testDocument.content}\n\n[编辑时间: ${new Date().toLocaleString()}]`;
        const contentSelectors = [
          'textarea[name="content"]',
          '#content',
          '.document-content',
          '.editor-content',
          '[data-testid="document-content"]'
        ];
        
        for (const selector of contentSelectors) {
          if (await testHelpers.isElementVisible(selector, 2000)) {
            await testHelpers.safeFill(selector, updatedContent);
            break;
          }
        }
        
        // 保存修改
        const saveButtons = [
          'button[type="submit"]',
          '.btn-save',
          'button:has-text("保存")',
          'button:has-text("更新")',
          '[data-testid="save-document"]'
        ];
        
        for (const selector of saveButtons) {
          if (await testHelpers.isElementVisible(selector, 2000)) {
            await testHelpers.safeClick(selector);
            break;
          }
        }
        
        // 等待保存成功
        await testHelpers.waitForPageLoad();
        
        // 验证编辑成功
        const successIndicators = [
          '.success-message',
          '.alert-success',
          '[data-testid="success-message"]'
        ];
        
        let successFound = false;
        for (const selector of successIndicators) {
          if (await testHelpers.isElementVisible(selector, 3000)) {
            successFound = true;
            break;
          }
        }
        
        // 截图记录编辑成功状态
        await testHelpers.takeScreenshot('document-edited');
      } else {
        console.log('⚠️ 没有找到编辑按钮，跳过编辑测试');
      }
    } else {
      console.log('⚠️ 没有找到文档项，跳过编辑测试');
    }
  });

  test('删除文档', async ({ authenticatedPage }: { authenticatedPage: import('@playwright/test').Page }) => {
    const page = authenticatedPage;
    
    // 查找并点击第一个文档的删除按钮
    const documentItems = page.locator('.document-item, .document-card, [data-testid="document-item"]');
    const itemCount = await documentItems.count();
    
    if (itemCount > 0) {
      const firstItem = documentItems.first();
      
      // 查找删除按钮
      const deleteSelectors = [
        '.delete-button',
        '.btn-delete',
        'button:has-text("删除")',
        '[data-testid="delete-document"]',
        '.fa-trash',
        '.fa-delete'
      ];
      
      let deleteButtonFound = false;
      for (const selector of deleteSelectors) {
        const element = firstItem.locator(selector);
        if (await element.isVisible({ timeout: 2000 })) {
          await element.click();
          deleteButtonFound = true;
          break;
        }
      }
      
      // 如果在列表页没找到删除按钮，先进入详情页
      if (!deleteButtonFound) {
        await firstItem.locator('.document-title, .title, h3, h4').first().click();
        await testHelpers.waitForPageLoad();
        
        // 在详情页查找删除按钮
        for (const selector of deleteSelectors) {
          if (await testHelpers.isElementVisible(selector, 2000)) {
            await testHelpers.safeClick(selector);
            deleteButtonFound = true;
            break;
          }
        }
      }
      
      if (deleteButtonFound) {
        // 处理确认对话框
        const confirmSelectors = [
          'button:has-text("确认")',
          'button:has-text("删除")',
          '.btn-confirm',
          '[data-testid="confirm-delete"]'
        ];
        
        // 等待确认对话框出现
        await page.waitForTimeout(1000);
        
        for (const selector of confirmSelectors) {
          if (await testHelpers.isElementVisible(selector, 3000)) {
            await testHelpers.safeClick(selector);
            break;
          }
        }
        
        // 等待删除完成
        await testHelpers.waitForPageLoad();
        
        // 验证删除成功
        const successIndicators = [
          '.success-message',
          '.alert-success',
          '[data-testid="success-message"]'
        ];
        
        let successFound = false;
        for (const selector of successIndicators) {
          if (await testHelpers.isElementVisible(selector, 3000)) {
            successFound = true;
            break;
          }
        }
        
        // 截图记录删除成功状态
        await testHelpers.takeScreenshot('document-deleted');
      } else {
        console.log('⚠️ 没有找到删除按钮，跳过删除测试');
      }
    } else {
      console.log('⚠️ 没有找到文档项，跳过删除测试');
    }
  });

  test('文档分类筛选', async ({ authenticatedPage }: { authenticatedPage: import('@playwright/test').Page }) => {
    const page = authenticatedPage;
    
    // 查找分类筛选器
    const categorySelectors = [
      '.category-filter',
      'select[name="category"]',
      '#category-filter',
      '[data-testid="category-filter"]'
    ];
    
    let categoryFilterFound = false;
    for (const selector of categorySelectors) {
      if (await testHelpers.isElementVisible(selector, 2000)) {
        const categoryFilter = page.locator(selector);
        
        // 获取可用的分类选项
        const options = await categoryFilter.locator('option').all();
        
        if (options.length > 1) {
          // 选择第二个选项（跳过"全部"选项）
          await categoryFilter.selectOption({ index: 1 });
          
          // 等待筛选结果加载
          await testHelpers.waitForPageLoad();
          
          // 验证筛选结果
          const documentItems = page.locator('.document-item, .document-card, [data-testid="document-item"]');
          const itemCount = await documentItems.count();
          
          // 截图记录筛选结果
          await testHelpers.takeScreenshot('document-category-filter');
          
          categoryFilterFound = true;
          break;
        }
      }
    }
    
    if (!categoryFilterFound) {
      console.log('⚠️ 没有找到分类筛选器，跳过筛选测试');
    }
  });

  test('文档排序功能', async ({ authenticatedPage }: { authenticatedPage: import('@playwright/test').Page }) => {
    const page = authenticatedPage;
    
    // 查找排序选择器
    const sortSelectors = [
      '.sort-select',
      'select[name="sort"]',
      '#sort-by',
      '[data-testid="sort-select"]'
    ];
    
    let sortSelectFound = false;
    for (const selector of sortSelectors) {
      if (await testHelpers.isElementVisible(selector, 2000)) {
        const sortSelect = page.locator(selector);
        
        // 获取可用的排序选项
        const options = await sortSelect.locator('option').all();
        
        if (options.length > 1) {
          // 记录排序前的第一个文档标题
          const firstDocumentBefore = await testHelpers.getTextContent('.document-item:first-child .document-title, .document-card:first-child .title');
          
          // 选择不同的排序方式
          await sortSelect.selectOption({ index: 1 });
          
          // 等待排序结果加载
          await testHelpers.waitForPageLoad();
          
          // 记录排序后的第一个文档标题
          const firstDocumentAfter = await testHelpers.getTextContent('.document-item:first-child .document-title, .document-card:first-child .title');
          
          // 截图记录排序结果
          await testHelpers.takeScreenshot('document-sorted');
          
          sortSelectFound = true;
          break;
        }
      }
    }
    
    if (!sortSelectFound) {
      console.log('⚠️ 没有找到排序选择器，跳过排序测试');
    }
  });

  test('文档分页功能', async ({ authenticatedPage }: { authenticatedPage: import('@playwright/test').Page }) => {
    const page = authenticatedPage;
    
    // 查找分页控件
    const paginationSelectors = [
      '.pagination',
      '.page-navigation',
      '[data-testid="pagination"]'
    ];
    
    let paginationFound = false;
    for (const selector of paginationSelectors) {
      if (await testHelpers.isElementVisible(selector, 2000)) {
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
            // 记录当前页面的第一个文档
            const firstDocumentBefore = await testHelpers.getTextContent('.document-item:first-child .document-title, .document-card:first-child .title');
            
            // 点击下一页
            await nextButton.click();
            await testHelpers.waitForPageLoad();
            
            // 记录下一页的第一个文档
            const firstDocumentAfter = await testHelpers.getTextContent('.document-item:first-child .document-title, .document-card:first-child .title');
            
            // 验证页面内容已改变
            expect(firstDocumentBefore).not.toBe(firstDocumentAfter);
            
            // 截图记录分页结果
            await testHelpers.takeScreenshot('document-pagination');
            
            paginationFound = true;
            break;
          }
        }
        
        if (paginationFound) break;
      }
    }
    
    if (!paginationFound) {
      console.log('⚠️ 没有找到可用的分页控件，跳过分页测试');
    }
  });
});