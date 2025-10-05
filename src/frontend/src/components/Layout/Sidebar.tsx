/**
 * 侧边栏组件
 */
import React from 'react';
import { Layout, Menu } from 'antd';
import {
  DashboardOutlined,
  FileTextOutlined,
  SearchOutlined,
  ShareAltOutlined,
  FolderOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const { Sider } = Layout;

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表板',
      onClick: () => navigate('/dashboard'),
    },
    {
      key: '/documents',
      icon: <FileTextOutlined />,
      label: <span data-testid="nav-documents">文档管理</span>,
      onClick: () => navigate('/documents'),
    },
    {
      key: '/categories',
      icon: <FolderOutlined />,
      label: '分类管理',
      onClick: () => navigate('/categories'),
    },
    {
      key: '/search',
      icon: <SearchOutlined />,
      label: '搜索',
      onClick: () => navigate('/search'),
    },
    {
      key: '/knowledge-graph',
      icon: <ShareAltOutlined />,
      label: '知识图谱',
      onClick: () => navigate('/knowledge-graph'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '设置',
      onClick: () => navigate('/settings'),
    },
  ];

  return (
    <Sider
      width={240}
      className="bg-white shadow-sm border-r border-gray-200"
      theme="light"
    >
      <div className="p-4">
        <div className="text-lg font-semibold text-gray-800 mb-4">
          导航菜单
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          className="border-none"
        />
      </div>
    </Sider>
  );
};