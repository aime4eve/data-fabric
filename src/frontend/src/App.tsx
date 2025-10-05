/**
 * 主应用组件
 */
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { QueryClient, QueryClientProvider } from 'react-query';
import { useAuthStore } from './store/authStore';
import { MainLayout } from './components/Layout/MainLayout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { DocumentManagement } from './pages/DocumentManagement';
import { DocumentUpload } from './pages/DocumentUpload';
import { SearchPage } from './pages/Search';
import { KnowledgeGraph } from './pages/KnowledgeGraph';
import { CategoryManagement } from './pages/CategoryManagement';
import Settings from './pages/Settings';
import './App.css';

// 创建 React Query 客户端
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// 受保护的路由组件
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loadUserProfile, isLoading } = useAuthStore();

  useEffect(() => {
    // 应用启动时尝试加载用户信息
    if (localStorage.getItem('access_token') && !isAuthenticated) {
      loadUserProfile();
    }
  }, [loadUserProfile, isAuthenticated]);

  // 如果正在加载，显示加载状态
  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// 公共路由组件（已登录用户重定向到仪表板）
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider locale={zhCN}>
        <Router>
          <div className="App">
            <Routes>
              {/* 公共路由 */}
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <PublicRoute>
                    <Register />
                  </PublicRoute>
                }
              />

              {/* 受保护的路由 */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Dashboard />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/documents/upload"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <DocumentUpload />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/documents"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <DocumentManagement />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/search"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <SearchPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/knowledge-graph"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <KnowledgeGraph />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/categories"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <CategoryManagement />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Settings />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Navigate to="/dashboard" replace />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </div>
        </Router>
      </ConfigProvider>
    </QueryClientProvider>
  );
}

export default App;
