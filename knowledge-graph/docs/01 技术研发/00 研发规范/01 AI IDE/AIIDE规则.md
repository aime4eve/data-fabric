### 🎯 **完整技术栈架构**

#### **1. 前端技术栈**
| 领域 | 技术选型 | 说明 |
|------|----------|------|
| 框架 | React 18 | 组件化开发，支持并发特性 |
| 构建工具 | Vite 5 | 快速冷启动，优化开发体验 |
| 语言 | TypeScript 5 | 类型安全，提升代码质量 |
| 状态管理 | Zustand / Redux Toolkit | 轻量级全局状态管理 |
| 路由 | React Router v6 | 声明式路由管理 |
| UI组件库 | Ant Design / MUI | 企业级UI组件，快速搭建 |
| CSS方案 | Tailwind CSS + CSS Modules | 原子化CSS，模块化样式 |
| 数据获取 | React Query / SWR | 服务端状态管理，缓存策略 |
| 测试 | Jest + React Testing Library | 单元测试与组件测试 |
| 工具库 | Lodash ES, Day.js, Axios | 工具函数、日期处理、HTTP客户端 |

#### **2. 后端技术栈**
| 领域 | 技术选型 | 说明 |
|------|----------|------|
| 框架 | Flask 3.0 + Flask-RESTX | RESTful API开发，自动生成文档 |
| 语言 | Python 3.11+ | 高性能Python版本 |
| 图数据库 | nebulagraph | 专业图数据库 |
| 图计算库 | NetworkX (分析) + igraph (性能) | 内存图分析+高性能计算 |
| 数据序列化 | Marshmallow / Pydantic | 数据验证与序列化 |
| 认证授权 | Flask-JWT-Extended / Authlib | JWT令牌，OAuth2支持 |
| 异步任务 | Celery + Redis | 异步任务队列，定时任务 |
| API文档 | Swagger UI / ReDoc | 自动生成API文档 |
| 测试 | pytest + Flask-Testing | 单元测试与集成测试 |

#### **3. 数据存储层**
| 类型 | 技术选型 | 说明 |
|------|----------|------|
| 主图数据库 | NebulaGraph DB v3.8.0  | 原生图存储，ACID事务 |
| 缓存数据库 | Redis 7.x | 会话存储，缓存层 |
| 文件存储 | 三元组文件备份 + MinIO | 文件备份，对象存储 |
| 监控数据 | Prometheus + TimescaleDB | 时序数据存储 |

#### **4. 基础设施与运维**
| 领域 | 技术选型 | 说明 |
|------|----------|------|
| 容器化 | Docker + Docker Compose | 容器化部署，开发环境一致性 |
| 容器编排 | Kubernetes (生产环境) | 微服务编排，自动扩缩容 |
| 服务网格 | Istio / Linkerd (可选) | 服务治理，流量管理 |
| CI/CD | GitHub Actions / GitLab CI | 自动化构建部署 |
| 监控告警 | Prometheus + Grafana + Alertmanager | 系统监控，可视化告警 |
| 日志管理 | ELK Stack (Elasticsearch, Logstash, Kibana) | 集中日志收集分析 |
| 配置管理 | Helm Charts / Kustomize | Kubernetes配置管理 |
| 云平台 | AWS/Aliyun/腾讯云 | 云服务托管 |

#### **5. 开发工具链**
| 领域 | 技术选型 | 说明 |
|------|----------|------|
| 版本控制 | Git + GitHub/GitLab | 代码版本管理 |
| 代码质量 | ESLint + Prettier + Black | 代码规范与格式化 |
| 提交规范 | Commitlint + Husky | Git提交信息规范 |
| 依赖管理 | Poetry (Python) / pnpm (Node.js) | 依赖锁定，虚拟环境 |
| IDE | VS Code + 相应插件 | 统一开发环境 |

#### **6. 安全与合规**
| 领域 | 技术选型 | 说明 |
|------|----------|------|
| API安全 | HTTPS + CORS + CSRF保护 | 传输安全，跨域控制 |
| 数据加密 | bcrypt (密码) + AES (敏感数据) | 数据加密处理 |
| 漏洞扫描 | Trivy + Snyk | 容器镜像与依赖漏洞扫描 |
| 合规审计 | OPA (Open Policy Agent) | 策略即代码，合规检查 |

---

### 🚀 **部署架构示例**
```
前端(React) → CDN(静态资源)
    ↓
API网关/K8s Ingress ← 负载均衡
    ↓
后端微服务(Flask) ←→ 图数据库(Neo4j)
    ↓
缓存层(Redis) ←→ 监控系统(Prometheus)
    ↓
日志收集(ELK) ←→ 文件存储(MinIO)
```

---
### 项目工程目录规划
项目名称/
├── src/                          # 源代码目录
│   ├── backend/                  # 后端服务
│   │   ├── domain/               # 领域层 - 核心业务逻辑
│   │   │   ├── entities/         # 实体定义
│   │   │   ├── value_objects/    # 值对象
│   │   │   ├── aggregates/       # 聚合根
│   │   │   ├── repositories/     # 仓库接口
│   │   │   ├── services/         # 领域服务
│   │   │   ├── events/           # 领域事件
│   │   │   ├── knowledge/        # 知识管理子域
│   │   │   ├── graph/            # 图数据库子域
│   │   │   └── user/             # 用户管理子域
│   │   ├── application/          # 应用层 - 业务用例
│   │   │   ├── services/         # 应用服务
│   │   │   ├── dto/              # 数据传输对象
│   │   │   ├── commands/         # 命令对象
│   │   │   ├── queries/          # 查询对象
│   │   │   ├── handlers/         # 处理器
│   │   │   ├── knowledge/        # 知识管理应用
│   │   │   ├── graph/            # 图数据库应用
│   │   │   └── user/             # 用户管理应用
│   │   ├── infrastructure/       # 基础设施层
│   │   │   ├── persistence/      # 持久化实现
│   │   │   ├── external_services/# 外部服务
│   │   │   ├── repositories/     # 仓库实现
│   │   │   ├── messaging/        # 消息传递
│   │   │   └── config/           # 配置管理
│   │   ├── presentation/         # 表示层
│   │   │   ├── rest_api/         # REST API
│   │   │   └── controllers/      # 控制器
│   │   └── shared_kernel/        # 共享内核
│   │       ├── exceptions/       # 异常定义
│   │       ├── utils/            # 工具类
│   │       └── constants/        # 常量定义
│   └── frontend/                 # 前端应用
│       ├── application/          # 前端应用层
│       ├── infrastructure/         # 前端基础设施层
│       ├── presentation/         # 前端表示层
│       │   ├── components/       # React组件
│       │   ├── pages/            # 页面组件
│       │   ├── hooks/            # 自定义Hooks
│       │   └── store/            # 状态管理
│       └── shared/               # 前端共享层
├── tests/                        # 测试目录
│   ├── unit/                     # 单元测试
│   ├── integration/              # 集成测试
│   └── e2e/                      # 端到端测试
├── docs/                         # 文档目录
│   ├── api/                      # API文档
│   ├── architecture/             # 架构文档
│   └── deployment/               # 部署文档
└── scripts/                      # 脚本工具
    ├── dev/                      # 开发脚本
    ├── build/                    # 构建脚本
    ├── deploy/                   # 部署脚本
    └── test/                     # 测试脚本
