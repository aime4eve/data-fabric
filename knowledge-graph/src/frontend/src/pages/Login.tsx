/**
 * 登录页面
 */
import React, { useEffect } from 'react';
import { Form, Input, Button, Card, Alert, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const { Title, Text } = Typography;

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading, error, isAuthenticated, clearError } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // 清除之前的错误信息
    return () => clearError();
  }, [clearError]);

  const onFinish = async (values: { username: string; password: string }) => {
    console.log('开始登录:', values.username);
    const result = await login(values.username, values.password);
    console.log('登录结果:', result);
    
    // 强制检查认证状态
    if (result && result.success) {
      console.log('登录成功，准备跳转到仪表板');
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <div className="text-center mb-8">
          <Title level={2} className="text-blue-600 mb-2">
            企业知识库
          </Title>
          <Text type="secondary">
            登录您的账户以访问知识库系统
          </Text>
        </div>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            className="mb-4 error-message"
            data-testid="error-message"
            closable
            onClose={clearError}
          />
        )}

        <Form
          name="login"
          onFinish={onFinish}
          layout="vertical"
          size="large"
          className="login-form"
          data-testid="login-form"
        >
          <Form.Item
            name="username"
            label="用户名或邮箱"
            rules={[
              { required: true, message: '请输入用户名或邮箱' },
            ]}
          >
            <Input
              id="username"
              name="username"
              data-testid="username-input"
              prefix={<UserOutlined />}
              placeholder="请输入用户名或邮箱"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '请输入密码' },
            ]}
          >
            <Input.Password
              id="password"
              name="password"
              data-testid="password-input"
              prefix={<LockOutlined />}
              placeholder="请输入密码"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              className="w-full login-button"
              data-testid="login-button"
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        <div className="text-center">
          <Text type="secondary">
            还没有账户？{' '}
            <Link to="/register" className="text-blue-600 hover:text-blue-800" data-testid="register-link">
              立即注册
            </Link>
          </Text>
        </div>
      </Card>
    </div>
  );
};