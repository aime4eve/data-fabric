/**
 * 文档详情页面
 */
import React, { useEffect, useState } from "react";
import {
  Card,
  Button,
  Space,
  Typography,
  Tag,
  Descriptions,
  message,
  Spin,
  Alert,
  Modal,
  Divider,
} from "antd";
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  EditOutlined,
  DeleteOutlined,
  FileOutlined,
  CalendarOutlined,
  UserOutlined,
  FolderOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import { DocumentService } from "../services/documentService";
import { Document, DocumentStatus } from "../types/document";

const { Title, Text, Paragraph } = Typography;
const { confirm } = Modal;

const DocumentDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadDocument(id);
    }
  }, [id]);

  const loadDocument = async (documentId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await DocumentService.getDocument(documentId);
      
      if (response.success && response.data) {
        setDocument(response.data);
      } else {
        setError(response.message || "文档不存在或已被删除");
      }
    } catch (error) {
      console.error("加载文档详情失败:", error);
      setError("加载文档详情失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!document) return;

    try {
      setDownloading(true);
      const blob = await DocumentService.downloadDocument(document.id);
      
      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.title || 'document';
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
      
      message.success("文档下载成功");
    } catch (error) {
      console.error("下载文档失败:", error);
      message.error("下载文档失败，请稍后重试");
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = () => {
    if (!document) return;

    confirm({
      title: "确认删除",
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除文档"${document.title}"吗？此操作不可恢复。`,
      okText: "确认删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        try {
          setDeleting(true);
          const response = await DocumentService.deleteDocument(document.id);
          
          if (response.success) {
            message.success("文档删除成功");
            navigate("/documents");
          } else {
            message.error(response.message || "删除文档失败");
          }
        } catch (error) {
          console.error("删除文档失败:", error);
          message.error("删除文档失败，请稍后重试");
        } finally {
          setDeleting(false);
        }
      },
    });
  };

  const getStatusColor = (status: DocumentStatus) => {
    switch (status) {
      case DocumentStatus.PUBLISHED:
        return "success";
      case DocumentStatus.DRAFT:
        return "warning";
      case DocumentStatus.ARCHIVED:
        return "default";
      default:
        return "default";
    }
  };

  const getStatusText = (status: DocumentStatus) => {
    switch (status) {
      case DocumentStatus.PUBLISHED:
        return "已发布";
      case DocumentStatus.DRAFT:
        return "草稿";
      case DocumentStatus.ARCHIVED:
        return "已归档";
      default:
        return "未知";
    }
  };

  if (loading) {
    return (
      <div className="document-detail-container p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <Spin size="large" />
            <div className="mt-4">
              <Text type="secondary">正在加载文档详情...</Text>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="document-detail-container p-6">
        <div className="max-w-4xl mx-auto">
          <Alert
            message="加载失败"
            description={error || "文档不存在"}
            type="error"
            showIcon
            action={
              <Space>
                <Button size="small" onClick={() => navigate("/documents")}>
                  返回文档列表
                </Button>
                <Button size="small" type="primary" onClick={() => id && loadDocument(id)}>
                  重新加载
                </Button>
              </Space>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="document-detail-container p-6">
      <div className="max-w-4xl mx-auto">
        {/* 页面头部 */}
        <div className="mb-6">
          <Space className="mb-4">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate("/documents")}
            >
              返回列表
            </Button>
          </Space>
          
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <Title level={2} className="mb-2">
                <FileOutlined className="mr-2" />
                {document.title}
              </Title>
              <Space size="middle">
                <Tag color={getStatusColor(document.status)}>
                  {getStatusText(document.status)}
                </Tag>
                {document.file_extension && (
                  <Tag>{document.file_extension.toUpperCase()}</Tag>
                )}
                {document.file_size && (
                  <Text type="secondary">
                    大小: {(document.file_size / 1024 / 1024).toFixed(2)} MB
                  </Text>
                )}
              </Space>
            </div>
            
            <Space>
              <Button
                icon={<DownloadOutlined />}
                loading={downloading}
                onClick={handleDownload}
              >
                下载
              </Button>
              <Button
                icon={<EditOutlined />}
                type="primary"
                onClick={() => navigate(`/documents/${document.id}/edit`)}
              >
                编辑
              </Button>
              <Button
                icon={<DeleteOutlined />}
                danger
                loading={deleting}
                onClick={handleDelete}
              >
                删除
              </Button>
            </Space>
          </div>
        </div>

        {/* 文档信息 */}
        <Card title="文档信息" className="mb-6">
          <Descriptions column={2} bordered>
            <Descriptions.Item label="文档ID" span={1}>
              <Text code>{document.id}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="状态" span={1}>
              <Tag color={getStatusColor(document.status)}>
                {getStatusText(document.status)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="创建时间" span={1}>
              <Space>
                <CalendarOutlined />
                {new Date(document.created_at).toLocaleString()}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="更新时间" span={1}>
              <Space>
                <CalendarOutlined />
                {new Date(document.updated_at).toLocaleString()}
              </Space>
            </Descriptions.Item>
            {document.category_name && (
              <Descriptions.Item label="分类" span={1}>
                <Space>
                  <FolderOutlined />
                  {document.category_name}
                </Space>
              </Descriptions.Item>
            )}
            {document.file_extension && (
              <Descriptions.Item label="文件类型" span={1}>
                <Tag>{document.file_extension.toUpperCase()}</Tag>
              </Descriptions.Item>
            )}
            {document.file_size && (
              <Descriptions.Item label="文件大小" span={1}>
                {(document.file_size / 1024 / 1024).toFixed(2)} MB
              </Descriptions.Item>
            )}
            {document.content_path && (
              <Descriptions.Item label="存储路径" span={2}>
                <Text code>{document.content_path}</Text>
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        {/* 文档描述 */}
        {document.description && (
          <Card title="文档描述" className="mb-6">
            <Paragraph>{document.description}</Paragraph>
          </Card>
        )}

        {/* 操作历史 */}
        <Card title="操作历史">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <CalendarOutlined />
              <Text>创建于 {new Date(document.created_at).toLocaleString()}</Text>
            </div>
            <div className="flex items-center space-x-2">
              <CalendarOutlined />
              <Text>最后更新于 {new Date(document.updated_at).toLocaleString()}</Text>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DocumentDetail;
