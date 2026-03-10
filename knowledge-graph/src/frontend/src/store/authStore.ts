/**
 * 认证状态管理
 */
import { create } from 'zustand';
import { User, RegisterResponse } from '../types/auth';
import { AuthService } from '../services/authService';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (username: string, password: string) => Promise<any>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  loadUserProfile: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  // 根据后端返回的 code/reason 映射更明确的错误文案
  // 若后端已提供 message，将优先使用 message；否则按 code/reason 生成
  mapRegisterErrorMessage: (resp: RegisterResponse): string => {
    const fallback = resp.message || '注册失败';
    const code = resp.code;
    const reason = resp.reason;

    if (!code) {
      return fallback;
    }

    const formatMap: Record<string, string> = {
      invalid_email_format: '邮箱格式不正确',
      invalid_domain: '邮箱域名不合法',
      invalid_local_part: '邮箱本地部分不合法',
      empty: '邮箱不能为空',
    };
    const deliverabilityMap: Record<string, string> = {
      domain_not_found: '邮箱域名不存在（DNS NXDOMAIN）',
      dns_unreachable: 'DNS 不可达或查询超时',
      mx_or_a_not_found: '域名缺少 MX 或 A/AAAA 记录（不可投递）',
    };

    if (reason === 'format_error') {
      return formatMap[code] || fallback;
    }
    if (reason === 'deliverability_error') {
      return deliverabilityMap[code] || fallback;
    }
    return fallback;
  },
  // 初始状态
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // 登录
  login: async (username: string, password: string) => {
    console.log('尝试登录:', username);
    set({ isLoading: true, error: null });
    try {
      const response = await AuthService.login({ username, password });
      console.log('登录响应:', response);
      
      if (response.success) {
        console.log('登录成功，保存用户数据');
        AuthService.saveUserData(response);
        set({ 
          isAuthenticated: true, 
          user: response.user, 
          isLoading: false,
          error: null
        });
        return response; // 返回响应以便组件使用
      } else {
        console.error('登录失败:', response.message);
        set({ 
          error: response.message || '登录失败', 
          isLoading: false,
          isAuthenticated: false,
          user: null
        });
        return response;
      }
    } catch (error: any) {
      console.error('登录错误:', error);
      const errorMessage = error?.response?.data?.message || error?.message || '网络错误，请稍后重试';
      set({ 
        error: errorMessage, 
        isLoading: false,
        isAuthenticated: false,
        user: null
      });
      return { success: false, message: errorMessage };
    }
  },

  // 注册
  register: async (username: string, email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await AuthService.register({ username, email, password });
      if (response.success) {
        set({
          isLoading: false,
        });
      } else {
        const mapMessage = (useAuthStore.getState() as any).mapRegisterErrorMessage as (r: RegisterResponse) => string;
        const errMsg = mapMessage ? mapMessage(response) : (response.message || '注册失败');
        set({
          error: errMsg,
          isLoading: false,
        });
      }
    } catch (error: any) {
      set({
        error: error.response?.data?.message || '注册失败',
        isLoading: false,
      });
    }
  },

  // 登出
  logout: () => {
    AuthService.logout();
    set({
      user: null,
      isAuthenticated: false,
      error: null,
    });
  },

  // 加载用户信息
  loadUser: async () => {
    if (!AuthService.isAuthenticated()) {
      return;
    }

    set({ isLoading: true });
    try {
      const response = await AuthService.getProfile();
      if (response.success) {
        set({
          user: response.user,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        // 如果获取用户信息失败，清除本地存储
        AuthService.logout();
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch (error) {
      // 如果请求失败，清除本地存储
      AuthService.logout();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  // 加载用户配置文件（别名）
  loadUserProfile: async () => {
    return get().loadUser();
  },

  // 清除错误
  clearError: () => {
    set({ error: null });
  },
}));

// 初始化时加载用户信息
if (typeof window !== 'undefined' && AuthService.isAuthenticated()) {
  const currentUser = AuthService.getCurrentUser();
  if (currentUser) {
    useAuthStore.setState({
      user: currentUser,
      isAuthenticated: true,
      isLoading: false,
    });
  } else {
    useAuthStore.getState().loadUser();
  }
}