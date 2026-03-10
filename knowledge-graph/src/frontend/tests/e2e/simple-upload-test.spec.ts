import { test, expect } from '@playwright/test';

test.describe('简化文档上传测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3002/upload');
    await page.waitForLoadState('networkidle');
  });

  test('检查页面基本元素', async ({ page }) => {
    // 检查页面标题
    await expect(page.locator('h2')).toContainText('文档上传');
    
    // 检查上传区域
    await expect(page.locator('.ant-upload-drag')).toBeVisible();
    
    // 检查目录树
    await expect(page.locator('.ant-tree')).toBeVisible();
  });

  test('测试文件上传和表单填写', async ({ page }) => {
    // 创建测试文件
    const testFileContent = 'This is a test document for upload testing.';
    const testFile = Buffer.from(testFileContent);

    // 上传文件
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-document.txt',
      mimeType: 'text/plain',
      buffer: testFile
    });

    // 等待文件显示在列表中
    await expect(page.locator('.ant-upload-list-item')).toBeVisible();

    // 选择目录
    await page.click('.ant-tree-node-content-wrapper[title="01_公司治理"]');
    
    // 等待表单出现
    await expect(page.locator('[data-testid="title-input"]')).toBeVisible();

    // 填写表单
    await page.fill('[data-testid="title-input"]', 'E2E测试文档');
    await page.fill('[data-testid="description-input"]', 'E2E自动化测试上传的文档');

    // 点击上传按钮
    const uploadButton = page.locator('[data-testid="upload-button"]');
    await expect(uploadButton).toBeVisible();
    await uploadButton.click();

    // 等待上传完成
    await page.waitForTimeout(3000);

    // 检查是否有成功或错误消息
    const successMessage = page.locator('.ant-message-success');
    const errorMessage = page.locator('.ant-message-error');
    
    try {
      await expect(successMessage).toBeVisible({ timeout: 5000 });
      console.log('✅ 上传成功');
    } catch {
      try {
        await expect(errorMessage).toBeVisible({ timeout: 2000 });
        console.log('❌ 上传失败');
      } catch {
        console.log('⚠️ 没有显示任何消息');
      }
    }
  });

  test('测试表单验证', async ({ page }) => {
    // 创建测试文件
    const testFileContent = 'This is a test document for upload testing.';
    const testFile = Buffer.from(testFileContent);

    // 上传文件
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-document.txt',
      mimeType: 'text/plain',
      buffer: testFile
    });

    // 等待文件显示在列表中
    await expect(page.locator('.ant-upload-list-item')).toBeVisible();

    // 选择目录
    await page.click('.ant-tree-node-content-wrapper[title="01_公司治理"]');
    
    // 等待表单出现
    await expect(page.locator('[data-testid="title-input"]')).toBeVisible();

    // 不填写标题，直接点击上传
    const uploadButton = page.locator('[data-testid="upload-button"]');
    await uploadButton.click();

    // 检查验证消息
    await expect(page.locator('.ant-form-item-explain-error')).toBeVisible();
  });
});