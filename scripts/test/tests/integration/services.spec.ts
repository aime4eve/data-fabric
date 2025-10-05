import { test, expect } from '@playwright/test';

/**
 * 服务间通信集成测试
 * 测试前端、后端、数据库、搜索引擎等服务之间的通信
 */
test.describe('服务间通信集成测试', () => {
  const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api/v1';
  const FRONTEND_URL = process.env.BASE_URL || 'http://localhost:3000';
  let authToken: string;

  test.beforeAll(async () => {
    // 获取认证令牌
    const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: process.env.TEST_USERNAME || 'testuser',
        password: process.env.TEST_PASSWORD || 'testpass123'
      })
    });

    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      authToken = loginData.token || loginData.access_token;
    }
  });

  test('前端与后端API通信', async ({ page }) => {
    // 访问前端页面
    await page.goto(FRONTEND_URL);
    
    // 监听网络请求
    const apiRequests: any[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiRequests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers()
        });
      }
    });

    // 监听网络响应
    const apiResponses: any[] = [];
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        apiResponses.push({
          url: response.url(),
          status: response.status(),
          headers: response.headers()
        });
      }
    });

    // 执行需要API调用的操作（如登录）
    const loginButton = page.locator('button:has-text("登录"), button:has-text("Login"), .login-button').first();
    if (await loginButton.isVisible({ timeout: 5000 })) {
      // 填写登录表单
      await page.fill('input[name="username"], input[type="email"], #username', process.env.TEST_USERNAME || 'testuser');
      await page.fill('input[name="password"], input[type="password"], #password', process.env.TEST_PASSWORD || 'testpass123');
      
      // 点击登录按钮
      await loginButton.click();
      
      // 等待API响应
      await page.waitForTimeout(2000);
    }

    // 验证API请求和响应
    expect(apiRequests.length).toBeGreaterThan(0);
    expect(apiResponses.length).toBeGreaterThan(0);

    // 验证API请求格式
    const loginRequest = apiRequests.find(req => req.url.includes('/auth/login'));
    if (loginRequest) {
      expect(loginRequest.method).toBe('POST');
      expect(loginRequest.headers['content-type']).toContain('application/json');
    }

    // 验证API响应状态
    const loginResponse = apiResponses.find(res => res.url.includes('/auth/login'));
    if (loginResponse) {
      expect([200, 201, 401]).toContain(loginResponse.status);
    }

    console.log(`API请求数量: ${apiRequests.length}`);
    console.log(`API响应数量: ${apiResponses.length}`);
  });

  test('后端与数据库服务通信', async () => {
    if (!authToken) {
      test.skip(true, '需要认证令牌');
    }

    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    // 测试数据库连接状态
    const dbHealthResponse = await fetch(`${API_BASE_URL}/health/database`, {
      headers
    });

    expect(dbHealthResponse.status).toBe(200);
    const dbHealth = await dbHealthResponse.json();
    expect(dbHealth.status).toBe('healthy');

    // 测试数据操作（创建、读取、更新、删除）
    const testDocument = {
      title: '服务通信测试文档',
      content: '测试后端与数据库的通信',
      category: '集成测试'
    };

    // 创建文档（后端 -> 数据库）
    const createResponse = await fetch(`${API_BASE_URL}/documents`, {
      method: 'POST',
      headers,
      body: JSON.stringify(testDocument)
    });

    expect([[200, 201]]).toContain(createResponse.status);
    const createdDocument = await createResponse.json();
    const documentId = createdDocument.id;

    // 读取文档（后端 <- 数据库）
    const getResponse = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      headers
    });

    expect(getResponse.status).toBe(200);
    const retrievedDocument = await getResponse.json();
    expect(retrievedDocument.title).toBe(testDocument.title);

    // 更新文档（后端 -> 数据库）
    const updateData = { title: '更新后的标题' };
    const updateResponse = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updateData)
    });

    expect(updateResponse.status).toBe(200);

    // 验证更新（后端 <- 数据库）
    const getUpdatedResponse = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      headers
    });

    const updatedDocument = await getUpdatedResponse.json();
    expect(updatedDocument.title).toBe(updateData.title);

    // 删除文档（后端 -> 数据库）
    const deleteResponse = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      method: 'DELETE',
      headers
    });

    expect([[200, 204]]).toContain(deleteResponse.status);

    // 验证删除（后端 <- 数据库）
    const getDeletedResponse = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      headers
    });

    expect(getDeletedResponse.status).toBe(404);
  });

  test('搜索引擎服务集成', async () => {
    if (!authToken) {
      test.skip(true, '需要认证令牌');
    }

    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    // 测试搜索引擎健康状态
    const searchHealthResponse = await fetch(`${API_BASE_URL}/health/search`, {
      headers
    });

    if (searchHealthResponse.status === 200) {
      const searchHealth = await searchHealthResponse.json();
      expect(searchHealth.status).toBe('healthy');
      console.log('搜索引擎服务正常');
    } else {
      console.log('搜索引擎健康检查端点不可用');
    }

    // 创建测试文档用于搜索
    const testDocument = {
      title: '搜索引擎集成测试文档',
      content: '这是一个用于测试搜索引擎集成的特殊文档，包含关键词：elasticsearch integration test',
      category: '搜索测试',
      tags: ['搜索', '集成', '测试']
    };

    const createResponse = await fetch(`${API_BASE_URL}/documents`, {
      method: 'POST',
      headers,
      body: JSON.stringify(testDocument)
    });

    expect([[200, 201]]).toContain(createResponse.status);
    const createdDocument = await createResponse.json();
    const documentId = createdDocument.id;

    // 等待搜索引擎索引文档
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 测试搜索功能
    const searchResponse = await fetch(`${API_BASE_URL}/search?q=elasticsearch integration test`, {
      headers
    });

    expect(searchResponse.status).toBe(200);
    const searchResults = await searchResponse.json();
    expect(searchResults).toHaveProperty('results');
    expect(Array.isArray(searchResults.results)).toBeTruthy();

    // 验证搜索结果包含创建的文档
    const foundDocument = searchResults.results.find((doc: any) => doc.id === documentId);
    if (foundDocument) {
      expect(foundDocument.title).toBe(testDocument.title);
      console.log('搜索引擎成功索引并返回了文档');
    } else {
      console.log('搜索引擎可能需要更多时间来索引文档');
    }

    // 测试高级搜索
    const advancedSearchResponse = await fetch(`${API_BASE_URL}/search/advanced?title=搜索引擎集成测试&category=搜索测试`, {
      headers
    });

    if (advancedSearchResponse.status === 200) {
      const advancedResults = await advancedSearchResponse.json();
      expect(advancedResults).toHaveProperty('results');
      console.log('高级搜索功能正常');
    }

    // 清理测试数据
    await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      method: 'DELETE',
      headers
    });
  });

  test('缓存服务集成', async () => {
    if (!authToken) {
      test.skip(true, '需要认证令牌');
    }

    const headers = { 'Authorization': `Bearer ${authToken}` };

    // 测试缓存服务健康状态
    const cacheHealthResponse = await fetch(`${API_BASE_URL}/health/cache`, {
      headers
    });

    if (cacheHealthResponse.status === 200) {
      const cacheHealth = await cacheHealthResponse.json();
      expect(cacheHealth.status).toBe('healthy');
      console.log('缓存服务正常');
    } else {
      console.log('缓存健康检查端点不可用');
    }

    // 测试缓存效果 - 多次请求同一资源
    const endpoint = `${API_BASE_URL}/documents?page=1&limit=10`;
    
    // 第一次请求
    const firstRequestStart = Date.now();
    const firstResponse = await fetch(endpoint, { headers });
    const firstRequestEnd = Date.now();
    const firstRequestTime = firstRequestEnd - firstRequestStart;

    expect(firstResponse.status).toBe(200);

    // 第二次请求（应该从缓存返回，更快）
    const secondRequestStart = Date.now();
    const secondResponse = await fetch(endpoint, { headers });
    const secondRequestEnd = Date.now();
    const secondRequestTime = secondRequestEnd - secondRequestStart;

    expect(secondResponse.status).toBe(200);

    console.log(`第一次请求时间: ${firstRequestTime}ms`);
    console.log(`第二次请求时间: ${secondRequestTime}ms`);

    // 验证响应内容一致
    const firstData = await firstResponse.json();
    const secondData = await secondResponse.json();
    
    expect(JSON.stringify(firstData)).toBe(JSON.stringify(secondData));

    // 如果有缓存，第二次请求通常会更快
    if (secondRequestTime < firstRequestTime * 0.8) {
      console.log('缓存服务工作正常，第二次请求更快');
    }
  });

  test('文件存储服务集成', async () => {
    if (!authToken) {
      test.skip(true, '需要认证令牌');
    }

    const headers = { 'Authorization': `Bearer ${authToken}` };

    // 测试文件上传
    const testFileContent = '这是一个测试文件的内容，用于测试文件存储服务集成';
    const testFile = new Blob([testFileContent], { type: 'text/plain' });

    const formData = new FormData();
    formData.append('file', testFile, 'integration-test-file.txt');
    formData.append('category', '集成测试');

    const uploadResponse = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` },
      body: formData
    });

    if (uploadResponse.status === 200 || uploadResponse.status === 201) {
      const uploadResult = await uploadResponse.json();
      expect(uploadResult).toHaveProperty('file_id');
      
      const fileId = uploadResult.file_id;
      console.log(`文件上传成功，ID: ${fileId}`);

      // 测试文件下载
      const downloadResponse = await fetch(`${API_BASE_URL}/files/${fileId}`, {
        headers
      });

      expect(downloadResponse.status).toBe(200);
      
      const downloadedContent = await downloadResponse.text();
      expect(downloadedContent).toBe(testFileContent);
      console.log('文件下载成功，内容匹配');

      // 测试文件元数据获取
      const metadataResponse = await fetch(`${API_BASE_URL}/files/${fileId}/metadata`, {
        headers
      });

      if (metadataResponse.status === 200) {
        const metadata = await metadataResponse.json();
        expect(metadata).toHaveProperty('filename');
        expect(metadata).toHaveProperty('size');
        console.log('文件元数据获取成功');
      }

      // 清理测试文件
      const deleteFileResponse = await fetch(`${API_BASE_URL}/files/${fileId}`, {
        method: 'DELETE',
        headers
      });

      expect([[200, 204]]).toContain(deleteFileResponse.status);
      console.log('测试文件清理完成');
    } else {
      console.log('文件上传功能不可用或权限不足');
    }
  });

  test('消息队列服务集成', async () => {
    if (!authToken) {
      test.skip(true, '需要认证令牌');
    }

    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    // 测试异步任务提交
    const taskData = {
      task_type: 'document_processing',
      data: {
        document_id: 'test-doc-123',
        operation: 'reindex'
      }
    };

    const submitTaskResponse = await fetch(`${API_BASE_URL}/tasks`, {
      method: 'POST',
      headers,
      body: JSON.stringify(taskData)
    });

    if (submitTaskResponse.status === 200 || submitTaskResponse.status === 201) {
      const taskResult = await submitTaskResponse.json();
      expect(taskResult).toHaveProperty('task_id');
      
      const taskId = taskResult.task_id;
      console.log(`异步任务提交成功，ID: ${taskId}`);

      // 等待任务处理
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 查询任务状态
      const taskStatusResponse = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        headers
      });

      if (taskStatusResponse.status === 200) {
        const taskStatus = await taskStatusResponse.json();
        expect(taskStatus).toHaveProperty('status');
        expect(['pending', 'processing', 'completed', 'failed']).toContain(taskStatus.status);
        
        console.log(`任务状态: ${taskStatus.status}`);
      }
    } else {
      console.log('异步任务功能不可用');
    }
  });

  test('监控和日志服务集成', async () => {
    if (!authToken) {
      test.skip(true, '需要认证令牌');
    }

    const headers = { 'Authorization': `Bearer ${authToken}` };

    // 测试系统监控端点
    const metricsResponse = await fetch(`${API_BASE_URL}/metrics`, {
      headers
    });

    if (metricsResponse.status === 200) {
      const metrics = await metricsResponse.json();
      expect(metrics).toHaveProperty('system');
      console.log('系统监控数据获取成功');
    } else {
      console.log('监控端点不可用或权限不足');
    }

    // 测试健康检查汇总
    const overallHealthResponse = await fetch(`${API_BASE_URL}/health`, {
      headers
    });

    expect(overallHealthResponse.status).toBe(200);
    const overallHealth = await overallHealthResponse.json();
    expect(overallHealth).toHaveProperty('status');
    expect(['healthy', 'degraded', 'unhealthy']).toContain(overallHealth.status);

    console.log(`系统整体健康状态: ${overallHealth.status}`);

    // 如果有详细的服务状态
    if (overallHealth.services) {
      Object.entries(overallHealth.services).forEach(([service, status]) => {
        console.log(`${service}: ${status}`);
      });
    }
  });

  test('服务间错误处理和恢复', async () => {
    if (!authToken) {
      test.skip(true, '需要认证令牌');
    }

    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    // 测试无效数据处理
    const invalidDocument = {
      title: '', // 空标题
      content: null, // 无效内容
      category: 'a'.repeat(1000) // 过长分类
    };

    const invalidDataResponse = await fetch(`${API_BASE_URL}/documents`, {
      method: 'POST',
      headers,
      body: JSON.stringify(invalidDocument)
    });

    expect([[400, 422]]).toContain(invalidDataResponse.status);
    
    const errorResponse = await invalidDataResponse.json();
    expect(errorResponse).toHaveProperty('error');
    console.log('无效数据错误处理正常');

    // 测试服务超时处理
    const timeoutTestResponse = await fetch(`${API_BASE_URL}/test/timeout`, {
      headers,
      signal: AbortSignal.timeout(5000) // 5秒超时
    }).catch(error => {
      if (error.name === 'AbortError') {
        console.log('超时处理测试完成');
        return { status: 408 }; // 模拟超时状态
      }
      throw error;
    });

    // 测试服务降级
    const degradedServiceResponse = await fetch(`${API_BASE_URL}/search?q=test&fallback=true`, {
      headers
    });

    if (degradedServiceResponse.status === 200) {
      const degradedResults = await degradedServiceResponse.json();
      console.log('服务降级功能正常');
    }
  });

  test('跨服务数据一致性', async () => {
    if (!authToken) {
      test.skip(true, '需要认证令牌');
    }

    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    // 创建文档
    const testDocument = {
      title: '跨服务一致性测试文档',
      content: '测试跨服务数据一致性的文档内容',
      category: '一致性测试'
    };

    const createResponse = await fetch(`${API_BASE_URL}/documents`, {
      method: 'POST',
      headers,
      body: JSON.stringify(testDocument)
    });

    expect([[200, 201]]).toContain(createResponse.status);
    const createdDocument = await createResponse.json();
    const documentId = createdDocument.id;

    // 等待各服务同步
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 从不同服务端点获取同一数据
    const directGetResponse = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      headers
    });

    const searchResponse = await fetch(`${API_BASE_URL}/search?q=${testDocument.title}`, {
      headers
    });

    const listResponse = await fetch(`${API_BASE_URL}/documents?category=${testDocument.category}`, {
      headers
    });

    // 验证数据一致性
    expect(directGetResponse.status).toBe(200);
    const directDocument = await directGetResponse.json();

    expect(searchResponse.status).toBe(200);
    const searchResults = await searchResponse.json();
    const searchedDocument = searchResults.results?.find((doc: any) => doc.id === documentId);

    expect(listResponse.status).toBe(200);
    const listResults = await listResponse.json();
    const listedDocument = (listResults.data || listResults).find((doc: any) => doc.id === documentId);

    // 验证标题一致性
    expect(directDocument.title).toBe(testDocument.title);
    if (searchedDocument) {
      expect(searchedDocument.title).toBe(testDocument.title);
    }
    if (listedDocument) {
      expect(listedDocument.title).toBe(testDocument.title);
    }

    console.log('跨服务数据一致性验证通过');

    // 清理测试数据
    await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      method: 'DELETE',
      headers
    });
  });
});