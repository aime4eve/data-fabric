/**
 * Elasticsearch 搜索服务
 */
import api from '../utils/api';

export interface SearchRequest {
  query: string;
  page?: number;
  size?: number;
  category?: string;
  subcategory?: string;
  file_extension?: string;
  sort_by?: 'relevance' | 'created_at' | 'updated_at' | 'file_size';
  sort_order?: 'asc' | 'desc';
}

export interface SearchHighlight {
  title?: string[];
  content?: string[];
  description?: string[];
}

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  category: string;
  subcategory?: string;
  file_path: string;
  file_name: string;
  file_extension: string;
  file_size: number;
  created_at: string;
  updated_at: string;
  content_hash: string;
  tags: string[];
  description?: string;
  score: number;
  highlight?: SearchHighlight;
}

export interface SearchResponseData {
  results: SearchResult[];
  total: number;
  page: number;
  size: number;
  total_pages: number;
  took: number;
}

export interface SearchResponse {
  success: boolean;
  data: SearchResponseData;
  message?: string;
}

export interface SearchSuggestion {
  text: string;
  score: number;
}

export interface SearchSuggestionsResponse {
  success: boolean;
  data: {
    suggestions: SearchSuggestion[];
  };
  message?: string;
}

export interface SearchCategory {
  category: string;
  subcategories: string[];
  doc_count: number;
}

export interface SearchCategoriesResponse {
  success: boolean;
  data: {
    categories: SearchCategory[];
    file_extensions: Array<{
      extension: string;
      doc_count: number;
    }>;
  };
  message?: string;
}

export interface SearchStatsResponse {
  success: boolean;
  data: {
    total_documents: number;
    index_size: string;
    index_name: string;
  };
  message?: string;
}

export class SearchService {
  /**
   * 搜索文档
   */
  static async searchDocuments(searchParams: SearchRequest): Promise<SearchResponseData> {
    // 修复：使用POST方法调用正确的搜索端点
    const response = await api.post('/search/documents', searchParams);
    return response.data.data || response.data;
  }

  /**
   * 获取搜索建议
   */
  static async getSearchSuggestions(prefix: string): Promise<SearchSuggestion[]> {
    const response = await api.get('/search/suggestions', { params: { prefix } });
    const backendData = response.data.data || response.data;
    
    if (backendData.suggestions && Array.isArray(backendData.suggestions)) {
      return backendData.suggestions;
    }
    return [];
  }

  /**
   * 获取搜索分类信息
   */
  static async getSearchCategories(): Promise<{
    categories: SearchCategory[];
    file_extensions: Array<{
      extension: string;
      doc_count: number;
    }>;
  }> {
    const response = await api.get('/search/categories');
    
    // 后端返回的数据结构：{ categories: { "category": ["subcategory"] }, file_extensions: [".ext"] }
    // 需要转换为前端期望的格式
    const backendData = response.data.data || response.data;
    const categories: SearchCategory[] = [];
    
    if (backendData.categories && typeof backendData.categories === 'object') {
      Object.entries(backendData.categories).forEach(([category, subcategories]) => {
        if (category && category.trim()) { // 过滤空分类
          categories.push({
            category,
            subcategories: Array.isArray(subcategories) ? subcategories.filter(sub => sub && sub.trim()) : [],
            doc_count: 0 // 后端暂未提供文档数量
          });
        }
      });
    }
    
    const file_extensions = Array.isArray(backendData.file_extensions) 
      ? backendData.file_extensions.map((ext: string) => ({
          extension: ext,
          doc_count: 0 // 后端暂未提供文档数量
        }))
      : [];
    
    return {
      categories,
      file_extensions
    };
  }

  /**
   * 获取搜索统计信息
   */
  static async getSearchStats(): Promise<{
    total_documents: number;
    index_size: string;
    index_name: string;
  }> {
    const response = await api.get('/search/stats');
    
    // 后端返回的数据结构：{ exists: true, document_count: 25, index_size: 595052, created: true }
    // 需要转换为前端期望的格式
    const backendData = response.data.data || response.data;
    
    return {
      total_documents: backendData.document_count || 0,
      index_size: backendData.index_size ? `${(backendData.index_size / 1024 / 1024).toFixed(2)} MB` : '0 MB',
      index_name: 'knowledge_base_documents' // 默认索引名
    };
  }

  /**
   * 重新索引文档
   */
  static async reindexDocuments(): Promise<{ success: boolean; message: string }> {
    const response = await api.post('/search/reindex');
    return response.data;
  }
}