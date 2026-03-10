import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('文档上传简单测试', () => {
  test.beforeEach(async ({ page }) => {
    // 监听控制台日志
    page.on('console', (msg) => {
      console.log(`[浏览器控制台 ${msg.type()}]:`, msg.text());
    });

    // 导航到上传页面
    await page.goto('http://localhost:3002/upload');
    await page.waitForLoadState('networkidle');
  });

  test('测试文档上传完整流程', async ({ page }) => {
    console.log('\n=== 开始文档上传完整流程测试 ===');
    
    // 创建测试文件
    const testFile = path.join(__dirname, '../../test-files/test-upload.txt');
    
    // 步骤1: 上传文件
    console.log('步骤1: 上传文件');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFile);
    
    // 等待文件处理
    await page.waitForTimeout(2000);
    
    // 步骤2: 选择目录
    console.log('步骤2: 选择目录');
    const directoryNode = page.locator('.ant-tree-node-content-wrapper').first();
    await directoryNode.click();
    
    // 等待表单显示
    await page.waitForTimeout(2000);
    
    // 步骤3: 填写表单
    console.log('步骤3: 填写表单');
    const titleInput = page.locator('[data-testid="title-input"]');
    await expect(titleInput).toBeVisible();
    await titleInput.fill('测试文档标题');
    
    const descriptionInput = page.locator('[data-testid="description-input"]');
    await descriptionInput.fill('这是一个测试文档的描述');
    
    // 步骤4: 提交表单
    console.log('步骤4: 提交表单');
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();
    
    await submitButton.click();
    
    // 等待提交处理
    await page.waitForTimeout(5000);
    
    // 检查结果
    const successMessage = page.locator('.ant-message-success');
    const errorMessage = page.locator('.ant-message-error');
    
    const hasSuccess = await successMessage.isVisible().catch(() => false);
    const hasError = await errorMessage.isVisible().catch(() => false);
    
    console.log('成功消息是否显示:', hasSuccess);
    console.log('错误消息是否显示:', hasError);
    
    if (hasError) {
      const errorText = await errorMessage.textContent();
      console.log('错误消息内容:', errorText);
    }
    
    if (hasSuccess) {
      const successText = await successMessage.textContent();
      console.log('成功消息内容:', successText);
    }
    
    // 期望上传成功
    expect(hasSuccess).toBeTruthy();
  });
});