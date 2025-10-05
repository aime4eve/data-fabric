/**
 * 文档服务
 */
import api from '../utils/api';
import {
  Document,
  DocumentUploadRequest,
  DocumentUploadResponse,
  DocumentUpdateRequest,
  DocumentListResponse,
  DocumentSearchParams
} from '../types/document';

export class DocumentService {
  /**
   * 上传文档
   */
  static async uploadDocument(
    file: File,
    title: string,
    description: string,
    category_id: string,
    upload_directory?: string
  ): Promise<DocumentUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('category_id', category_id);
    if (upload_directory) {
      formData.append('upload_directory', upload_directory);
    }

    const response = await api.post<DocumentUploadResponse>('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  /**
   * 获取文档信息
   */
  static async getDocument(documentId: string): Promise<{ success: boolean; document: Document }> {
    const response = await api.get(`/documents/${documentId}`);
    return response.data;
  }

  /**
   * 更新文档信息
   */
  static async updateDocument(
    documentId: string,
    updateData: DocumentUpdateRequest
  ): Promise<{ success: boolean; document: Document; message: string }> {
    const response = await api.put(`/documents/${documentId}`, updateData);
    return response.data;
  }

  /**
   * 删除文档
   */
  static async deleteDocument(documentId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/documents/${documentId}`);
    return response.data;
  }

  /**
   * 下载文档
   */
  static async downloadDocument(documentId: string): Promise<Blob> {
    const response = await api.get(`/documents/${documentId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * 发布文档
   */
  static async publishDocument(documentId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/documents/${documentId}/publish`);
    return response.data;
  }

  /**
   * 归档文档
   */
  static async archiveDocument(documentId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/documents/${documentId}/archive`);
    return response.data;
  }

  /**
   * 获取文档列表
   */
  static async getDocuments(params?: {
    category_id?: string;
    author_id?: string;
    status?: string;
    page?: number;
    size?: number;
  }): Promise<DocumentListResponse> {
    const response = await api.get<DocumentListResponse>('/documents/', { params });
    return response.data;
  }

  /**
   * 搜索文档
   */
  static async searchDocuments(searchParams: DocumentSearchParams): Promise<DocumentListResponse> {
    const response = await api.get<DocumentListResponse>('/documents/search', {
      params: searchParams,
    });
    return response.data;
  }

  /**
   * 获取文档统计信息
   */
  static async getDocumentStatistics(): Promise<any> {
    try {
      const response = await api.get('/documents/statistics');
      return response.data.data;
    } catch (error) {
      console.error('获取文档统计失败:', error);
      // 返回默认数据
      return {
        total_documents: 0,
        published_documents: 0,
        draft_documents: 0,
        archived_documents: 0,
      };
    }
  }
}