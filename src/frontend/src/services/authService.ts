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
  static async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await api.post('/auth/login', data);
    return response.data as LoginResponse;
  }

  /**
   * 用户注册
   */
  static async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await api.post('/auth/register', data);
    return response.data as RegisterResponse;
  }

  /**
   * 刷新令牌
   */
  static async refreshToken(data: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    const response = await api.post('/auth/refresh', data);
    return response.data as RefreshTokenResponse;
  }

  /**
   * 修改密码
   */
  static async changePassword(data: ChangePasswordRequest): Promise<void> {
    const response = await api.post('/auth/change-password', data);
    // 不需要返回数据
  }

  /**
   * 获取用户资料
   */
  static async getProfile(): Promise<ProfileResponse> {
    const response = await api.get('/auth/profile');
    return response.data as unknown as ProfileResponse;
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