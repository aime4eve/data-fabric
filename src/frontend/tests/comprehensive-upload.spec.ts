import { test, expect, Page } from '@playwright/test';

test.describe('文档上传功能全面测试', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // 监听控制台消息
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      console.log(`[浏览器控制台 ${type.toUpperCase()}]: ${text}`);
      
      // 特别关注useForm警告
      if (text.includes('useForm') && text.includes('not connected')) {
        console.error('🚨 发现useForm连接问题:', text);
      }
      
      // 关注上传失败信息
      if (text.includes('上传失败')) {
        console.error('🚨 发现上传失败:', text);
      }
    });

    // 监听页面错误
    page.on('pageerror', error => {
      console.error('🚨 页面错误:', error.message);
    });

    // 监听网络请求
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        console.log(`📤 API请求: ${request.method()} ${request.url()}`);
      }
    });

    page.on('response', response => {
      if (response.url().includes('/api/')) {
        console.log(`📥 API响应: ${response.status()} ${response.url()}`);
      }
    });

    // 导航到上传页面
    await page.goto('http://localhost:3002/documents/upload');
    await page.waitForLoadState('networkidle');
  });

  test('1. 检查页面基本元素', async () => {
    console.log('🔍 开始检查页面基本元素...');

    // 检查页面标题
    await expect(page).toHaveTitle(/知识库/);

    // 检查表单存在
    const form = page.locator('form[data-testid="document-upload-form"]');
    await expect(form).toBeVisible();
    console.log('✅ 表单元素存在');

    // 检查文件上传组件
    const fileUpload = page.locator('.ant-upload');
    await expect(fileUpload).toBeVisible();
    console.log('✅ 文件上传组件存在');

    // 检查目录树
    const directoryTree = page.locator('.ant-tree');
    await expect(directoryTree).toBeVisible();
    console.log('✅ 目录树组件存在');

    // 检查表单字段
    const titleInput = page.locator('input[placeholder*="标题"]');
    const descTextarea = page.locator('textarea[placeholder*="描述"]');
    
    await expect(titleInput).toBeVisible();
    await expect(descTextarea).toBeVisible();
    console.log('✅ 表单字段存在');
  });

  test('2. 检查useForm连接问题', async () => {
    console.log('🔍 开始检查useForm连接问题...');

    // 等待页面完全加载
    await page.waitForTimeout(2000);

    // 检查是否有useForm警告
    const consoleLogs = [];
    page.on('console', msg => {
      consoleLogs.push(msg.text());
    });

    // 尝试与表单交互
    const titleInput = page.locator('input[placeholder*="标题"]');
    await titleInput.fill('测试标题');
    await titleInput.blur();

    // 等待一下看是否有警告
    await page.waitForTimeout(1000);

    // 检查控制台是否有useForm相关警告
    const hasUseFormWarning = consoleLogs.some(log => 
      log.includes('useForm') && log.includes('not connected')
    );

    if (hasUseFormWarning) {
      console.error('🚨 发现useForm连接问题');
      
      // 尝试修复：检查表单属性绑定
      const formElement = await page.locator('form').first();
      const formProps = await formElement.evaluate(el => ({
        hasFormAttribute: el.hasAttribute('form'),
        className: el.className,
        id: el.id
      }));
      
      console.log('表单属性:', formProps);
    } else {
      console.log('✅ 未发现useForm连接问题');
    }
  });

  test('3. 测试文件上传流程', async () => {
    console.log('🔍 开始测试文件上传流程...');

    // 创建测试文件
    const testContent = '这是一个测试文档\n用于测试文档上传功能\n包含中文内容';
    const testFile = Buffer.from(testContent, 'utf8');

    // 上传文件
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-document.txt',
      mimeType: 'text/plain',
      buffer: testFile
    });

    console.log('✅ 文件已选择');

    // 等待文件处理
    await page.waitForTimeout(2000);

    // 检查文件是否显示在列表中
    const fileList = page.locator('.ant-upload-list-item');
    await expect(fileList).toBeVisible();
    console.log('✅ 文件显示在列表中');

    // 选择目录
    const treeNode = page.locator('.ant-tree-node-content-wrapper').first();
    await treeNode.click();
    console.log('✅ 目录已选择');

    // 填写表单
    await page.locator('input[placeholder*="标题"]').fill('E2E测试文档');
    await page.locator('textarea[placeholder*="描述"]').fill('这是通过E2E测试上传的文档');
    console.log('✅ 表单已填写');

    // 提交表单
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeEnabled();
    
    console.log('🚀 准备提交表单...');
    await submitButton.click();

    // 等待上传完成或失败
    await page.waitForTimeout(5000);

    // 检查结果
    const successMessage = page.locator('.ant-message-success');
    const errorMessage = page.locator('.ant-message-error');

    const hasSuccess = await successMessage.count() > 0;
    const hasError = await errorMessage.count() > 0;

    if (hasSuccess) {
      console.log('✅ 文档上传成功');
    } else if (hasError) {
      console.error('🚨 文档上传失败');
      const errorText = await errorMessage.textContent();
      console.error('错误信息:', errorText);
    } else {
      console.warn('⚠️ 未检测到明确的成功或失败消息');
    }
  });

  test('4. 测试API调用', async () => {
    console.log('🔍 开始测试API调用...');

    let apiCalled = false;
    let apiResponse = null;

    // 监听API调用
    page.on('request', request => {
      if (request.url().includes('/api/v1/documents/upload')) {
        apiCalled = true;
        console.log('📤 检测到上传API调用:', request.url());
      }
    });

    page.on('response', response => {
      if (response.url().includes('/api/v1/documents/upload')) {
        apiResponse = {
          status: response.status(),
          url: response.url()
        };
        console.log('📥 上传API响应:', apiResponse);
      }
    });

    // 执行上传流程
    const testContent = '测试API调用';
    const testFile = Buffer.from(testContent, 'utf8');

    await page.locator('input[type="file"]').setInputFiles({
      name: 'api-test.txt',
      mimeType: 'text/plain',
      buffer: testFile
    });

    await page.waitForTimeout(1000);

    // 选择目录和填写表单
    await page.locator('.ant-tree-node-content-wrapper').first().click();
    await page.locator('input[placeholder*="标题"]').fill('API测试文档');
    await page.locator('textarea[placeholder*="描述"]').fill('测试API调用');

    // 提交
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(3000);

    // 验证API调用
    expect(apiCalled).toBeTruthy();
    console.log(apiCalled ? '✅ API调用已发起' : '🚨 API调用未发起');

    if (apiResponse) {
      console.log(`API响应状态: ${apiResponse.status}`);
      if (apiResponse.status === 201) {
        console.log('✅ API调用成功');
      } else {
        console.error(`🚨 API调用失败，状态码: ${apiResponse.status}`);
      }
    }
  });

  test('5. 错误处理测试', async () => {
    console.log('🔍 开始测试错误处理...');

    // 测试无文件上传
    await page.locator('input[placeholder*="标题"]').fill('无文件测试');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1000);

    // 应该显示错误信息
    const errorMessage = page.locator('.ant-form-item-explain-error');
    const hasError = await errorMessage.count() > 0;
    
    if (hasError) {
      console.log('✅ 无文件上传时正确显示错误');
    } else {
      console.warn('⚠️ 无文件上传时未显示错误信息');
    }

    // 测试大文件上传（如果有限制）
    const largeContent = 'x'.repeat(10 * 1024 * 1024); // 10MB
    const largeFile = Buffer.from(largeContent, 'utf8');

    await page.locator('input[type="file"]').setInputFiles({
      name: 'large-file.txt',
      mimeType: 'text/plain',
      buffer: largeFile
    });

    await page.waitForTimeout(2000);

    // 检查是否有大小限制提示
    const sizeError = page.locator('.ant-upload-list-item-error');
    const hasSizeError = await sizeError.count() > 0;

    if (hasSizeError) {
      console.log('✅ 大文件上传时正确显示错误');
    } else {
      console.log('ℹ️ 未检测到文件大小限制');
    }
  });
});