/**
 * 文档上传页面
 */
import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Upload,
  Button,
  Space,
  message,
  Progress,
  Tag,
  Row,
  Col,
  Divider,
  Typography,
  Alert,
  Tooltip,
  Tree,
} from 'antd';
import {
  UploadOutlined,
  InboxOutlined,
  FileTextOutlined,
  DeleteOutlined,
  EyeOutlined,
  SaveOutlined,
  FolderOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import type { DataNode } from 'antd/es/tree';
import { CategoryService, Category } from '../services/categoryService';
import { DocumentService } from '../services/documentService';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Text } = Typography;
const { Dragger } = Upload;

interface DocumentUploadForm {
  title: string;
  description?: string;
  category_id?: string;
  upload_directory?: string;
  tags?: string[];
}

// 目录树数据结构
interface DirectoryNode {
  key: string;
  title: string;
  path: string;
  children?: DirectoryNode[];
}

export const DocumentUpload: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm<DocumentUploadForm>();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [selectedDirectory, setSelectedDirectory] = useState<string>('');
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);

  // 支持的文件类型
  const acceptedFileTypes = {
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/vnd.ms-powerpoint': ['.ppt'],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
    'text/plain': ['.txt'],
    'text/markdown': ['.md'],
    'text/csv': ['.csv'],
  };

  const acceptString = Object.values(acceptedFileTypes).flat().join(',');

  // 目录树数据
  const directoryTreeData: DataNode[] = [
    {
      key: '01_公司基本信息',
      title: '01_公司基本信息',
      icon: <FolderOutlined />,
      children: [
        { key: '01_公司基本信息/企业文化和价值观', title: '企业文化和价值观', icon: <FolderOutlined /> },
        { key: '01_公司基本信息/公司简介与发展历程', title: '公司简介与发展历程', icon: <FolderOutlined /> },
        { key: '01_公司基本信息/公司证照资质', title: '公司证照资质', icon: <FolderOutlined /> },
        { key: '01_公司基本信息/战略规划与年度目标', title: '战略规划与年度目标', icon: <FolderOutlined /> },
        { key: '01_公司基本信息/组织架构与岗位职责', title: '组织架构与岗位职责', icon: <FolderOutlined /> },
        { key: '01_公司基本信息/规章制度手册', title: '规章制度手册', icon: <FolderOutlined /> },
      ],
    },
    {
      key: '02_人力资源中心',
      title: '02_人力资源中心',
      icon: <FolderOutlined />,
      children: [
        { key: '02_人力资源中心/人事档案管理', title: '人事档案管理', icon: <FolderOutlined /> },
        { key: '02_人力资源中心/员工关系管理', title: '员工关系管理', icon: <FolderOutlined /> },
        { key: '02_人力资源中心/培训发展体系', title: '培训发展体系', icon: <FolderOutlined /> },
        { key: '02_人力资源中心/招聘与入职管理', title: '招聘与入职管理', icon: <FolderOutlined /> },
        { key: '02_人力资源中心/绩效考核体系', title: '绩效考核体系', icon: <FolderOutlined /> },
        { key: '02_人力资源中心/薪酬福利制度', title: '薪酬福利制度', icon: <FolderOutlined /> },
      ],
    },
    {
      key: '03_财务管理中心',
      title: '03_财务管理中心',
      icon: <FolderOutlined />,
      children: [
        { key: '03_财务管理中心/成本控制', title: '成本控制', icon: <FolderOutlined /> },
        { key: '03_财务管理中心/税务管理', title: '税务管理', icon: <FolderOutlined /> },
        { key: '03_财务管理中心/财务制度与流程', title: '财务制度与流程', icon: <FolderOutlined /> },
        { key: '03_财务管理中心/财务报表与分析', title: '财务报表与分析', icon: <FolderOutlined /> },
        { key: '03_财务管理中心/资金管理', title: '资金管理', icon: <FolderOutlined /> },
        { key: '03_财务管理中心/预算管理', title: '预算管理', icon: <FolderOutlined /> },
      ],
    },
    {
      key: '04_行政后勤管理',
      title: '04_行政后勤管理',
      icon: <FolderOutlined />,
      children: [
        { key: '04_行政后勤管理/会议管理', title: '会议管理', icon: <FolderOutlined /> },
        { key: '04_行政后勤管理/办公资产管理', title: '办公资产管理', icon: <FolderOutlined /> },
        { key: '04_行政后勤管理/后勤服务管理', title: '后勤服务管理', icon: <FolderOutlined /> },
        { key: '04_行政后勤管理/文档管理规范', title: '文档管理规范', icon: <FolderOutlined /> },
        { key: '04_行政后勤管理/行政采购管理', title: '行政采购管理', icon: <FolderOutlined /> },
      ],
    },
    {
      key: '05_海外物联网业务',
      title: '05_海外物联网业务',
      icon: <FolderOutlined />,
      children: [
        {
          key: '05_海外物联网业务/客户服务部',
          title: '客户服务部',
          icon: <FolderOutlined />,
          children: [
            { key: '05_海外物联网业务/客户服务部/产品安装指南', title: '产品安装指南', icon: <FolderOutlined /> },
            { key: '05_海外物联网业务/客户服务部/客户反馈管理', title: '客户反馈管理', icon: <FolderOutlined /> },
            { key: '05_海外物联网业务/客户服务部/客户案例库', title: '客户案例库', icon: <FolderOutlined /> },
            { key: '05_海外物联网业务/客户服务部/故障排除手册', title: '故障排除手册', icon: <FolderOutlined /> },
            { key: '05_海外物联网业务/客户服务部/服务标准流程', title: '服务标准流程', icon: <FolderOutlined /> },
          ],
        },
        {
          key: '05_海外物联网业务/市场拓展部',
          title: '市场拓展部',
          icon: <FolderOutlined />,
          children: [
            { key: '05_海外物联网业务/市场拓展部/合作伙伴管理', title: '合作伙伴管理', icon: <FolderOutlined /> },
            { key: '05_海外物联网业务/市场拓展部/市场推广策略', title: '市场推广策略', icon: <FolderOutlined /> },
            { key: '05_海外物联网业务/市场拓展部/目标市场分析', title: '目标市场分析', icon: <FolderOutlined /> },
            { key: '05_海外物联网业务/市场拓展部/竞争对手情报', title: '竞争对手情报', icon: <FolderOutlined /> },
            { key: '05_海外物联网业务/市场拓展部/行业趋势研究', title: '行业趋势研究', icon: <FolderOutlined /> },
          ],
        },
        {
          key: '05_海外物联网业务/技术研发中心',
          title: '技术研发中心',
          icon: <FolderOutlined />,
          children: [
            { key: '05_海外物联网业务/技术研发中心/API接口文档', title: 'API接口文档', icon: <FolderOutlined /> },
            { key: '05_海外物联网业务/技术研发中心/技术标准规范', title: '技术标准规范', icon: <FolderOutlined /> },
            { key: '05_海外物联网业务/技术研发中心/技术白皮书', title: '技术白皮书', icon: <FolderOutlined /> },
            { key: '05_海外物联网业务/技术研发中心/硬件产品文档', title: '硬件产品文档', icon: <FolderOutlined /> },
            { key: '05_海外物联网业务/技术研发中心/软件系统文档', title: '软件系统文档', icon: <FolderOutlined /> },
          ],
        },
        {
          key: '05_海外物联网业务/销售管理部',
          title: '销售管理部',
          icon: <FolderOutlined />,
          children: [
            { key: '05_海外物联网业务/销售管理部/合同范本库', title: '合同范本库', icon: <FolderOutlined /> },
            { key: '05_海外物联网业务/销售管理部/报价模板库', title: '报价模板库', icon: <FolderOutlined /> },
            { key: '05_海外物联网业务/销售管理部/销售培训资料', title: '销售培训资料', icon: <FolderOutlined /> },
            { key: '05_海外物联网业务/销售管理部/销售数据分析', title: '销售数据分析', icon: <FolderOutlined /> },
            { key: '05_海外物联网业务/销售管理部/销售流程规范', title: '销售流程规范', icon: <FolderOutlined /> },
          ],
        },
      ],
    },
    {
      key: '06_政府信息化业务',
      title: '06_政府信息化业务',
      icon: <FolderOutlined />,
      children: [
        {
          key: '06_政府信息化业务/项目运营中心',
          title: '项目运营中心',
          icon: <FolderOutlined />,
          children: [
            { key: '06_政府信息化业务/项目运营中心/市场商务团队', title: '市场商务团队', icon: <FolderOutlined /> },
            { key: '06_政府信息化业务/项目运营中心/质量成本团队', title: '质量成本团队', icon: <FolderOutlined /> },
            { key: '06_政府信息化业务/项目运营中心/项目研发团队', title: '项目研发团队', icon: <FolderOutlined /> },
          ],
        },
      ],
    },
    {
      key: '07_保障性住房业务',
      title: '07_保障性住房业务',
      icon: <FolderOutlined />,
      children: [
        {
          key: '07_保障性住房业务/政策合规部',
          title: '政策合规部',
          icon: <FolderOutlined />,
          children: [
            { key: '07_保障性住房业务/政策合规部/保障房政策库', title: '保障房政策库', icon: <FolderOutlined /> },
            { key: '07_保障性住房业务/政策合规部/审计合规要求', title: '审计合规要求', icon: <FolderOutlined /> },
            { key: '07_保障性住房业务/政策合规部/政府检查记录', title: '政府检查记录', icon: <FolderOutlined /> },
            { key: '07_保障性住房业务/政策合规部/政策风险预警', title: '政策风险预警', icon: <FolderOutlined /> },
            { key: '07_保障性住房业务/政策合规部/补贴申请流程', title: '补贴申请流程', icon: <FolderOutlined /> },
          ],
        },
        {
          key: '07_保障性住房业务/物业管理部',
          title: '物业管理部',
          icon: <FolderOutlined />,
          children: [
            { key: '07_保障性住房业务/物业管理部/安全管理规范', title: '安全管理规范', icon: <FolderOutlined /> },
            { key: '07_保障性住房业务/物业管理部/收费管理制度', title: '收费管理制度', icon: <FolderOutlined /> },
            { key: '07_保障性住房业务/物业管理部/物业服务标准', title: '物业服务标准', icon: <FolderOutlined /> },
            { key: '07_保障性住房业务/物业管理部/环境管理标准', title: '环境管理标准', icon: <FolderOutlined /> },
            { key: '07_保障性住房业务/物业管理部/维修维护手册', title: '维修维护手册', icon: <FolderOutlined /> },
          ],
        },
        {
          key: '07_保障性住房业务/租户管理部',
          title: '租户管理部',
          icon: <FolderOutlined />,
          children: [
            { key: '07_保障性住房业务/租户管理部/投诉处理流程', title: '投诉处理流程', icon: <FolderOutlined /> },
            { key: '07_保障性住房业务/租户管理部/社区活动管理', title: '社区活动管理', icon: <FolderOutlined /> },
            { key: '07_保障性住房业务/租户管理部/租户信息档案', title: '租户信息档案', icon: <FolderOutlined /> },
            { key: '07_保障性住房业务/租户管理部/租户服务指南', title: '租户服务指南', icon: <FolderOutlined /> },
            { key: '07_保障性住房业务/租户管理部/租赁合同模板', title: '租赁合同模板', icon: <FolderOutlined /> },
          ],
        },
        {
          key: '07_保障性住房业务/项目建设部',
          title: '项目建设部',
          icon: <FolderOutlined />,
          children: [
            { key: '07_保障性住房业务/项目建设部/工程进度管理', title: '工程进度管理', icon: <FolderOutlined /> },
            { key: '07_保障性住房业务/项目建设部/施工图纸资料', title: '施工图纸资料', icon: <FolderOutlined /> },
            { key: '07_保障性住房业务/项目建设部/施工规范标准', title: '施工规范标准', icon: <FolderOutlined /> },
            { key: '07_保障性住房业务/项目建设部/规划设计文件', title: '规划设计文件', icon: <FolderOutlined /> },
            { key: '07_保障性住房业务/项目建设部/质量验收记录', title: '质量验收记录', icon: <FolderOutlined /> },
          ],
        },
      ],
    },
    {
      key: '08_技术研发中心',
      title: '08_技术研发中心',
      icon: <FolderOutlined />,
      children: [
        { key: '08_技术研发中心/创新项目库', title: '创新项目库', icon: <FolderOutlined /> },
        { key: '08_技术研发中心/技术培训资料', title: '技术培训资料', icon: <FolderOutlined /> },
        { key: '08_技术研发中心/技术架构规范', title: '技术架构规范', icon: <FolderOutlined /> },
        { key: '08_技术研发中心/知识产权管理', title: '知识产权管理', icon: <FolderOutlined /> },
        { key: '08_技术研发中心/研发流程管理', title: '研发流程管理', icon: <FolderOutlined /> },
      ],
    },
    {
      key: '09_项目管理办公室',
      title: '09_项目管理办公室',
      icon: <FolderOutlined />,
      children: [
        { key: '09_项目管理办公室/项目模板库', title: '项目模板库', icon: <FolderOutlined /> },
        { key: '09_项目管理办公室/项目管理方法论', title: '项目管理方法论', icon: <FolderOutlined /> },
        { key: '09_项目管理办公室/项目经验总结', title: '项目经验总结', icon: <FolderOutlined /> },
        { key: '09_项目管理办公室/项目绩效评估', title: '项目绩效评估', icon: <FolderOutlined /> },
        { key: '09_项目管理办公室/项目风险管理', title: '项目风险管理', icon: <FolderOutlined /> },
      ],
    },
    {
      key: '10_法务合规中心',
      title: '10_法务合规中心',
      icon: <FolderOutlined />,
      children: [
        { key: '10_法务合规中心/合同模板库', title: '合同模板库', icon: <FolderOutlined /> },
        { key: '10_法务合规中心/合规审查流程', title: '合规审查流程', icon: <FolderOutlined /> },
        { key: '10_法务合规中心/法律咨询记录', title: '法律咨询记录', icon: <FolderOutlined /> },
        { key: '10_法务合规中心/法律风险防控', title: '法律风险防控', icon: <FolderOutlined /> },
        { key: '10_法务合规中心/诉讼案件管理', title: '诉讼案件管理', icon: <FolderOutlined /> },
      ],
    },
    {
      key: '11_知识库管理规范',
      title: '11_知识库管理规范',
      icon: <FolderOutlined />,
      children: [
        { key: '11_知识库管理规范/定期维护计划', title: '定期维护计划', icon: <FolderOutlined /> },
        { key: '11_知识库管理规范/搜索优化策略', title: '搜索优化策略', icon: <FolderOutlined /> },
        { key: '11_知识库管理规范/文档分类标准', title: '文档分类标准', icon: <FolderOutlined /> },
        { key: '11_知识库管理规范/权限管理体系', title: '权限管理体系', icon: <FolderOutlined /> },
        { key: '11_知识库管理规范/版本控制机制', title: '版本控制机制', icon: <FolderOutlined /> },
        { key: '11_知识库管理规范/知识贡献激励', title: '知识贡献激励', icon: <FolderOutlined /> },
      ],
    },
  ];

  // 获取目录路径
  const getDirectoryPath = (key: string): string => {
    return `/root/knowledge-base-app/company_knowledge_base/${key}`;
  };

  // 目录选择处理
  const handleDirectorySelect = (selectedKeys: React.Key[]) => {
    if (selectedKeys.length > 0) {
      const selectedKey = selectedKeys[0] as string;
      setSelectedDirectory(selectedKey);
      form.setFieldValue('upload_directory', selectedKey);
    }
  };

  // 加载分类数据
  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await CategoryService.getCategoryTree();
      const flatCategories = flattenCategories(response?.data || []);
      setCategories(flatCategories);
    } catch (error) {
      message.error('加载分类数据失败');
      console.error('Load categories error:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  // 扁平化分类数据
  const flattenCategories = (categories: Category[]): Category[] => {
    const result: Category[] = [];
    const flatten = (cats: Category[], level = 0) => {
      if (!cats || !Array.isArray(cats)) {
        return;
      }
      cats.forEach(cat => {
        result.push({ ...cat, level });
        if (cat.children && Array.isArray(cat.children) && cat.children.length > 0) {
          flatten(cat.children, level + 1);
        }
      });
    };
    flatten(categories);
    return result;
  };

  // 文件上传前的检查
  const beforeUpload = (file: File) => {
    const isValidType = Object.keys(acceptedFileTypes).includes(file.type) ||
      Object.values(acceptedFileTypes).flat().some(ext => file.name.toLowerCase().endsWith(ext));
    
    if (!isValidType) {
      message.error('不支持的文件格式！请上传 PDF、Word、Excel、PowerPoint、TXT、Markdown 或 CSV 文件');
      return false;
    }

    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('文件大小不能超过 10MB！');
      return false;
    }

    return false; // 阻止自动上传
  };

  // 文件列表变化处理
  const handleFileChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
    setFileList(newFileList);
    
    // 如果添加了文件且标题为空，自动填充标题
    if (newFileList.length > 0 && !form.getFieldValue('title')) {
      const fileName = newFileList[0].name;
      const titleWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
      form.setFieldValue('title', titleWithoutExt);
    }
  };

  // 移除文件
  const handleRemoveFile = (file: UploadFile) => {
    const newFileList = fileList.filter(item => item.uid !== file.uid);
    setFileList(newFileList);
  };

  // 获取文件类型图标
  const getFileIcon = (fileName: string) => {
    const ext = fileName.toLowerCase().split('.').pop();
    switch (ext) {
      case 'pdf':
        return <FileTextOutlined style={{ color: '#ff4d4f' }} />;
      case 'doc':
      case 'docx':
        return <FileTextOutlined style={{ color: '#1890ff' }} />;
      case 'xls':
      case 'xlsx':
        return <FileTextOutlined style={{ color: '#52c41a' }} />;
      case 'ppt':
      case 'pptx':
        return <FileTextOutlined style={{ color: '#fa8c16' }} />;
      default:
        return <FileTextOutlined />;
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 提交表单
  const handleSubmit = async (values: DocumentUploadForm) => {
    if (fileList.length === 0) {
      message.error('请选择要上传的文件');
      return;
    }

    if (!selectedDirectory) {
      message.error('请选择上传目录');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      // 模拟上传进度
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const file = fileList[0];
      const response = await DocumentService.uploadDocument(
        file.originFileObj as File,
        values.title,
        values.description || '',
        values.category_id || '',
        selectedDirectory
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.success) {
        message.success(`文档上传成功！存储路径：${getDirectoryPath(selectedDirectory)}`);
        setTimeout(() => {
          navigate('/documents');
        }, 2000);
      } else {
        throw new Error(response.message || '上传失败');
      }
    } catch (error) {
      message.error('文档上传失败，请重试');
      console.error('Upload error:', error);
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  // 重置表单
  const handleReset = () => {
    form.resetFields();
    setFileList([]);
    setUploadProgress(0);
    setSelectedDirectory('');
  };

  // 组件挂载时加载分类
  useEffect(() => {
    loadCategories();
  }, []);

  return (
    <div className="document-upload-page p-6">
      <Title level={2} className="mb-6" data-testid="page-title">
        文档上传
      </Title>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card title="文档信息" className="mb-6" data-testid="document-info-card">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              className="document-upload-form"
              data-testid="document-upload-form"
            >
              <Form.Item
                label="文档标题"
                name="title"
                rules={[
                  { required: true, message: '请输入文档标题' },
                  { min: 2, message: '标题至少2个字符' },
                  { max: 100, message: '标题不能超过100个字符' }
                ]}
              >
                <Input
                  placeholder="请输入文档标题"
                  maxLength={100}
                  showCount
                  data-testid="title-input"
                />
              </Form.Item>

              <Form.Item
                label="文档描述"
                name="description"
                rules={[
                  { max: 500, message: '描述不能超过500个字符' }
                ]}
              >
                <TextArea
                  placeholder="请输入文档描述（可选）"
                  rows={4}
                  maxLength={500}
                  showCount
                  data-testid="description-input"
                />
              </Form.Item>

              <Form.Item
                label="文档分类"
                name="category_id"
                rules={[
                  { required: false, message: '请选择文档分类' }
                ]}
              >
                <Select
                  placeholder="请选择文档分类（可选）"
                  loading={loadingCategories}
                  allowClear
                  data-testid="category-select"
                >
                  {categories.map(category => (
                    <Option key={category.id} value={category.id}>
                      {category.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              {selectedDirectory && (
                <Alert
                  message={`已选择目录: ${getDirectoryPath(selectedDirectory)}`}
                  type="info"
                  showIcon
                  className="mb-4"
                  data-testid="selected-directory-alert"
                />
              )}

              <Form.Item>
                <Space>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={uploading}
                    disabled={fileList.length === 0 || !selectedDirectory}
                    icon={<SaveOutlined />}
                    className="upload-button"
                    data-testid="upload-button"
                  >
                    {uploading ? '上传中...' : '上传文档'}
                  </Button>
                  <Button 
                    onClick={handleReset} 
                    disabled={uploading}
                    className="reset-button"
                    data-testid="reset-button"
                  >
                    重置
                  </Button>
                  <Button 
                    onClick={() => navigate('/documents')}
                    className="back-button"
                    data-testid="back-button"
                  >
                    返回文档列表
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={6}>
          <Card title="选择上传目录" className="mb-6">
            <Tree
              treeData={directoryTreeData}
              onSelect={handleDirectorySelect}
              selectedKeys={selectedDirectory ? [selectedDirectory] : []}
              expandedKeys={expandedKeys}
              onExpand={setExpandedKeys}
              showIcon
              height={400}
              style={{ overflow: 'auto' }}
              className="directory-tree"
              data-testid="directory-tree"
            />
          </Card>
        </Col>

        <Col xs={24} lg={6}>
          <Card title="文件上传" className="mb-6">
            <Dragger
              fileList={fileList}
              onChange={handleFileChange}
              beforeUpload={beforeUpload}
              maxCount={1}
              accept={acceptString}
              disabled={uploading}
              className="file-dragger"
              data-testid="file-dragger"
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">
                支持单个文件上传，文件大小不超过 10MB
              </p>
            </Dragger>

            {uploading && uploadProgress > 0 && (
              <div className="mt-4">
                <Progress percent={uploadProgress} status="active" />
                <Text type="secondary" className="text-sm">
                  正在上传文档...
                </Text>
              </div>
            )}
          </Card>

          {fileList.length > 0 && (
            <Card title="已选文件" size="small" className="mb-6">
              {fileList.map(file => (
                <div key={file.uid} className="flex items-center justify-between p-2 border rounded mb-2">
                  <div className="flex items-center space-x-2 flex-1">
                    {getFileIcon(file.name)}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{file.name}</div>
                      <div className="text-xs text-gray-500">
                        {formatFileSize(file.size || 0)}
                      </div>
                    </div>
                  </div>
                  <Tooltip title="移除文件">
                    <Button
                      type="text"
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => handleRemoveFile(file)}
                      disabled={uploading}
                    />
                  </Tooltip>
                </div>
              ))}
            </Card>
          )}

          <Card title="支持格式" size="small">
            <div className="space-y-2">
              <div>
                <Tag color="red">PDF</Tag>
                <Text type="secondary" className="text-sm">便携式文档格式</Text>
              </div>
              <div>
                <Tag color="blue">Word</Tag>
                <Text type="secondary" className="text-sm">DOC, DOCX</Text>
              </div>
              <div>
                <Tag color="green">Excel</Tag>
                <Text type="secondary" className="text-sm">XLS, XLSX</Text>
              </div>
              <div>
                <Tag color="orange">PowerPoint</Tag>
                <Text type="secondary" className="text-sm">PPT, PPTX</Text>
              </div>
              <div>
                <Tag color="purple">文本</Tag>
                <Text type="secondary" className="text-sm">TXT, MD, CSV</Text>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};