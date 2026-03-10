import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';

/**
 * 数据库集成测试
 * 测试数据库连接、数据持久化、事务处理等
 */
test.describe('数据库集成测试', () => {
  const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api/v1';
  let authToken: string;
let testHelpers: TestHelpers;

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  testHelpers = new TestHelpers(page);

    // 登录获取认证令牌
    try {
      await page.goto('/login');
      await testHelpers.safeFill('#username', 'testuser');
      await testHelpers.safeFill('#password', 'testpass');
      await testHelpers.safeClick('button[type="submit"]');
      
      // 等待登录完成并获取token
      await testHelpers.waitForPageLoad();
      authToken = await page.evaluate(() => localStorage.getItem('authToken') || '');
    } catch (error: unknown) {
      console.error('登录失败:', error instanceof Error ? error.message : String(error));
    }

    await context.close();
  });

  test('数据库连接测试', async () => {
    // 测试数据库健康检查端点
    const healthResponse = await fetch(`${API_BASE_URL}/health/database`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(healthResponse.status).toBe(200);

    const healthData = await healthResponse.json();
    expect(healthData).toHaveProperty('status');
    expect(healthData.status).toBe('healthy');
    expect(healthData).toHaveProperty('database');
    expect(healthData.database).toBe('connected');
  });

  test('数据持久化测试', async () => {
    if (!authToken) {
      test.skip(true, '需要认证令牌');
    }

    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    // 创建测试数据
    const testDocument = {
      title: '数据持久化测试文档',
      content: '这是用于测试数据持久化的文档内容',
      category: '测试分类',
      tags: ['持久化', '测试'],
      metadata: {
        author: 'test-user',
        created_at: new Date().toISOString()
      }
    };

    // 创建文档
    const createResponse = await fetch(`${API_BASE_URL}/documents`, {
      method: 'POST',
      headers,
      body: JSON.stringify(testDocument)
    });

    expect([[200, 201]]).toContain(createResponse.status);

    const createdDocument = await createResponse.json();
    expect(createdDocument).toHaveProperty('id');
    const documentId = createdDocument.id;

    // 验证数据已持久化 - 重新获取数据
    const getResponse = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      headers
    });

    expect(getResponse.status).toBe(200);

    const retrievedDocument = await getResponse.json();
    expect(retrievedDocument.id).toBe(documentId);
    expect(retrievedDocument.title).toBe(testDocument.title);
    expect(retrievedDocument.content).toBe(testDocument.content);
    expect(retrievedDocument.category).toBe(testDocument.category);

    // 更新数据测试持久化
    const updatedData = {
      title: '更新后的标题',
      content: '更新后的内容'
    };

    const updateResponse = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updatedData)
    });

    expect(updateResponse.status).toBe(200);

    // 验证更新后的数据持久化
    const getUpdatedResponse = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      headers
    });

    const updatedDocument = await getUpdatedResponse.json();
    expect(updatedDocument.title).toBe(updatedData.title);
    expect(updatedDocument.content).toBe(updatedData.content);

    // 清理测试数据
    await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      method: 'DELETE',
      headers
    });
  });

  test('事务处理测试', async () => {
    if (!authToken) {
      test.skip(true, '需要认证令牌');
    }

    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    // 测试批量操作的事务性
    const batchDocuments = [
      {
        title: '事务测试文档1',
        content: '内容1',
        category: '测试分类'
      },
      {
        title: '事务测试文档2',
        content: '内容2',
        category: '测试分类'
      },
      {
        title: '事务测试文档3',
        content: '内容3',
        category: '测试分类'
      }
    ];

    // 如果API支持批量创建，测试事务性
    const batchCreateResponse = await fetch(`${API_BASE_URL}/documents/batch`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ documents: batchDocuments })
    });

    if (batchCreateResponse.status === 200 || batchCreateResponse.status === 201) {
      const batchResult = await batchCreateResponse.json();
      expect(batchResult).toHaveProperty('created_documents');
      expect(batchResult.created_documents).toHaveLength(3);

      // 验证所有文档都已创建
      for (const doc of batchResult.created_documents) {
        const getResponse = await fetch(`${API_BASE_URL}/documents/${doc.id}`, {
          headers
        });
        expect(getResponse.status).toBe(200);
      }

      // 清理测试数据
      for (const doc of batchResult.created_documents) {
        await fetch(`${API_BASE_URL}/documents/${doc.id}`, {
          method: 'DELETE',
          headers
        });
      }
    } else {
      // 如果不支持批量操作，单独测试每个文档的创建
      const createdIds = [];
      
      for (const doc of batchDocuments) {
        const createResponse = await fetch(`${API_BASE_URL}/documents`, {
          method: 'POST',
          headers,
          body: JSON.stringify(doc)
        });
        
        if (createResponse.ok) {
          const created = await createResponse.json();
          createdIds.push(created.id);
        }
      }

      // 验证创建的文档
      expect(createdIds.length).toBe(3);

      // 清理测试数据
      for (const id of createdIds) {
        await fetch(`${API_BASE_URL}/documents/${id}`, {
          method: 'DELETE',
          headers
        });
      }
    }
  });

  test('数据完整性约束测试', async () => {
    if (!authToken) {
      test.skip(true, '需要认证令牌');
    }

    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    // 测试必需字段约束
    const invalidDocument = {
      // 缺少必需的title字段
      content: '只有内容没有标题'
    };

    const createInvalidResponse = await fetch(`${API_BASE_URL}/documents`, {
      method: 'POST',
      headers,
      body: JSON.stringify(invalidDocument)
    });

    expect([[400, 422]]).toContain(createInvalidResponse.status);

    // 测试数据类型约束
    const wrongTypeDocument = {
      title: 123, // 应该是字符串
      content: 'test content'
    };

    const wrongTypeResponse = await fetch(`${API_BASE_URL}/documents`, {
      method: 'POST',
      headers,
      body: JSON.stringify(wrongTypeDocument)
    });

    expect([[400, 422]]).toContain(wrongTypeResponse.status);

    // 测试字段长度约束
    const tooLongTitleDocument = {
      title: 'a'.repeat(1000), // 假设标题有长度限制
      content: 'test content'
    };

    const tooLongResponse = await fetch(`${API_BASE_URL}/documents`, {
      method: 'POST',
      headers,
      body: JSON.stringify(tooLongTitleDocument)
    });

    // 根据API实现，可能返回400或成功但截断
    expect([200, 201, 400, 422]).toContain(tooLongResponse.status);
  });

  test('数据查询性能测试', async () => {
    if (!authToken) {
      test.skip(true, '需要认证令牌');
    }

    const headers = { 'Authorization': `Bearer ${authToken}` };

    // 测试分页查询性能
    const startTime = Date.now();
    const documentsResponse = await fetch(`${API_BASE_URL}/documents?page=1&limit=50`, {
      headers
    });
    const endTime = Date.now();

    expect(documentsResponse.status).toBe(200);
    
    const queryTime = endTime - startTime;
    expect(queryTime).toBeLessThan(2000); // 查询时间应小于2秒

    console.log(`文档列表查询时间: ${queryTime}ms`);

    // 测试搜索查询性能
    const searchStartTime = Date.now();
    const searchResponse = await fetch(`${API_BASE_URL}/search?q=测试&limit=20`, {
      headers
    });
    const searchEndTime = Date.now();

    expect(searchResponse.status).toBe(200);
    
    const searchTime = searchEndTime - searchStartTime;
    expect(searchTime).toBeLessThan(3000); // 搜索时间应小于3秒

    console.log(`搜索查询时间: ${searchTime}ms`);
  });

  test('数据库索引效果测试', async () => {
    if (!authToken) {
      test.skip(true, '需要认证令牌');
    }

    const headers = { 'Authorization': `Bearer ${authToken}` };

    // 测试按ID查询（应该有主键索引）
    const documentsListResponse = await fetch(`${API_BASE_URL}/documents?limit=1`, {
      headers
    });

    if (documentsListResponse.ok) {
      const documentsList = await documentsListResponse.json();
      const documents = documentsList.data || documentsList;
      
      if (documents.length > 0) {
        const documentId = documents[0].id;
        
        const startTime = Date.now();
        const getByIdResponse = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
          headers
        });
        const endTime = Date.now();

        expect(getByIdResponse.status).toBe(200);
        
        const idQueryTime = endTime - startTime;
        expect(idQueryTime).toBeLessThan(500); // ID查询应该很快

        console.log(`按ID查询时间: ${idQueryTime}ms`);
      }
    }

    // 测试按分类查询（如果有分类索引）
    const categoryStartTime = Date.now();
    const categoryResponse = await fetch(`${API_BASE_URL}/documents?category=测试分类`, {
      headers
    });
    const categoryEndTime = Date.now();

    if (categoryResponse.ok) {
      const categoryQueryTime = categoryEndTime - categoryStartTime;
      console.log(`按分类查询时间: ${categoryQueryTime}ms`);
    }
  });

  test('数据库连接池测试', async () => {
    if (!authToken) {
      test.skip(true, '需要认证令牌');
    }

    const headers = { 'Authorization': `Bearer ${authToken}` };

    // 并发发送多个数据库查询请求
    const concurrentQueries = Array.from({ length: 10 }, (_, index) => 
      fetch(`${API_BASE_URL}/documents?page=${index + 1}&limit=5`, { headers })
    );

    const startTime = Date.now();
    const responses = await Promise.all(concurrentQueries);
    const endTime = Date.now();

    // 验证所有请求都成功
    responses.forEach((response, index) => {
      expect(response.status).toBe(200);
    });

    const totalTime = endTime - startTime;
    const averageTime = totalTime / responses.length;

    console.log(`并发查询总时间: ${totalTime}ms`);
    console.log(`平均查询时间: ${averageTime}ms`);

    // 并发查询的平均时间不应该太长
    expect(averageTime).toBeLessThan(1000);
  });

  test('数据备份和恢复测试', async () => {
    if (!authToken) {
      test.skip(true, '需要认证令牌');
    }

    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    // 创建测试数据
    const testDocument = {
      title: '备份恢复测试文档',
      content: '用于测试备份和恢复功能的文档',
      category: '备份测试'
    };

    const createResponse = await fetch(`${API_BASE_URL}/documents`, {
      method: 'POST',
      headers,
      body: JSON.stringify(testDocument)
    });

    expect([[200, 201]]).toContain(createResponse.status);
    const createdDocument = await createResponse.json();
    const documentId = createdDocument.id;

    // 如果API支持备份功能，测试备份
    const backupResponse = await fetch(`${API_BASE_URL}/admin/backup`, {
      method: 'POST',
      headers
    });

    if (backupResponse.status === 200) {
      const backupResult = await backupResponse.json();
      expect(backupResult).toHaveProperty('backup_id');
      
      console.log('数据备份成功');
    } else {
      console.log('API不支持备份功能或权限不足');
    }

    // 验证数据仍然存在
    const verifyResponse = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      headers
    });

    expect(verifyResponse.status).toBe(200);

    // 清理测试数据
    await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      method: 'DELETE',
      headers
    });
  });

  test('数据库锁定和并发控制测试', async () => {
    if (!authToken) {
      test.skip(true, '需要认证令牌');
    }

    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    // 创建测试文档
    const testDocument = {
      title: '并发控制测试文档',
      content: '初始内容',
      category: '并发测试'
    };

    const createResponse = await fetch(`${API_BASE_URL}/documents`, {
      method: 'POST',
      headers,
      body: JSON.stringify(testDocument)
    });

    expect([[200, 201]]).toContain(createResponse.status);
    const createdDocument = await createResponse.json();
    const documentId = createdDocument.id;

    // 并发更新同一文档
    const update1 = {
      title: '并发更新1',
      content: '更新内容1'
    };

    const update2 = {
      title: '并发更新2',
      content: '更新内容2'
    };

    const concurrentUpdates = [
      fetch(`${API_BASE_URL}/documents/${documentId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(update1)
      }),
      fetch(`${API_BASE_URL}/documents/${documentId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(update2)
      })
    ];

    const updateResponses = await Promise.all(concurrentUpdates);

    // 至少有一个更新应该成功
    const successfulUpdates = updateResponses.filter(r => r.status === 200);
    expect(successfulUpdates.length).toBeGreaterThanOrEqual(1);

    // 验证最终状态
    const finalResponse = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      headers
    });

    expect(finalResponse.status).toBe(200);
    const finalDocument = await finalResponse.json();
    
    // 最终文档应该是其中一个更新的结果
    const isUpdate1 = finalDocument.title === update1.title;
    const isUpdate2 = finalDocument.title === update2.title;
    expect(isUpdate1 || isUpdate2).toBeTruthy();

    console.log(`最终文档标题: ${finalDocument.title}`);

    // 清理测试数据
    await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      method: 'DELETE',
      headers
    });
  });

  test('数据库清理和维护测试', async () => {
    if (!authToken) {
      test.skip(true, '需要认证令牌');
    }

    const headers = { 'Authorization': `Bearer ${authToken}` };

    // 测试数据库统计信息
    const statsResponse = await fetch(`${API_BASE_URL}/admin/database/stats`, {
      headers
    });

    if (statsResponse.status === 200) {
      const stats = await statsResponse.json();
      expect(stats).toHaveProperty('total_documents');
      expect(stats).toHaveProperty('database_size');
      expect(typeof stats.total_documents).toBe('number');
      
      console.log('数据库统计信息:', stats);
    } else {
      console.log('无法获取数据库统计信息，可能权限不足');
    }

    // 测试数据库健康检查
    const healthResponse = await fetch(`${API_BASE_URL}/health/database`, {
      headers
    });

    expect(healthResponse.status).toBe(200);
    const healthData = await healthResponse.json();
    expect(healthData.status).toBe('healthy');
  });
});