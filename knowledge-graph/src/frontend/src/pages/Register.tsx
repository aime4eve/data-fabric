/**
 * 注册页面
 */
import React, { useState } from 'react';
import { Form, Input, Button, Card, Alert, Typography, message } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const { Title, Text } = Typography;

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuthStore();
  const [form] = Form.useForm();

  const onFinish = async (values: { username: string; email: string; password: string }) => {
    try {
      await register(values.username, values.email, values.password);
      message.success('注册成功！请登录您的账户');
      navigate('/login');
    } catch (err) {
      // 错误已经在store中处理
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
            创建您的账户以开始使用知识库系统
          </Text>
        </div>

        {error && (
          <Alert
            message={error}
            type="error"
            description="请检查邮箱格式或域名可达性"
            showIcon
            className="mb-4 error-message"
            data-testid="error-message"
            closable
            onClose={clearError}
          />
        )}

        <Form
          form={form}
          name="register"
          onFinish={onFinish}
          layout="vertical"
          size="large"
          className="register-form"
          data-testid="register-form"
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名至少3个字符' },
              { max: 20, message: '用户名最多20个字符' },
            ]}
          >
            <Input
              id="username"
              name="username"
              data-testid="username-input"
              prefix={<UserOutlined />}
              placeholder="请输入用户名"
            />
          </Form.Item>

          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input
              id="email"
              name="email"
              data-testid="email-input"
              prefix={<MailOutlined />}
              placeholder="请输入邮箱"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6个字符' },
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

          <Form.Item
            name="confirmPassword"
            label="确认密码"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password
              id="confirmPassword"
              name="confirmPassword"
              data-testid="confirm-password-input"
              prefix={<LockOutlined />}
              placeholder="请再次输入密码"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              className="w-full register-button"
              data-testid="register-button"
            >
              注册
            </Button>
          </Form.Item>
        </Form>

        <div className="text-center">
          <Text type="secondary">
            已有账户？{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-800" data-testid="login-link">
              立即登录
            </Link>
          </Text>
        </div>
      </Card>
    </div>
  );
};