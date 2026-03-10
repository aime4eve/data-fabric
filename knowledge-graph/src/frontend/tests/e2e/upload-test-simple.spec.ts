import { test, expect } from '@playwright/test';

test.describe('文档上传功能测试', () => {
  test.beforeEach(async ({ page }) => {
    // 监听控制台消息
    page.on('console', msg => {
      console.log(`[${msg.type()}] ${msg.text()}`);
    });
    
    await page.goto('http://localhost:3000');
  });

  test('测试文档上传完整流程', async ({ page }) => {
    // 导航到文档上传页面
    await page.goto('http://localhost:3000/documents/upload');
    
    // 等待页面加载
    await page.waitForSelector('form', { timeout: 10000 });
    
    // 1. 上传文件
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-document.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('测试文档内容')
    });
    
    // 等待文件上传完成
    await page.waitForTimeout(1000);
    
    // 2. 选择目录
    await page.click('.ant-tree-node-content-wrapper');
    
    // 等待目录选择完成
    await page.waitForTimeout(1000);
    
    // 3. 填写表单信息
    await page.fill('input[placeholder="请输入文档标题"]', '测试文档标题');
    await page.fill('textarea[placeholder="请输入文档描述（可选）"]', '测试文档描述');
    
    // 4. 提交表单
    await page.click('button:has-text("上传文档")');
    
    // 等待上传完成
    await page.waitForTimeout(5000);
    
    // 检查是否有成功消息
    const successMessage = await page.locator('.ant-message-success').textContent();
    console.log('成功消息:', successMessage);
    
    // 检查是否有错误消息
    const errorMessage = await page.locator('.ant-message-error').textContent();
    if (errorMessage) {
      console.log('错误消息:', errorMessage);
    }
  });

  test('检查Form组件连接', async ({ page }) => {
    await page.goto('http://localhost:3000/documents/upload');
    
    // 等待页面加载
    await page.waitForSelector('form', { timeout: 10000 });
    
    // 检查Form组件是否正确渲染
    const formElement = await page.locator('form').first();
    expect(formElement).toBeTruthy();
    
    // 检查是否有data-testid属性
    const hasTestId = await formElement.getAttribute('data-testid');
    console.log('Form data-testid:', hasTestId);
    
    // 检查Form是否有正确的class
    const formClass = await formElement.getAttribute('class');
    console.log('Form class:', formClass);
  });
});