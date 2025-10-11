import { test, expect, Page } from '@playwright/test';
import path from 'path';

// 使用相对路径
const testFilesDir = '../../test-files';

test.describe('文档上传功能全面诊断', () => {
  let page: Page;
  let consoleLogs: string[] = [];
  let consoleErrors: string[] = [];
  let networkRequests: any[] = [];
  let networkResponses: any[] = [];

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // 清空日志数组
    consoleLogs = [];
    consoleErrors = [];
    networkRequests = [];
    networkResponses = [];

    // 监听控制台日志
    page.on('console', (msg) => {
      const text = msg.text();
      consoleLogs.push(text);
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
      console.log(`[浏览器控制台 ${msg.type()}]:`, text);
    });

    // 监听网络请求
    page.on('request', (request) => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        postData: request.postData()
      });
      console.log(`[网络请求]: ${request.method()} ${request.url()}`);
    });

    // 监听网络响应
    page.on('response', (response) => {
      networkResponses.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText()
      });
      console.log(`[网络响应]: ${response.status()} ${response.url()}`);
    });

    // 导航到上传页面
    await page.goto('http://localhost:3002/upload');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('1. 基础页面元素检查', async () => {
    console.log('\n=== 开始基础页面元素检查 ===');
    
    // 检查页面标题
    await expect(page).toHaveTitle(/知识库管理系统/);
    
    // 检查主要元素是否存在
    const uploadArea = page.locator('[data-testid="upload-area"]');
    await expect(uploadArea).toBeVisible();
    
    const directoryTree = page.locator('[data-testid="directory-tree"]');
    await expect(directoryTree).toBeVisible();
    
    console.log('✓ 基础页面元素检查通过');
  });

  test('2. useForm连接问题诊断', async () => {
    console.log('\n=== 开始useForm连接问题诊断 ===');
    
    // 等待页面完全加载
    await page.waitForTimeout(2000);
    
    // 检查是否有useForm相关的警告
    const useFormWarnings = consoleLogs.filter(log => 
      log.includes('useForm') || 
      log.includes('Form element') ||
      log.includes('form` prop')
    );
    
    console.log('useForm相关日志:', useFormWarnings);
    
    // 检查表单元素是否正确连接
    const formElement = page.locator('[data-testid="document-upload-form"]');
    
    // 先上传文件和选择目录，让表单显示出来
    const testFile = path.join(testFilesDir, 'test-upload.txt');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFile);
    
    // 选择目录
    const directoryNode = page.locator('.ant-tree-node-content-wrapper').first();
    await directoryNode.click();
    
    // 等待表单显示
    await page.waitForTimeout(1000);
    
    // 现在检查表单是否可见
    const isFormVisible = await formElement.isVisible();
    console.log('表单是否可见:', isFormVisible);
    
    if (isFormVisible) {
      // 检查表单的form属性
      const formProps = await formElement.evaluate((el) => {
        return {
          tagName: el.tagName,
          className: el.className,
          hasFormAttribute: el.hasAttribute('form'),
          formAttribute: el.getAttribute('form')
        };
      });
      console.log('表单元素属性:', formProps);
      
      // 检查表单内的输入元素
      const titleInput = page.locator('[data-testid="title-input"]');
      const isTitleInputVisible = await titleInput.isVisible();
      console.log('标题输入框是否可见:', isTitleInputVisible);
    }
    
    // 如果有useForm警告，记录详细信息
    if (useFormWarnings.length > 0) {
      console.log('❌ 发现useForm连接问题:', useFormWarnings);
      expect(useFormWarnings.length).toBe(0);
    } else {
      console.log('✓ 未发现useForm连接问题');
    }
  });

  test('3. 文件上传流程完整测试', async () => {
    console.log('\n=== 开始文件上传流程完整测试 ===');
    
    // 创建测试文件
    const testFile = path.join(testFilesDir, 'test-upload.txt');
    
    // 步骤1: 上传文件
    console.log('步骤1: 上传文件');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFile);
    
    // 等待文件上传完成
    await page.waitForTimeout(1000);
    
    // 检查文件是否成功添加到列表
    const fileItem = page.locator('.ant-upload-list-item');
    await expect(fileItem).toBeVisible();
    console.log('✓ 文件成功添加到上传列表');
    
    // 步骤2: 选择目录
    console.log('步骤2: 选择目录');
    const directoryNode = page.locator('.ant-tree-node-content-wrapper').first();
    await directoryNode.click();
    console.log('✓ 目录选择完成');
    
    // 步骤3: 填写表单
    console.log('步骤3: 填写表单');
    await page.waitForTimeout(1000);
    
    const titleInput = page.locator('[data-testid="title-input"]');
    await expect(titleInput).toBeVisible();
    await titleInput.fill('测试文档标题');
    
    const descriptionInput = page.locator('[data-testid="description-input"]');
    await descriptionInput.fill('这是一个测试文档的描述');
    
    console.log('✓ 表单填写完成');
    
    // 步骤4: 提交表单
    console.log('步骤4: 提交表单');
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();
    
    // 清空之前的日志，专注于提交过程
    consoleLogs.length = 0;
    consoleErrors.length = 0;
    networkRequests.length = 0;
    networkResponses.length = 0;
    
    await submitButton.click();
    
    // 等待提交处理
    await page.waitForTimeout(3000);
    
    // 分析提交过程中的日志
    console.log('\n=== 提交过程日志分析 ===');
    console.log('控制台日志:', consoleLogs);
    console.log('控制台错误:', consoleErrors);
    console.log('网络请求:', networkRequests.map(req => `${req.method} ${req.url}`));
    console.log('网络响应:', networkResponses.map(res => `${res.status} ${res.url}`));
    
    // 检查是否有上传相关的API调用
    const uploadRequests = networkRequests.filter(req => 
      req.url.includes('/api/v1/documents/upload')
    );
    console.log('上传API请求:', uploadRequests);
    
    const uploadResponses = networkResponses.filter(res => 
      res.url.includes('/api/v1/documents/upload')
    );
    console.log('上传API响应:', uploadResponses);
    
    // 检查是否有错误
    if (consoleErrors.length > 0) {
      console.log('❌ 发现控制台错误:', consoleErrors);
    }
    
    // 检查上传是否成功
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
  });

  test('4. API连接性测试', async () => {
    console.log('\\n=== 开始API连接性测试 ===');
    
    // 测试后端API是否可访问
    const response = await page.request.get('http://localhost:5000/api/v1/categories/tree/');
    console.log('分类API响应状态:', response.status());
    
    if (response.ok()) {
      const data = await response.json();
      console.log('分类API响应数据:', data);
      console.log('✓ 后端API连接正常');
    } else {
      console.log('❌ 后端API连接失败');
      expect(response.ok()).toBeTruthy();
    }
  });

  test('5. 表单验证测试', async () => {
    console.log('\n=== 开始表单验证测试 ===');
    
    // 创建测试文件
    const testFile = path.join(testFilesDir, 'test-upload.txt');
    
    // 上传文件
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFile);
    
    // 选择目录
    const directoryNode = page.locator('.ant-tree-node-content-wrapper').first();
    await directoryNode.click();
    
    await page.waitForTimeout(1000);
    
    // 测试必填字段验证
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    
    // 检查是否显示验证错误
    const validationError = page.locator('.ant-form-item-explain-error');
    await expect(validationError).toBeVisible();
    
    const errorText = await validationError.textContent();
    console.log('验证错误信息:', errorText);
    
    expect(errorText).toContain('请输入文档标题');
    console.log('✓ 表单验证正常工作');
  });
});