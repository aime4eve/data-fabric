/**
 * 分类管理服务
 */
import api from '../utils/api';

export interface Category {
  id: string;
  name: string;
  description?: string;
  parent_id?: string;
  level: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  children?: Category[];
  document_count?: number;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  parent_id?: string;
  sort_order?: number;
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  parent_id?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface CategoryListResponse {
  data: Category[];
  total: number;
  page: number;
  per_page: number;
}

export interface CategoryTreeResponse {
  data: Category[];
}

export class CategoryService {
  /**
   * 获取分类列表
   */
  static async getCategories(params?: {
    page?: number;
    per_page?: number;
    parent_id?: string;
    search?: string;
    is_active?: boolean;
  }): Promise<CategoryListResponse> {
    const response = await api.get<CategoryListResponse>('/categories/', { params });
    // 后端返回的数据结构直接包含data字段
    return (response.data as any).data || response.data;
  }

  /**
   * 获取分类树
   */
  static async getCategoryTree(): Promise<CategoryTreeResponse> {
    const response = await api.get<Category[]>('/categories/tree/');
    // 后端直接返回数组，不是包装在data字段中
    return { data: (response.data as any).data || response.data };
  }

  /**
   * 获取单个分类详情
   */
  static async getCategory(id: string): Promise<Category> {
    const response = await api.get(`/categories/${id}/`);
    return response.data.data;
  }

  /**
   * 创建分类
   */
  static async createCategory(data: CreateCategoryRequest): Promise<Category> {
    const response = await api.post('/categories/', data);
    return response.data.data;
  }

  /**
   * 更新分类
   */
  static async updateCategory(id: string, data: UpdateCategoryRequest): Promise<Category> {
    const response = await api.put(`/categories/${id}/`, data);
    return response.data.data;
  }

  /**
   * 删除分类
   */
  static async deleteCategory(id: string): Promise<void> {
    await api.delete(`/categories/${id}/`);
  }

  /**
   * 批量删除分类
   */
  static async deleteCategoriesBatch(ids: string[]): Promise<void> {
    await api.post('/categories/batch-delete/', { ids });
  }

  /**
   * 移动分类
   */
  static async moveCategory(id: string, parent_id?: string, sort_order?: number): Promise<Category> {
    const response = await api.patch(`/categories/${id}/move/`, {
      parent_id,
      sort_order,
    });
    return response.data.data;
  }

  /**
   * 批量更新分类排序
   */
  static async updateCategoriesOrder(updates: Array<{ id: string; sort_order: number; parent_id?: string }>): Promise<void> {
    await api.post('/categories/batch-update-order/', { updates });
  }

  /**
   * 获取分类统计信息
   */
  static async getCategoryStats(id: string): Promise<{
    document_count: number;
    subcategory_count: number;
    total_document_count: number;
  }> {
    const response = await api.get(`/categories/${id}/stats/`);
    return response.data.data;
  }

  /**
   * 切换分类状态
   */
  static async toggleCategoryStatus(id: string, is_active: boolean): Promise<Category> {
    const response = await api.patch(`/categories/${id}/status/`, { is_active });
    return response.data.data;
  }
}