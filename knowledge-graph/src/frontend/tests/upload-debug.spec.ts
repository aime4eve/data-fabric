import { test, expect } from '@playwright/test';

test.describe('文档上传调试测试', () => {
  test('检查useForm警告和上传功能', async ({ page }) => {
    const consoleMessages: string[] = [];
    const pageErrors: string[] = [];
    
    // 监听控制台消息
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(`[${msg.type()}] ${text}`);
      console.log(`Console: [${msg.type()}] ${text}`);
    });
    
    // 监听页面错误
    page.on('pageerror', error => {
      const errorText = error.message;
      pageErrors.push(errorText);
      console.log(`Page Error: ${errorText}`);
    });
    
    // 导航到文档上传页面
    await page.goto('/documents/upload');
    
    // 等待页面加载
    await page.waitForSelector('form', { timeout: 10000 });
    
    // 检查Form组件是否正确渲染
    const form = page.locator('form[data-testid="document-upload-form"]');
    await expect(form).toBeVisible();
    
    // 等待一下让所有组件初始化完成
    await page.waitForTimeout(2000);
    
    // 检查是否有useForm警告
    const useFormWarnings = consoleMessages.filter(msg => 
      msg.includes('useForm') && msg.includes('not connected')
    );
    
    console.log('所有控制台消息:', consoleMessages);
    console.log('useForm警告:', useFormWarnings);
    
    // 如果有useForm警告，记录但不失败测试
    if (useFormWarnings.length > 0) {
      console.log('发现useForm警告:', useFormWarnings);
    }
    
    // 测试文件上传功能
    await test.step('测试文件上传', async () => {
      // 创建测试文件
      const testContent = '这是一个测试文档的内容';
      const testFile = Buffer.from(testContent, 'utf8');
      
      // 查找文件输入元素
      const fileInput = page.locator('input[type="file"]');
      await expect(fileInput).toBeVisible();
      
      // 上传文件
      await fileInput.setInputFiles({
        name: 'test-document.txt',
        mimeType: 'text/plain',
        buffer: testFile
      });
      
      // 等待文件上传完成
      await page.waitForTimeout(1000);
      
      // 检查文件是否显示在列表中
      const fileList = page.locator('.ant-upload-list-item');
      await expect(fileList).toBeVisible();
    });
    
    // 测试目录选择
    await test.step('测试目录选择', async () => {
      // 点击目录树节点
      const treeNode = page.locator('.ant-tree-node-content-wrapper').first();
      if (await treeNode.isVisible()) {
        await treeNode.click();
        await page.waitForTimeout(500);
      }
    });
    
    // 测试表单填写
    await test.step('测试表单填写', async () => {
      // 填写文档标题
      const titleInput = page.locator('input[placeholder="请输入文档标题"]');
      await expect(titleInput).toBeVisible();
      await titleInput.fill('测试文档标题');
      
      // 填写文档描述
      const descInput = page.locator('textarea[placeholder="请输入文档描述"]');
      await expect(descInput).toBeVisible();
      await descInput.fill('这是一个测试文档的描述');
    });
    
    // 测试表单提交
    await test.step('测试表单提交', async () => {
      // 查找提交按钮
      const submitButton = page.locator('button[type="submit"]').or(
        page.locator('button:has-text("上传")')
      ).or(
        page.locator('button:has-text("提交")')
      );
      
      if (await submitButton.isVisible()) {
        // 点击提交按钮
        await submitButton.click();
        
        // 等待响应
        await page.waitForTimeout(3000);
        
        // 检查是否有成功或错误消息
        const successMessage = page.locator('.ant-message-success');
        const errorMessage = page.locator('.ant-message-error');
        
        // 记录提交结果
        if (await successMessage.isVisible()) {
          console.log('文档上传成功');
        } else if (await errorMessage.isVisible()) {
          console.log('文档上传失败');
        } else {
          console.log('未检测到明确的成功或失败消息');
        }
      } else {
        console.log('未找到提交按钮');
      }
    });
    
    // 最终检查控制台消息和错误
    console.log('=== 测试完成 ===');
    console.log('控制台消息总数:', consoleMessages.length);
    console.log('页面错误总数:', pageErrors.length);
    
    if (pageErrors.length > 0) {
      console.log('页面错误:', pageErrors);
    }
    
    // 检查特定的错误模式
    const uploadErrors = consoleMessages.filter(msg => 
      msg.includes('上传失败') || msg.includes('upload failed')
    );
    
    if (uploadErrors.length > 0) {
      console.log('上传错误:', uploadErrors);
    }
  });
});