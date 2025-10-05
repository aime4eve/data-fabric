/**
 * 文档管理页面
 */
import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Select,
  Tag,
  Modal,
  message,
  Upload,
  Form,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  DownloadOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { DocumentService } from '../services/documentService';
import { Document, DocumentStatus } from '../types/document';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload/interface';

const { Search } = Input;
const { Option } = Select;

export const DocumentManagement: React.FC = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all');
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploadForm] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, [searchText, statusFilter]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: 1,
        size: 100,
      };

      if (searchText) {
        params.title = searchText;
      }

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const response = await DocumentService.getDocuments(params);
      if (response.success) {
        setDocuments(response.documents);
      }
    } catch (error) {
      message.error('加载文档列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (values: any) => {
    if (fileList.length === 0) {
      message.error('请选择要上传的文件');
      return;
    }

    try {
      setUploading(true);
      const file = fileList[0];
      
      const response = await DocumentService.uploadDocument(
        file.originFileObj as File,
        values.title,
        values.description,
        values.category_id
      );

      if (response.success) {
        message.success('文档上传成功');
        setUploadModalVisible(false);
        uploadForm.resetFields();
        setFileList([]);
        loadDocuments();
      }
    } catch (error) {
      message.error('文档上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (document: Document) => {
    try {
      await DocumentService.downloadDocument(document.id);
      message.success('文档下载开始');
    } catch (error) {
      message.error('文档下载失败');
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      const response = await DocumentService.deleteDocument(documentId);
      if (response.success) {
        message.success('文档删除成功');
        loadDocuments();
      }
    } catch (error) {
      message.error('文档删除失败');
    }
  };

  const handlePublish = async (documentId: string) => {
    try {
      const response = await DocumentService.publishDocument(documentId);
      if (response.success) {
        message.success('文档发布成功');
        loadDocuments();
      }
    } catch (error) {
      message.error('文档发布失败');
    }
  };

  const handleArchive = async (documentId: string) => {
    try {
      const response = await DocumentService.archiveDocument(documentId);
      if (response.success) {
        message.success('文档归档成功');
        loadDocuments();
      }
    } catch (error) {
      message.error('文档归档失败');
    }
  };

  const getStatusColor = (status: DocumentStatus) => {
    switch (status) {
      case DocumentStatus.PUBLISHED:
        return 'green';
      case DocumentStatus.DRAFT:
        return 'orange';
      case DocumentStatus.ARCHIVED:
        return 'gray';
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
        return status;
    }
  };

  const columns: ColumnsType<Document> = [
    {
      title: '文档标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: DocumentStatus) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: '文件大小',
      dataIndex: 'file_size',
      key: 'file_size',
      width: 120,
      render: (size: number) => {
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
        return `${(size / (1024 * 1024)).toFixed(1)} MB`;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '操作',
      key: 'actions',
      width: 300,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/documents/${record.id}`)}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(record)}
          >
            下载
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/documents/${record.id}/edit`)}
          >
            编辑
          </Button>
          {record.status === DocumentStatus.DRAFT && (
            <Button
              type="link"
              size="small"
              onClick={() => handlePublish(record.id)}
            >
              发布
            </Button>
          )}
          {record.status === DocumentStatus.PUBLISHED && (
            <Button
              type="link"
              size="small"
              onClick={() => handleArchive(record.id)}
            >
              归档
            </Button>
          )}
          <Popconfirm
            title="确定要删除这个文档吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">文档管理</h2>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setUploadModalVisible(true)}
          >
            上传文档
          </Button>
        </div>

        <div className="flex items-center space-x-4 mb-4">
          <Search
            placeholder="搜索文档标题"
            allowClear
            style={{ width: 300 }}
            onSearch={setSearchText}
            onChange={(e) => !e.target.value && setSearchText('')}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 120 }}
          >
            <Option value="all">全部状态</Option>
            <Option value={DocumentStatus.PUBLISHED}>已发布</Option>
            <Option value={DocumentStatus.DRAFT}>草稿</Option>
            <Option value={DocumentStatus.ARCHIVED}>已归档</Option>
          </Select>
        </div>

        <Table
          columns={columns}
          dataSource={documents}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>

      {/* 上传文档模态框 */}
      <Modal
        title="上传文档"
        open={uploadModalVisible}
        onCancel={() => {
          setUploadModalVisible(false);
          uploadForm.resetFields();
          setFileList([]);
        }}
        footer={null}
        width={600}
      >
        <Form
          form={uploadForm}
          layout="vertical"
          onFinish={handleUpload}
        >
          <Form.Item
            name="title"
            label="文档标题"
            rules={[{ required: true, message: '请输入文档标题' }]}
          >
            <Input placeholder="请输入文档标题" />
          </Form.Item>

          <Form.Item
            name="description"
            label="文档描述"
          >
            <Input.TextArea
              rows={3}
              placeholder="请输入文档描述（可选）"
            />
          </Form.Item>

          <Form.Item
            name="category_id"
            label="文档分类"
          >
            <Select placeholder="请选择文档分类（可选）">
              <Option value="1">技术文档</Option>
              <Option value="2">产品文档</Option>
              <Option value="3">管理制度</Option>
              <Option value="4">其他</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="选择文件"
            required
          >
            <Upload
              fileList={fileList}
              onChange={({ fileList }) => setFileList(fileList)}
              beforeUpload={() => false}
              maxCount={1}
              accept=".pdf,.doc,.docx,.txt,.md"
            >
              <Button icon={<UploadOutlined />}>选择文件</Button>
            </Upload>
            <div className="text-gray-500 text-sm mt-2">
              支持格式：PDF、Word、TXT、Markdown，最大 10MB
            </div>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={uploading}
              >
                上传
              </Button>
              <Button
                onClick={() => {
                  setUploadModalVisible(false);
                  uploadForm.resetFields();
                  setFileList([]);
                }}
              >
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};