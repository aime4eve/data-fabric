/**
 * 标签管理服务
 */
import { api } from '../utils/api';

export interface Tag {
  id: string;
  name: string;
  color?: string;
  description?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface TagStatistics {
  total_tags: number;
  used_tags: number;
  unused_tags: number;
}

export interface TagWithUsage extends Tag {
  usage_count?: number;
  directory_count?: number;
  file_count?: number;
}

export interface CreateTagRequest {
  name: string;
  color?: string;
  description?: string;
  metadata?: any;
}

export interface UpdateTagRequest {
  name?: string;
  color?: string;
  description?: string;
  metadata?: any;
}

export interface AssociateTagRequest {
  tag_id: string;
  entity_type: 'directory' | 'file';
  entity_id: string;
}

export class TagService {
  /**
   * 获取标签列表
   */
  static async getTags(params?: {
    name?: string;
    page?: number;
    size?: number;
  }): Promise<Tag[]> {
    const response = await api.get<Tag[]>('/tags', { params });
    return response.data.data || [];
  }

  /**
   * 获取标签统计信息
   */
  static async getTagStatistics(): Promise<TagStatistics> {
    const response = await api.get<TagStatistics>('/tags/statistics');
    return response.data.data!;
  }

  /**
   * 获取单个标签
   */
  static async getTag(id: string): Promise<Tag> {
    const response = await api.get<Tag>(`/tags/${id}`);
    return response.data.data!;
  }

  /**
   * 创建标签
   */
  static async createTag(data: CreateTagRequest): Promise<Tag> {
    const response = await api.post<Tag>('/tags', data);
    return response.data.data!;
  }

  /**
   * 更新标签
   */
  static async updateTag(id: string, data: UpdateTagRequest): Promise<Tag> {
    const response = await api.put<Tag>(`/tags/${id}`, data);
    return response.data.data!;
  }

  /**
   * 删除标签
   */
  static async deleteTag(id: string): Promise<void> {
    await api.delete(`/tags/${id}`);
  }

  /**
   * 关联标签
   */
  static async associateTag(data: AssociateTagRequest): Promise<void> {
    await api.post('/tags/associate', data);
  }

  /**
   * 取消关联标签
   */
  static async disassociateTag(data: AssociateTagRequest): Promise<void> {
    await api.post('/tags/disassociate', data);
  }

  /**
   * 根据标签获取目录
   */
  static async getDirectoriesByTag(tagId: string): Promise<any[]> {
    const response = await api.get<any[]>(`/tags/${tagId}/directories`);
    return response.data.data || [];
  }

  /**
   * 根据标签获取文件
   */
  static async getFilesByTag(tagId: string): Promise<any[]> {
    const response = await api.get<any[]>(`/tags/${tagId}/files`);
    return response.data.data || [];
  }
}