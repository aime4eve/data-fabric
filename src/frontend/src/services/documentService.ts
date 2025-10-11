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
  DocumentSearchParams,
  DocumentStatus
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
    try {
      // 验证文件对象
      if (!file || !(file instanceof File)) {
        throw new Error('没有上传文件');
      }

      const formData = new FormData();
      formData.append('file', file, file.name);  // 明确指定文件名
      formData.append('title', title);
      formData.append('description', description || '');
      formData.append('category_id', category_id || '');
      if (upload_directory) {
        formData.append('upload_directory', upload_directory);
      }

      console.log('上传文档参数:', {
        fileName: file.name,
        fileSize: file.size,
        title,
        description,
        category_id,
        upload_directory
      });

      // 验证FormData内容
      console.log('FormData内容:');
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`${key}: File(${value.name}, ${value.size} bytes)`);
        } else {
          console.log(`${key}: ${value}`);
        }
      }

      const response = await api.post<DocumentUploadResponse>('/documents/upload', formData, {
        headers: {
          // 让浏览器自动设置Content-Type，包含boundary
          // 'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('API响应:', response.data);
      
      // 处理API响应格式
      if (response.data.success && response.data.data) {
        const data = response.data.data as any;
        return {
          success: response.data.success,
          message: response.data.message,
          document: {
            id: data.id,
            title: data.title,
            content_path: data.content_path,
            category_id: data.category_id || '',
            author_id: data.author_id || 'anonymous',
            status: data.status as DocumentStatus,
            metadata: data.metadata || {},
            created_at: data.created_at,
            updated_at: data.updated_at,
            description: data.description
          }
        };
      } else {
        // 如果响应直接是DocumentUploadResponse格式
        return response.data as DocumentUploadResponse;
      }
    } catch (error: any) {
      console.error('文档上传API调用失败:', error);
      
      // 处理网络错误或API错误
      if (error.response) {
        // API返回了错误响应
        console.error('API错误响应:', error.response.data);
        const errorMessage = error.response.data?.message || '文档上传失败';
        throw new Error(errorMessage);
      } else if (error.request) {
        // 网络请求失败
        console.error('网络请求失败:', error.request);
        throw new Error('网络连接失败，请检查网络连接');
      } else {
        // 其他错误
        console.error('其他错误:', error.message);
        throw new Error(error.message || '文档上传失败，请重试');
      }
    }
  }

  /**
   * 获取文档信息
   */
  static async getDocument(documentId: string): Promise<{ success: boolean; data?: Document; message?: string }> {
    const response = await api.get(`/documents/${documentId}`);
    return response.data;
  }

  /**
   * 更新文档
   */
  static async updateDocument(
    documentId: string,
    updateData: DocumentUpdateRequest
  ): Promise<{ success: boolean; document: Document; message: string }> {
    const response = await api.put(`/documents/${documentId}`, updateData);
    return response.data.data || response.data;
  }

  /**
   * 删除文档
   */
  static async deleteDocument(documentId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/documents/${documentId}`);
    return response.data.data || response.data;
  }

  /**
   * 下载文档
   */
  static async downloadDocument(documentId: string): Promise<Blob> {
    const response = await api.get(`/documents/${documentId}/download`, {
      responseType: 'blob',
    });
    // 对于blob响应，直接返回data，使用unknown中间转换
    return response.data as unknown as Blob;
  }

  /**
   * 发布文档
   */
  static async publishDocument(documentId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/documents/${documentId}/publish`);
    return response.data.data || response.data;
  }

  /**
   * 归档文档
   */
  static async archiveDocument(documentId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/documents/${documentId}/archive`);
    return response.data.data || response.data;
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
    const response = await api.get('/documents', { params });
    
    // 后端返回格式: { success: true, message: "...", data: [...], total: 30, page: 1, size: 10 }
    // 需要转换为前端期望的 DocumentListResponse 格式
    const backendData = response.data as any;
    
    if (backendData.success !== undefined) {
      // 如果是后端的完整响应格式
      return {
        success: backendData.success,
        data: backendData.data || [],
        documents: backendData.data || [],
        total: backendData.total || 0,
        page: backendData.page,
        size: backendData.size
      };
    } else {
      // 如果直接是数据数组
      return {
        success: true,
        data: backendData,
        documents: backendData,
        total: backendData.length || 0
      };
    }
  }

  /**
   * 搜索文档
   */
  static async searchDocuments(searchParams: DocumentSearchParams): Promise<DocumentListResponse> {
    // 构建查询参数
    const params = new URLSearchParams();
    
    if (searchParams.query) {
      params.append('query', searchParams.query);
    }
    if (searchParams.category_id) {
      params.append('category_id', searchParams.category_id);
    }
    if (searchParams.author_id) {
      params.append('author_id', searchParams.author_id);
    }
    if (searchParams.status) {
      params.append('status', searchParams.status);
    }
    if (searchParams.page) {
      params.append('page', searchParams.page.toString());
    }
    if (searchParams.size) {
      params.append('size', searchParams.size.toString());
    }

    const response = await api.get(`/documents/search?${params.toString()}`);
    
    // 后端返回格式: { success: true, message: "...", data: [...], total: 26, page: 1, size: 20 }
    // 需要转换为前端期望的 DocumentListResponse 格式
    const backendData = response.data as any;
    
    if (backendData.success !== undefined) {
      // 如果是后端的完整响应格式
      return {
        success: backendData.success,
        data: backendData.data || [],
        documents: backendData.data || [],
        total: backendData.total || 0,
        page: backendData.page,
        size: backendData.size
      };
    } else {
      // 如果直接是数据数组
      return {
        success: true,
        data: backendData,
        documents: backendData,
        total: backendData.length || 0
      };
    }
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