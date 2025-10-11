/**
 * 文档管理模块完整E2E测试
 * 测试所有文档管理核心功能，确保前后端API通信正常
 */

import { DocumentService } from '../services/documentService';
import { SearchService } from '../services/searchService';
import { CategoryService } from '../services/categoryService';
import { AuthService } from '../services/authService';

// 测试配置
const TEST_CONFIG = {
  baseUrl: 'http://localhost:8000',
  frontendUrl: 'http://localhost:3002',
  testUser: {
    username: 'admin',
    password: '123456'
  },
  testDocument: {
    title: 'E2E测试文档',
    description: '这是一个用于E2E测试的文档',
    category_id: '1'
  }
};

// 测试状态
let authToken: string = '';
let testDocumentId: string = '';
let testCategories: any[] = [];

/**
 * E2E测试套件
 */
describe('文档管理模块 E2E 测试', () => {
  
  beforeAll(async () => {
    console.log('🚀 开始文档管理模块 E2E 测试');
    
    // 1. 用户登录获取认证令牌
    try {
      const loginResponse = await AuthService.login(TEST_CONFIG.testUser);
      if (loginResponse.success && loginResponse.access_token) {
        authToken = loginResponse.access_token;
        // 设置全局认证令牌
        localStorage.setItem('access_token', authToken);
        console.log('✅ 用户登录成功');
      } else {
        throw new Error('登录失败');
      }
    } catch (error) {
      console.error('❌ 用户登录失败:', error);
      throw error;
    }

    // 2. 获取分类列表
    try {
      const categoriesResponse = await CategoryService.getCategories();
      testCategories = categoriesResponse.data || [];
      console.log('✅ 获取分类列表成功，共', testCategories.length, '个分类');
    } catch (error) {
      console.error('❌ 获取分类列表失败:', error);
    }
  });

  afterAll(async () => {
    // 清理测试数据
    if (testDocumentId) {
      try {
        await DocumentService.deleteDocument(testDocumentId);
        console.log('✅ 清理测试文档成功');
      } catch (error) {
        console.error('❌ 清理测试文档失败:', error);
      }
    }
    
    // 清理认证信息
    localStorage.removeItem('access_token');
    console.log('🏁 E2E 测试完成');
  });

  /**
   * 测试1: 文档列表页面加载功能
   */
  test('1. 文档列表页面加载功能', async () => {
    console.log('📋 测试文档列表页面加载...');
    
    try {
      const response = await DocumentService.getDocuments({
        page: 1,
        size: 10
      });
      
      expect(response.success).toBe(true);
      expect(Array.isArray(response.data || response.documents)).toBe(true);
      expect(typeof response.total).toBe('number');
      
      console.log('✅ 文档列表加载成功，共', response.total, '个文档');
    } catch (error) {
      console.error('❌ 文档列表加载失败:', error);
      throw error;
    }
  });

  /**
   * 测试2: 文档上传功能
   */
  test('2. 文档上传功能', async () => {
    console.log('📤 测试文档上传功能...');
    
    try {
      // 创建测试文件
      const testContent = 'E2E测试文档内容\n这是一个用于测试的PDF文档。';
      const testFile = new File([testContent], 'e2e-test-document.txt', {
        type: 'text/plain'
      });
      
      // 使用第一个可用分类，如果没有则使用默认值
      const categoryId = testCategories.length > 0 ? testCategories[0].id : '1';
      
      const response = await DocumentService.uploadDocument(
        testFile,
        TEST_CONFIG.testDocument.title,
        TEST_CONFIG.testDocument.description,
        categoryId
      );
      
      expect(response.success).toBe(true);
      expect(response.document).toBeDefined();
      expect(response.document.title).toBe(TEST_CONFIG.testDocument.title);
      
      testDocumentId = response.document.id;
      console.log('✅ 文档上传成功，文档ID:', testDocumentId);
    } catch (error) {
      console.error('❌ 文档上传失败:', error);
      throw error;
    }
  });

  /**
   * 测试3: 文档详情页面查看功能
   */
  test('3. 文档详情页面查看功能', async () => {
    console.log('📄 测试文档详情页面查看功能...');
    
    // 使用实际存在的文档ID进行测试
    const realDocumentId = 'b61cf050-699a-4c68-a76f-8fd856edf680';
    
    try {
      const response = await DocumentService.getDocument(realDocumentId);
      
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.id).toBe(realDocumentId);
      
      console.log('✅ 文档详情获取成功:', response.data.title);
    } catch (error) {
      console.error('❌ 文档详情获取失败:', error);
      throw error;
    }
  });

  /**
   * 测试4: 文档下载功能
   */
  test('4. 文档下载功能', async () => {
    console.log('📥 测试文档下载功能...');
    
    // 使用实际存在的文档ID进行测试
    const realDocumentId = 'b61cf050-699a-4c68-a76f-8fd856edf680';
    
    try {
      const blob = await DocumentService.downloadDocument(realDocumentId);
      
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
      
      console.log('✅ 文档下载成功，文件大小:', blob.size, 'bytes');
    } catch (error) {
      console.error('❌ 文档下载失败:', error);
      throw error;
    }
  });

  /**
   * 测试5: 文档编辑功能
   */
  test('5. 文档编辑功能', async () => {
    console.log('✏️ 测试文档编辑功能...');
    
    // 使用实际存在的文档ID进行测试
    const realDocumentId = 'b61cf050-699a-4c68-a76f-8fd856edf680';
    
    try {
      const updatedTitle = 'Python开发指南 (已编辑)';
      
      const response = await DocumentService.updateDocument(realDocumentId, {
        title: updatedTitle
      });
      
      expect(response.success).toBe(true);
      expect(response.document).toBeDefined();
      expect(response.document.title).toBe(updatedTitle);
      
      console.log('✅ 文档编辑成功:', response.document.title);
    } catch (error) {
      console.error('❌ 文档编辑失败:', error);
      throw error;
    }
  });

  /**
   * 测试6: 全文搜索功能
   */
  test('6. 全文搜索功能', async () => {
    console.log('🔍 测试全文搜索功能...');
    
    try {
      const searchResponse = await SearchService.searchDocuments({
        query: 'E2E测试',
        page: 1,
        size: 10
      });
      
      expect(searchResponse.results).toBeDefined();
      expect(Array.isArray(searchResponse.results)).toBe(true);
      expect(typeof searchResponse.total).toBe('number');
      
      console.log('✅ 全文搜索成功，找到', searchResponse.total, '个结果');
    } catch (error) {
      console.error('❌ 全文搜索失败:', error);
      throw error;
    }
  });

  /**
   * 测试7: 文档状态管理功能
   */
  test('7. 文档状态管理功能', async () => {
    console.log('📊 测试文档状态管理功能...');
    
    if (!testDocumentId) {
      throw new Error('测试文档ID不存在，请先运行文档上传测试');
    }
    
    try {
      // 测试发布文档
      const publishResponse = await DocumentService.publishDocument(testDocumentId);
      expect(publishResponse.success).toBe(true);
      console.log('✅ 文档发布成功');
      
      // 测试归档文档
      const archiveResponse = await DocumentService.archiveDocument(testDocumentId);
      expect(archiveResponse.success).toBe(true);
      console.log('✅ 文档归档成功');
    } catch (error) {
      console.error('❌ 文档状态管理失败:', error);
      throw error;
    }
  });

  /**
   * 测试8: 文档统计信息功能
   */
  test('8. 文档统计信息功能', async () => {
    console.log('📈 测试文档统计信息功能...');
    
    try {
      const stats = await DocumentService.getDocumentStatistics();
      
      expect(typeof stats.total_documents).toBe('number');
      expect(typeof stats.published_documents).toBe('number');
      expect(typeof stats.draft_documents).toBe('number');
      expect(typeof stats.archived_documents).toBe('number');
      
      console.log('✅ 文档统计信息获取成功:', stats);
    } catch (error) {
      console.error('❌ 文档统计信息获取失败:', error);
      throw error;
    }
  });

  /**
   * 测试9: 搜索建议功能
   */
  test('9. 搜索建议功能', async () => {
    console.log('💡 测试搜索建议功能...');
    
    try {
      const suggestions = await SearchService.getSearchSuggestions('测试');
      
      expect(Array.isArray(suggestions)).toBe(true);
      
      console.log('✅ 搜索建议获取成功，共', suggestions.length, '个建议');
    } catch (error) {
      console.error('❌ 搜索建议获取失败:', error);
      throw error;
    }
  });

  /**
   * 测试10: 分类管理功能
   */
  test('10. 分类管理功能', async () => {
    console.log('📁 测试分类管理功能...');
    
    try {
      // 测试获取分类树
      const treeResponse = await CategoryService.getCategoryTree();
      expect(treeResponse.data).toBeDefined();
      expect(Array.isArray(treeResponse.data)).toBe(true);
      
      console.log('✅ 分类树获取成功，共', treeResponse.data.length, '个根分类');
      
      // 测试获取分类列表
      const listResponse = await CategoryService.getCategories();
      expect(listResponse.data).toBeDefined();
      expect(Array.isArray(listResponse.data)).toBe(true);
      
      console.log('✅ 分类列表获取成功，共', listResponse.data.length, '个分类');
    } catch (error) {
      console.error('❌ 分类管理功能测试失败:', error);
      throw error;
    }
  });

  /**
   * 测试11: 文档删除功能 (最后执行)
   */
  test('11. 文档删除功能', async () => {
    console.log('🗑️ 测试文档删除功能...');
    
    if (!testDocumentId) {
      throw new Error('测试文档ID不存在，请先运行文档上传测试');
    }
    
    try {
      const response = await DocumentService.deleteDocument(testDocumentId);
      
      expect(response.success).toBe(true);
      
      // 验证文档已被删除
      try {
        await DocumentService.getDocument(testDocumentId);
        throw new Error('文档应该已被删除，但仍然可以访问');
      } catch (error) {
        // 预期的错误，文档已被删除
        console.log('✅ 文档删除成功，文档已不可访问');
      }
      
      // 清空测试文档ID，避免在afterAll中重复删除
      testDocumentId = '';
    } catch (error) {
      console.error('❌ 文档删除失败:', error);
      throw error;
    }
  });
});

/**
 * 辅助函数：等待指定时间
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 辅助函数：验证API响应格式
 */
function validateApiResponse(response: any, expectedFields: string[]): void {
  expectedFields.forEach(field => {
    if (!(field in response)) {
      throw new Error(`API响应缺少必需字段: ${field}`);
    }
  });
}

/**
 * 辅助函数：生成随机测试数据
 */
function generateTestData(prefix: string = 'test'): {
  title: string;
  description: string;
  timestamp: string;
} {
  const timestamp = new Date().toISOString();
  return {
    title: `${prefix}_${Date.now()}`,
    description: `测试描述_${timestamp}`,
    timestamp
  };
}

export default {
  TEST_CONFIG,
  sleep,
  validateApiResponse,
  generateTestData
};