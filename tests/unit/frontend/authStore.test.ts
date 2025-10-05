/**
 * 认证状态管理单元测试
 */
import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from '../../../src/frontend/src/store/authStore';
import * as authService from '../../../src/frontend/src/services/authService';

// Mock authService
jest.mock('../../../src/frontend/src/services/authService');
const mockAuthService = authService as jest.Mocked<typeof authService>;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('AuthStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    // Reset store state
    const { result } = renderHook(() => useAuthStore());
    act(() => {
      result.current.logout();
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useAuthStore());
      
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Login', () => {
    it('should handle successful login', async () => {
      const mockUser = {
        id: '1',
        username: 'admin',
        email: 'admin@test.com',
        role: 'admin' as const,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      const mockResponse = {
        access_token: 'mock-token',
        user: mockUser,
      };

      mockAuthService.AuthService.login.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.login('admin', '123456');
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(localStorageMock.setItem).toHaveBeenCalledWith('access_token', 'mock-token');
    });

    it('should handle login failure', async () => {
      const errorMessage = '用户名或密码错误';
      mockAuthService.AuthService.login.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.login('admin', 'wrong-password');
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('should set loading state during login', async () => {
      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });
      
      mockAuthService.AuthService.login.mockReturnValue(loginPromise);

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.login('admin', '123456');
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveLogin!({
          access_token: 'mock-token',
          user: {
            id: '1',
            username: 'admin',
            email: 'admin@test.com',
            role: 'admin' as const,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        });
        await loginPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should validate input parameters', async () => {
      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.login('', '');
      });

      expect(result.current.error).toBe('用户名和密码不能为空');
      expect(mockAuthService.AuthService.login).not.toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      mockAuthService.AuthService.login.mockRejectedValue(new Error('Network Error'));

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.login('admin', '123456');
      });

      expect(result.current.error).toBe('Network Error');
    });
  });

  describe('Register', () => {
    it('should handle successful registration', async () => {
      const mockUser = {
        id: '1',
        username: 'newuser',
        email: 'newuser@test.com',
        role: 'user' as const,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockAuthService.AuthService.register.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.register('newuser', 'newuser@test.com', '123456');
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockAuthService.AuthService.register).toHaveBeenCalledWith(
        'newuser',
        'newuser@test.com',
        '123456'
      );
    });

    it('should handle registration failure', async () => {
      const errorMessage = '用户名已存在';
      mockAuthService.AuthService.register.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.register('existinguser', 'user@test.com', '123456');
      });

      expect(result.current.error).toBe(errorMessage);
    });

    it('should validate registration input', async () => {
      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.register('', '', '');
      });

      expect(result.current.error).toBe('所有字段都是必填的');
      expect(mockAuthService.AuthService.register).not.toHaveBeenCalled();
    });

    it('should validate email format', async () => {
      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.register('user', 'invalid-email', '123456');
      });

      expect(result.current.error).toBe('请输入有效的邮箱地址');
      expect(mockAuthService.AuthService.register).not.toHaveBeenCalled();
    });
  });

  describe('Logout', () => {
    it('should clear user data and token on logout', () => {
      const { result } = renderHook(() => useAuthStore());

      // Set initial authenticated state
      act(() => {
        result.current.login('admin', '123456');
      });

      act(() => {
        result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('access_token');
    });
  });

  describe('Load User Profile', () => {
    it('should load user profile successfully', async () => {
      const mockUser = {
        id: '1',
        username: 'admin',
        email: 'admin@test.com',
        role: 'admin' as const,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      localStorageMock.getItem.mockReturnValue('mock-token');
      mockAuthService.AuthService.getUserProfile.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.loadUserProfile();
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle profile loading failure', async () => {
      localStorageMock.getItem.mockReturnValue('invalid-token');
      mockAuthService.AuthService.getUserProfile.mockRejectedValue(new Error('Unauthorized'));

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.loadUserProfile();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('access_token');
    });

    it('should not load profile if no token exists', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.loadUserProfile();
      });

      expect(mockAuthService.AuthService.getUserProfile).not.toHaveBeenCalled();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should clear error', () => {
      const { result } = renderHook(() => useAuthStore());

      // Set error state
      act(() => {
        result.current.login('', '');
      });

      expect(result.current.error).toBeTruthy();

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('should handle API response errors', async () => {
      const apiError = {
        response: {
          data: {
            message: 'API错误信息'
          }
        }
      };

      mockAuthService.AuthService.login.mockRejectedValue(apiError);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.login('admin', '123456');
      });

      expect(result.current.error).toBe('API错误信息');
    });
  });

  describe('Type Safety', () => {
    it('should maintain type safety for user object', async () => {
      const mockUser = {
        id: '1',
        username: 'admin',
        email: 'admin@test.com',
        role: 'admin' as const,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockAuthService.AuthService.login.mockResolvedValue({
        access_token: 'mock-token',
        user: mockUser,
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.login('admin', '123456');
      });

      // TypeScript should enforce these properties exist
      expect(result.current.user?.id).toBe('1');
      expect(result.current.user?.username).toBe('admin');
      expect(result.current.user?.email).toBe('admin@test.com');
      expect(result.current.user?.role).toBe('admin');
    });
  });
});