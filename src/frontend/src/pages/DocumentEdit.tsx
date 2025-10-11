/**
 * 文档编辑页面
 */
import React, { useEffect, useState } from 'react';
import {
  Card,
  Button,
  Space,
  Typography,
  Form,
  Input,
  Select,
  message,
  Spin,
  Alert,
  Upload,
  Tag,
  Divider,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  FileOutlined,
  UploadOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { DocumentService } from '../services/documentService';
import { CategoryService } from '../services/categoryService';
import { Document, DocumentStatus } from '../types/document';
import { Category } from '../services/categoryService';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { Dragger } = Upload;

interface DocumentFormData {
  title: string;
  description?: string;
  category_id?: string;
  status: DocumentStatus;
}

const DocumentEdit: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [form] = Form.useForm();
  const [document, setDocument] = useState<Document | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileList, setFileList] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      loadDocument(id);
    }
    loadCategories();
  }, [id]);

  const loadDocument = async (documentId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await DocumentService.getDocument(documentId);
      
      if (response.success && response.data) {
        const doc = response.data;
        setDocument(doc);
        
        // 设置表单初始值
        form.setFieldsValue({
          title: doc.title,
          description: doc.description || '',
          category_id: doc.category_id || undefined,
          status: doc.status,
        });
      } else {
        setError('文档不存在或已被删除');
      }
    } catch (error) {
      console.error('加载文档详情失败:', error);
      setError('加载文档详情失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await CategoryService.getCategories();
      if (response.data) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('加载分类列表失败:', error);
    }
  };

  const handleSubmit = async (values: DocumentFormData) => {
    if (!document) return;

    try {
      setSaving(true);
      const response = await DocumentService.updateDocument(document.id, values);
      
      if (response.success) {
        message.success('文档更新成功');
        navigate(`/documents/${document.id}`);
      } else {
        message.error(response.message || '更新文档失败');
      }
    } catch (error) {
      console.error('更新文档失败:', error);
      message.error('更新文档失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = {
    name: 'file',
    multiple: false,
    beforeUpload: (file: File) => {
      // 这里可以添加文件验证逻辑
      const isValidSize = file.size / 1024 / 1024 < 50; // 50MB限制
      if (!isValidSize) {
        message.error('文件大小不能超过50MB');
        return false;
      }
      return false; // 阻止自动上传，由表单提交时处理
    },
    onChange: (info: any) => {
      setFileList(info.fileList);
    },
    fileList,
  };

  const getStatusColor = (status: DocumentStatus) => {
    switch (status) {
      case DocumentStatus.PUBLISHED:
        return 'success';
      case DocumentStatus.DRAFT:
        return 'warning';
      case DocumentStatus.ARCHIVED:
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: DocumentStatus) => {
    switch (status) {
      case DocumentStatus.PUBLISHED:
        return '已发布';
      case DocumentStatus.DRAFT:
        return '草稿';
      case DocumentStatus.ARCHIVED:
        return '已归档';
      default:
        return '未知';
    }
  };

  if (loading) {
    return (
      <div className="document-edit-container p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <Spin size="large" />
            <div className="mt-4">
              <Text type="secondary">正在加载文档信息...</Text>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="document-edit-container p-6">
        <div className="max-w-4xl mx-auto">
          <Alert
            message="加载失败"
            description={error || '文档不存在'}
            type="error"
            showIcon
            action={
              <Space>
                <Button size="small" onClick={() => navigate('/documents')}>
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
    <div className="document-edit-container p-6">
      <div className="max-w-4xl mx-auto">
        {/* 页面头部 */}
        <div className="mb-6">
          <Space className="mb-4">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(`/documents/${document.id}`)}
            >
              返回详情
            </Button>
          </Space>
          
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <Title level={2} className="mb-2">
                <FileOutlined className="mr-2" />
                编辑文档
              </Title>
              <Space size="middle">
                <Tag color={getStatusColor(document.status)}>
                  {getStatusText(document.status)}
                </Tag>
                {document.file_extension && (
                  <Tag>{document.file_extension.toUpperCase()}</Tag>
                )}
                <Text type="secondary">
                  文档ID: {document.id}
                </Text>
              </Space>
            </div>
          </div>
        </div>

        {/* 编辑表单 */}
        <Card title="文档信息">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              status: DocumentStatus.DRAFT,
            }}
          >
            <Form.Item
              label="文档标题"
              name="title"
              rules={[
                { required: true, message: '请输入文档标题' },
                { max: 200, message: '标题长度不能超过200个字符' },
              ]}
            >
              <Input placeholder="请输入文档标题" />
            </Form.Item>

            <Form.Item
              label="文档描述"
              name="description"
              rules={[
                { max: 1000, message: '描述长度不能超过1000个字符' },
              ]}
            >
              <TextArea
                rows={4}
                placeholder="请输入文档描述（可选）"
              />
            </Form.Item>

            <Form.Item
              label="文档分类"
              name="category_id"
            >
              <Select
                placeholder="请选择文档分类（可选）"
                allowClear
              >
                {categories.map(category => (
                  <Option key={category.id} value={category.id}>
                    {category.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="文档状态"
              name="status"
              rules={[{ required: true, message: '请选择文档状态' }]}
            >
              <Select placeholder="请选择文档状态">
                <Option value={DocumentStatus.DRAFT}>
                  <Tag color="warning">草稿</Tag>
                </Option>
                <Option value={DocumentStatus.PUBLISHED}>
                  <Tag color="success">已发布</Tag>
                </Option>
                <Option value={DocumentStatus.ARCHIVED}>
                  <Tag color="default">已归档</Tag>
                </Option>
              </Select>
            </Form.Item>

            <Divider />

            {/* 文件替换 */}
            <Form.Item label="替换文件（可选）">
              <Dragger {...handleFileUpload}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
                <p className="ant-upload-hint">
                  支持单个文件上传，文件大小不超过50MB
                </p>
              </Dragger>
            </Form.Item>

            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={saving}
                >
                  保存更改
                </Button>
                <Button onClick={() => navigate(`/documents/${document.id}`)}>
                  取消
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>

        {/* 当前文件信息 */}
        <Card title="当前文件信息" className="mt-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Text strong>文件名:</Text>
              <Text>{document.title}</Text>
            </div>
            {document.file_extension && (
              <div className="flex items-center space-x-2">
                <Text strong>文件类型:</Text>
                <Tag>{document.file_extension.toUpperCase()}</Tag>
              </div>
            )}
            {document.file_size && (
              <div className="flex items-center space-x-2">
                <Text strong>文件大小:</Text>
                <Text>{(document.file_size / 1024 / 1024).toFixed(2)} MB</Text>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Text strong>创建时间:</Text>
              <Text>{new Date(document.created_at).toLocaleString()}</Text>
            </div>
            <div className="flex items-center space-x-2">
              <Text strong>更新时间:</Text>
              <Text>{new Date(document.updated_at).toLocaleString()}</Text>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DocumentEdit;
