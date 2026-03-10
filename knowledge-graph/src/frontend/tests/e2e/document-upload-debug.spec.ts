import { test, expect, Page } from '@playwright/test';

test.describe('文档上传功能调试测试', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // 监听控制台消息
    page.on('console', msg => {
      console.log(`[${msg.type()}] ${msg.text()}`);
    });
    
    // 监听页面错误
    page.on('pageerror', error => {
      console.error('页面错误:', error);
    });
    
    // 监听网络请求失败
    page.on('requestfailed', request => {
      console.error('请求失败:', request.url(), request.failure()?.errorText);
    });
    
    await page.goto('http://localhost:3000');
  });

  test('检查useForm警告和上传失败问题', async () => {
    // 导航到文档上传页面
    await page.click('text=文档管理');
    await page.click('text=上传文档');
    
    // 等待页面加载完成
    await page.waitForSelector('[data-testid="document-upload-form"]', { timeout: 10000 });
    
    // 检查Form组件是否正确渲染
    const formElement = await page.locator('form').first();
    expect(formElement).toBeTruthy();
    
    // 检查是否有useForm警告
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      consoleMessages.push(msg.text());
    });
    
    // 模拟文件上传流程
    // 1. 选择文件
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-document.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('test pdf content')
    });
    
    // 2. 选择目录
    await page.click('.ant-tree-node-content-wrapper');
    
    // 3. 填写表单信息
    await page.fill('input[placeholder="请输入文档标题"]', '测试文档标题');
    await page.fill('textarea[placeholder="请输入文档描述"]', '测试文档描述');
    
    // 4. 提交表单
    await page.click('button:has-text("上传文档")');
    
    // 等待一段时间让错误消息出现
    await page.waitForTimeout(3000);
    
    // 检查是否有上传失败的错误消息
    const errorMessage = await page.locator('.ant-message-error').textContent();
    if (errorMessage) {
      console.log('发现错误消息:', errorMessage);
    }
    
    // 检查控制台是否有useForm警告
    const hasUseFormWarning = consoleMessages.some(msg => 
      msg.includes('useForm') && msg.includes('not connected')
    );
    
    if (hasUseFormWarning) {
      console.log('发现useForm警告');
    }
    
    // 检查控制台是否有上传失败错误
    const hasUploadError = consoleMessages.some(msg => 
      msg.includes('上传失败')
    );
    
    if (hasUploadError) {
      console.log('发现上传失败错误');
    }
  });

  test('检查Form组件与useForm的连接', async () => {
    await page.goto('http://localhost:3000/documents/upload');
    
    // 等待页面加载
    await page.waitForSelector('form', { timeout: 10000 });
    
    // 检查Form组件的属性
    const formElement = await page.locator('form').first();
    const formProps = await formElement.evaluate(el => {
      return {
        hasFormAttribute: el.hasAttribute('data-form-instance'),
        className: el.className,
        id: el.id
      };
    });
    
    console.log('Form元素属性:', formProps);
    
    // 检查是否有form实例绑定
    const hasFormInstance = await page.evaluate(() => {
      const formElements = document.querySelectorAll('form');
      return Array.from(formElements).some(form => {
        return form.hasAttribute('data-form-instance') || 
               form.classList.contains('ant-form');
      });
    });
    
    console.log('Form实例绑定状态:', hasFormInstance);
  });

  test('检查API调用和网络请求', async () => {
    // 监听网络请求
    const requests: any[] = [];
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        postData: request.postData()
      });
    });
    
    // 监听响应
    const responses: any[] = [];
    page.on('response', async response => {
      try {
        const responseBody = await response.text();
        responses.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
          body: responseBody
        });
      } catch (error) {
        console.error('获取响应体失败:', error);
      }
    });
    
    await page.goto('http://localhost:3000/documents/upload');
    
    // 模拟上传流程
    await page.waitForSelector('input[type="file"]', { timeout: 10000 });
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-document.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('test pdf content')
    });
    
    // 选择目录
    await page.click('.ant-tree-node-content-wrapper');
    
    // 填写表单
    await page.fill('input[placeholder="请输入文档标题"]', '测试文档');
    await page.fill('textarea[placeholder="请输入文档描述"]', '测试描述');
    
    // 提交表单
    await page.click('button:has-text("上传文档")');
    
    // 等待请求完成
    await page.waitForTimeout(5000);
    
    // 分析网络请求
    const uploadRequests = requests.filter(req => 
      req.url.includes('/documents/upload') && req.method === 'POST'
    );
    
    console.log('上传请求:', uploadRequests);
    
    const uploadResponses = responses.filter(res => 
      res.url.includes('/documents/upload')
    );
    
    console.log('上传响应:', uploadResponses);
    
    // 检查是否有API调用失败
    const failedRequests = responses.filter(res => res.status >= 400);
    if (failedRequests.length > 0) {
      console.log('失败的请求:', failedRequests);
    }
  });

  test('检查后端API是否可用', async () => {
    // 直接测试后端API
    const response = await page.request.get('http://localhost:5000/api/health');
    console.log('后端健康检查:', response.status(), await response.text());
    
    // 测试文档上传端点
    try {
      const uploadResponse = await page.request.post('http://localhost:5000/api/documents/upload', {
        multipart: {
          file: {
            name: 'test.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from('test content')
          },
          title: '测试文档',
          description: '测试描述',
          category_id: '1'
        }
      });
      
      console.log('上传API测试:', uploadResponse.status(), await uploadResponse.text());
    } catch (error) {
      console.error('上传API测试失败:', error);
    }
  });
});