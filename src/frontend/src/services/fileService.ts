/**
 * 文件管理服务
 */
import { api } from '../utils/api';
import axios from 'axios';

export interface FileInfo {
  id: string;
  name: string;
  original_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  mime_type: string;
  directory_id?: string;
  description?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface FileUploadRequest {
  file: File;
  directory_id?: string;
  description?: string;
  metadata?: any;
}

export interface FileUpdateRequest {
  name?: string;
  description?: string;
  metadata?: any;
  directory_id?: string;
}

export class FileService {
  /**
   * 获取文件列表
   */
  static async getFiles(params?: {
    directory_id?: string;
    file_type?: string;
    page?: number;
    size?: number;
  }): Promise<FileInfo[]> {
    const response = await api.get<FileInfo[]>('/files', { params });
    return response.data.data || [];
  }

  /**
   * 获取单个文件信息
   */
  static async getFile(id: string): Promise<FileInfo> {
    const response = await api.get<FileInfo>(`/files/${id}`);
    return response.data.data!;
  }

  /**
   * 上传文件
   */
  static async uploadFile(data: FileUploadRequest): Promise<FileInfo> {
    const formData = new FormData();
    formData.append('file', data.file);
    
    if (data.directory_id) {
      formData.append('directory_id', data.directory_id);
    }
    if (data.description) {
      formData.append('description', data.description);
    }
    if (data.metadata) {
      formData.append('metadata', JSON.stringify(data.metadata));
    }

    const response = await api.post<FileInfo>('/files/upload', formData);
    return response.data.data!;
  }

  /**
   * 更新文件信息
   */
  static async updateFile(id: string, data: FileUpdateRequest): Promise<FileInfo> {
    const response = await api.put<FileInfo>(`/files/${id}`, data);
    return response.data.data!;
  }

  /**
   * 删除文件
   */
  static async deleteFile(id: string): Promise<void> {
    await api.delete(`/files/${id}`);
  }

  /**
   * 下载文件
   */
  static async downloadFile(id: string): Promise<Blob> {
    const token = localStorage.getItem('access_token');
    const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
    
    const response = await axios.get(`${baseURL}/files/${id}/download`, {
      responseType: 'blob',
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined
      }
    });
    return response.data;
  }

  /**
   * 获取文件标签
   */
  static async getFileTags(id: string): Promise<any[]> {
    const response = await api.get<any[]>(`/files/${id}/tags`);
    return response.data.data || [];
  }

  /**
   * 添加文件标签
   */
  static async addFileTag(fileId: string, tagId: string): Promise<void> {
    await api.post(`/files/${fileId}/tags`, { tag_id: tagId });
  }

  /**
   * 移除文件标签
   */
  static async removeFileTag(fileId: string, tagId: string): Promise<void> {
    await api.delete(`/files/${fileId}/tags/${tagId}`);
  }

  /**
   * 移动文件到目录
   */
  static async moveFile(fileId: string, directoryId?: string): Promise<FileInfo> {
    const response = await api.put<FileInfo>(`/files/${fileId}/move`, {
      directory_id: directoryId
    });
    return response.data.data!;
  }
}