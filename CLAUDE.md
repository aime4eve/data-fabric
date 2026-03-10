# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Data-Fabric 是一个外贸推广辅助系统的 monorepo，包含两个独立子项目：

| 子项目 | 技术栈 | 用途 |
|--------|--------|------|
| [knowledge-crawl](knowledge-crawl/) | Node.js + Playwright | 厂商门户搜索采集系统 |
| [knowledge-graph](knowledge-graph/) | React + Flask + NebulaGraph | 企业知识库管理系统 |

## 常用命令

### knowledge-crawl（厂商采集）

```bash
cd knowledge-crawl

# 安装依赖
pnpm install
npx playwright install chromium

# 运行采集
node src/index.js --keywords-file "./keywords.csv"
node src/index.js --source-doc "./产品规格.md" --max-domains 5

# 测试
npm test
node --test tests/serp-collector.test.js
```

### knowledge-graph（知识图谱）

```bash
cd knowledge-graph

# 后端
cd src/backend
poetry install                          # 安装依赖
python main.py                          # 启动开发服务器 (port 5000)
pytest                                  # 运行测试

# 前端
cd src/frontend
pnpm install                            # 安装依赖
pnpm dev                                # 启动开发服务器 (port 3000)
pnpm test                               # 运行测试

# Docker 部署
docker-compose up -d                    # 启动所有服务
```

## 架构概览

### knowledge-crawl 数据流

```
关键词 → Google SERP → 域名聚合 → robots 检查 → 证据页抓取 → 联系方式提取 → LLM 增强 → CSV 输出
```

四阶段演进：Phase 0 (域名采集) → Phase 1 (联系方式) → Phase 2 (LLM 增强) → Phase 3 (离线归档)

### knowledge-graph DDD 架构

```
src/
├── backend/
│   ├── domain/           # 领域层（实体、值对象、聚合、领域服务）
│   ├── application/      # 应用层（用例、DTO、命令/查询处理器）
│   ├── infrastructure/   # 基础设施层（持久化、外部服务、消息）
│   └── presentation/     # 表示层（REST API、控制器）
└── frontend/
    └── src/
        ├── components/   # React 组件
        ├── pages/        # 页面组件
        ├── hooks/        # 自定义 Hooks
        ├── store/        # Zustand 状态管理
        └── services/     # API 服务
```

## 关键约束

### knowledge-crawl
- Playwright 有头模式 (`headless: false`)，需处理 Google 验证码
- 浏览器数据持久化在 `./browser-data/`
- robots.txt 合规检查，禁止路径跳过
- 时间格式统一使用北京时间 (UTC+8)

### knowledge-graph
- 端口配置集中管理：`config/ports.yml`
- 后端使用 Poetry 管理依赖，前端使用 pnpm
- 遵循 DDD 分层约束，领域层不依赖基础设施层
- 端口管理工具：`python3 scripts/manage_ports.py show`

## 子项目文档

详细开发指南请参考各子项目的 CLAUDE.md：
- [knowledge-crawl/CLAUDE.md](knowledge-crawl/CLAUDE.md) - 采集系统完整指南
- [knowledge-graph/README.md](knowledge-graph/README.md) - 知识图谱系统指南
