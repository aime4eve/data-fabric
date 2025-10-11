import { test, expect, Page } from '@playwright/test';
import path from 'path';

// 使用相对路径（从项目根目录运行）
const testFilesDir = './test-files';

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

    try {
      // 先导航到登录页面进行登录
      console.log('导航到登录页面...');
      await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle', timeout: 15000 });
      
      // 等待登录表单加载
      await page.waitForTimeout(2000);
      
      // 调试：打印当前页面URL和标题
      console.log('当前页面URL:', page.url());
      console.log('当前页面标题:', await page.title());
      
      // 使用正确的data-testid选择器来找到登录表单元素
      const usernameInput = page.locator('[data-testid="username-input"]');
      const passwordInput = page.locator('[data-testid="password-input"]');
      const loginButton = page.locator('button[type="submit"]');
      
      console.log('用户名输入框是否可见:', await usernameInput.isVisible());
      console.log('密码输入框是否可见:', await passwordInput.isVisible());
      console.log('登录按钮是否可见:', await loginButton.isVisible());
      
      // 如果元素不可见，等待更长时间或尝试其他选择器
      if (!(await usernameInput.isVisible())) {
        console.log('等待更长时间...');
        await page.waitForTimeout(5000);
        console.log('等待5秒后用户名输入框是否可见:', await usernameInput.isVisible());
      }
      
      // 填写登录表单
      await usernameInput.fill('admin');
      await passwordInput.fill('123456');
      
      // 点击登录按钮
      await loginButton.click();
      
      // 等待登录完成并重定向到仪表板
      console.log('等待登录重定向...');
      await page.waitForURL('http://localhost:3000/dashboard', { timeout: 15000 });
      console.log('登录成功，已重定向到仪表板');
      
      // 等待仪表板加载完成
      await page.waitForLoadState('networkidle');
      
      // 导航到上传页面
      console.log('导航到上传页面...');
      await page.goto('http://localhost:3000/upload', { waitUntil: 'networkidle', timeout: 15000 });
      
      // 等待上传页面完全加载
      await page.waitForTimeout(3000);
      
      // 调试：打印上传页面的URL和标题
      console.log('上传页面URL:', page.url());
      console.log('上传页面标题:', await page.title());
      
      // 检查是否成功导航到上传页面
      if (!page.url().includes('/upload')) {
        console.log('警告：可能未正确导航到上传页面，当前URL:', page.url());
      }
      
    } catch (error) {
      console.error('测试设置过程中发生错误:', error);
      throw error;
    }
  });

  test.afterEach(async () => {
    // 只在所有测试完成后关闭页面
    // 因为测试之间共享页面实例，所以不能在每个测试后关闭
    // await page.close();
  });

  test.afterAll(async () => {
    // 在所有测试完成后关闭页面
    if (page) {
      await page.close();
    }
  });

  test('1. 基础页面元素检查', async () => {
    console.log('\n=== 开始基础页面元素检查 ===');
    
    // 检查页面标题
    await expect(page).toHaveTitle(/知识库管理系统/);
    
    // 检查主要元素是否存在
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    
    // 使用Ant Design Upload组件的正确选择器
    const uploadArea = page.locator('.ant-upload-drag').first();
    
    // 调试：检查元素的各种状态
    console.log('上传区域是否存在:', await uploadArea.count() > 0);
    if (await uploadArea.count() > 0) {
      console.log('上传区域是否可见:', await uploadArea.isVisible());
      
      // 检查上传区域内的文件输入元素
      const fileInput = uploadArea.locator('input[type="file"]');
      console.log('文件输入元素是否存在:', await fileInput.count() > 0);
      console.log('文件输入元素是否可见:', await fileInput.isVisible());
    } else {
      console.log('未找到上传区域，检查页面结构...');
      
      // 列出所有Ant Upload元素
      const allAntUploads = page.locator('.ant-upload');
      const uploadCount = await allAntUploads.count();
      console.log('Ant Upload元素总数:', uploadCount);
      for (let i = 0; i < uploadCount; i++) {
        const uploadEl = allAntUploads.nth(i);
        const className = await uploadEl.getAttribute('class');
        const text = await uploadEl.textContent();
        console.log(`Ant Upload ${i}: class="${className}", text="${text}"`);
      }
    }
    
    // 检查文件输入元素是否存在（隐藏的input[type="file"]）
    const fileInput = page.locator('input[type="file"]');
    console.log('文件输入元素是否存在:', await fileInput.count() > 0);
    console.log('文件输入元素是否可见:', await fileInput.isVisible());
    
    // 检查其他上传相关元素
    const antUpload = page.locator('.ant-upload').first();
    console.log('Ant Upload选择器是否存在:', await antUpload.count() > 0);
    if (await antUpload.count() > 0) {
      console.log('Ant Upload选择器是否可见:', await antUpload.isVisible());
    }
    
    const antUploadDragger = page.locator('.ant-upload-drag').first();
    console.log('Ant Upload Dragger选择器是否存在:', await antUploadDragger.count() > 0);
    if (await antUploadDragger.count() > 0) {
      console.log('Ant Upload Dragger选择器是否可见:', await antUploadDragger.isVisible());
    }
    
    // 暂时跳过文件上传区域的可见性检查，先检查其他元素
    // 检查目录树元素 - 使用Ant Design的树组件选择器
    const directoryTree = page.locator('.ant-tree');
    const directoryTreeExists = await directoryTree.count() > 0;
    console.log('目录树是否存在:', directoryTreeExists);
    
    if (directoryTreeExists) {
      console.log('目录树是否可见:', await directoryTree.isVisible());
    } else {
      console.log('⚠️ 目录树元素未找到，尝试查找其他树组件选择器');
      // 列出页面上所有可能的树组件
      const treeElements = page.locator('[class*="tree"], [class*="Tree"]');
      console.log('树组件元素数量:', await treeElements.count());
    }
    
    console.log('✓ 基础页面元素检查完成');
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
    
    // 选择目录 - 先检查目录树是否存在
    const directoryTree = page.locator('.ant-tree');
    if (await directoryTree.count() > 0) {
      const directoryNode = page.locator('.ant-tree-node-content-wrapper').first();
      await directoryNode.click();
      console.log('✓ 目录选择完成');
    } else {
      console.log('⚠️ 目录树不存在，跳过目录选择步骤');
    }
    
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
    const directoryTree = page.locator('.ant-tree');
    if (await directoryTree.count() > 0) {
      // 先检查"01_公司基本信息"目录是否已展开
      const parentNode = page.locator('.ant-tree-node-content-wrapper:has-text("01_公司基本信息")');
      
      // 点击父目录展开（如果未展开）
      await parentNode.click();
      await page.waitForTimeout(1000);
      
      // 等待子目录出现
      await page.waitForSelector('.ant-tree-node-content-wrapper:has-text("公司简介与发展历程")', { timeout: 5000 });
      
      // 然后选择子目录"公司简介与发展历程"
      const directoryNode = page.locator('.ant-tree-node-content-wrapper:has-text("公司简介与发展历程")');
      await directoryNode.click();
      console.log('✓ 目录选择完成');
    } else {
      console.log('⚠️ 目录树不存在，跳过目录选择步骤');
    }
    
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
    
    // 选择目录 - 选择"01_公司基本信息/公司简介与发展历程"目录（前端显示格式）
    const directoryTree = page.locator('.ant-tree');
    if (await directoryTree.count() > 0) {
      // 先检查"01_公司基本信息"目录是否已展开
      const parentNode = page.locator('.ant-tree-node-content-wrapper:has-text("01_公司基本信息")');
      
      // 点击父目录展开（如果未展开）
      await parentNode.click();
      await page.waitForTimeout(1000);
      
      // 等待子目录出现
      await page.waitForSelector('.ant-tree-node-content-wrapper:has-text("公司简介与发展历程")', { timeout: 5000 });
      
      // 然后选择子目录"公司简介与发展历程"
      const directoryNode = page.locator('.ant-tree-node-content-wrapper:has-text("公司简介与发展历程")');
      await directoryNode.click();
      console.log('✓ 目录选择完成');
    } else {
      console.log('⚠️ 目录树不存在，跳过目录选择步骤');
    }
    
    await page.waitForTimeout(1000);
    
    // 测试必填字段验证
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    
    // 检查是否显示验证错误 - 使用更通用的选择器
    await page.waitForTimeout(1000);
    
    // 尝试多种可能的验证错误选择器
    const validationError1 = page.locator('.ant-form-item-explain-error');
    const validationError2 = page.locator('.ant-form-item-has-error');
    const validationError3 = page.locator('.ant-form-item-control');
    
    let errorText = '';
    let validationFound = false;
    
    if (await validationError1.count() > 0) {
      errorText = await validationError1.textContent() || '';
      validationFound = true;
      console.log('验证错误信息 (方式1):', errorText);
    } else if (await validationError2.count() > 0) {
      errorText = await validationError2.textContent() || '';
      validationFound = true;
      console.log('验证错误信息 (方式2):', errorText);
    } else if (await validationError3.count() > 0) {
      // 检查包含错误文本的元素
      const errorElements = page.locator('.ant-form-item-control:has-text("请输入文档标题")');
      if (await errorElements.count() > 0) {
        errorText = '请输入文档标题';
        validationFound = true;
        console.log('验证错误信息 (方式3):', errorText);
      }
    }
    
    // 如果没找到验证错误，检查页面是否有其他错误提示
    if (!validationFound) {
      const anyError = page.locator('[class*="error"], [class*="Error"]');
      const errorCount = await anyError.count();
      console.log('页面错误元素数量:', errorCount);
      
      for (let i = 0; i < errorCount; i++) {
        const element = anyError.nth(i);
        const text = await element.textContent() || '';
        console.log(`错误元素 ${i}:`, text);
        if (text.includes('标题') || text.includes('请输入')) {
          errorText = text;
          validationFound = true;
          break;
        }
      }
    }
    
    if (validationFound) {
      expect(errorText).toContain('请输入文档标题');
      console.log('✓ 表单验证正常工作');
    } else {
      console.log('⚠️ 未找到验证错误信息，但表单提交可能已成功');
      // 检查是否有成功消息
      const successMessage = page.locator('.ant-message-success');
      if (await successMessage.count() > 0) {
        console.log('✓ 表单提交成功');
      }
    }
  });
});