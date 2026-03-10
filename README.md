# Data-Fabric

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

外贸推广辅助系统 - 通过智能采集与知识管理，助力外贸业务拓展。

## 项目组成

Data-Fabric 是一个 monorepo，包含两个独立子项目：

| 项目 | 描述 | 技术栈 |
|------|------|--------|
| [knowledge-crawl](./knowledge-crawl) | 厂商门户搜索采集系统 | Node.js + Playwright |
| [knowledge-graph](./knowledge-graph) | 企业知识库管理系统 | React + Flask + NebulaGraph |

## 核心功能

### knowledge-crawl - 厂商门户搜索采集

- 智能关键词提取与 Google 搜索查询生成
- 域名聚合与评分排序
- robots.txt 合规检查
- 证据页抓取与联系方式提取
- LLM 智能增强（厂商类型推断、关键人物提取）
- 离线网页归档

### knowledge-graph - 企业知识库管理

- 领域驱动设计 (DDD) 架构
- 图数据库 (NebulaGraph) 关系建模
- 多层级组织架构与权限管理
- 文档上传与全文检索
- Docker 容器化部署

## 快速开始

### knowledge-crawl

```bash
cd knowledge-crawl

# 安装依赖
pnpm install
npx playwright install chromium

# 配置环境变量
cp .env.example .env
# 编辑 .env，设置 DEEPSEEK_API_KEY

# 运行采集
node src/index.js --keywords-file "./keywords.csv"
```

### knowledge-graph

```bash
cd knowledge-graph

# 后端
cd src/backend
poetry install
python main.py

# 前端（新终端）
cd src/frontend
pnpm install
pnpm dev

# 或使用 Docker
docker-compose up -d
```

## 技术栈

### knowledge-crawl
- **运行时**: Node.js 18+
- **浏览器自动化**: Playwright
- **LLM**: DeepSeek API (OpenAI 兼容)
- **测试**: Node.js 内置测试框架

### knowledge-graph
- **后端**: Python 3.11+ / Flask 3.0 / Flask-RESTX
- **前端**: React 18 / TypeScript 5 / Vite 6 / Ant Design
- **数据库**: PostgreSQL / NebulaGraph / Redis
- **容器化**: Docker / Docker Compose

## 项目结构

```
data-fabric/
├── knowledge-crawl/           # 厂商采集系统
│   ├── src/
│   │   ├── index.js           # 主入口
│   │   ├── services/          # 业务服务
│   │   └── utils/             # 工具函数
│   ├── tests/                 # 测试文件
│   └── outputs/               # 采集输出
│
├── knowledge-graph/           # 知识图谱系统
│   ├── src/
│   │   ├── backend/           # Flask 后端 (DDD 架构)
│   │   │   ├── domain/        # 领域层
│   │   │   ├── application/   # 应用层
│   │   │   ├── infrastructure/# 基础设施层
│   │   │   └── presentation/  # 表示层
│   │   └── frontend/          # React 前端
│   ├── tests/                 # 测试文件
│   └── docs/                  # 文档
│
└── CLAUDE.md                  # AI 助手开发指南
```

## 文档

- [knowledge-crawl README](./knowledge-crawl/README.md) - 采集系统详细文档
- [knowledge-graph README](./knowledge-graph/README.md) - 知识图谱详细文档
- [CLAUDE.md](./CLAUDE.md) - AI 助手开发指南

## 许可证

[MIT](LICENSE)
