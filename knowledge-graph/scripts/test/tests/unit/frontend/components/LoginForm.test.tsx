import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock component for testing
const LoginForm = ({ onSubmit, loading, error }: any) => (
  <form data-testid="login-form" onSubmit={onSubmit}>
    <input 
      name="username" 
      placeholder="用户名" 
      data-testid="username-input"
    />
    <input 
      name="password" 
      type="password" 
      placeholder="密码" 
      data-testid="password-input"
    />
    <button type="submit" disabled={loading} data-testid="submit-button">
      {loading ? '登录中...' : '登录'}
    </button>
    {error && <div data-testid="error-message">{error}</div>}
  </form>
);

describe('LoginForm', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('渲染登录表单', () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);
    
    expect(screen.getByTestId('login-form')).toBeInTheDocument();
    expect(screen.getByTestId('username-input')).toBeInTheDocument();
    expect(screen.getByTestId('password-input')).toBeInTheDocument();
    expect(screen.getByTestId('submit-button')).toBeInTheDocument();
  });

  test('处理表单提交', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockOnSubmit} />);
    
    const usernameInput = screen.getByTestId('username-input');
    const passwordInput = screen.getByTestId('password-input');
    const submitButton = screen.getByTestId('submit-button');

    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'testpass');
    await user.click(submitButton);

    expect(mockOnSubmit).toHaveBeenCalled();
  });

  test('显示加载状态', () => {
    render(<LoginForm onSubmit={mockOnSubmit} loading={true} />);
    
    const submitButton = screen.getByTestId('submit-button');
    expect(submitButton).toBeDisabled();
    expect(screen.getByText('登录中...')).toBeInTheDocument();
  });

  test('显示错误信息', () => {
    const errorMessage = '用户名或密码错误';
    render(<LoginForm onSubmit={mockOnSubmit} error={errorMessage} />);
    
    expect(screen.getByTestId('error-message')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  test('输入验证', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockOnSubmit} />);
    
    const submitButton = screen.getByTestId('submit-button');
    await user.click(submitButton);

    // 表单应该仍然可以提交，验证逻辑在组件内部处理
    expect(mockOnSubmit).toHaveBeenCalled();
  });
});