/**
 * 标签管理组件
 */
import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  Space,
  message,
  Dropdown,
  Popconfirm,
  Statistic,
  Row,
  Col
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  TagOutlined,
  FileOutlined,
  FolderOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { TagService, Tag as TagType, CreateTagRequest, UpdateTagRequest, TagStatistics, TagWithUsage } from '../../services/tagService';
import { formatDateTime } from '../../utils/format';

const { Option } = Select;

interface TagManagerProps {
  onTagSelect?: (tag: TagType) => void;
  showActions?: boolean;
}

export const TagManager: React.FC<TagManagerProps> = ({
  onTagSelect,
  showActions = true
}) => {
  const [tags, setTags] = useState<TagWithUsage[]>([]);
  const [statistics, setStatistics] = useState<TagStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentTag, setCurrentTag] = useState<TagType | null>(null);
  
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  // 标签颜色选项
  const tagColors = [
    'magenta', 'red', 'volcano', 'orange', 'gold',
    'lime', 'green', 'cyan', 'blue', 'geekblue', 'purple'
  ];

  // 加载标签列表
  const loadTags = async () => {
    setLoading(true);
    try {
      const [tagList, stats] = await Promise.all([
        TagService.getTags(),
        TagService.getTagStatistics()
      ]);
      setTags(tagList);
      setStatistics(stats);
    } catch (error) {
      message.error('加载标签列表失败');
      console.error('Load tags error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 创建标签
  const handleCreateTag = async (values: CreateTagRequest) => {
    try {
      await TagService.createTag(values);
      message.success('创建成功');
      setCreateModalVisible(false);
      createForm.resetFields();
      loadTags();
    } catch (error) {
      message.error('创建失败');
    }
  };

  // 编辑标签
  const handleEditTag = (tag: TagType) => {
    setCurrentTag(tag);
    editForm.setFieldsValue({
      name: tag.name,
      description: tag.description,
      color: tag.color
    });
    setEditModalVisible(true);
  };

  // 更新标签
  const handleUpdateTag = async (values: UpdateTagRequest) => {
    if (!currentTag) return;
    
    try {
      await TagService.updateTag(currentTag.id, values);
      message.success('更新成功');
      setEditModalVisible(false);
      editForm.resetFields();
      setCurrentTag(null);
      loadTags();
    } catch (error) {
      message.error('更新失败');
    }
  };

  // 删除标签
  const handleDeleteTag = async (tag: TagType) => {
    try {
      await TagService.deleteTag(tag.id);
      message.success('删除成功');
      loadTags();
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 表格列定义
  const columns: ColumnsType<TagWithUsage> = [
    {
      title: '标签名',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <Tag color={record.color} icon={<TagOutlined />}>
            {text}
          </Tag>
        </Space>
      ),
      sorter: (a, b) => a.name.localeCompare(b.name)
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (text) => text || '-'
    },
    {
      title: '使用次数',
      dataIndex: 'usage_count',
      key: 'usage_count',
      render: (count) => (
        <Space>
          <span>{count || 0}</span>
        </Space>
      ),
      sorter: (a, b) => (a.usage_count || 0) - (b.usage_count || 0)
    },
    {
      title: '创建时间',
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
            key: 'select',
            label: '选择',
            icon: <TagOutlined />,
            onClick: () => onTagSelect?.(record)
          },
          {
            key: 'edit',
            label: '编辑',
            icon: <EditOutlined />,
            onClick: () => handleEditTag(record)
          },
          {
            key: 'delete',
            label: '删除',
            icon: <DeleteOutlined />,
            onClick: () => handleDeleteTag(record),
            danger: true
          }
        ];

        return (
          <Space>
            <Button
              type="text"
              size="small"
              onClick={() => onTagSelect?.(record)}
            >
              选择
            </Button>
            <Dropdown menu={{ items: menuItems.slice(1) }} trigger={['click']}>
              <Button type="text" icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        );
      }
    });
  }

  useEffect(() => {
    loadTags();
  }, []);

  return (
    <div className="tag-manager">
      {/* 统计信息 */}
      {statistics && (
        <Row gutter={16} className="mb-6">
          <Col span={8}>
            <Card>
              <Statistic
                title="总标签数"
                value={statistics.total_tags}
                prefix={<TagOutlined />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="已使用标签"
                value={statistics.used_tags}
                prefix={<FileOutlined />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="未使用标签"
                value={statistics.unused_tags}
                prefix={<FolderOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 标签列表 */}
      <Card
        title="标签管理"
        extra={
          showActions && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              新建标签
            </Button>
          )
        }
      >
        <Table
          columns={columns}
          dataSource={tags}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 个标签`
          }}
        />
      </Card>

      {/* 创建标签模态框 */}
      <Modal
        title="新建标签"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
        }}
        onOk={() => createForm.submit()}
        okText="创建"
        cancelText="取消"
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateTag}
        >
          <Form.Item
            name="name"
            label="标签名"
            rules={[
              { required: true, message: '请输入标签名' },
              { max: 50, message: '标签名不能超过50个字符' }
            ]}
          >
            <Input placeholder="请输入标签名" />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea placeholder="请输入标签描述" rows={3} />
          </Form.Item>
          <Form.Item
            name="color"
            label="颜色"
            initialValue="blue"
          >
            <Select placeholder="选择标签颜色">
              {tagColors.map(color => (
                <Option key={color} value={color}>
                  <Tag color={color}>{color}</Tag>
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑标签模态框 */}
      <Modal
        title="编辑标签"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
          setCurrentTag(null);
        }}
        onOk={() => editForm.submit()}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdateTag}
        >
          <Form.Item
            name="name"
            label="标签名"
            rules={[
              { required: true, message: '请输入标签名' },
              { max: 50, message: '标签名不能超过50个字符' }
            ]}
          >
            <Input placeholder="请输入标签名" />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea placeholder="请输入标签描述" rows={3} />
          </Form.Item>
          <Form.Item
            name="color"
            label="颜色"
          >
            <Select placeholder="选择标签颜色">
              {tagColors.map(color => (
                <Option key={color} value={color}>
                  <Tag color={color}>{color}</Tag>
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};