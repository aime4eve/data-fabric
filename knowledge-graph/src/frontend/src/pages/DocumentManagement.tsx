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
  Typography,
  Alert,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  DownloadOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  UploadOutlined,
  ReloadOutlined,
  FileOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { DocumentService } from '../services/documentService';
import { CategoryService, Category } from '../services/categoryService';
import { Document, DocumentStatus } from '../types/document';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload/interface';

const { Search } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

export const DocumentManagement: React.FC = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all');
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploadForm] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // 初始化时加载文档列表和分类数据
  useEffect(() => {
    loadDocuments();
    loadCategories();
  }, []);

  // 搜索和筛选时重新加载
  useEffect(() => {
    loadDocuments(1, pagination.pageSize);
  }, [searchText, statusFilter]);

  // 加载分类数据
  const loadCategories = async () => {
    try {
      const response = await CategoryService.getCategoryTree();
      setCategories(response.data || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
      message.error('加载分类失败');
    }
  };

  // 递归渲染分类选项
  const renderCategoryOptions = (categories: Category[], level = 0): JSX.Element[] => {
    const result: JSX.Element[] = [];
    
    categories.forEach(category => {
      const prefix = '　'.repeat(level);
      result.push(
        <Option key={category.id} value={category.id}>
          {prefix}{category.name}
        </Option>
      );
      
      if (category.children && category.children.length > 0) {
        result.push(...renderCategoryOptions(category.children, level + 1));
      }
    });
    
    return result;
  };

  const loadDocuments = async (page = 1, pageSize = 10) => {
    try {
      setLoading(true);
      let response;

      if (searchText) {
        // 使用搜索API
        response = await DocumentService.searchDocuments({
          query: searchText,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          page,
          size: pageSize,
        });
      } else {
        // 使用普通列表API
        const params: any = {
          page,
          size: pageSize,
        };

        if (statusFilter !== 'all') {
          params.status = statusFilter;
        }

        response = await DocumentService.getDocuments(params);
      }

      if (response.success) {
        setDocuments(response.documents || response.data || []);
        setPagination({
          current: page,
          pageSize,
          total: response.total || 0,
        });
      } else {
        message.error('加载文档列表失败');
        setDocuments([]);
        setPagination({
          current: 1,
          pageSize: 10,
          total: 0,
        });
      }
    } catch (error) {
      console.error('加载文档列表失败:', error);
      message.error('加载文档列表失败');
      // 设置空数据，避免界面异常
      setDocuments([]);
      setPagination({
        current: 1,
        pageSize: 10,
        total: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPagination({ ...pagination, current: 1 });
  };

  const handleStatusFilterChange = (value: DocumentStatus | 'all') => {
    setStatusFilter(value);
    setPagination({ ...pagination, current: 1 });
  };

  const handleTableChange = (paginationInfo: any) => {
    const { current, pageSize } = paginationInfo;
    loadDocuments(current, pageSize);
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
        values.description || '',
        values.category_id || '',
        '01_公司基本信息'
      );
      
      if (response.success) {
        message.success('文档上传成功');
        setUploadModalVisible(false);
        uploadForm.resetFields();
        setFileList([]);
        // 重新加载文档列表
        loadDocuments(pagination.current, pagination.pageSize);
      } else {
        message.error(response.message || '文档上传失败');
      }
    } catch (error) {
      console.error('文档上传失败:', error);
      message.error('文档上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (document: Document) => {
    try {
      const response = await DocumentService.downloadDocument(document.id);
      
      // 创建下载链接
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = window.document.createElement('a');
      link.href = url;
      link.setAttribute('download', document.title);
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      message.success('文档下载成功');
    } catch (error) {
      console.error('文档下载失败:', error);
      message.error('文档下载失败');
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      const response = await DocumentService.deleteDocument(documentId);
      if (response.success) {
        message.success('文档删除成功');
        // 重新加载文档列表
        loadDocuments(pagination.current, pagination.pageSize);
      } else {
        message.error(response.message || '文档删除失败');
      }
    } catch (error) {
      console.error('文档删除失败:', error);
      message.error('文档删除失败');
    }
  };

  const handlePublish = async (documentId: string) => {
    try {
      const response = await DocumentService.publishDocument(documentId);
      if (response.success) {
        message.success('文档发布成功');
        loadDocuments(pagination.current, pagination.pageSize);
      } else {
        message.error(response.message || '文档发布失败');
      }
    } catch (error) {
      console.error('文档发布失败:', error);
      message.error('文档发布失败');
    }
  };

  const handleArchive = async (documentId: string) => {
    try {
      const response = await DocumentService.archiveDocument(documentId);
      if (response.success) {
        message.success('文档归档成功');
        loadDocuments(pagination.current, pagination.pageSize);
      } else {
        message.error(response.message || '文档归档失败');
      }
    } catch (error) {
      console.error('文档归档失败:', error);
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
        return '未知';
    }
  };

  const columns: ColumnsType<Document> = [
    {
      title: '文档标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (title: string, record: Document) => (
        <Space>
          <FileOutlined />
          <span>{title}</span>
        </Space>
      ),
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
        if (!size) return '-';
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
      render: (date: string) => date ? new Date(date).toLocaleString() : '-',
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
            data-testid={`view-document-${record.id}`}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(record)}
            data-testid={`download-document-${record.id}`}
          >
            下载
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/documents/${record.id}/edit`)}
            data-testid={`edit-document-${record.id}`}
          >
            编辑
          </Button>
          {record.status === DocumentStatus.DRAFT && (
            <Button
              type="link"
              size="small"
              onClick={() => handlePublish(record.id)}
              data-testid={`publish-document-${record.id}`}
            >
              发布
            </Button>
          )}
          {record.status === DocumentStatus.PUBLISHED && (
            <Button
              type="link"
              size="small"
              onClick={() => handleArchive(record.id)}
              data-testid={`archive-document-${record.id}`}
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
              data-testid={`delete-document-${record.id}`}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="document-management-container p-6" data-testid="documents-page">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Title level={2}>文档管理</Title>
          <Text type="secondary">
            管理和组织您的文档，支持上传、搜索、分类和状态管理
          </Text>
        </div>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <Space>
              <Search
                placeholder="搜索文档标题"
                allowClear
                style={{ width: 300 }}
                onSearch={handleSearch}
                onChange={(e) => !e.target.value && setSearchText('')}
                data-testid="search-input"
              />
              <Select
                value={statusFilter}
                onChange={handleStatusFilterChange}
                style={{ width: 120 }}
                data-testid="status-filter"
              >
                <Option value="all">全部状态</Option>
                <Option value={DocumentStatus.PUBLISHED}>已发布</Option>
                <Option value={DocumentStatus.DRAFT}>草稿</Option>
                <Option value={DocumentStatus.ARCHIVED}>已归档</Option>
              </Select>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => loadDocuments(pagination.current, pagination.pageSize)}
                data-testid="refresh-button"
              >
                刷新
              </Button>
            </Space>
            
            <Space>
              <Button
                type="default"
                icon={<PlusOutlined />}
                onClick={() => navigate('/documents/upload')}
                data-testid="goto-upload-button"
              >
                前往上传页面
              </Button>
              <Button
                type="primary"
                icon={<UploadOutlined />}
                onClick={() => setUploadModalVisible(true)}
                data-testid="quick-upload-button"
              >
                快速上传
              </Button>
            </Space>
          </div>

          {documents.length === 0 && !loading ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span>
                  {searchText || statusFilter !== 'all' 
                    ? '没有找到符合条件的文档' 
                    : '暂无文档，点击上传按钮添加文档'
                  }
                </span>
              }
              data-testid="empty-documents"
            >
              {!searchText && statusFilter === 'all' && (
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={() => navigate('/documents/upload')}
                >
                  立即上传
                </Button>
              )}
            </Empty>
          ) : (
            <Table
              columns={columns}
              dataSource={documents}
              rowKey="id"
              loading={loading}
              pagination={{
                ...pagination,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
                pageSizeOptions: ['10', '20', '50', '100'],
              }}
              onChange={handleTableChange}
              data-testid="documents-table"
            />
          )}
        </Card>

        {/* 快速上传文档模态框 */}
        <Modal
          title="快速上传文档"
          open={uploadModalVisible}
          onCancel={() => {
            setUploadModalVisible(false);
            uploadForm.resetFields();
            setFileList([]);
          }}
          footer={null}
          width={600}
          data-testid="upload-modal"
        >
          <Alert
            message="快速上传说明"
            description="快速上传将文档保存到默认目录，如需选择特定目录，请使用完整上传功能。"
            type="info"
            showIcon
            className="mb-4"
          />
          
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
              <Input placeholder="请输入文档标题" data-testid="modal-title-input" />
            </Form.Item>

            <Form.Item
              name="description"
              label="文档描述"
            >
              <Input.TextArea
                rows={3}
                placeholder="请输入文档描述（可选）"
                data-testid="modal-description-input"
              />
            </Form.Item>

            <Form.Item
              name="category_id"
              label="文档分类"
            >
              <Select placeholder="请选择文档分类（可选）" data-testid="modal-category-select">
                {renderCategoryOptions(categories)}
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
                accept=".pdf,.doc,.docx,.txt,.md,.xls,.xlsx,.ppt,.pptx,.csv"
                data-testid="modal-file-upload"
              >
                <Button icon={<UploadOutlined />}>选择文件</Button>
              </Upload>
              <div className="text-gray-500 text-sm mt-2">
                支持格式：PDF、Word、Excel、PowerPoint、TXT、Markdown、CSV，最大 10MB
              </div>
            </Form.Item>

            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={uploading}
                  data-testid="modal-upload-button"
                >
                  上传
                </Button>
                <Button
                  onClick={() => {
                    setUploadModalVisible(false);
                    uploadForm.resetFields();
                    setFileList([]);
                  }}
                  data-testid="modal-cancel-button"
                >
                  取消
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </div>
  );
};