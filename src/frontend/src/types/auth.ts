/**
 * 认证相关类型定义
 */

// 用户角色枚举
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest'
}

// 用户信息接口
export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  created_at?: string;
  updated_at?: string;
}

// 登录请求接口
export interface LoginRequest {
  username: string;
  password: string;
}

// 登录响应接口
export interface LoginResponse {
  success: boolean;
  message: string;
  access_token: string;
  refresh_token: string;
  user: User;
}

// 注册请求接口
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  role?: UserRole;
}

// 注册响应接口
export interface RegisterResponse {
  success: boolean;
  message: string;
  user: User;
}

// 修改密码请求接口
export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

// 刷新令牌请求接口
export interface RefreshTokenRequest {
  refresh_token: string;
}

// 刷新令牌响应接口
export interface RefreshTokenResponse {
  success: boolean;
  message: string;
  access_token: string;
}

// 用户信息响应接口
export interface ProfileResponse {
  success: boolean;
  user: User;
}