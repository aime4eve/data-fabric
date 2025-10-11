import { test, expect, Page } from '@playwright/test';

test.describe('文档上传功能测试', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // 导航到登录页面
    await page.goto('http://localhost:3002/login');
    
    // 登录
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // 等待登录完成并导航到上传页面
    await page.waitForURL('**/dashboard');
    await page.goto('http://localhost:3002/documents/upload');
    await page.waitForLoadState('networkidle');
  });

  test('测试文档上传功能', async () => {
    console.log('🔍 开始测试文档上传功能...');

    // 检查页面是否正确加载
    await expect(page.locator('h1')).toContainText('文档上传');
    
    // 创建测试文件
    const testContent = 'This is a test document for upload testing.';
    const testFile = Buffer.from(testContent);
    
    // 上传文件
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-document.txt',
      mimeType: 'text/plain',
      buffer: testFile,
    });
    
    // 等待文件上传完成
    await page.waitForTimeout(1000);
    
    // 填写标题
    await page.locator('input[placeholder*="标题"]').fill('测试文档标题');
    
    // 填写描述
    await page.locator('textarea[placeholder*="描述"]').fill('这是一个测试文档的描述');
    
    // 选择目录
    const directoryTree = page.locator('.ant-tree');
    if (await directoryTree.count() > 0) {
      // 点击第一个目录节点
      const firstNode = directoryTree.locator('.ant-tree-node-content-wrapper').first();
      await firstNode.click();
      await page.waitForTimeout(500);
    }
    
    // 提交表单
    console.log('📤 提交上传表单...');
    await page.locator('button[type="submit"]').click();
    
    // 等待上传完成
    await page.waitForTimeout(3000);
    
    // 检查是否有成功消息
    const successMessage = page.locator('.ant-message-success');
    const errorMessage = page.locator('.ant-message-error');
    
    if (await successMessage.count() > 0) {
      console.log('✅ 文档上传成功');
    } else if (await errorMessage.count() > 0) {
      const errorText = await errorMessage.textContent();
      console.log('❌ 文档上传失败:', errorText);
      throw new Error(`文档上传失败: ${errorText}`);
    } else {
      console.log('⚠️ 未检测到明确的成功或失败消息');
    }
    
    // 检查控制台错误
    const logs = await page.evaluate(() => {
      return (window as any).testLogs || [];
    });
    
    if (logs.length > 0) {
      console.log('📋 控制台日志:', logs);
    }
  });

  test('测试useForm连接问题', async () => {
    console.log('🔍 检查useForm连接问题...');
    
    // 监听控制台警告
    const warnings: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'warning' && msg.text().includes('useForm')) {
        warnings.push(msg.text());
      }
    });
    
    // 等待页面完全加载
    await page.waitForTimeout(2000);
    
    // 检查是否有useForm警告
    if (warnings.length > 0) {
      console.log('⚠️ 发现useForm警告:', warnings);
      throw new Error(`useForm连接问题: ${warnings.join(', ')}`);
    } else {
      console.log('✅ 未发现useForm连接问题');
    }
  });

  test('测试API调用', async () => {
    console.log('🔍 测试API调用...');
    
    // 监听网络请求
    const requests: any[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        requests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers()
        });
      }
    });
    
    // 监听网络响应
    const responses: any[] = [];
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        responses.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });
    
    // 创建测试文件并上传
    const testContent = 'API test document content';
    const testFile = Buffer.from(testContent);
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'api-test.txt',
      mimeType: 'text/plain',
      buffer: testFile,
    });
    
    await page.locator('input[placeholder*="标题"]').fill('API测试文档');
    
    // 选择目录（如果有）
    const directoryTree = page.locator('.ant-tree');
    if (await directoryTree.count() > 0) {
      const firstNode = directoryTree.locator('.ant-tree-node-content-wrapper').first();
      await firstNode.click();
      await page.waitForTimeout(500);
    }
    
    // 提交并等待API调用
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(3000);
    
    // 检查API请求
    console.log('📡 API请求:', requests);
    console.log('📡 API响应:', responses);
    
    // 验证是否有上传API调用
    const uploadRequests = requests.filter(req => req.url.includes('/documents/upload'));
    if (uploadRequests.length === 0) {
      throw new Error('未发现文档上传API调用');
    }
    
    // 验证API响应状态
    const uploadResponses = responses.filter(res => res.url.includes('/documents/upload'));
    if (uploadResponses.length > 0) {
      const response = uploadResponses[0];
      if (response.status >= 400) {
        throw new Error(`API调用失败: ${response.status} ${response.statusText}`);
      }
      console.log('✅ API调用成功');
    }
  });
});