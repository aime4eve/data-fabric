/**
 * 仪表板页面
 */
import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Typography, List, Button, Space } from 'antd';
import {
  FileTextOutlined,
  EyeOutlined,
  UserOutlined,
  ClockCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { DocumentService } from '../services/documentService';
import { Document } from '../types/document';

const { Title, Text } = Typography;

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [statistics, setStatistics] = useState({
    total_documents: 0,
    published_documents: 0,
    draft_documents: 0,
    archived_documents: 0,
  });
  const [recentDocuments, setRecentDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // 加载统计数据
      const stats = await DocumentService.getDocumentStatistics();
      setStatistics(stats);

      // 加载最近文档
      const documentsResponse = await DocumentService.getDocuments({
        page: 1,
        size: 5,
      });
      if (documentsResponse.success) {
        setRecentDocuments(documentsResponse.data || []);
      }
    } catch (error) {
      console.error('加载仪表板数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const statisticsData = [
    {
      title: '总文档数',
      value: statistics.total_documents,
      icon: <FileTextOutlined className="text-blue-500" />,
      color: '#1890ff',
    },
    {
      title: '已发布',
      value: statistics.published_documents,
      icon: <EyeOutlined className="text-green-500" />,
      color: '#52c41a',
    },
    {
      title: '草稿',
      value: statistics.draft_documents,
      icon: <ClockCircleOutlined className="text-orange-500" />,
      color: '#fa8c16',
    },
    {
      title: '已归档',
      value: statistics.archived_documents,
      icon: <UserOutlined className="text-gray-500" />,
      color: '#8c8c8c',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 欢迎信息 */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <Title level={3} className="mb-2">
              欢迎回来，{user?.username}！
            </Title>
            <Text type="secondary">
              这里是您的知识库管理仪表板，您可以查看最新的统计信息和文档动态。
            </Text>
          </div>
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={() => navigate('/documents/upload')}
          >
            上传文档
          </Button>
        </div>
      </Card>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]}>
        {statisticsData.map((stat, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
            <Card loading={loading}>
              <Statistic
                title={stat.title}
                value={stat.value}
                prefix={stat.icon}
                valueStyle={{ color: stat.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* 最近文档和快捷操作 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card
            title="最近文档"
            extra={
              <Button type="link" onClick={() => navigate('/documents')}>
                查看全部
              </Button>
            }
            loading={loading}
          >
            <List
              dataSource={recentDocuments}
              renderItem={(document) => (
                <List.Item
                  actions={[
                    <Button
                      type="link"
                      onClick={() => navigate(`/documents/${document.id}`)}
                    >
                      查看
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<FileTextOutlined className="text-blue-500" />}
                    title={document.title}
                    description={
                      <Space>
                        <Text type="secondary">
                          状态: {document.status}
                        </Text>
                        <Text type="secondary">
                          更新时间: {new Date(document.updated_at).toLocaleDateString()}
                        </Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
              locale={{ emptyText: '暂无文档' }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="快捷操作">
            <Space direction="vertical" className="w-full">
              <Button
                type="primary"
                block
                icon={<PlusOutlined />}
                onClick={() => navigate('/documents/upload')}
              >
                上传新文档
              </Button>
              <Button
                block
                icon={<FileTextOutlined />}
                onClick={() => navigate('/documents')}
              >
                管理文档
              </Button>
              <Button
                block
                icon={<EyeOutlined />}
                onClick={() => navigate('/search')}
              >
                搜索文档
              </Button>
              <Button
                block
                icon={<UserOutlined />}
                onClick={() => navigate('/knowledge-graph')}
              >
                知识图谱
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};