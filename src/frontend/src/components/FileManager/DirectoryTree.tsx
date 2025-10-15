/**
 * 目录树组件
 */
import React, { useState, useEffect } from 'react';
import { Tree, Button, Modal, Form, Input, message, Dropdown, Space } from 'antd';
import { 
  FolderOutlined, 
  FolderOpenOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  MoreOutlined
} from '@ant-design/icons';
import type { DataNode, TreeProps } from 'antd/es/tree';
import { DirectoryService, DirectoryTree as DirectoryTreeType, CreateDirectoryRequest } from '../../services/directoryService';

interface DirectoryTreeProps {
  onDirectorySelect?: (directoryId: string | null) => void;
  selectedDirectoryId?: string | null;
  showActions?: boolean;
}

interface TreeNodeData extends DataNode {
  id: string;
  name: string;
  parent_id?: string;
  children?: TreeNodeData[];
}

export const DirectoryTree: React.FC<DirectoryTreeProps> = ({
  onDirectorySelect,
  selectedDirectoryId,
  showActions = true
}) => {
  const [treeData, setTreeData] = useState<TreeNodeData[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentDirectory, setCurrentDirectory] = useState<DirectoryTreeType | null>(null);
  const [parentDirectoryId, setParentDirectoryId] = useState<string | undefined>();
  
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  // 加载目录树
  const loadDirectoryTree = async () => {
    setLoading(true);
    try {
      const directories = await DirectoryService.getDirectoryTree();
      const treeNodes = convertToTreeNodes(directories);
      setTreeData(treeNodes);
    } catch (error) {
      message.error('加载目录树失败');
      console.error('Load directory tree error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 转换为树节点格式
  const convertToTreeNodes = (directories: DirectoryTreeType[]): TreeNodeData[] => {
    return directories.map(dir => ({
      key: dir.id,
      id: dir.id,
      name: dir.name,
      parent_id: dir.parent_id,
      title: renderTreeNodeTitle(dir),
      icon: ({ expanded }: { expanded: boolean }) => 
        expanded ? <FolderOpenOutlined /> : <FolderOutlined />,
      children: dir.children ? convertToTreeNodes(dir.children) : undefined
    }));
  };

  // 渲染树节点标题
  const renderTreeNodeTitle = (directory: DirectoryTreeType) => {
    const menuItems = [
      {
        key: 'add',
        label: '添加子目录',
        icon: <PlusOutlined />,
        onClick: () => handleAddSubDirectory(directory.id)
      },
      {
        key: 'edit',
        label: '编辑',
        icon: <EditOutlined />,
        onClick: () => handleEditDirectory(directory)
      },
      {
        key: 'delete',
        label: '删除',
        icon: <DeleteOutlined />,
        onClick: () => handleDeleteDirectory(directory),
        danger: true
      }
    ];

    return (
      <div className="flex items-center justify-between w-full">
        <span className="flex-1">{directory.name}</span>
        {showActions && (
          <Dropdown
            menu={{ items: menuItems }}
            trigger={['click']}
          >
            <Button
              type="text"
              size="small"
              icon={<MoreOutlined />}
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>
        )}
      </div>
    );
  };

  // 处理目录选择
  const handleSelect: TreeProps['onSelect'] = (selectedKeys, info) => {
    const key = selectedKeys[0] as string;
    setSelectedKeys(selectedKeys);
    onDirectorySelect?.(key || null);
  };

  // 处理展开/收起
  const handleExpand: TreeProps['onExpand'] = (expandedKeys) => {
    setExpandedKeys(expandedKeys);
  };

  // 添加根目录
  const handleAddRootDirectory = () => {
    setParentDirectoryId(undefined);
    setCreateModalVisible(true);
  };

  // 添加子目录
  const handleAddSubDirectory = (parentId: string) => {
    setParentDirectoryId(parentId);
    setCreateModalVisible(true);
  };

  // 编辑目录
  const handleEditDirectory = async (directory: DirectoryTreeType) => {
    try {
      const fullDirectory = await DirectoryService.getDirectory(directory.id);
      // 将Directory转换为DirectoryTree格式
      const directoryTree: DirectoryTreeType = {
        ...fullDirectory,
        children: []
      };
      setCurrentDirectory(directoryTree);
      editForm.setFieldsValue({
        name: fullDirectory.name,
        description: fullDirectory.description
      });
      setEditModalVisible(true);
    } catch (error) {
      message.error('获取目录信息失败');
    }
  };

  // 删除目录
  const handleDeleteDirectory = (directory: DirectoryTreeType) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除目录 "${directory.name}" 吗？此操作不可恢复。`,
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await DirectoryService.deleteDirectory(directory.id);
          message.success('删除成功');
          loadDirectoryTree();
        } catch (error) {
          message.error('删除失败');
        }
      }
    });
  };

  // 创建目录
  const handleCreateDirectory = async (values: CreateDirectoryRequest) => {
    try {
      await DirectoryService.createDirectory({
        ...values,
        parent_id: parentDirectoryId
      });
      message.success('创建成功');
      setCreateModalVisible(false);
      form.resetFields();
      loadDirectoryTree();
    } catch (error) {
      message.error('创建失败');
    }
  };

  // 更新目录
  const handleUpdateDirectory = async (values: any) => {
    if (!currentDirectory) return;
    
    try {
      await DirectoryService.updateDirectory(currentDirectory.id, values);
      message.success('更新成功');
      setEditModalVisible(false);
      editForm.resetFields();
      setCurrentDirectory(null);
      loadDirectoryTree();
    } catch (error) {
      message.error('更新失败');
    }
  };

  useEffect(() => {
    loadDirectoryTree();
  }, []);

  useEffect(() => {
    if (selectedDirectoryId) {
      setSelectedKeys([selectedDirectoryId]);
    } else {
      setSelectedKeys([]);
    }
  }, [selectedDirectoryId]);

  return (
    <div className="directory-tree">
      <div className="mb-4">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddRootDirectory}
          disabled={!showActions}
        >
          添加根目录
        </Button>
      </div>

      <Tree
        showIcon
        treeData={treeData}
        expandedKeys={expandedKeys}
        selectedKeys={selectedKeys}
        onSelect={handleSelect}
        onExpand={handleExpand}
        className="custom-tree"
      />

      {/* 创建目录模态框 */}
      <Modal
        title="创建目录"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText="创建"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateDirectory}
        >
          <Form.Item
            name="name"
            label="目录名称"
            rules={[{ required: true, message: '请输入目录名称' }]}
          >
            <Input placeholder="请输入目录名称" />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea placeholder="请输入目录描述" rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑目录模态框 */}
      <Modal
        title="编辑目录"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
          setCurrentDirectory(null);
        }}
        onOk={() => editForm.submit()}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdateDirectory}
        >
          <Form.Item
            name="name"
            label="目录名称"
            rules={[{ required: true, message: '请输入目录名称' }]}
          >
            <Input placeholder="请输入目录名称" />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea placeholder="请输入目录描述" rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};