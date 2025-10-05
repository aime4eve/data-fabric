/**
 * 文档相关类型定义
 */

// 文档状态枚举
export enum DocumentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
  DELETED = 'deleted'
}

// 文档接口
export interface Document {
  id: string;
  title: string;
  content_path: string;
  category_id: string;
  author_id: string;
  status: DocumentStatus;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  description?: string;  // 文档描述，可选属性
  file_size?: number;    // 文件大小（字节），可选属性
}

// 文档上传请求接口
export interface DocumentUploadRequest {
  title: string;
  file: File;
  category_id: string;
}

// 文档上传响应接口
export interface DocumentUploadResponse {
  success: boolean;
  message: string;
  document: Document;
}

// 文档更新请求接口
export interface DocumentUpdateRequest {
  title?: string;
  category_id?: string;
}

// 文档列表响应接口
export interface DocumentListResponse {
  success: boolean;
  data: Document[];
  documents: Document[];  // 添加 documents 字段，与后端API一致
  total: number;
}

// 文档搜索参数接口
export interface DocumentSearchParams {
  query: string;  // 修改为 query，与后端API一致
  category_id?: string;
  author_id?: string;
  status?: DocumentStatus;
  page?: number;
  size?: number;
}

// 文档统计信息接口
export interface DocumentStatistics {
  total_documents: number;
  published_documents: number;
  draft_documents: number;
  archived_documents: number;
  user_id?: string;
}