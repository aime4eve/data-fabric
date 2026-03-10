/**
 * 主布局组件
 */
import React from 'react';
import { Layout } from 'antd';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

const { Content } = Layout;

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <Layout className="min-h-screen">
      <Header />
      <Layout>
        <Sidebar />
        <Layout className="bg-gray-50">
          <Content className="p-6">
            {children}
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};