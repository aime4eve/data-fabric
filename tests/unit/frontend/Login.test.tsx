/**
 * 登录组件单元测试
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { Login } from '../../../src/frontend/src/pages/Login';
import { useAuthStore } from '../../../src/frontend/src/store/authStore';

// Mock useAuthStore
jest.mock('../../../src/frontend/src/store/authStore');
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// 测试包装器组件
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <ConfigProvider locale={zhCN}>
      {children}
    </ConfigProvider>
  </BrowserRouter>
);

describe('Login Component', () => {
  const mockLogin = jest.fn();
  const mockClearError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      login: mockLogin,
      isLoading: false,
      error: null,
      isAuthenticated: false,
      clearError: mockClearError,
      user: null,
      loadUserProfile: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
    });
  });

  describe('UI Rendering', () => {
    it('should render login form with all required elements', () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      // 检查标题
      expect(screen.getByText('企业知识库')).toBeInTheDocument();
      expect(screen.getByText('登录您的账户以访问知识库系统')).toBeInTheDocument();

      // 检查表单字段
      expect(screen.getByPlaceholderText('请输入用户名')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('请输入密码')).toBeInTheDocument();

      // 检查按钮
      expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument();

      // 检查注册链接
      expect(screen.getByText('立即注册')).toBeInTheDocument();
    });

    it('should display error message when error exists', () => {
      mockUseAuthStore.mockReturnValue({
        login: mockLogin,
        isLoading: false,
        error: '用户名或密码错误',
        isAuthenticated: false,
        clearError: mockClearError,
        user: null,
        loadUserProfile: jest.fn(),
        logout: jest.fn(),
        register: jest.fn(),
      });

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      expect(screen.getByText('用户名或密码错误')).toBeInTheDocument();
    });

    it('should show loading state when isLoading is true', () => {
      mockUseAuthStore.mockReturnValue({
        login: mockLogin,
        isLoading: true,
        error: null,
        isAuthenticated: false,
        clearError: mockClearError,
        user: null,
        loadUserProfile: jest.fn(),
        logout: jest.fn(),
        register: jest.fn(),
      });

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const loginButton = screen.getByRole('button', { name: '登录' });
      expect(loginButton).toBeDisabled();
    });
  });

  describe('Form Validation', () => {
    it('should show validation errors for empty fields', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const loginButton = screen.getByRole('button', { name: '登录' });
      await user.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('请输入用户名')).toBeInTheDocument();
        expect(screen.getByText('请输入密码')).toBeInTheDocument();
      });
    });

    it('should validate username length', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const usernameInput = screen.getByPlaceholderText('请输入用户名');
      await user.type(usernameInput, 'ab'); // 少于3个字符

      const loginButton = screen.getByRole('button', { name: '登录' });
      await user.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('用户名至少需要3个字符')).toBeInTheDocument();
      });
    });

    it('should validate password length', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const usernameInput = screen.getByPlaceholderText('请输入用户名');
      const passwordInput = screen.getByPlaceholderText('请输入密码');
      
      await user.type(usernameInput, 'admin');
      await user.type(passwordInput, '123'); // 少于6个字符

      const loginButton = screen.getByRole('button', { name: '登录' });
      await user.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('密码至少需要6个字符')).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call login function with correct credentials', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const usernameInput = screen.getByPlaceholderText('请输入用户名');
      const passwordInput = screen.getByPlaceholderText('请输入密码');
      const loginButton = screen.getByRole('button', { name: '登录' });

      await user.type(usernameInput, 'admin');
      await user.type(passwordInput, '123456');
      await user.click(loginButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('admin', '123456');
      });
    });

    it('should handle special characters in credentials', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const usernameInput = screen.getByPlaceholderText('请输入用户名');
      const passwordInput = screen.getByPlaceholderText('请输入密码');
      const loginButton = screen.getByRole('button', { name: '登录' });

      await user.type(usernameInput, 'test@user');
      await user.type(passwordInput, 'pass@123!');
      await user.click(loginButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@user', 'pass@123!');
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to dashboard when already authenticated', () => {
      mockUseAuthStore.mockReturnValue({
        login: mockLogin,
        isLoading: false,
        error: null,
        isAuthenticated: true,
        clearError: mockClearError,
        user: null,
        loadUserProfile: jest.fn(),
        logout: jest.fn(),
        register: jest.fn(),
      });

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    it('should clear error on component unmount', () => {
      const { unmount } = render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      unmount();
      expect(mockClearError).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const usernameInput = screen.getByPlaceholderText('请输入用户名');
      const passwordInput = screen.getByPlaceholderText('请输入密码');
      const loginButton = screen.getByRole('button', { name: '登录' });

      expect(usernameInput).toHaveAttribute('type', 'text');
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(loginButton).toHaveAttribute('type', 'submit');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const usernameInput = screen.getByPlaceholderText('请输入用户名');
      
      // Tab navigation
      await user.tab();
      expect(usernameInput).toHaveFocus();

      await user.tab();
      expect(screen.getByPlaceholderText('请输入密码')).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: '登录' })).toHaveFocus();
    });
  });

  describe('Security', () => {
    it('should not expose sensitive data in DOM', () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const passwordInput = screen.getByPlaceholderText('请输入密码');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should handle XSS prevention in error messages', () => {
      const xssPayload = '<script>alert("xss")</script>';
      mockUseAuthStore.mockReturnValue({
        login: mockLogin,
        isLoading: false,
        error: xssPayload,
        isAuthenticated: false,
        clearError: mockClearError,
        user: null,
        loadUserProfile: jest.fn(),
        logout: jest.fn(),
        register: jest.fn(),
      });

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      // 错误消息应该被转义，不应该执行脚本
      expect(screen.getByText(xssPayload)).toBeInTheDocument();
      expect(document.querySelector('script')).toBeNull();
    });
  });
});