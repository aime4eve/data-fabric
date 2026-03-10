import { test, expect } from '@playwright/test';
import { ApiTestHelpers } from '../utils/test-helpers';

/**
 * API集成测试
 * 测试前端与后端API的集成，包括认证、数据交互等
 */
test.describe('API集成测试', () => {
  let apiHelpers: ApiTestHelpers;
  let authToken: string;

  test.beforeAll(async () => {
    apiHelpers = new ApiTestHelpers();
    
    // 获取认证令牌
    const loginResponse = await apiHelpers.post('/auth/login', {
      username: process.env.TEST_USERNAME || 'testuser',
      password: process.env.TEST_PASSWORD || 'testpass123'
    });
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      authToken = loginData.token || loginData.access_token;
    }
  });

  test('用户认证API集成', async () => {
    // 测试登录API
    const loginResponse = await apiHelpers.post('/auth/login', {
      username: process.env.TEST_USERNAME || 'testuser',
      password: process.env.TEST_PASSWORD || 'testpass123'
    });

    expect(loginResponse.status).toBe(200);
    
    const loginData = await loginResponse.json();
    expect(loginData).toHaveProperty('token');
    expect(loginData.token).toBeTruthy();

    // 测试令牌验证
    const verifyResponse = await apiHelpers.get('/auth/verify', {
      'Authorization': `Bearer ${loginData.token}`
    });

    expect(verifyResponse.status).toBe(200);
    
    const verifyData = await verifyResponse.json();
    expect(verifyData).toHaveProperty('user');
    expect(verifyData.user).toHaveProperty('username');
  });

  test('文档管理API集成', async () => {
    if (!authToken) {
      test.skip(true, '需要认证令牌');
      return;
    }

    const headers = { 'Authorization': `Bearer ${authToken}` };

    // 测试获取文档列表
    const documentsResponse = await apiHelpers.get('/documents', headers);
    expect(documentsResponse.status).toBe(200);

    const documents = await documentsResponse.json();
    expect(Array.isArray(documents.data || documents)).toBeTruthy();

    // 测试创建文档
    const newDocument = {
      title: '测试文档标题',
      content: '这是一个测试文档的内容',
      category: '测试分类',
      tags: ['测试', '集成测试']
    };

    const createResponse = await apiHelpers.post('/documents', newDocument, headers);
    expect(createResponse.status).toBe(201);

    const createdDoc = await createResponse.json();
    expect(createdDoc).toHaveProperty('id');
    expect(createdDoc.title).toBe(newDocument.title);

    // 测试获取单个文档
    const getDocResponse = await apiHelpers.get(`/documents/${createdDoc.id}`, headers);
    expect(getDocResponse.status).toBe(200);

    const retrievedDoc = await getDocResponse.json();
    expect(retrievedDoc.id).toBe(createdDoc.id);
    expect(retrievedDoc.title).toBe(newDocument.title);

    // 测试更新文档
    const updatedData = {
      title: '更新后的文档标题',
      content: '更新后的文档内容'
    };

    const updateResponse = await apiHelpers.put(`/documents/${createdDoc.id}`, updatedData, headers);
    expect(updateResponse.status).toBe(200);

    const updatedDoc = await updateResponse.json();
    expect(updatedDoc.title).toBe(updatedData.title);

    // 测试删除文档
    const deleteResponse = await apiHelpers.delete(`/documents/${createdDoc.id}`, headers);
    expect(deleteResponse.status).toBe(204);

    // 验证文档已删除
    const getDeletedResponse = await apiHelpers.get(`/documents/${createdDoc.id}`, headers);
    expect(getDeletedResponse.status).toBe(404);
  });

  test('搜索API集成', async () => {
    if (!authToken) {
      test.skip(true, '需要认证令牌');
      return;
    }

    const headers = { 'Authorization': `Bearer ${authToken}` };

    // 测试基本搜索
    const searchResponse = await apiHelpers.get('/search?q=测试', headers);
    expect(searchResponse.status).toBe(200);

    const searchResults = await searchResponse.json();
    expect(searchResults).toHaveProperty('results');
    expect(Array.isArray(searchResults.results)).toBeTruthy();

    // 测试高级搜索
    const advancedSearchData = {
      query: '测试',
      category: '测试分类',
      tags: ['测试'],
      dateRange: {
        start: '2024-01-01',
        end: '2024-12-31'
      }
    };

    const advancedSearchResponse = await apiHelpers.post('/search/advanced', advancedSearchData, headers);
    expect(advancedSearchResponse.status).toBe(200);

    const advancedResults = await advancedSearchResponse.json();
    expect(advancedResults).toHaveProperty('results');
    expect(advancedResults).toHaveProperty('total');
    expect(advancedResults).toHaveProperty('page');
  });

  test('用户管理API集成', async () => {
    if (!authToken) {
      test.skip(true, '需要认证令牌');
      return;
    }

    const headers = { 'Authorization': `Bearer ${authToken}` };

    // 测试获取用户信息
    const userResponse = await apiHelpers.get('/user/profile', headers);
    expect(userResponse.status).toBe(200);

    const userProfile = await userResponse.json();
    expect(userProfile).toHaveProperty('username');
    expect(userProfile).toHaveProperty('email');

    // 测试更新用户信息
    const updateData = {
      displayName: '测试用户',
      bio: '这是一个测试用户的简介'
    };

    const updateUserResponse = await apiHelpers.put('/user/profile', updateData, headers);
    expect(updateUserResponse.status).toBe(200);

    const updatedProfile = await updateUserResponse.json();
    expect(updatedProfile.displayName).toBe(updateData.displayName);
  });

  test('文件上传API集成', async () => {
    if (!authToken) {
      test.skip(true, '需要认证令牌');
      return;
    }

    const headers = { 'Authorization': `Bearer ${authToken}` };

    // 创建测试文件数据
    const testFileContent = 'This is a test file content';
    const blob = new Blob([testFileContent], { type: 'text/plain' });
    const formData = new FormData();
    formData.append('file', blob, 'test.txt');

    // 测试文件上传
    const uploadResponse = await fetch(`${apiHelpers['baseUrl']}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': headers['Authorization']
      },
      body: formData
    });

    expect(uploadResponse.status).toBe(200);

    const uploadResult = await uploadResponse.json();
    expect(uploadResult).toHaveProperty('fileId');
    expect(uploadResult).toHaveProperty('url');

    // 测试文件下载
    const downloadResponse = await apiHelpers.get(`/files/${uploadResult.fileId}`, headers);
    expect(downloadResponse.status).toBe(200);
  });

  test('权限验证API集成', async () => {
    // 测试未授权访问
    const unauthorizedResponse = await apiHelpers.get('/documents');
    expect(unauthorizedResponse.status).toBe(401);

    // 测试无效令牌
    const invalidTokenResponse = await apiHelpers.get('/documents', {
      'Authorization': 'Bearer invalid-token'
    });
    expect(invalidTokenResponse.status).toBe(401);

    // 测试过期令牌（如果有的话）
    if (authToken) {
      const headers = { 'Authorization': `Bearer ${authToken}` };
      
      // 测试有效令牌访问
      const validResponse = await apiHelpers.get('/documents', headers);
      expect([200, 404]).toContain(validResponse.status); // 200 if documents exist, 404 if none
    }
  });

  test('错误处理API集成', async () => {
    if (!authToken) {
      test.skip(true, '需要认证令牌');
      return;
    }

    const headers = { 'Authorization': `Bearer ${authToken}` };

    // 测试404错误
    const notFoundResponse = await apiHelpers.get('/documents/non-existent-id', headers);
    expect(notFoundResponse.status).toBe(404);

    // 测试400错误（无效数据）
    const invalidDataResponse = await apiHelpers.post('/documents', {
      // 缺少必需字段
      content: '只有内容没有标题'
    }, headers);
    expect(invalidDataResponse.status).toBe(400);

    const errorData = await invalidDataResponse.json();
    expect(errorData).toHaveProperty('error');
  });

  test('分页API集成', async () => {
    if (!authToken) {
      test.skip(true, '需要认证令牌');
      return;
    }

    const headers = { 'Authorization': `Bearer ${authToken}` };

    // 测试分页参数
    const paginatedResponse = await apiHelpers.get('/documents?page=1&limit=10', headers);
    expect(paginatedResponse.status).toBe(200);

    const paginatedData = await paginatedResponse.json();
    expect(paginatedData).toHaveProperty('data');
    expect(paginatedData).toHaveProperty('pagination');
    
    if (paginatedData.pagination) {
      expect(paginatedData.pagination).toHaveProperty('page');
      expect(paginatedData.pagination).toHaveProperty('limit');
      expect(paginatedData.pagination).toHaveProperty('total');
    }
  });

  test('批量操作API集成', async () => {
    if (!authToken) {
      test.skip(true, '需要认证令牌');
      return;
    }

    const headers = { 'Authorization': `Bearer ${authToken}` };

    // 创建多个测试文档
    const documents = [
      { title: '批量测试文档1', content: '内容1', category: '测试' },
      { title: '批量测试文档2', content: '内容2', category: '测试' },
      { title: '批量测试文档3', content: '内容3', category: '测试' }
    ];

    const createdIds: string[] = [];

    // 批量创建
    for (const doc of documents) {
      const createResponse = await apiHelpers.post('/documents', doc, headers);
      if (createResponse.status === 201) {
        const created = await createResponse.json();
        createdIds.push(created.id);
      }
    }

    // 测试批量删除
    if (createdIds.length > 0) {
      const batchDeleteResponse = await apiHelpers.post('/documents/batch-delete', {
        ids: createdIds
      }, headers);
      
      // 批量删除可能返回200或204
      expect([200, 204]).toContain(batchDeleteResponse.status);
    }
  });

  test('API性能测试', async () => {
    if (!authToken) {
      test.skip(true, '需要认证令牌');
      return;
    }

    const headers = { 'Authorization': `Bearer ${authToken}` };

    // 测试响应时间
    const startTime = Date.now();
    const response = await apiHelpers.get('/documents', headers);
    const endTime = Date.now();
    
    const responseTime = endTime - startTime;
    
    expect(response.status).toBe(200);
    expect(responseTime).toBeLessThan(5000); // 响应时间应小于5秒

    // 测试并发请求
    const concurrentRequests = Array(5).fill(null).map(() => 
      apiHelpers.get('/documents', headers)
    );

    const concurrentResponses = await Promise.all(concurrentRequests);
    
    concurrentResponses.forEach(response => {
      expect(response.status).toBe(200);
    });
  });
});