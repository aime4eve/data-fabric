/**
 * 目录管理服务
 */
import { api } from '../utils/api';

export interface Directory {
  id: string;
  name: string;
  path: string;
  full_path: string;
  parent_id?: string;
  level: number;
  sort_order: number;
  description?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface DirectoryTree extends Directory {
  children: DirectoryTree[];
}

export interface CreateDirectoryRequest {
  name: string;
  parent_id?: string;
  description?: string;
  metadata?: any;
}

export interface UpdateDirectoryRequest {
  name?: string;
  description?: string;
  metadata?: any;
  sort_order?: number;
}

export class DirectoryService {
  /**
   * 获取目录列表
   */
  static async getDirectories(params?: {
    parent_id?: string;
    level?: number;
    page?: number;
    size?: number;
  }): Promise<Directory[]> {
    const response = await api.get<Directory[]>('/directories', { params });
    return response.data.data || [];
  }

  /**
   * 获取目录树
   */
  static async getDirectoryTree(): Promise<DirectoryTree[]> {
    const response = await api.get<DirectoryTree[]>('/directories/tree');
    return response.data.data || [];
  }

  /**
   * 获取单个目录
   */
  static async getDirectory(id: string): Promise<Directory> {
    const response = await api.get<Directory>(`/directories/${id}`);
    return response.data.data!;
  }

  /**
   * 创建目录
   */
  static async createDirectory(data: CreateDirectoryRequest): Promise<Directory> {
    const response = await api.post<Directory>('/directories', data);
    return response.data.data!;
  }

  /**
   * 更新目录
   */
  static async updateDirectory(id: string, data: UpdateDirectoryRequest): Promise<Directory> {
    const response = await api.put<Directory>(`/directories/${id}`, data);
    return response.data.data!;
  }

  /**
   * 删除目录
   */
  static async deleteDirectory(id: string): Promise<void> {
    await api.delete(`/directories/${id}`);
  }

  /**
   * 获取目录标签
   */
  static async getDirectoryTags(id: string): Promise<any[]> {
    const response = await api.get<any[]>(`/directories/${id}/tags`);
    return response.data.data || [];
  }

  /**
   * 添加目录标签
   */
  static async addDirectoryTag(directoryId: string, tagId: string): Promise<void> {
    await api.post(`/directories/${directoryId}/tags`, { tag_id: tagId });
  }

  /**
   * 移除目录标签
   */
  static async removeDirectoryTag(directoryId: string, tagId: string): Promise<void> {
    await api.delete(`/directories/${directoryId}/tags/${tagId}`);
  }
}