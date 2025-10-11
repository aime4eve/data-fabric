import { test, expect, Page, Request, Response } from '@playwright/test';

test.describe('文档上传功能完整调试', () => {
  let consoleLogs: string[] = [];
  let uploadRequest: any = null;
  let uploadResponse: any = null;

  test.beforeEach(async ({ page }) => {
    // 清空日志 - 移到开头
    consoleLogs = [];
    uploadRequest = null;
    uploadResponse = null;

    // 监听控制台消息
    page.on('console', (msg) => {
      const text = `[${msg.type()}] ${msg.text()}`;
      consoleLogs.push(text);
      console.log('浏览器控制台:', text);
    });

    // 监听网络请求
    page.on('request', (request: Request) => {
      if (request.url().includes('/api/v1/documents/upload')) {
        uploadRequest = {
          url: request.url(),
          method: request.method(),
          headers: request.headers(),
          postData: request.postData()
        };
        console.log('上传请求:', uploadRequest);
      }
    });

    // 监听网络响应
    page.on('response', (response: Response) => {
      if (response.url().includes('/api/v1/documents/upload')) {
        uploadResponse = {
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
          headers: response.headers()
        };
        console.log('上传响应:', uploadResponse);
      }
    });
  });

  test('检查页面基本元素', async ({ page }) => {
    await page.goto('http://localhost:3002/upload');
    
    // 等待页面加载
    await page.waitForLoadState('networkidle');
    
    // 检查页面标题
    await expect(page.locator('h1')).toContainText('文档上传');
    
    // 检查表单存在
    const form = page.locator('[data-testid="document-upload-form"]');
    await expect(form).toBeVisible();
    
    // 检查表单字段
    await expect(page.locator('[data-testid="title-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="description-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="category-select"]')).toBeVisible();
    
    // 检查上传区域
    await expect(page.locator('[data-testid="file-dragger"]')).toBeVisible();
    
    // 检查上传按钮
    await expect(page.locator('[data-testid="upload-button"]')).toBeVisible();
    
    console.log('页面基本元素检查完成');
  });

  test('检查useForm连接问题', async ({ page }) => {
    await page.goto('http://localhost:3002/upload');
    await page.waitForLoadState('networkidle');
    
    // 等待一段时间让React组件完全初始化
    await page.waitForTimeout(3000);
    
    // 检查是否有useForm警告
    const useFormWarnings = consoleLogs.filter(log => 
      log.includes('useForm') && log.includes('not connected')
    );
    
    console.log('useForm警告:', useFormWarnings);
    
    if (useFormWarnings.length > 0) {
      console.log('发现useForm连接问题:', useFormWarnings);
      
      // 检查Form组件是否正确绑定form属性
      const formElement = page.locator('[data-testid="document-upload-form"]');
      await expect(formElement).toBeVisible();
      
      // 尝试获取form属性
      const formProps = await formElement.evaluate((el) => {
        return {
          hasFormAttribute: el.hasAttribute('form'),
          formValue: el.getAttribute('form'),
          className: el.className,
          tagName: el.tagName
        };
      });
      
      console.log('Form元素属性:', formProps);
    }
    
    // 输出所有控制台日志用于调试
    console.log('所有控制台日志:');
    consoleLogs.forEach((log, index) => {
      console.log(`${index + 1}: ${log}`);
    });
    
    // 如果有useForm警告，测试失败
    if (useFormWarnings.length > 0) {
      throw new Error(`发现useForm连接问题: ${useFormWarnings.join(', ')}`);
    }
  });

  test('完整文档上传流程测试', async ({ page }) => {
    await page.goto('http://localhost:3002/upload');
    await page.waitForLoadState('networkidle');
    
    // 等待页面完全加载
    await page.waitForTimeout(2000);
    
    // 1. 上传文件
    console.log('步骤1: 上传文件');
    const fileInput = page.locator('[data-testid="file-dragger"] input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-document.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('这是一个测试文档内容')
    });
    
    // 等待文件上传处理
    await page.waitForTimeout(1000);
    
    // 2. 选择目录 - 点击第一个目录
    console.log('步骤2: 选择目录');
    const firstDirectory = page.locator('.ant-tree-node-content-wrapper').first();
    await firstDirectory.click();
    
    // 等待目录选择处理
    await page.waitForTimeout(1000);
    
    // 3. 填写表单
    console.log('步骤3: 填写表单');
    await page.locator('[data-testid="title-input"]').fill('测试文档标题');
    await page.locator('[data-testid="description-input"]').fill('测试文档描述');
    
    // 4. 提交表单
    console.log('步骤4: 提交表单');
    const uploadButton = page.locator('[data-testid="upload-button"]');
    await expect(uploadButton).toBeEnabled();
    
    console.log('准备点击上传按钮');
    await uploadButton.click();
    
    // 等待上传请求
    await page.waitForTimeout(5000);
    
    // 检查上传请求
    console.log('上传请求详情:', uploadRequest);
    console.log('上传响应详情:', uploadResponse);
    
    // 检查控制台日志中的错误
    const errorLogs = consoleLogs.filter(log => 
      log.includes('[error]') || log.includes('上传失败') || log.includes('Error')
    );
    
    console.log('错误日志:', errorLogs);
    
    if (errorLogs.length > 0) {
      console.log('发现上传错误:', errorLogs);
      // 输出详细的错误信息
      errorLogs.forEach((log, index) => {
        console.log(`错误 ${index + 1}: ${log}`);
      });
    }
    
    // 验证上传请求是否发送
    if (!uploadRequest) {
      console.log('未发送上传请求，可能的原因:');
      console.log('1. 表单验证失败');
      console.log('2. 文件或目录选择有问题');
      console.log('3. JavaScript错误阻止了请求');
      throw new Error('未发送上传请求');
    }
    
    if (uploadResponse) {
      console.log('上传响应状态:', uploadResponse.status);
      if (uploadResponse.status !== 201) {
        console.log('上传失败，状态码:', uploadResponse.status);
        throw new Error(`上传失败，状态码: ${uploadResponse.status}`);
      }
    }
  });

  test('API连接性测试', async ({ page }) => {
    // 直接测试API端点
    console.log('测试API连接性...');
    
    try {
      const response = await page.request.get('http://localhost:5001/api/v1/health');
      console.log('API健康检查响应:', response.status());
      
      if (response.ok()) {
        const data = await response.json();
        console.log('API健康检查数据:', data);
      } else {
        console.log('API连接失败，状态码:', response.status());
        throw new Error(`API连接失败，状态码: ${response.status()}`);
      }
    } catch (error) {
      console.log('API连接错误:', error);
      throw error;
    }
  });

  test.afterEach(async () => {
    // 输出所有控制台日志
    console.log('\n=== 完整控制台日志 ===');
    consoleLogs.forEach((log, index) => {
      console.log(`${index + 1}: ${log}`);
    });
    console.log('=== 日志结束 ===\n');
  });
});