/**
 * 搜索页面 - 基于 Elasticsearch 全文检索
 */
import React, { useState, useEffect } from 'react';
import {
  Card,
  Input,
  Button,
  List,
  Tag,
  Space,
  Empty,
  Spin,
  Typography,
  Select,
  Row,
  Col,
  AutoComplete,
  message,
  Tooltip,
  Badge,
} from 'antd';
import {
  SearchOutlined,
  FileTextOutlined,
  CalendarOutlined,
  FilterOutlined,
  FolderOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { SearchService, SearchResult, SearchCategory } from '../services/searchService';

const { Search } = Input;
const { Text, Title } = Typography;
const { Option } = Select;

export const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTime, setSearchTime] = useState(0);
  
  // 筛选条件
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>('');
  const [fileExtensionFilter, setFileExtensionFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'relevance' | 'created_at' | 'updated_at' | 'file_size'>('relevance');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // 搜索建议和分类数据
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [categories, setCategories] = useState<SearchCategory[]>([]);
  const [fileExtensions, setFileExtensions] = useState<Array<{ extension: string; doc_count: number }>>([]);
  const [searchStats, setSearchStats] = useState<{ total_documents: number; index_size: string } | null>(null);

  // 初始化数据
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // 加载分类和统计信息
      const [categoriesRes, statsRes] = await Promise.all([
        SearchService.getSearchCategories(),
        SearchService.getSearchStats()
      ]);

      if (categoriesRes.success) {
        setCategories(categoriesRes.data.categories);
        setFileExtensions(categoriesRes.data.file_extensions);
      }

      if (statsRes.success) {
        setSearchStats({
          total_documents: statsRes.data.total_documents,
          index_size: statsRes.data.index_size
        });
      }
    } catch (error) {
      console.error('加载初始数据失败:', error);
    }
  };

  const handleSearch = async (query?: string, page: number = 1) => {
    const searchQuery = query || searchText;
    if (!searchQuery.trim()) {
      return;
    }

    try {
      setLoading(true);
      setHasSearched(true);

      const searchParams = {
        query: searchQuery,
        page,
        size: pageSize,
        category: categoryFilter || undefined,
        subcategory: subcategoryFilter || undefined,
        file_extension: fileExtensionFilter || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      };

      const response = await SearchService.searchDocuments(searchParams);
      if (response.success) {
        setSearchResults(response.data.results);
        setTotalResults(response.data.total);
        setCurrentPage(response.data.page);
        setTotalPages(response.data.total_pages);
        setSearchTime(response.data.took);
      }
    } catch (error) {
      console.error('搜索失败:', error);
      // 避免循环引用错误，只记录错误消息
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      console.error('错误详情:', errorMessage);
      message.error('搜索失败，请稍后重试');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionSearch = async (value: string) => {
    if (value.length >= 2) {
      try {
        const response = await SearchService.getSearchSuggestions(value);
        if (response.success) {
          setSearchSuggestions(response.data.suggestions.map(s => s.text));
        }
      } catch (error) {
        console.error('获取搜索建议失败:', error);
      }
    }
  };

  const handleSuggestionSelect = (value: string) => {
    setSearchText(value);
    handleSearch(value);
  };

  const handleClearFilters = () => {
    setCategoryFilter('');
    setSubcategoryFilter('');
    setFileExtensionFilter('');
    setSortBy('relevance');
    setSortOrder('desc');
    if (searchText) {
      handleSearch();
    }
  };

  const clearFilters = () => {
    setCategoryFilter('');
    setSubcategoryFilter('');
    setFileExtensionFilter('');
    setSortBy('relevance');
    setSortOrder('desc');
    if (searchText) {
      handleSearch();
    }
  };

  const handleReindex = async () => {
    try {
      setLoading(true);
      const response = await SearchService.reindexDocuments();
      if (response.success) {
        message.success('重新索引成功');
        await loadInitialData(); // 重新加载统计信息
      }
    } catch (error) {
      console.error('重新索引失败:', error);
      message.error('重新索引失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const renderHighlightedText = (text: string, highlights?: string[]) => {
    if (!highlights || highlights.length === 0) {
      return text;
    }

    // 使用第一个高亮片段
    const highlightedText = highlights[0];
    return (
      <div
        dangerouslySetInnerHTML={{
          __html: highlightedText
        }}
      />
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileExtensionColor = (extension: string) => {
    const colors: { [key: string]: string } = {
      '.md': 'blue',
      '.txt': 'green',
      '.json': 'orange',
      '.pdf': 'red',
      '.doc': 'purple',
      '.docx': 'purple',
    };
    return colors[extension] || 'default';
  };

  const getAvailableSubcategories = () => {
    if (!categoryFilter) return [];
    const category = categories.find(c => c.category === categoryFilter);
    return category?.subcategories || [];
  };

  return (
    <div className="search-page p-6">
      <Title level={2} className="mb-6" data-testid="search-page-title">
        全文检索
      </Title>

      {/* 搜索统计信息 */}
      {searchStats && (
        <Card size="small" className="mb-4" data-testid="search-stats-card">
          <Space>
            <Badge count={searchStats.total_documents} showZero>
              <Text type="secondary">索引文档数</Text>
            </Badge>
            <Text type="secondary">|</Text>
            <Text type="secondary">索引大小: {searchStats.index_size}</Text>
          </Space>
        </Card>
      )}

      {/* 搜索框和筛选器 */}
      <Card className="mb-6" data-testid="search-controls-card">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <AutoComplete
              options={searchSuggestions.map(suggestion => ({ value: suggestion }))}
              onSearch={handleSuggestionSearch}
              onSelect={handleSuggestionSelect}
              style={{ width: '100%' }}
              data-testid="search-autocomplete"
            >
              <Search
                placeholder="输入关键词搜索文档..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onSearch={(value) => handleSearch(value)}
                loading={loading}
                enterButton={
                  <Button type="primary" icon={<SearchOutlined />} data-testid="search-button">
                    搜索
                  </Button>
                }
                size="large"
                data-testid="search-input"
              />
            </AutoComplete>
          </Col>
          
          <Col xs={24} md={12}>
            <Space wrap>
              <Select
                placeholder="文档分类"
                value={categoryFilter}
                onChange={setCategoryFilter}
                allowClear
                style={{ minWidth: 120 }}
                data-testid="category-filter"
              >
                {categories.map(category => (
                  <Option key={category.category} value={category.category}>
                    {category.category} ({category.doc_count})
                  </Option>
                ))}
              </Select>

              <Select
                placeholder="文件类型"
                value={fileExtensionFilter}
                onChange={setFileExtensionFilter}
                allowClear
                style={{ minWidth: 100 }}
                data-testid="file-type-filter"
              >
                {fileExtensions.map(ext => (
                  <Option key={ext.extension} value={ext.extension}>
                    {ext.extension.toUpperCase()} ({ext.doc_count})
                  </Option>
                ))}
              </Select>

              <Select
                value={`${sortBy}-${sortOrder}`}
                onChange={(value) => {
                  const [sort, order] = value.split('-');
                  setSortBy(sort as any);
                  setSortOrder(order as any);
                }}
                style={{ minWidth: 120 }}
                data-testid="sort-select"
              >
                <Option value="relevance-desc">相关度</Option>
                <Option value="created_at-desc">最新创建</Option>
                <Option value="updated_at-desc">最近更新</Option>
                <Option value="file_size-desc">文件大小</Option>
              </Select>

              <Button
                icon={<ReloadOutlined />}
                onClick={handleClearFilters}
                data-testid="clear-filters-button"
              >
                清除筛选
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 搜索结果 */}
      <Card
        title={
          hasSearched && (
            <div className="flex items-center justify-between">
              <span>搜索结果</span>
              <Space>
                <Text type="secondary">
                  找到 {totalResults} 个相关文档
                </Text>
                {searchTime > 0 && (
                  <Text type="secondary">
                    ({searchTime}ms)
                  </Text>
                )}
              </Space>
            </div>
          )
        }
      >
        <Spin spinning={loading}>
          {!hasSearched ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="输入关键词开始搜索文档"
            />
          ) : totalResults === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="未找到相关文档，请尝试其他关键词"
            />
          ) : (
            <List
              itemLayout="vertical"
              dataSource={searchResults}
              className="search-results-list"
              data-testid="search-results-list"
              renderItem={(result) => (
                <List.Item
                  key={result.id}
                  actions={[
                    <Text type="secondary" key="score">
                      相关度: {result.score.toFixed(2)}
                    </Text>,
                    <Button
                      type="link"
                      key="view"
                      onClick={() => window.open(result.file_path, '_blank')}
                    >
                      查看文件
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<FileTextOutlined className="text-blue-500 text-lg" />}
                    title={
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="font-medium">
                          {renderHighlightedText(result.title, result.highlight?.title)}
                        </span>
                        <Tag color={getFileExtensionColor(result.file_extension)}>
                          {result.file_extension}
                        </Tag>
                        <Tag color="blue">{result.category}</Tag>
                        {result.subcategory && (
                          <Tag color="cyan">{result.subcategory}</Tag>
                        )}
                      </div>
                    }
                    description={
                      <Space direction="vertical" size="small" className="w-full">
                        {/* 高亮内容片段 */}
                        {result.highlight?.content && result.highlight.content.length > 0 && (
                          <div className="bg-gray-50 p-2 rounded border-l-4 border-blue-400">
                            <Text type="secondary" className="text-xs">内容片段:</Text>
                            <div className="mt-1">
                              {renderHighlightedText('', result.highlight.content)}
                            </div>
                          </div>
                        )}
                        
                        {/* 文件信息 */}
                        <Space wrap>
                          <Space size="small">
                            <FolderOutlined />
                            <Text type="secondary" className="text-xs">
                              {result.file_path.replace('/root/knowledge-base-app/company_knowledge_base/', '')}
                            </Text>
                          </Space>
                          <Space size="small">
                            <CalendarOutlined />
                            <Text type="secondary" className="text-xs">
                              {new Date(result.updated_at).toLocaleString()}
                            </Text>
                          </Space>
                          <Text type="secondary" className="text-xs">
                            {formatFileSize(result.file_size)}
                          </Text>
                        </Space>
                        
                        {/* 标签 */}
                        {result.tags && result.tags.length > 0 && (
                          <div>
                            <Text type="secondary" className="text-xs mr-2">标签:</Text>
                            {result.tags.slice(0, 5).map(tag => (
                              <Tag key={tag} color="default">
                                {tag}
                              </Tag>
                            ))}
                            {result.tags.length > 5 && (
                              <Text type="secondary" className="text-xs">
                                +{result.tags.length - 5} 更多
                              </Text>
                            )}
                          </div>
                        )}
                      </Space>
                    }
                  />
                </List.Item>
              )}
              pagination={{
                current: currentPage,
                pageSize: pageSize,
                total: totalResults,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
                onChange: (page, size) => {
                  setCurrentPage(page);
                  setPageSize(size || 10);
                  handleSearch(searchText, page);
                },
                onShowSizeChange: (current, size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                  handleSearch(searchText, 1);
                },
              }}
            />
          )}
        </Spin>
      </Card>
    </div>
  );
};