/**
 * 文件管理主页面
 */
import React, { useState } from 'react';
import { Layout, Card, Tabs, Row, Col, Breadcrumb } from 'antd';
import { 
  FolderOutlined, 
  FileOutlined, 
  TagOutlined,
  HomeOutlined
} from '@ant-design/icons';
import { DirectoryTree } from '../components/FileManager/DirectoryTree';
import { FileList } from '../components/FileManager/FileList';
import { TagManager } from '../components/FileManager/TagManager';
import type { DirectoryTree as DirectoryTreeType } from '../services/directoryService';
import type { FileInfo } from '../services/fileService';
import type { Tag } from '../services/tagService';

const { Content } = Layout;
const { TabPane } = Tabs;

export const FileManager: React.FC = () => {
  const [currentDirectory, setCurrentDirectory] = useState<DirectoryTreeType | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [activeTab, setActiveTab] = useState('files');

  // 处理目录选择
  const handleDirectorySelect = (directory: DirectoryTreeType) => {
    setCurrentDirectory(directory);
    setSelectedFile(null);
    setActiveTab('files');
  };

  // 处理文件选择
  const handleFileSelect = (file: FileInfo) => {
    setSelectedFile(file);
  };

  // 处理标签选择
  const handleTagSelect = (tag: Tag) => {
    setSelectedTag(tag);
    setActiveTab('files');
  };

  // 生成面包屑导航
  const generateBreadcrumb = () => {
    const items = [
      {
        title: (
          <>
            <HomeOutlined />
            <span>根目录</span>
          </>
        )
      }
    ];

    if (currentDirectory) {
      items.push({
        title: (
          <>
            <FolderOutlined />
            <span>{currentDirectory.name}</span>
          </>
        )
      });
    }

    if (selectedFile) {
      items.push({
        title: (
          <>
            <FileOutlined />
            <span>{selectedFile.original_name}</span>
          </>
        )
      });
    }

    return items;
  };

  return (
    <Layout className="min-h-screen bg-gray-50">
      <Content className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* 页面标题和面包屑 */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              文件管理
            </h1>
            <Breadcrumb items={generateBreadcrumb()} />
          </div>

          <Row gutter={[16, 16]}>
            {/* 左侧目录树 */}
            <Col xs={24} md={6}>
              <Card 
                title="目录结构" 
                size="small"
                className="h-full"
                bodyStyle={{ padding: '12px' }}
              >
                <DirectoryTree
                  onDirectorySelect={(directoryId) => {
                    if (directoryId && currentDirectory?.id !== directoryId) {
                      // 根据directoryId获取完整的目录信息
                      // 这里简化处理，实际应该调用API获取目录详情
                      setCurrentDirectory({ id: directoryId } as DirectoryTreeType);
                    } else if (!directoryId) {
                      setCurrentDirectory(null);
                    }
                  }}
                  selectedDirectoryId={currentDirectory?.id}
                  showActions={true}
                />
              </Card>
            </Col>

            {/* 右侧主内容区 */}
            <Col xs={24} md={18}>
              <Card className="h-full">
                <Tabs 
                  activeKey={activeTab} 
                  onChange={setActiveTab}
                  items={[
                    {
                      key: 'files',
                      label: (
                        <span>
                          <FileOutlined />
                          文件列表
                        </span>
                      ),
                      children: (
                        <FileList
                          directoryId={currentDirectory?.id}
                          onFileSelect={handleFileSelect}
                          showActions={true}
                        />
                      )
                    },
                    {
                      key: 'tags',
                      label: (
                        <span>
                          <TagOutlined />
                          标签管理
                        </span>
                      ),
                      children: (
                        <TagManager
                          onTagSelect={handleTagSelect}
                          showActions={true}
                        />
                      )
                    }
                  ]}
                />
              </Card>
            </Col>
          </Row>

          {/* 选中文件的详细信息 */}
          {selectedFile && (
            <Row className="mt-4">
              <Col span={24}>
                <Card 
                  title={`文件详情: ${selectedFile.original_name}`}
                  size="small"
                >
                  <Row gutter={16}>
                    <Col span={8}>
                      <p><strong>文件名:</strong> {selectedFile.original_name}</p>
                      <p><strong>文件类型:</strong> {selectedFile.file_type}</p>
                      <p><strong>文件大小:</strong> {(selectedFile.file_size / 1024).toFixed(2)} KB</p>
                    </Col>
                    <Col span={8}>
                      <p><strong>存储路径:</strong> {selectedFile.file_path}</p>
                      <p><strong>上传时间:</strong> {new Date(selectedFile.created_at).toLocaleString()}</p>
                      <p><strong>更新时间:</strong> {new Date(selectedFile.updated_at).toLocaleString()}</p>
                    </Col>
                    <Col span={8}>
                      <p><strong>描述:</strong> {selectedFile.description || '无'}</p>
                      <p><strong>元数据:</strong> {selectedFile.metadata ? JSON.stringify(selectedFile.metadata) : '无'}</p>
                    </Col>
                  </Row>
                </Card>
              </Col>
            </Row>
          )}

          {/* 选中标签的相关信息 */}
          {selectedTag && (
            <Row className="mt-4">
              <Col span={24}>
                <Card 
                  title={`标签: ${selectedTag.name}`}
                  size="small"
                >
                  <p><strong>描述:</strong> {selectedTag.description || '无'}</p>
                  <p><strong>颜色:</strong> {selectedTag.color}</p>
                  <p><strong>创建时间:</strong> {new Date(selectedTag.created_at).toLocaleString()}</p>
                </Card>
              </Col>
            </Row>
          )}
        </div>
      </Content>
    </Layout>
  );
};