/**
 * 页面头部组件
 */
import React from 'react';
import { Layout, Menu, Dropdown, Avatar, Button, Space } from 'antd';
import { UserOutlined, LogoutOutlined, SettingOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const { Header: AntHeader } = Layout;

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息',
      onClick: () => navigate('/profile'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置',
      onClick: () => navigate('/settings'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
      'data-testid': 'logout-menu-item',
    },
  ];

  const mainMenuItems = [
    {
      key: 'dashboard',
      label: '仪表板',
      onClick: () => navigate('/dashboard'),
    },
    {
      key: 'documents',
      label: '文档管理',
      onClick: () => navigate('/documents'),
    },
    {
      key: 'search',
      label: '搜索',
      onClick: () => navigate('/search'),
    },
    {
      key: 'knowledge-graph',
      label: '知识图谱',
      onClick: () => navigate('/knowledge-graph'),
    },
  ];

  return (
    <AntHeader className="bg-white shadow-sm border-b border-gray-200 px-6 flex items-center justify-between">
      <div className="flex items-center space-x-8">
        <div className="text-xl font-bold text-blue-600">
          企业知识库
        </div>
        <Menu
          mode="horizontal"
          items={mainMenuItems}
          className="border-none bg-transparent"
          style={{ minWidth: 0, flex: 'auto' }}
        />
      </div>

      <div className="flex items-center space-x-4">
        {user ? (
          <Dropdown
            menu={{ items: userMenuItems }}
            placement="bottomRight"
            trigger={['click']}
          >
            <Space className="cursor-pointer hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors user-info" data-testid="user-info">
              <Avatar size="small" icon={<UserOutlined />} className="user-avatar" />
              <span className="text-gray-700">{user.username}</span>
            </Space>
          </Dropdown>
        ) : (
          <Button type="primary" onClick={() => navigate('/login')}>
            登录
          </Button>
        )}
      </div>
    </AntHeader>
  );
};