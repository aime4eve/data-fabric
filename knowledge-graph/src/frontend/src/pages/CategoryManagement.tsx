/**
 * 分类管理页面
 */
import React, { useState, useEffect } from 'react';
import {
  Card,
  Tree,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Popconfirm,
  message,
  Row,
  Col,
  Statistic,
  Tooltip,
  Dropdown,
  Switch,
  Tag,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  MoreOutlined,
  DragOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons';
import type { DataNode, TreeProps } from 'antd/es/tree';
import { CategoryService, Category, CreateCategoryRequest, UpdateCategoryRequest } from '../services/categoryService';
import { DocumentService } from '../services/documentService';

const { TextArea } = Input;
const { Option } = Select;

interface CategoryTreeNode extends DataNode {
  key: string;
  title: React.ReactNode;
  children?: CategoryTreeNode[];
  category: Category;
  isLeaf?: boolean;
}

export const CategoryManagement: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [treeData, setTreeData] = useState<CategoryTreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [autoExpandParent, setAutoExpandParent] = useState(true);

  // 模态框状态
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'create' | 'edit'>('create');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form] = Form.useForm();

  // 统计数据
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    totalDocuments: 0,
  });

  // 加载分类数据
  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await CategoryService.getCategoryTree();
      
      // 添加空值检查
      const categoriesData = response?.data || [];
      setCategories(categoriesData);
      
      // 获取文档统计数据
      const statsResponse = await DocumentService.getDocumentStatistics();
      const totalDocuments = statsResponse.data.total_documents;

      // 计算统计数据
      const flatCategories = flattenCategories(categoriesData);
      setStats({
        total: flatCategories.length,
        active: flatCategories.filter(c => c.is_active).length,
        inactive: flatCategories.filter(c => !c.is_active).length,
        totalDocuments: totalDocuments,
      });

      // 转换为树形数据
      const treeNodes = convertToTreeData(categoriesData);
      setTreeData(treeNodes);

      // 默认展开第一层
      const firstLevelKeys = categoriesData.map(cat => cat.id);
      setExpandedKeys(firstLevelKeys);
    } catch (error) {
      message.error('加载分类数据失败');
      console.error('Load categories error:', error);
      // 设置默认空数据
      setCategories([]);
      setTreeData([]);
      setStats({
        total: 0,
        active: 0,
        inactive: 0,
        totalDocuments: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  // 扁平化分类数据
  const flattenCategories = (categories: Category[]): Category[] => {
    const result: Category[] = [];
    const flatten = (cats: Category[]) => {
      // 添加空值检查
      if (!cats || !Array.isArray(cats)) {
        return;
      }
      cats.forEach(cat => {
        result.push(cat);
        if (cat.children && Array.isArray(cat.children) && cat.children.length > 0) {
          flatten(cat.children);
        }
      });
    };
    flatten(categories);
    return result;
  };

  // 转换为树形数据
  const convertToTreeData = (categories: Category[]): CategoryTreeNode[] => {
    // 添加空值检查
    if (!categories || !Array.isArray(categories)) {
      return [];
    }
    return categories.map(category => ({
      key: category.id,
      title: renderTreeNodeTitle(category),
      children: category.children && Array.isArray(category.children) && category.children.length > 0 
        ? convertToTreeData(category.children) 
        : undefined,
      category,
      isLeaf: !category.children || !Array.isArray(category.children) || category.children.length === 0,
    }));
  };

  // 渲染树节点标题
  const renderTreeNodeTitle = (category: Category) => {
    const menuItems = [
      {
        key: 'edit',
        label: '编辑',
        icon: <EditOutlined />,
        onClick: () => handleEdit(category),
      },
      {
        key: 'add-child',
        label: '添加子分类',
        icon: <PlusOutlined />,
        onClick: () => handleAddChild(category),
      },
      {
        key: 'toggle-status',
        label: category.is_active ? '禁用' : '启用',
        icon: category.is_active ? <EyeInvisibleOutlined /> : <EyeOutlined />,
        onClick: () => handleToggleStatus(category),
      },
      {
        type: 'divider' as const,
      },
      {
        key: 'delete',
        label: '删除',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: () => handleDelete(category),
      },
    ];

    return (
      <div className="flex items-center justify-between w-full pr-2">
        <div className="flex items-center space-x-2">
          {category.is_active ? (
            <FolderOutlined className="text-blue-500" />
          ) : (
            <FolderOutlined className="text-gray-400" />
          )}
          <span className={category.is_active ? 'text-gray-900' : 'text-gray-400'}>
            {category.name}
          </span>
          {!category.is_active && <Tag color="red">已禁用</Tag>}
          {category.document_count !== undefined && (
            <Tag color="blue">{category.document_count}个文档</Tag>
          )}
        </div>
        <Dropdown
          menu={{ items: menuItems }}
          trigger={['click']}
          placement="bottomRight"
        >
          <Button
            type="text"
            size="small"
            icon={<MoreOutlined />}
            onClick={(e) => e.stopPropagation()}
          />
        </Dropdown>
      </div>
    );
  };

  // 处理创建分类
  const handleCreate = () => {
    setModalType('create');
    setEditingCategory(null);
    form.resetFields();
    setModalVisible(true);
  };

  // 处理编辑分类
  const handleEdit = (category: Category) => {
    setModalType('edit');
    setEditingCategory(category);
    form.setFieldsValue({
      name: category.name,
      description: category.description,
      parent_id: category.parent_id,
      is_active: category.is_active,
    });
    setModalVisible(true);
  };

  // 处理添加子分类
  const handleAddChild = (parentCategory: Category) => {
    setModalType('create');
    setEditingCategory(null);
    form.resetFields();
    form.setFieldsValue({
      parent_id: parentCategory.id,
    });
    setModalVisible(true);
  };

  // 处理删除分类
  const handleDelete = async (category: Category) => {
    try {
      await CategoryService.deleteCategory(category.id);
      message.success('删除成功');
      loadCategories();
    } catch (error) {
      message.error('删除失败');
      console.error('Delete category error:', error);
    }
  };

  // 处理启用/禁用分类
  const handleToggleStatus = async (category: Category) => {
    try {
      await CategoryService.toggleCategoryStatus(category.id, !category.is_active);
      message.success(category.is_active ? '已禁用' : '已启用');
      loadCategories();
    } catch (error) {
      message.error('操作失败');
      console.error('Toggle category status error:', error);
    }
  };

  // 处理表单提交
  const handleSubmit = async (values: any) => {
    try {
      if (modalType === 'create') {
        const createData: CreateCategoryRequest = {
          name: values.name,
          description: values.description,
          parent_id: values.parent_id,
          sort_order: values.sort_order || 0,
        };
        await CategoryService.createCategory(createData);
        message.success('创建成功');
      } else {
        const updateData: UpdateCategoryRequest = {
          name: values.name,
          description: values.description,
          parent_id: values.parent_id,
          is_active: values.is_active,
        };
        await CategoryService.updateCategory(editingCategory!.id, updateData);
        message.success('更新成功');
      }
      
      setModalVisible(false);
      form.resetFields();
      loadCategories();
    } catch (error) {
      message.error(modalType === 'create' ? '创建失败' : '更新失败');
      console.error('Submit category error:', error);
    }
  };

  // 获取父分类选项
  const getParentOptions = (categories: Category[], excludeId?: string): Category[] => {
    const result: Category[] = [];
    const traverse = (cats: Category[], level = 0) => {
      // 添加空值检查
      if (!cats || !Array.isArray(cats)) {
        return;
      }
      cats.forEach(cat => {
        if (cat.id !== excludeId) {
          result.push({ ...cat, level });
          if (cat.children && Array.isArray(cat.children) && cat.children.length > 0) {
            traverse(cat.children, level + 1);
          }
        }
      });
    };
    traverse(categories);
    return result;
  };

  // 树形组件事件处理
  const onExpand: TreeProps['onExpand'] = (expandedKeysValue) => {
    setExpandedKeys(expandedKeysValue);
    setAutoExpandParent(false);
  };

  const onSelect: TreeProps['onSelect'] = (selectedKeysValue) => {
    setSelectedKeys(selectedKeysValue);
  };

  // 组件挂载时加载数据
  useEffect(() => {
    loadCategories();
  }, []);

  return (
    <div className="p-6" data-testid="category-management-page">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">分类管理</h1>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
            data-testid="create-category-button"
          >
            新建分类
          </Button>
        </div>

        {/* 统计卡片 */}
        <Row gutter={16} className="mb-6">
          <Col xs={24} sm={6}>
            <Card data-testid="total-categories-card">
              <Statistic
                title="总分类数"
                value={stats.total}
                prefix={<FolderOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card data-testid="active-categories-card">
              <Statistic
                title="启用分类"
                value={stats.active}
                valueStyle={{ color: '#3f8600' }}
                prefix={<EyeOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card data-testid="inactive-categories-card">
              <Statistic
                title="禁用分类"
                value={stats.inactive}
                valueStyle={{ color: '#cf1322' }}
                prefix={<EyeInvisibleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card data-testid="total-documents-card">
              <Statistic
                title="总文档数"
                value={stats.totalDocuments}
                prefix={<FolderOpenOutlined />}
              />
            </Card>
          </Col>
        </Row>
      </div>

      {/* 分类树 */}
      <Card
        title="分类结构"
        extra={
          <Space>
            <Button
              icon={<DragOutlined />}
              onClick={() => message.info('拖拽排序功能开发中')}
              data-testid="sort-mode-button"
            >
              排序模式
            </Button>
            <Button 
              onClick={loadCategories}
              data-testid="refresh-categories-button"
            >
              刷新
            </Button>
          </Space>
        }
        loading={loading}
        data-testid="category-tree-card"
      >
        {treeData.length > 0 ? (
          <Tree
            showLine
            showIcon={false}
            expandedKeys={expandedKeys}
            autoExpandParent={autoExpandParent}
            selectedKeys={selectedKeys}
            onExpand={onExpand}
            onSelect={onSelect}
            treeData={treeData}
            className="category-tree"
            data-testid="category-tree"
          />
        ) : (
          <div className="text-center py-8 text-gray-500" data-testid="empty-categories">
            暂无分类数据，点击"新建分类"开始创建
          </div>
        )}
      </Card>

      {/* 创建/编辑分类模态框 */}
      <Modal
        title={modalType === 'create' ? '新建分类' : '编辑分类'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={600}
        data-testid="category-modal"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          data-testid="category-form"
        >
          <Form.Item
            name="name"
            label="分类名称"
            rules={[
              { required: true, message: '请输入分类名称' },
              { max: 100, message: '分类名称不能超过100个字符' },
            ]}
          >
            <Input placeholder="请输入分类名称" data-testid="category-name-input" />
          </Form.Item>

          <Form.Item
            name="description"
            label="分类描述"
            rules={[
              { max: 500, message: '分类描述不能超过500个字符' },
            ]}
          >
            <TextArea
              rows={3}
              placeholder="请输入分类描述（可选）"
              data-testid="category-description-input"
            />
          </Form.Item>

          <Form.Item
            name="parent_id"
            label="父分类"
          >
            <Select
              placeholder="请选择父分类（可选）"
              allowClear
              data-testid="parent-category-select"
            >
              {getParentOptions(categories, editingCategory?.id).map(cat => (
                <Option key={cat.id} value={cat.id}>
                  {'　'.repeat(cat.level || 0)}{cat.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {modalType === 'edit' && (
            <Form.Item
              name="is_active"
              label="状态"
              valuePropName="checked"
            >
              <Switch
                checkedChildren="启用"
                unCheckedChildren="禁用"
                data-testid="category-status-switch"
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
};