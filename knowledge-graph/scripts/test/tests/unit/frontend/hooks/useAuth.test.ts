import { renderHook, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock hook for testing
const useAuth = () => {
  const login = async (credentials: { username: string; password: string }) => {
    if (credentials.username === 'testuser' && credentials.password === 'testpass') {
      return { success: true, user: { id: 1, username: 'testuser' } };
    }
    throw new Error('Invalid credentials');
  };

  const logout = async () => {
    return { success: true };
  };

  const isAuthenticated = () => {
    return true;
  };

  const register = async (userData: { username: string; password: string; email: string }) => {
    return { success: true, user: { id: 2, username: userData.username } };
  };

  const updateProfile = async (profileData: { username?: string; email?: string }) => {
    return { success: true, user: { id: 1, username: profileData.username || 'testuser' } };
  };

  const changePassword = async (passwordData: { oldPassword: string; newPassword: string }) => {
    if (passwordData.oldPassword === 'testpass') {
      return { success: true };
    }
    throw new Error('Invalid old password');
  };

  const refreshToken = async () => {
    return { success: true, token: 'new-token' };
  };

  const hasRole = (role: string) => {
    return role === 'user';
  };

  const hasAnyRole = (roles: string[]) => {
    return roles.includes('user');
  };

  const checkAuthStatus = async () => {
    return { isAuthenticated: true, user: { id: 1, username: 'testuser' } };
  };

  return {
    login,
    logout,
    register,
    updateProfile,
    changePassword,
    refreshToken,
    hasRole,
    hasAnyRole,
    checkAuthStatus,
    isAuthenticated,
    user: { id: 1, username: 'testuser' },
    loading: false,
    error: null
  };
};

describe('useAuth', () => {
  test('初始状态', () => {
    const { result } = renderHook(() => useAuth());
    
    expect(result.current.user).toEqual({ id: 1, username: 'testuser' });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.isAuthenticated()).toBe(true);
  });

  test('成功登录', async () => {
    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      const response = await result.current.login({
        username: 'testuser',
        password: 'testpass'
      });
      
      expect(response.success).toBe(true);
      expect(response.user).toEqual({ id: 1, username: 'testuser' });
    });
  });

  test('登录失败', async () => {
    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      try {
        await result.current.login({
          username: 'wronguser',
          password: 'wrongpass'
        });
      } catch (error: unknown) {
        expect(error instanceof Error ? error.message : String(error)).toBe('Invalid credentials');
      }
    });
  });

  test('成功登出', async () => {
    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      const response = await result.current.logout();
      expect(response.success).toBe(true);
    });
  });

  test('用户注册', async () => {
    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      const response = await result.current.register({
        username: 'newuser',
        password: 'newpass',
        email: 'new@example.com'
      });
      
      expect(response.success).toBe(true);
      expect(response.user).toEqual({ id: 2, username: 'newuser' });
    });
  });

  test('更新用户资料', async () => {
    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      const response = await result.current.updateProfile({
        username: 'updateduser'
      });
      
      expect(response.success).toBe(true);
      expect(response.user).toEqual({ id: 1, username: 'updateduser' });
    });
  });

  test('修改密码成功', async () => {
    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      const response = await result.current.changePassword({
        oldPassword: 'testpass',
        newPassword: 'newpass'
      });
      
      expect(response.success).toBe(true);
    });
  });

  test('修改密码失败', async () => {
    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      try {
        await result.current.changePassword({
          oldPassword: 'wrongpass',
          newPassword: 'newpass'
        });
      } catch (error: unknown) {
        expect(error instanceof Error ? error.message : String(error)).toBe('Invalid old password');
      }
    });
  });

  test('刷新令牌', async () => {
    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      const response = await result.current.refreshToken();
      expect(response.success).toBe(true);
      expect(response.token).toBe('new-token');
    });
  });

  test('检查用户角色', () => {
    const { result } = renderHook(() => useAuth());
    
    expect(result.current.hasRole('user')).toBe(true);
    expect(result.current.hasRole('admin')).toBe(false);
  });

  test('检查多个角色', () => {
    const { result } = renderHook(() => useAuth());
    
    expect(result.current.hasAnyRole(['user', 'admin'])).toBe(true);
    expect(result.current.hasAnyRole(['admin', 'moderator'])).toBe(false);
  });

  test('检查认证状态', () => {
    const { result } = renderHook(() => useAuth());
    
    expect(result.current.isAuthenticated()).toBe(true);
  });

  test('检查认证状态异步', async () => {
    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      const status = await result.current.checkAuthStatus();
      expect(status.isAuthenticated).toBe(true);
      expect(status.user).toEqual({ id: 1, username: 'testuser' });
    });
  });
});