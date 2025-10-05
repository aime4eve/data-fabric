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

export interface SearchResponse {
  success: boolean;
  data: {
    results: SearchResult[];
    total: number;
    page: number;
    size: number;
    total_pages: number;
    took: number;
  };
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
   * 全文搜索文档
   */
  static async searchDocuments(searchParams: SearchRequest): Promise<SearchResponse> {
    const response = await api.post<SearchResponse>('/search/documents', searchParams);
    return response.data;
  }

  /**
   * 获取搜索建议
   */
  static async getSearchSuggestions(prefix: string): Promise<SearchSuggestionsResponse> {
    const response = await api.get<SearchSuggestionsResponse>('/search/suggestions', {
      params: { prefix }
    });
    return response.data;
  }

  /**
   * 获取搜索分类信息
   */
  static async getSearchCategories(): Promise<SearchCategoriesResponse> {
    const response = await api.get<SearchCategoriesResponse>('/search/categories');
    return response.data;
  }

  /**
   * 获取搜索统计信息
   */
  static async getSearchStats(): Promise<SearchStatsResponse> {
    const response = await api.get<SearchStatsResponse>('/search/stats');
    return response.data;
  }

  /**
   * 重新索引文档
   */
  static async reindexDocuments(): Promise<{ success: boolean; message: string }> {
    const response = await api.post('/search/reindex');
    return response.data;
  }
}