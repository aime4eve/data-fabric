import React, { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Form,
  Input,
  Button,
  Switch,
  Select,
  Avatar,
  Upload,
  message,
  Divider,
  Space,
  Row,
  Col,
  Typography,
  Alert,
  Modal
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  SettingOutlined,
  CameraOutlined,
  SaveOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone
} from '@ant-design/icons';
import { useAuthStore } from '../store/authStore';

const { Title, Text } = Typography;
const { Option } = Select;

interface UserProfile {
  id: string;
  username: string;
  email: string;
  fullName: string;
  avatar?: string;
  phone?: string;
  department?: string;
  position?: string;
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: 'zh-CN' | 'en-US';
  emailNotifications: boolean;
  systemNotifications: boolean;
  autoSave: boolean;
  pageSize: number;
}

interface PasswordChangeForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const Settings: React.FC = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  
  // 表单实例
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [preferencesForm] = Form.useForm();
  
  // 状态管理
  const [userProfile, setUserProfile] = useState<UserProfile>({
    id: user?.id || '',
    username: user?.username || '',
    email: user?.email || '',
    fullName: user?.fullName || '',
    avatar: user?.avatar,
    phone: '',
    department: '',
    position: ''
  });
  
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: 'light',
    language: 'zh-CN',
    emailNotifications: true,
    systemNotifications: true,
    autoSave: true,
    pageSize: 20
  });

  // 初始化数据
  useEffect(() => {
    loadUserProfile();
    loadUserPreferences();
  }, []);

  const loadUserProfile = async () => {
    try {
      // 这里应该调用API获取用户详细信息
      // const response = await userService.getProfile();
      // setUserProfile(response.data);
      
      // 模拟数据
      const mockProfile: UserProfile = {
        id: user?.id || '1',
        username: user?.username || 'admin',
        email: user?.email || 'admin@example.com',
        fullName: user?.fullName || '管理员',
        avatar: user?.avatar,
        phone: '138****8888',
        department: '技术部',
        position: '系统管理员'
      };
      
      setUserProfile(mockProfile);
      profileForm.setFieldsValue(mockProfile);
    } catch (error) {
      message.error('加载用户信息失败');
    }
  };

  const loadUserPreferences = async () => {
    try {
      // 这里应该调用API获取用户偏好设置
      // const response = await userService.getPreferences();
      // setPreferences(response.data);
      
      // 从localStorage加载偏好设置
      const savedPreferences = localStorage.getItem('userPreferences');
      if (savedPreferences) {
        const parsedPreferences = JSON.parse(savedPreferences);
        setPreferences(parsedPreferences);
        preferencesForm.setFieldsValue(parsedPreferences);
      } else {
        preferencesForm.setFieldsValue(preferences);
      }
    } catch (error) {
      message.error('加载偏好设置失败');
    }
  };

  // 更新个人信息
  const handleProfileUpdate = async (values: any) => {
    setLoading(true);
    try {
      // 这里应该调用API更新用户信息
      // await userService.updateProfile(values);
      
      setUserProfile({ ...userProfile, ...values });
      message.success('个人信息更新成功');
    } catch (error) {
      message.error('更新个人信息失败');
    } finally {
      setLoading(false);
    }
  };

  // 修改密码
  const handlePasswordChange = async (values: PasswordChangeForm) => {
    setLoading(true);
    try {
      // 这里应该调用API修改密码
      // await userService.changePassword(values);
      
      message.success('密码修改成功');
      passwordForm.resetFields();
    } catch (error) {
      message.error('密码修改失败');
    } finally {
      setLoading(false);
    }
  };

  // 更新偏好设置
  const handlePreferencesUpdate = async (values: UserPreferences) => {
    setLoading(true);
    try {
      // 这里应该调用API更新偏好设置
      // await userService.updatePreferences(values);
      
      setPreferences(values);
      localStorage.setItem('userPreferences', JSON.stringify(values));
      message.success('偏好设置更新成功');
    } catch (error) {
      message.error('更新偏好设置失败');
    } finally {
      setLoading(false);
    }
  };

  // 头像上传
  const handleAvatarUpload = (info: any) => {
    if (info.file.status === 'uploading') {
      setLoading(true);
      return;
    }
    if (info.file.status === 'done') {
      // 这里应该处理上传成功的逻辑
      message.success('头像上传成功');
      setLoading(false);
    }
  };

  // 个人信息表单
  const ProfileForm = () => (
    <Card title="个人信息" extra={<UserOutlined />}>
      <Row gutter={24}>
        <Col span={6}>
          <div style={{ textAlign: 'center' }}>
            <Avatar
              size={120}
              src={userProfile.avatar}
              icon={<UserOutlined />}
              style={{ marginBottom: 16 }}
            />
            <Upload
              name="avatar"
              showUploadList={false}
              action="/api/v1/users/avatar"
              beforeUpload={(file) => {
                const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
                if (!isJpgOrPng) {
                  message.error('只能上传 JPG/PNG 格式的图片!');
                }
                const isLt2M = file.size / 1024 / 1024 < 2;
                if (!isLt2M) {
                  message.error('图片大小不能超过 2MB!');
                }
                return isJpgOrPng && isLt2M;
              }}
              onChange={handleAvatarUpload}
            >
              <Button icon={<CameraOutlined />} loading={loading}>
                更换头像
              </Button>
            </Upload>
          </div>
        </Col>
        <Col span={18}>
          <Form
            form={profileForm}
            layout="vertical"
            onFinish={handleProfileUpdate}
            initialValues={userProfile}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="用户名"
                  name="username"
                  rules={[{ required: true, message: '请输入用户名' }]}
                >
                  <Input disabled />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="邮箱"
                  name="email"
                  rules={[
                    { required: true, message: '请输入邮箱' },
                    { type: 'email', message: '请输入有效的邮箱地址' }
                  ]}
                >
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="姓名"
                  name="fullName"
                  rules={[{ required: true, message: '请输入姓名' }]}
                >
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="手机号"
                  name="phone"
                >
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="部门"
                  name="department"
                >
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="职位"
                  name="position"
                >
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
                保存更改
              </Button>
            </Form.Item>
          </Form>
        </Col>
      </Row>
    </Card>
  );

  // 密码修改表单
  const PasswordForm = () => (
    <Card title="修改密码" extra={<LockOutlined />}>
      <Alert
        message="密码安全提示"
        description="为了您的账户安全，建议定期更换密码，密码应包含字母、数字和特殊字符。"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />
      <Form
        form={passwordForm}
        layout="vertical"
        onFinish={handlePasswordChange}
        style={{ maxWidth: 400 }}
      >
        <Form.Item
          label="当前密码"
          name="currentPassword"
          rules={[{ required: true, message: '请输入当前密码' }]}
        >
          <Input.Password
            iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
          />
        </Form.Item>
        <Form.Item
          label="新密码"
          name="newPassword"
          rules={[
            { required: true, message: '请输入新密码' },
            { min: 6, message: '密码长度至少6位' },
            {
              pattern: /^(?=.*[a-zA-Z])(?=.*\d)/,
              message: '密码必须包含字母和数字'
            }
          ]}
        >
          <Input.Password
            iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
          />
        </Form.Item>
        <Form.Item
          label="确认新密码"
          name="confirmPassword"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: '请确认新密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('两次输入的密码不一致'));
              },
            }),
          ]}
        >
          <Input.Password
            iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
          />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            修改密码
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );

  // 偏好设置表单
  const PreferencesForm = () => (
    <Card title="偏好设置" extra={<SettingOutlined />}>
      <Form
        form={preferencesForm}
        layout="vertical"
        onFinish={handlePreferencesUpdate}
        initialValues={preferences}
      >
        <Row gutter={24}>
          <Col span={12}>
            <Form.Item label="主题设置" name="theme">
              <Select>
                <Option value="light">浅色主题</Option>
                <Option value="dark">深色主题</Option>
                <Option value="auto">跟随系统</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="语言设置" name="language">
              <Select>
                <Option value="zh-CN">简体中文</Option>
                <Option value="en-US">English</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
        
        <Divider>通知设置</Divider>
        
        <Row gutter={24}>
          <Col span={12}>
            <Form.Item label="邮件通知" name="emailNotifications" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="系统通知" name="systemNotifications" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
        </Row>
        
        <Divider>系统设置</Divider>
        
        <Row gutter={24}>
          <Col span={12}>
            <Form.Item label="自动保存" name="autoSave" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="每页显示数量" name="pageSize">
              <Select>
                <Option value={10}>10条/页</Option>
                <Option value={20}>20条/页</Option>
                <Option value={50}>50条/页</Option>
                <Option value={100}>100条/页</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
        
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
            保存设置
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>系统设置</Title>
      <Text type="secondary">管理您的个人信息、密码和偏好设置</Text>
      
      <div style={{ marginTop: 24 }}>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            {
              key: 'profile',
              label: '个人信息',
              children: <ProfileForm />
            },
            {
              key: 'password',
              label: '修改密码',
              children: <PasswordForm />
            },
            {
              key: 'preferences',
              label: '偏好设置',
              children: <PreferencesForm />
            }
          ]}
        />
      </div>
    </div>
  );
};

export default Settings;