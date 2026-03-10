/**
 * 文件列表组件
 */
import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  Upload, 
  message, 
  Dropdown, 
  Space,
  Tag,
  Tooltip,
  Progress
} from 'antd';
import { 
  UploadOutlined, 
  DownloadOutlined, 
  EditOutlined, 
  DeleteOutlined,
  MoreOutlined,
  FileOutlined,
  EyeOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile, UploadProps } from 'antd/es/upload';
import { FileService, FileInfo, FileUpdateRequest } from '../../services/fileService';
import { formatFileSize, formatDateTime } from '../../utils/format';

interface FileListProps {
  directoryId?: string | null;
  onFileSelect?: (file: FileInfo) => void;
  showActions?: boolean;
}

export const FileList: React.FC<FileListProps> = ({
  directoryId,
  onFileSelect,
  showActions = true
}) => {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentFile, setCurrentFile] = useState<FileInfo | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  
  const [editForm] = Form.useForm();

  // 加载文件列表
  const loadFiles = async () => {
    setLoading(true);
    try {
      const fileList = await FileService.getFiles({
        directory_id: directoryId || undefined
      });
      setFiles(fileList);
    } catch (error) {
      message.error('加载文件列表失败');
      console.error('Load files error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 处理文件上传
  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);
    
    try {
      // 模拟上传进度
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      await FileService.uploadFile({
        file,
        directory_id: directoryId || undefined
      });

      clearInterval(progressInterval);
      setUploadProgress(100);
      
      message.success('文件上传成功');
      setUploadModalVisible(false);
      loadFiles();
    } catch (error) {
      message.error('文件上传失败');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // 处理文件下载
  const handleDownload = async (file: FileInfo) => {
    try {
      const blob = await FileService.downloadFile(file.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.original_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success('文件下载成功');
    } catch (error) {
      message.error('文件下载失败');
      console.error('Download error:', error);
    }
  };

  // 处理文件编辑
  const handleEdit = (file: FileInfo) => {
    setCurrentFile(file);
    editForm.setFieldsValue({
      name: file.name,
      description: file.description
    });
    setEditModalVisible(true);
  };

  // 处理文件删除
  const handleDelete = (file: FileInfo) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除文件 "${file.original_name}" 吗？此操作不可恢复。`,
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await FileService.deleteFile(file.id);
          message.success('删除成功');
          loadFiles();
        } catch (error) {
          message.error('删除失败');
        }
      }
    });
  };

  // 更新文件信息
  const handleUpdateFile = async (values: FileUpdateRequest) => {
    if (!currentFile) return;
    
    try {
      await FileService.updateFile(currentFile.id, values);
      message.success('更新成功');
      setEditModalVisible(false);
      editForm.resetFields();
      setCurrentFile(null);
      loadFiles();
    } catch (error) {
      message.error('更新失败');
    }
  };

  // 获取文件类型标签颜色
  const getFileTypeColor = (fileType: string) => {
    const colorMap: Record<string, string> = {
      'pdf': 'red',
      'doc': 'blue',
      'docx': 'blue',
      'txt': 'green',
      'md': 'purple',
      'image': 'orange',
      'video': 'magenta',
      'audio': 'cyan'
    };
    return colorMap[fileType.toLowerCase()] || 'default';
  };

  // 表格列定义
  const columns: ColumnsType<FileInfo> = [
    {
      title: '文件名',
      dataIndex: 'original_name',
      key: 'original_name',
      render: (text, record) => (
        <Space>
          <FileOutlined />
          <span 
            className="cursor-pointer hover:text-blue-500"
            onClick={() => onFileSelect?.(record)}
          >
            {text}
          </span>
        </Space>
      ),
      sorter: (a, b) => a.original_name.localeCompare(b.original_name)
    },
    {
      title: '类型',
      dataIndex: 'file_type',
      key: 'file_type',
      render: (text) => (
        <Tag color={getFileTypeColor(text)}>
          {text.toUpperCase()}
        </Tag>
      ),
      filters: [
        { text: 'PDF', value: 'pdf' },
        { text: 'DOC', value: 'doc' },
        { text: 'TXT', value: 'txt' },
        { text: 'MD', value: 'md' }
      ],
      onFilter: (value, record) => record.file_type === value
    },
    {
      title: '大小',
      dataIndex: 'file_size',
      key: 'file_size',
      render: (size) => formatFileSize(size),
      sorter: (a, b) => a.file_size - b.file_size
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (text) => (
        <Tooltip title={text}>
          <span className="max-w-xs truncate">
            {text || '-'}
          </span>
        </Tooltip>
      )
    },
    {
      title: '上传时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => formatDateTime(date),
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    }
  ];

  // 添加操作列
  if (showActions) {
    columns.push({
      title: '操作',
      key: 'actions',
      render: (_, record) => {
        const menuItems = [
          {
            key: 'view',
            label: '查看',
            icon: <EyeOutlined />,
            onClick: () => onFileSelect?.(record)
          },
          {
            key: 'download',
            label: '下载',
            icon: <DownloadOutlined />,
            onClick: () => handleDownload(record)
          },
          {
            key: 'edit',
            label: '编辑',
            icon: <EditOutlined />,
            onClick: () => handleEdit(record)
          },
          {
            key: 'delete',
            label: '删除',
            icon: <DeleteOutlined />,
            onClick: () => handleDelete(record),
            danger: true
          }
        ];

        return (
          <Dropdown menu={{ items: menuItems }} trigger={['click']}>
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        );
      }
    });
  }

  // 上传配置
  const uploadProps: UploadProps = {
    beforeUpload: (file) => {
      handleUpload(file);
      return false; // 阻止默认上传
    },
    showUploadList: false,
    multiple: false
  };

  useEffect(() => {
    loadFiles();
  }, [directoryId]);

  return (
    <div className="file-list">
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-medium">
          文件列表 {directoryId && `(当前目录)`}
        </h3>
        {showActions && (
          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={() => setUploadModalVisible(true)}
          >
            上传文件
          </Button>
        )}
      </div>

      <Table
        columns={columns}
        dataSource={files}
        rowKey="id"
        loading={loading}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 个文件`
        }}
      />

      {/* 上传文件模态框 */}
      <Modal
        title="上传文件"
        open={uploadModalVisible}
        onCancel={() => setUploadModalVisible(false)}
        footer={null}
      >
        <div className="text-center py-8">
          <Upload {...uploadProps}>
            <Button 
              icon={<UploadOutlined />} 
              size="large"
              disabled={uploading}
            >
              选择文件上传
            </Button>
          </Upload>
          
          {uploading && (
            <div className="mt-4">
              <Progress percent={uploadProgress} />
              <p className="mt-2 text-gray-500">正在上传...</p>
            </div>
          )}
        </div>
      </Modal>

      {/* 编辑文件模态框 */}
      <Modal
        title="编辑文件"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
          setCurrentFile(null);
        }}
        onOk={() => editForm.submit()}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdateFile}
        >
          <Form.Item
            name="name"
            label="文件名"
            rules={[{ required: true, message: '请输入文件名' }]}
          >
            <Input placeholder="请输入文件名" />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea placeholder="请输入文件描述" rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};