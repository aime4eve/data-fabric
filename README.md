# Data-Fabric 🚀

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-green.svg)](https://www.docker.com/)

基于领域驱动设计(DDD)的现代企业级知识库管理系统，采用前后端分离架构，集成图数据库技术。系统包含完整的公司级业务知识管理体系，支持政府信息化项目的全生命周期管理。

## ✨ 核心特性

- 🏗️ **领域驱动设计**: 基于DDD架构，清晰的业务边界和领域模型
- 📊 **图数据库**: 集成NebulaGraph，支持复杂关系数据建模
- 🔄 **前后端分离**: React + TypeScript前端，Flask + Python后端
- 🐳 **容器化部署**: Docker + Docker Compose，一键部署
- 📈 **监控告警**: Prometheus + Grafana完整监控体系
- 🧪 **完整测试**: 单元测试 + 集成测试 + E2E测试
- 📚 **企业级知识管理**: 支持多层级组织架构和业务流程

## 🚀 技术栈

### 后端技术栈
- **框架**: Flask 3.0 + Flask-RESTX
- **语言**: Python 3.11+
- **图数据库**: NebulaGraph v3.8.0
- **缓存**: Redis 7.x
- **数据序列化**: Marshmallow / Pydantic
- **认证授权**: Flask-JWT-Extended
- **异步任务**: Celery + Redis
- **测试**: pytest + Flask-Testing

### 前端技术栈
- **框架**: React 18
- **构建工具**: Vite 5
- **语言**: TypeScript 5
- **状态管理**: Zustand / Redux Toolkit
- **路由**: React Router v6
- **UI组件库**: Ant Design
- **CSS方案**: Tailwind CSS
- **数据获取**: React Query

### 基础设施
- **容器化**: Docker + Docker Compose
- **监控**: Prometheus + Grafana
- **日志**: ELK Stack
- **CI/CD**: GitHub Actions

## 📁 项目结构

```
knowledge-base-app/
├── company_knowledge_base/       # 公司级知识库 - 业务知识管理
│   ├── 01_公司基本信息/          # 基础管理体系
│   ├── 02_人力资源中心/          # 人事管理
│   ├── 03_财务管理中心/          # 财务管理
│   ├── 04_行政后勤管理/          # 行政管理
│   ├── 05_海外物联网业务/        # 核心业务体系
│   ├── 06_政府信息化业务/        # 政府项目业务
│   │   └── 项目运营中心/         # 重构后的统一运营中心
│   │       ├── 市场商务团队/     # 市场拓展与商务合作
│   │       ├── 项目研发团队/     # 技术研发与项目实施
│   │       └── 质量成本团队/     # 质量控制与成本管理
│   ├── 07_保障性住房业务/        # 住房保障业务
│   ├── 08_技术研发中心/          # 支撑保障体系
│   ├── 09_项目管理办公室/        # 项目管理
│   ├── 10_法务合规中心/          # 法务合规
│   └── 11_知识库管理规范/        # 知识库运营
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
```

## 🛠️ 研发环境搭建

### 前置要求

- Python 3.11+
- Node.js 18+
- Docker & Docker Compose
- Git

### 端口配置管理

项目采用集中式端口配置管理，所有服务端口统一在 `config/ports.yml` 文件中配置：

```bash
# 查看当前端口配置
python3 scripts/manage_ports.py show

# 更新端口配置（例如更新后端端口）
python3 scripts/manage_ports.py update backend 5001

# 验证端口配置
python3 scripts/manage_ports.py validate

# 生成配置文件（Docker Compose和前端环境变量）
python3 scripts/manage_ports.py generate
```

端口配置文件位置：`config/ports.yml`

主要特性：
- ✅ 集中式端口配置管理
- ✅ 自动生成Docker Compose配置
- ✅ 自动生成前端环境变量
- ✅ 端口冲突检测和验证
- ✅ 支持动态端口更新

详细文档请参考：[端口配置管理文档](./PORT_CONFIG_README.md)

### 1. 克隆项目

```bash
git clone <repository-url>
cd knowledge-base-app
```

### 2. 后端环境搭建

#### 2.1 创建Python虚拟环境

```bash
# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Linux/Mac
source venv/bin/activate
# Windows
venv\Scripts\activate
```

#### 2.2 安装后端依赖

```bash
# 进入后端目录
cd src/backend

# 安装依赖
pip install -r requirements.txt

# 或者使用Poetry（推荐）
poetry install
```

#### 2.3 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
vim .env
```

#### 2.4 启动基础设施服务

```bash
# 使用Docker Compose启动依赖服务
docker-compose up -d nebula-graph redis

# 等待服务启动完成
docker-compose logs -f
```

#### 2.5 初始化数据库

```bash
# 运行数据库迁移
python scripts/migrate.py

# 导入初始数据
python scripts/seed.py
```

#### 2.6 启动后端服务

```bash
# 开发模式
python main.py

# 或者使用Flask开发服务器
flask run --host=0.0.0.0 --port=5000

# 生产模式
gunicorn -w 4 -b 0.0.0.0:5000 main:app
```

### 3. 前端环境搭建

#### 3.1 安装前端依赖

```bash
# 进入前端目录
cd src/frontend

# 安装依赖
npm install
# 或者使用pnpm（推荐）
pnpm install
```

#### 3.2 配置前端环境

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
vim .env
```

#### 3.3 启动前端开发服务器

```bash
# 开发模式
npm run dev
# 或者
pnpm dev

# 构建生产版本
npm run build
# 或者
pnpm build
```

### 4. 使用开发脚本（推荐）

```bash
# 一键启动所有服务
./scripts/dev/setup.sh

# 启动开发环境
./scripts/dev/start.sh

# 停止开发环境
./scripts/dev/stop.sh

# 查看日志
./scripts/dev/logs.sh
```

### 5. 验证安装

#### 5.1 后端API测试

```bash
# 测试API端点
curl http://localhost:5000/health

# 预期响应
{"status": "healthy", "service": "knowledge-base-api"}
```

#### 5.2 前端访问

打开浏览器访问：http://localhost:3000

#### 5.3 数据库连接测试

```bash
# 测试NebulaGraph连接
python scripts/test_nebula_connection.py

# 测试Redis连接
python scripts/test_redis_connection.py
```

## 🔧 开发工作流

### 1. 创建功能分支

```bash
git checkout -b feature/your-feature-name
```

### 2. 后端开发

```bash
# 运行后端测试
./scripts/test/unit.sh backend

# 运行特定领域测试
pytest tests/unit/domain/test_knowledge.py -v

# 代码格式化
black src/backend/
isort src/backend/
```

### 3. 前端开发

```bash
# 运行前端测试
npm run test
# 或者
pnpm test

# 运行特定组件测试
npm run test:components

# 代码格式化
npm run lint:fix
```

### 4. 集成测试

```bash
# 运行集成测试
./scripts/test/integration.sh

# 运行端到端测试
./scripts/test/e2e.sh
```

## 📊 监控和调试

### 1. 应用监控

- **API监控**: http://localhost:5000/metrics
- **数据库监控**: http://localhost:7000
- **缓存监控**: http://localhost:8081

### 2. 日志查看

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend

# 查看应用日志
tail -f logs/app.log
```

### 3. 调试工具

```bash
# 启动调试模式
python main.py --debug

# 使用pdb调试
python -m pdb main.py
```

## 🚨 常见问题

### Q1: 端口冲突

项目使用集中式端口配置管理，端口冲突问题可以通过以下方式解决：

```bash
# 检查端口配置和冲突
python3 scripts/manage_ports.py validate

# 查看当前端口配置
python3 scripts/manage_ports.py show

# 修改端口配置（例如更新后端端口）
python3 scripts/manage_ports.py update backend 5001

# 生成新的配置文件
python3 scripts/manage_ports.py generate
```

端口配置管理工具会自动检测端口冲突，如果多个服务使用相同的端口，会提示错误信息。

### Q2: 数据库连接失败

```bash
# 检查数据库状态
docker-compose ps

# 重启数据库服务
docker-compose restart nebula-graph
```

### Q3: 依赖安装失败

```bash
# 清理缓存
pip cache purge
npm cache clean --force

# 重新安装依赖
pip install -r requirements.txt --no-cache-dir
npm install --force
```

## 🚀 快速开始

### 环境要求

- Docker & Docker Compose
- Python 3.11+
- Node.js 18+
- Git

### 一键启动

```bash
# 克隆项目
git clone https://github.com/your-username/Data-Fabric.git
cd Data-Fabric

# 查看端口配置（可选）
python3 scripts/manage_ports.py show

# 启动所有服务
./start.sh

# 访问应用（端口配置见 config/ports.yml）
# 前端: http://localhost:3000（默认）
# 后端API: http://localhost:5000（默认）
# Grafana监控: http://localhost:3001（默认）
```

### 开发模式

```bash
# 启动开发环境
./scripts/dev/start_dev.sh

# 运行测试
./scripts/test/run-tests.sh

# 停止服务
./stop.sh
```

## 🛠️ 部署和启动方法

### 快速启动脚本

项目提供了完整的启动脚本体系，支持快速部署和开发环境搭建：

- **`start.sh`** - 主启动脚本，包含环境检查、服务启动和状态监控
- **`stop.sh`** - 停止所有服务
- **`status.sh`** - 检查服务运行状态

### 开发环境启动

使用开发脚本快速启动完整开发环境：

```bash
# 一键启动开发环境
./scripts/dev/start_dev.sh

# 该脚本包含以下步骤：
# 1. 环境检查（验证docker、node、python3等命令）
# 2. 启动基础设施服务（PostgreSQL、Redis、NebulaGraph）
# 3. 激活Python虚拟环境
# 4. 启动后端API服务
# 5. 启动前端开发服务器
```

### 容器化部署

项目使用Docker Compose进行容器化部署，支持以下服务：

#### 核心服务
- **后端API服务** - Flask应用，端口配置见 `config/ports.yml`
- **前端服务** - React应用，端口配置见 `config/ports.yml`
- **PostgreSQL数据库** - 主数据库，端口配置见 `config/ports.yml`
- **Redis缓存** - 缓存服务，端口配置见 `config/ports.yml`
- **NebulaGraph图数据库** - 图数据存储，端口配置见 `config/ports.yml`

#### 监控服务
- **Prometheus** - 监控数据收集，端口配置见 `config/ports.yml`
- **Grafana** - 数据可视化，端口配置见 `config/ports.yml`
- **Elasticsearch** - 日志存储，端口配置见 `config/ports.yml`

#### 服务端口映射
所有服务端口均通过集中式配置管理，具体端口映射请查看当前端口配置：

```bash
# 查看当前端口配置
python3 scripts/manage_ports.py show

# 默认端口映射（可通过配置修改）
# 前端应用: http://localhost:3000
# 后端API: http://localhost:5000
# Grafana监控: http://localhost:3001
# Prometheus: http://localhost:9090
# PostgreSQL: localhost:5432
# Redis: localhost:6379
# NebulaGraph: localhost:9669
```

### 开发脚本

项目包含完整的开发脚本体系：

#### 开发脚本目录结构
```
scripts/
├── dev/           # 开发环境脚本
│   ├── start_dev.sh    # 开发环境启动
│   ├── setup.sh        # 环境设置
│   └── logs.sh         # 日志查看
├── build/         # 构建脚本
├── deploy/        # 部署脚本
└── test/          # 测试脚本
```

#### 常用开发命令
```bash
# 启动开发环境
./scripts/dev/start_dev.sh

# 停止服务
./stop.sh

# 检查服务状态
./status.sh

# 查看日志
./scripts/dev/logs.sh

# 运行测试
./scripts/test/run-tests.sh
```

### 环境配置

项目使用环境变量进行配置管理：

#### 后端环境变量 (.env)
```bash
# 数据库配置（端口配置见 config/ports.yml）
DATABASE_URL=postgresql://user:pass@localhost:5432/knowledge_base
REDIS_URL=redis://localhost:6379/0
NEBULA_GRAPH_URL=localhost:9669

# 应用配置
FLASK_ENV=development
SECRET_KEY=your-secret-key
DEBUG=True
```

#### 前端环境变量 (.env)
前端环境变量通过端口配置管理工具自动生成：

```bash
# 生成前端环境变量配置
python3 scripts/manage_ports.py generate
```

生成的文件包含：
```bash
# API配置（端口自动配置）
VITE_API_BASE_URL=http://localhost:5000/api
VITE_GRAPHQL_URL=http://localhost:5000/graphql

# 应用配置
VITE_APP_TITLE=Data-Fabric
VITE_APP_VERSION=1.0.0
```

## 📖 文档

- [技术架构文档](./docs/05-技术设计/03-代码架构说明.md)
- [API接口文档](./docs/05-技术设计/02-接口契约/)
- [部署指南](./docs/06-实现与测试/05-Docker配置/)
- [用户手册](./docs/07-交付物/02-用户手册/)

## 🧪 测试

项目包含完整的测试体系：

```bash
# 运行所有测试
npm test

# E2E测试
npx playwright test

# 后端测试
cd src/backend && python -m pytest

# 测试覆盖率
npm run test:coverage
```

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [NebulaGraph](https://nebula-graph.io/) - 图数据库
- [React](https://reactjs.org/) - 前端框架
- [Flask](https://flask.palletsprojects.com/) - 后端框架
- [Docker](https://www.docker.com/) - 容器化平台

---

<div align="center">
  <strong>Data-Fabric</strong> - 让知识管理更智能 🚀
</div>