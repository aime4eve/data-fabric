/**
 * 认证服务
 */
import api from '../utils/api';
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  ChangePasswordRequest,
  RefreshTokenRequest,
  RefreshTokenResponse,
  ProfileResponse
} from '../types/auth';

export class AuthService {
  /**
   * 用户登录
   */
  static async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  }

  /**
   * 用户注册
   */
  static async register(userData: RegisterRequest): Promise<RegisterResponse> {
    const response = await api.post<RegisterResponse>('/auth/register', userData);
    return response.data;
  }

  /**
   * 刷新令牌
   */
  static async refreshToken(refreshTokenData: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    const response = await api.post<RefreshTokenResponse>('/auth/refresh', refreshTokenData);
    return response.data;
  }

  /**
   * 修改密码
   */
  static async changePassword(passwordData: ChangePasswordRequest): Promise<{ success: boolean; message: string }> {
    const response = await api.post('/auth/change-password', passwordData);
    return response.data;
  }

  /**
   * 获取用户信息
   */
  static async getProfile(): Promise<ProfileResponse> {
    const response = await api.get<ProfileResponse>('/auth/profile');
    return response.data;
  }

  /**
   * 登出
   */
  static logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }

  /**
   * 检查是否已登录
   */
  static isAuthenticated(): boolean {
    const token = localStorage.getItem('access_token');
    return !!token;
  }

  /**
   * 获取当前用户信息
   */
  static getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  /**
   * 保存用户信息到本地存储
   */
  static saveUserData(loginResponse: LoginResponse): void {
    console.log('保存用户数据:', loginResponse);
    localStorage.setItem('access_token', loginResponse.access_token);
    localStorage.setItem('refresh_token', loginResponse.refresh_token);
    localStorage.setItem('user', JSON.stringify(loginResponse.user));
    console.log('localStorage已更新');
  }
}