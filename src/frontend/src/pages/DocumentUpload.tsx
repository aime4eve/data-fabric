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
  Steps,
  Result,
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
  CheckCircleOutlined,
  EditOutlined,
  InfoCircleOutlined,
  ExclamationCircleOutlined,
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
const { Step } = Steps;

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
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>(['01_公司基本信息']);
  const [currentStep, setCurrentStep] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadedDocument, setUploadedDocument] = useState<any>(null);





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
          key: '05_海外物联网业务/技术研发中心',
          title: '技术研发中心',
          icon: <FolderOutlined />,
          children: [
            { key: '05_海外物联网业务/技术研发中心/产品规格书', title: '产品规格书', icon: <FolderOutlined /> },
            { key: '05_海外物联网业务/技术研发中心/技术标准文档', title: '技术标准文档', icon: <FolderOutlined /> },
            { key: '05_海外物联网业务/技术研发中心/测试报告', title: '测试报告', icon: <FolderOutlined /> },
            { key: '05_海外物联网业务/技术研发中心/研发流程规范', title: '研发流程规范', icon: <FolderOutlined /> },
            { key: '05_海外物联网业务/技术研发中心/硬件产品文档', title: '硬件产品文档', icon: <FolderOutlined /> },
            { key: '05_海外物联网业务/技术研发中心/软件系统文档', title: '软件系统文档', icon: <FolderOutlined /> },
          ],
        },
        {
          key: '05_海外物联网业务/销售市场部',
          title: '销售市场部',
          icon: <FolderOutlined />,
          children: [
            { key: '05_海外物联网业务/销售市场部/产品宣传资料', title: '产品宣传资料', icon: <FolderOutlined /> },
            { key: '05_海外物联网业务/销售市场部/合同模板', title: '合同模板', icon: <FolderOutlined /> },
            { key: '05_海外物联网业务/销售市场部/客户资料管理', title: '客户资料管理', icon: <FolderOutlined /> },
            { key: '05_海外物联网业务/销售市场部/市场分析报告', title: '市场分析报告', icon: <FolderOutlined /> },
            { key: '05_海外物联网业务/销售市场部/销售流程规范', title: '销售流程规范', icon: <FolderOutlined /> },
          ],
        },
      ],
    },
    {
      key: '06_国内智慧城市业务',
      title: '06_国内智慧城市业务',
      icon: <FolderOutlined />,
      children: [
        {
          key: '06_国内智慧城市业务/项目实施部',
          title: '项目实施部',
          icon: <FolderOutlined />,
          children: [
            { key: '06_国内智慧城市业务/项目实施部/实施方案模板', title: '实施方案模板', icon: <FolderOutlined /> },
            { key: '06_国内智慧城市业务/项目实施部/项目交付标准', title: '项目交付标准', icon: <FolderOutlined /> },
            { key: '06_国内智慧城市业务/项目实施部/质量控制流程', title: '质量控制流程', icon: <FolderOutlined /> },
          ],
        },
        {
          key: '06_国内智慧城市业务/解决方案部',
          title: '解决方案部',
          icon: <FolderOutlined />,
          children: [
            { key: '06_国内智慧城市业务/解决方案部/技术方案库', title: '技术方案库', icon: <FolderOutlined /> },
            { key: '06_国内智慧城市业务/解决方案部/行业解决方案', title: '行业解决方案', icon: <FolderOutlined /> },
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
          key: '07_保障性住房业务/物业管理部',
          title: '物业管理部',
          icon: <FolderOutlined />,
          children: [
            { key: '07_保障性住房业务/物业管理部/住户服务指南', title: '住户服务指南', icon: <FolderOutlined /> },
            { key: '07_保障性住房业务/物业管理部/安全管理制度', title: '安全管理制度', icon: <FolderOutlined /> },
            { key: '07_保障性住房业务/物业管理部/物业服务标准', title: '物业服务标准', icon: <FolderOutlined /> },
            { key: '07_保障性住房业务/物业管理部/环境管理标准', title: '环境管理标准', icon: <FolderOutlined /> },
            { key: '07_保障性住房业务/物业管理部/维修维护手册', title: '维修维护手册', icon: <FolderOutlined /> },
          ],
        },
        {
          key: '07_保障性住房业务/运营管理部',
          title: '运营管理部',
          icon: <FolderOutlined />,
          children: [
            { key: '07_保障性住房业务/运营管理部/入住管理流程', title: '入住管理流程', icon: <FolderOutlined /> },
            { key: '07_保障性住房业务/运营管理部/租赁管理制度', title: '租赁管理制度', icon: <FolderOutlined /> },
            { key: '07_保障性住房业务/运营管理部/费用管理规范', title: '费用管理规范', icon: <FolderOutlined /> },
          ],
        },
      ],
    },
    {
      key: '08_投资发展中心',
      title: '08_投资发展中心',
      icon: <FolderOutlined />,
      children: [
        { key: '08_投资发展中心/投资决策流程', title: '投资决策流程', icon: <FolderOutlined /> },
        { key: '08_投资发展中心/项目评估标准', title: '项目评估标准', icon: <FolderOutlined /> },
        { key: '08_投资发展中心/风险控制体系', title: '风险控制体系', icon: <FolderOutlined /> },
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
      ],
    },
  ];

  // 加载分类数据
  useEffect(() => {
    const loadCategories = async () => {
      setLoadingCategories(true);
      try {
        const response = await CategoryService.getCategoryTree();
        setCategories(response.data || []);
      } catch (error) {
        console.error('加载分类失败:', error);
        message.error('加载分类失败');
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);

  // 文件上传前验证
  const beforeUpload = (file: File) => {
    const isValidType = Object.keys(acceptedFileTypes).some(type => 
      file.type === type || acceptedFileTypes[type as keyof typeof acceptedFileTypes].some(ext => 
        file.name.toLowerCase().endsWith(ext)
      )
    );
    
    if (!isValidType) {
      message.error('不支持的文件格式！请选择支持的文件类型。');
      return false;
    }

    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('文件大小不能超过 10MB！');
      return false;
    }

    return false; // 阻止自动上传
  };

  // 处理文件选择
  const handleFileChange: UploadProps['onChange'] = (info) => {
    console.log('文件选择变化:', info);
    console.log('文件列表:', info.fileList);
    
    // 正确处理文件对象，确保originFileObj存在
    const processedFileList: UploadFile[] = info.fileList.map(file => {
      // 如果文件没有originFileObj，但有其他文件属性，说明是新上传的文件
      if (!file.originFileObj && file.status !== 'removed') {
        console.log('处理文件对象:', file);
        // 对于新上传的文件，file本身就是File对象
        if (file instanceof File) {
          return {
            ...file,
            uid: file.uid || `${Date.now()}-${Math.random()}`,
            name: file.name,
            size: file.size,
            type: file.type,
            originFileObj: file as any,
            status: 'done' as const
          };
        }
        // 如果file不是File对象但包含文件信息，可能需要从其他属性获取
        else if (file.name && file.size !== undefined) {
          console.warn('文件对象结构异常，尝试修复:', file);
          // 尝试从file对象本身获取File实例
          const fileObj = (file as any).originFileObj || (file as any).file || file;
          if (fileObj instanceof File) {
            return {
              ...file,
              originFileObj: fileObj as any,
              status: 'done' as const
            };
          }
        }
      }
      return file;
    });
    
    console.log('处理后的文件列表:', processedFileList);
    setFileList(processedFileList);
    
    if (processedFileList.length > 0 && currentStep === 0) {
      setCurrentStep(1);
      // 自动填充文档标题
      const fileName = processedFileList[0].name;
      const titleWithoutExt = fileName.replace(/\.[^/.]+$/, "");
      form.setFieldsValue({ title: titleWithoutExt });
    } else if (processedFileList.length === 0 && currentStep > 0) {
      setCurrentStep(0);
    }
  };

  // 处理目录选择
  const handleDirectorySelect = (selectedKeys: React.Key[], info: any) => {
    if (selectedKeys.length > 0) {
      const selectedKey = selectedKeys[0] as string;
      setSelectedDirectory(selectedKey);
      form.setFieldsValue({ upload_directory: selectedKey });
      if (currentStep === 1) {
        setCurrentStep(2);
      }
    }
  };

  // 处理重置
  const handleReset = () => {
    form.resetFields();
    setFileList([]);
    setSelectedDirectory('');
    setCurrentStep(0);
    setUploadProgress(0);
    setUploadSuccess(false);
    setUploadedDocument(null);
  };

  // 处理表单提交
  const handleSubmit = async (values: DocumentUploadForm) => {
    console.log('开始提交表单:', values);
    console.log('文件列表:', fileList);
    
    if (fileList.length === 0) {
      message.error('请选择要上传的文件');
      return;
    }

    if (!values.upload_directory) {
      message.error('请选择上传目录');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const file = fileList[0];
      console.log('准备上传文件:', {
        name: file.name,
        size: file.size,
        type: file.type,
        originFileObj: file.originFileObj
      });
      
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

      // 调用上传API
      console.log('调用DocumentService.uploadDocument...');
      
      // 确保文件对象存在
      if (!file.originFileObj) {
        throw new Error('文件对象不存在');
      }
      
      const response = await DocumentService.uploadDocument(
        file.originFileObj as File,
        values.title,
        values.description || '',
        values.category_id || '',
        values.upload_directory
      );
      
      console.log('上传响应:', response);
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      if (response && response.success) {
        setUploadSuccess(true);
        setUploadedDocument(response.document);
        message.success('文档上传成功！');
        setCurrentStep(2); // 移动到成功步骤
      } else {
        throw new Error(response?.message || '上传失败');
      }

    } catch (error: any) {
      console.error('上传失败:', error);
      console.error('错误详情:', {
        message: error.message,
        stack: error.stack,
        response: error.response
      });
      
      setUploadProgress(0);
      
      const errorMessage = error.message || '文档上传失败，请重试';
      message.error(errorMessage);
      setUploadSuccess(false);
    } finally {
      setUploading(false);
    }
  };

  // 步骤配置
  const steps = [
    {
      title: '选择文件',
      icon: <InboxOutlined />,
      description: '选择要上传的文档文件',
    },
    {
      title: '选择目录',
      icon: <FolderOutlined />,
      description: '选择文档存储目录',
    },
    {
      title: '填写信息',
      icon: <EditOutlined />,
      description: '填写文档基本信息',
    },
  ];

  // 如果上传成功，显示成功页面
  if (uploadSuccess) {
    return (
      <div className="document-upload-container p-6">
        <div className="max-w-4xl mx-auto">
          <Result
            status="success"
            title="文档上传成功！"
            subTitle={`文档"${uploadedDocument?.title || '未知文档'}"已成功上传到知识库`}
            extra={[
              <Button type="primary" key="view" onClick={() => navigate('/documents')}>
                查看文档列表
              </Button>,
              <Button key="upload-again" onClick={handleReset}>
                继续上传
              </Button>,
            ]}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="document-upload-container p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Title level={2}>
            <FileTextOutlined className="mr-2" />
            文档上传
          </Title>
          <Text type="secondary">
            按照以下步骤完成文档上传：选择文件 → 选择目录 → 填写信息 → 确认上传
          </Text>
        </div>

        {/* 步骤指示器 */}
        <Card className="mb-6">
          <Steps current={currentStep} items={steps} />
        </Card>

        {/* 操作提示 */}
        <Alert
          message="上传提示"
          description={
            <div>
              <p>• 支持的文件格式：PDF、Word、Excel、PowerPoint、TXT、Markdown、CSV</p>
              <p>• 单个文件大小不超过 10MB</p>
              <p>• 建议为文档选择合适的分类和目录，便于后续管理和检索</p>
            </div>
          }
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          className="mb-6"
        />

        <Row gutter={24}>
          {/* 左侧：文件上传和目录选择 */}
          <Col xs={24} lg={14}>
            {/* 第一步：文件上传 */}
            <Card 
              title={
                <Space>
                  <InboxOutlined />
                  <span>第一步：选择文件</span>
                  {fileList.length > 0 && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
                </Space>
              } 
              className="mb-6"
              style={{ 
                border: currentStep === 0 ? '2px solid #1890ff' : '1px solid #d9d9d9',
                backgroundColor: fileList.length > 0 ? '#f6ffed' : 'white'
              }}
            >
              <Dragger
                fileList={fileList}
                onChange={handleFileChange}
                beforeUpload={beforeUpload}
                maxCount={1}
                accept={acceptString}
                disabled={uploading}
                className="file-dragger"
                data-testid="file-dragger"
                customRequest={({ file, onSuccess }) => {
                  // 自定义上传请求，阻止默认上传行为
                  console.log('自定义上传请求:', file);
                  console.log('文件类型:', typeof file);
                  console.log('文件属性:', Object.keys(file));
                  
                  // 确保文件对象正确设置
                  const uploadFile = {
                    uid: Date.now().toString(),
                    name: (file as File).name,
                    size: (file as File).size,
                    type: (file as File).type,
                    originFileObj: file as File,
                    status: 'done' as const
                  };
                  
                  console.log('处理后的文件对象:', uploadFile);
                  
                  // 立即调用成功回调，但不实际上传
                  setTimeout(() => {
                    onSuccess?.(uploadFile);
                  }, 0);
                }}
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
                <p className="ant-upload-hint">
                  支持单个文件上传，文件大小不超过 10MB
                </p>
              </Dragger>

              {/* 支持的文件格式提示 */}
              <div className="mt-4">
                <Text type="secondary" className="text-sm">
                  支持的文件格式：
                </Text>
                <div className="mt-2">
                  {Object.values(acceptedFileTypes).flat().map(ext => (
                    <Tag key={ext} color="blue" className="mb-1">
                      {ext}
                    </Tag>
                  ))}
                </div>
              </div>

              {/* 已选文件显示 */}
              {fileList.length > 0 && (
                <div className="mt-4">
                  <Alert
                    message="已选择文件"
                    description={
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FileTextOutlined />
                          <span>{fileList[0].name}</span>
                          <Tag color="green">
                            {(fileList[0].size! / 1024 / 1024).toFixed(2)} MB
                          </Tag>
                        </div>
                        <Button
                          type="text"
                          icon={<DeleteOutlined />}
                          onClick={() => {
                            setFileList([]);
                            setCurrentStep(0);
                          }}
                          disabled={uploading}
                        >
                          移除
                        </Button>
                      </div>
                    }
                    type="success"
                    showIcon
                  />
                </div>
              )}
            </Card>

            {/* 第二步：目录选择 */}
            <Card 
              title={
                <Space>
                  <FolderOutlined />
                  <span>第二步：选择目录</span>
                  {selectedDirectory && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
                </Space>
              } 
              className="mb-6"
              style={{ 
                border: currentStep === 1 ? '2px solid #1890ff' : '1px solid #d9d9d9',
                backgroundColor: selectedDirectory ? '#f6ffed' : 'white',
                opacity: fileList.length === 0 ? 0.6 : 1
              }}
            >
              {fileList.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <ExclamationCircleOutlined className="text-2xl mb-2" />
                  <p>请先选择要上传的文件</p>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <Text type="secondary">
                      选择文档存储的目录位置，建议根据文档类型选择合适的分类目录
                    </Text>
                  </div>
                  <Tree
                    showLine
                    showIcon
                    defaultExpandedKeys={['01_公司基本信息']}
                    expandedKeys={expandedKeys}
                    onExpand={setExpandedKeys}
                    onSelect={handleDirectorySelect}
                    treeData={directoryTreeData}
                    className="directory-tree"
                    data-testid="directory-tree"
                  />
                  {selectedDirectory && (
                    <div className="mt-4">
                      <Alert
                        message="已选择目录"
                        description={
                          <div className="flex items-center space-x-2">
                            <FolderOpenOutlined />
                            <span>{selectedDirectory}</span>
                          </div>
                        }
                        type="success"
                        showIcon
                      />
                    </div>
                  )}
                </>
              )}
            </Card>
          </Col>

          {/* 右侧：文档信息表单 */}
          <Col xs={24} lg={10}>
            <Card 
              title={
                <Space>
                  <EditOutlined />
                  <span>第三步：填写信息</span>
                  {currentStep >= 2 && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
                </Space>
              }
              style={{ 
                border: currentStep === 2 ? '2px solid #1890ff' : '1px solid #d9d9d9',
                opacity: !fileList.length || !selectedDirectory ? 0.6 : 1
              }}
            >
              {!fileList.length || !selectedDirectory ? (
                <div className="text-center py-8 text-gray-400">
                  <ExclamationCircleOutlined className="text-2xl mb-2" />
                  <p>请先完成文件选择和目录选择</p>
                </div>
              ) : (
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleSubmit}
                  disabled={uploading}
                  data-testid="document-upload-form"
                >
                  <Form.Item name="upload_directory" hidden>
                    <Input />
                  </Form.Item>
                  <Form.Item
                    label="文档标题"
                    name="title"
                    rules={[
                      { required: true, message: '请输入文档标题' },
                      { max: 100, message: '标题长度不能超过100个字符' }
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
                      { max: 500, message: '描述长度不能超过500个字符' }
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

                  {/* 上传进度 */}
                  {uploading && uploadProgress > 0 && (
                    <div className="mb-4">
                      <Progress percent={uploadProgress} status="active" />
                      <Text type="secondary" className="text-sm">
                        正在上传文档...
                      </Text>
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <Form.Item>
                    <Space>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={uploading}
                        disabled={!fileList.length || !selectedDirectory}
                        icon={<SaveOutlined />}
                        size="large"
                        data-testid="upload-button"
                      >
                        {uploading ? '上传中...' : '上传文档'}
                      </Button>
                      <Button
                        onClick={handleReset}
                        disabled={uploading}
                        size="large"
                        data-testid="reset-button"
                      >
                        重置
                      </Button>
                      <Button
                        onClick={() => navigate('/documents')}
                        disabled={uploading}
                        size="large"
                        data-testid="cancel-button"
                      >
                        取消
                      </Button>
                    </Space>
                  </Form.Item>
                </Form>
              )}
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};