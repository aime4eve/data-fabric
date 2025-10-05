/**
 * 用户相关API服务
 */
import { api } from '../utils/api';

// 用户个人信息接口
export interface UserProfile {
  id: string;
  username: string;
  email: string;
  fullName: string;
  avatar?: string;
  phone?: string;
  department?: string;
  position?: string;
  createdAt: string;
  updatedAt: string;
}

// 用户偏好设置接口
export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: 'zh-CN' | 'en-US';
  emailNotifications: boolean;
  systemNotifications: boolean;
  autoSave: boolean;
  pageSize: number;
}

// 密码修改请求接口
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// 更新个人信息请求接口
export interface UpdateProfileRequest {
  email?: string;
  fullName?: string;
  phone?: string;
  department?: string;
  position?: string;
}

// 头像上传响应接口
export interface AvatarUploadResponse {
  avatarUrl: string;
}

// API响应包装接口
export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

/**
 * 用户服务类
 */
export class UserService {
  /**
   * 获取当前用户个人信息
   */
  static async getProfile(): Promise<ApiResponse<UserProfile>> {
    const response = await api.get('/users/profile');
    return response.data;
  }

  /**
   * 更新个人信息
   */
  static async updateProfile(data: UpdateProfileRequest): Promise<ApiResponse<UserProfile>> {
    const response = await api.put('/users/profile', data);
    return response.data;
  }

  /**
   * 修改密码
   */
  static async changePassword(data: ChangePasswordRequest): Promise<ApiResponse<void>> {
    const response = await api.post('/users/change-password', data);
    return response.data;
  }

  /**
   * 上传头像
   */
  static async uploadAvatar(file: File): Promise<ApiResponse<AvatarUploadResponse>> {
    const formData = new FormData();
    formData.append('avatar', file);
    
    const response = await api.post('/users/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  /**
   * 获取用户偏好设置
   */
  static async getPreferences(): Promise<ApiResponse<UserPreferences>> {
    const response = await api.get('/users/preferences');
    return response.data;
  }

  /**
   * 更新用户偏好设置
   */
  static async updatePreferences(data: UserPreferences): Promise<ApiResponse<UserPreferences>> {
    const response = await api.put('/users/preferences', data);
    return response.data;
  }

  /**
   * 获取用户统计信息
   */
  static async getUserStats(): Promise<ApiResponse<{
    documentCount: number;
    categoryCount: number;
    searchCount: number;
    lastLoginAt: string;
  }>> {
    const response = await api.get('/users/stats');
    return response.data;
  }

  /**
   * 删除用户账户
   */
  static async deleteAccount(password: string): Promise<ApiResponse<void>> {
    const response = await api.delete('/users/account', {
      data: { password }
    });
    return response.data;
  }

  /**
   * 获取用户活动日志
   */
  static async getActivityLogs(params?: {
    page?: number;
    pageSize?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<{
    data: Array<{
      id: string;
      action: string;
      description: string;
      ipAddress: string;
      userAgent: string;
      createdAt: string;
    }>;
    total: number;
    page: number;
    pageSize: number;
  }>> {
    const response = await api.get('/users/activity-logs', { params });
    return response.data;
  }

  /**
   * 导出用户数据
   */
  static async exportUserData(): Promise<Blob> {
    const response = await api.get('/users/export', {
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * 验证当前密码
   */
  static async verifyPassword(password: string): Promise<ApiResponse<boolean>> {
    const response = await api.post('/users/verify-password', { password });
    return response.data;
  }

  /**
   * 启用/禁用两步验证
   */
  static async toggleTwoFactorAuth(enabled: boolean): Promise<ApiResponse<{
    enabled: boolean;
    qrCode?: string;
    backupCodes?: string[];
  }>> {
    const response = await api.post('/users/two-factor-auth', { enabled });
    return response.data;
  }

  /**
   * 获取用户会话列表
   */
  static async getSessions(): Promise<ApiResponse<Array<{
    id: string;
    deviceInfo: string;
    ipAddress: string;
    location: string;
    isCurrent: boolean;
    lastActiveAt: string;
    createdAt: string;
  }>>> {
    const response = await api.get('/users/sessions');
    return response.data;
  }

  /**
   * 终止指定会话
   */
  static async terminateSession(sessionId: string): Promise<ApiResponse<void>> {
    const response = await api.delete(`/users/sessions/${sessionId}`);
    return response.data;
  }

  /**
   * 终止所有其他会话
   */
  static async terminateAllOtherSessions(): Promise<ApiResponse<void>> {
    const response = await api.delete('/users/sessions/others');
    return response.data;
  }
}

// 导出默认实例
export default UserService;