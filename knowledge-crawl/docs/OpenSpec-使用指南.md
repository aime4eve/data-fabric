# OpenSpec 中文使用指南

> **版本**: 1.2.0
> **更新日期**: 2026-03-06
> **官方仓库**: https://github.com/Fission-AI/OpenSpec

---

## 目录

1. [简介](#简介)
2. [安装与配置](#安装与配置)
3. [核心概念](#核心概念)
4. [目录结构](#目录结构)
5. [CLI 命令详解](#cli-命令详解)
6. [AI 助手集成](#ai-助手集成)
7. [工作流程](#工作流程)
8. [实战案例](#实战案例)
9. [最佳实践](#最佳实践)
10. [常见问题](#常见问题)

---

## 简介

### 什么是 OpenSpec？

OpenSpec 是一个**开源的规格驱动开发（Spec-Driven Development, SDD）框架**，专为 AI 编程助手设计。它创建了一个轻量级的"契约层"，连接人类意图与 AI 实现，确保 AI 编码更加可控和精确。

### 核心价值

| 特性 | 说明 |
|------|------|
| 🎯 **意图对齐** | 通过结构化文档确保 AI 完全理解需求后再生成代码 |
| 📜 **可追溯性** | 所有变更都有记录，便于审计和回溯 |
| 🔄 **工具无关** | 支持 20+ AI 编程工具，规格文档跨工具通用 |
| 🏗️ **棕地友好** | 特别适合现有项目的渐进式改进 |

### 适用场景

**✅ 推荐使用：**
- 团队协作项目（规格作为团队标准）
- 长期维护的系统（可追溯的变更历史）
- 遗留项目重构（棕地项目适配）
- 需要切换 AI 模型的场景

**❌ 不推荐使用：**
- 快速原型开发（流程过于正式）
- 一次性脚本（文档成本 > 收益）
- 简单 Bug 修复（直接修改更快）

---

## 安装与配置

### 系统要求

- **Node.js**: >= 20.19.0
- **npm**: 随 Node.js 安装

### 安装步骤

```bash
# 1. 检查 Node.js 版本
node --version
# 应输出 v20.19.0 或更高

# 2. 全局安装 OpenSpec
npm install -g @fission-ai/openspec@latest

# 3. 验证安装
openspec --version
# 应输出 1.2.0 或更高

# 4. 在项目中初始化
cd your-project
openspec init
```

### 更新 OpenSpec

```bash
npm update -g @fission-ai/openspec@latest
```

---

## 核心概念

### 1. 规格文档（Specs）

规格文档是 OpenSpec 的核心，描述了功能需求的完整定义。它们是 AI 生成代码的"契约"。

### 2. 变更提案（Changes）

变更提案是对系统进行修改的建议，包含：
- 变更原因
- 影响范围
- 实现计划

### 3. 依赖图（Dependency Graph）

OpenSpec 使用依赖图驱动开发流程，自动识别变更影响范围。

### 4. 项目上下文（project.md）

最重要的文件，包含项目的全局上下文信息，帮助 AI 理解项目整体架构。

---

## 目录结构

初始化后，项目将生成以下结构：

```
openspec/
├── specs/              # 规格文档目录
│   └── *.md           # 各功能的规格定义
├── changes/            # 变更提案目录
│   └── *.md           # 待处理/已归档的变更
├── AGENTS.md          # AI 助手指令集
└── project.md         # 项目全局上下文（最重要）
```

### 文件说明

| 文件/目录 | 用途 |
|-----------|------|
| `project.md` | 项目概述、技术栈、架构决策等全局信息 |
| `specs/` | 功能规格、API 定义、数据模型等 |
| `changes/` | 变更记录，包括待处理和已归档 |
| `AGENTS.md` | 针对不同 AI 工具的指令配置 |

---

## CLI 命令详解

### 初始化命令

```bash
# 在项目目录中初始化 OpenSpec
openspec init
```

### 查看命令

```bash
# 列出所有活跃的变更提案
openspec list

# 查看特定变更的详细信息
openspec show <change-name>

# 启动交互式仪表盘
openspec view
```

### 验证命令

```bash
# 验证规格文档格式
openspec validate <spec-name>
```

### 归档命令

```bash
# 归档已完成的变更（需要确认）
openspec archive <change-name> --yes
```

### 更新命令

```bash
# 更新 OpenSpec 到最新版本
openspec update
```

---

## AI 助手集成

OpenSpec 支持 20+ AI 编程工具，以下是常用工具的命令对照：

### Claude Code

| 阶段 | 命令 |
|------|------|
| 探索模式 | `/openspec:explore` |
| 创建提案 | `/openspec:proposal` |
| 应用变更 | `/openspec:apply <proposal-name>` |
| 归档变更 | `/openspec:archive <proposal-name>` |

#### Claude Code 使用示例

```bash
# 场景：想要添加一个新功能，但不确定具体实现方式
# 1. 先进入探索模式，让 AI 帮你分析需求
/openspec:explore 我想要添加一个用户积分系统，用户购买商品可以获得积分

# 2. 探索完成后，创建正式提案
/openspec:proposal

# 3. 查看生成的规格文档，确认无误后应用
/openspec:apply add-points-system

# 4. 实现完成后归档
/openspec:archive add-points-system
```

### Cursor / Windsurf

| 阶段 | 命令 |
|------|------|
| 探索模式 | `/opsx:explore` |
| 创建提案 | `/opsx:propose` 或 `/opsx:new <feature-name>` |
| 应用变更 | `/opsx:apply` |
| 归档变更 | `/opsx:archive` |
| 生成产物 | `/opsx:ff` |

### GitHub Copilot

使用 `/openspec:proposal` 和 `/openspec:apply` 命令。

### 其他支持工具

- Codex
- Gemini CLI
- Cline
- Qwen Code
- RooCode
- ...更多

### 命令详解

#### `/openspec:explore` - 探索模式

在正式创建提案前，先与 AI 探讨需求和方案：

```
/openspec:explore 我想要重构用户模块，目前代码很乱，你有什么建议？
```

AI 会：
1. 分析现有代码结构
2. 识别问题和改进点
3. 提供多种方案选择
4. 帮助澄清需求

#### `/openspec:proposal` - 创建提案

根据对话内容生成完整的变更提案：

```
/openspec:proposal 添加商品收藏功能
```

AI 会生成：
- `openspec/changes/add-product-favorite.md` - 变更提案
- `openspec/specs/product-favorite.md` - 功能规格

#### `/openspec:apply` - 应用变更

让 AI 根据规格文档生成实现代码：

```
/openspec:apply add-product-favorite
```

AI 会：
1. 读取规格文档
2. 生成/修改相关代码文件
3. 创建测试文件
4. 更新文档

#### `/openspec:archive` - 归档变更

完成开发后归档，保持项目整洁：

```
/openspec:archive add-product-favorite
```

---

## 工作流程

### 标准开发流程

```
┌─────────────────────────────────────────────────────────┐
│                    OpenSpec 工作流程                      │
└─────────────────────────────────────────────────────────┘

1. 📝 创建变更提案
   └─→ /openspec:proposal 或 /opsx:new <feature>

2. ✏️ 编辑规格文档
   └─→ 在 openspec/specs/ 中定义详细规格

3. ✅ 验证规格
   └─→ openspec validate <spec-name>

4. 🤖 AI 生成实现
   └─→ /openspec:apply <proposal-name>

5. 🧪 测试验证
   └─→ 运行测试确保功能正确

6. 📦 归档变更
   └─→ openspec archive <change-name> --yes
```

### 示例：添加新功能

```bash
# 1. 创建提案（通过 AI 助手）
# 在 Claude Code 中输入：
/open-spec:proposal

# 2. AI 会生成类似以下的规格文档：
# openspec/changes/add-user-authentication.md

# 3. 编辑规格文档，定义需求细节

# 4. 验证规格
openspec validate add-user-authentication

# 5. 应用变更
/openspec:apply add-user-authentication

# 6. 完成后归档
openspec archive add-user-authentication --yes
```

---

## 实战案例

### 案例 1：为现有项目添加用户认证功能

**场景**：在一个 Node.js + Express 项目中添加 JWT 用户认证。

#### 步骤 1：初始化 OpenSpec

```bash
cd my-express-app
openspec init
```

#### 步骤 2：编辑 project.md

```markdown
# My Express App

## 技术栈
- Node.js 20.x
- Express 4.x
- PostgreSQL 15
- Redis (会话缓存)

## 架构
- 分层架构：Controller → Service → Repository
- 认证方式：目前无，计划使用 JWT

## 编码规范
- 使用 CommonJS 模块
- 错误处理使用中间件
- 所有 API 返回 JSON

## 约束
- 密码必须使用 bcrypt 加密
- Token 有效期 24 小时
```

#### 步骤 3：创建变更提案

在 Claude Code 中输入：

```
/openspec:proposal 添加 JWT 用户认证功能，包括注册、登录、Token 验证中间件
```

#### 步骤 4：AI 生成的规格文档

`openspec/changes/add-jwt-auth.md`:

```markdown
# 添加 JWT 用户认证

## 背景
系统目前无认证机制，需要添加用户注册、登录功能以保护 API。

## 目标
- 用户注册（邮箱 + 密码）
- 用户登录返回 JWT Token
- Token 验证中间件
- 密码 bcrypt 加密

## 非目标
- OAuth 第三方登录
- 多因素认证
- 权限管理（RBAC）

## API 设计

### POST /api/auth/register
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

### POST /api/auth/login
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```
响应：
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 86400
}
```

## 数据模型

### users 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| email | VARCHAR(255) | 唯一 |
| password_hash | VARCHAR(255) | bcrypt 哈希 |
| created_at | TIMESTAMP | 创建时间 |

## 任务清单
- [ ] 创建 users 表迁移
- [ ] 实现 AuthService
- [ ] 创建 AuthController
- [ ] 添加 auth 中间件
- [ ] 编写测试用例
```

#### 步骤 5：验证并应用

```bash
# 验证规格
openspec validate add-jwt-auth

# 应用变更（AI 开始生成代码）
/openspec:apply add-jwt-auth
```

#### 步骤 6：测试验证

```bash
# 运行测试
npm test

# 手动测试
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

#### 步骤 7：归档

```bash
openspec archive add-jwt-auth --yes
```

---

### 案例 2：重构遗留代码模块

**场景**：重构一个老旧的订单处理模块，将单体拆分为微服务风格的服务层。

#### 步骤 1：描述现状

在 `project.md` 中添加：

```markdown
## 待重构模块

### 订单模块（legacy/orders.js）
- 当前：单体文件 2000+ 行
- 问题：职责混杂、难以测试
- 目标：拆分为 Service 层
```

#### 步骤 2：创建重构提案

```
/openspec:proposal 重构订单模块，拆分为 OrderService、PaymentService、ShippingService
```

#### 步骤 3：规格文档示例

`openspec/changes/refactor-order-module.md`:

```markdown
# 重构订单模块

## 背景
`legacy/orders.js` 包含 2000+ 行代码，混合了订单处理、支付、物流逻辑。

## 目标
- 拆分为三个独立 Service
- 保持 API 兼容
- 提高测试覆盖率到 80%

## 迁移策略
1. 创建新 Service（不删除旧代码）
2. 逐步切换调用
3. 删除旧代码

## 服务拆分

### OrderService
- createOrder()
- getOrder()
- cancelOrder()
- listOrders()

### PaymentService
- processPayment()
- refundPayment()
- getPaymentStatus()

### ShippingService
- createShipment()
- trackShipment()
- updateShippingStatus()

## 风险
- 支付回调需要同步更新
- 需要全量回归测试
```

---

### 案例 3：API 接口开发

**场景**：为电商平台添加商品搜索 API。

#### 完整规格文档示例

`openspec/specs/product-search-api.md`:

```markdown
# 商品搜索 API

## 概述
提供商品全文搜索功能，支持分页、过滤、排序。

## 端点

### GET /api/products/search

#### 查询参数
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| q | string | 是 | 搜索关键词 |
| page | int | 否 | 页码，默认 1 |
| limit | int | 否 | 每页数量，默认 20，最大 100 |
| category | string | 否 | 分类过滤 |
| minPrice | number | 否 | 最低价格 |
| maxPrice | number | 否 | 最高价格 |
| sortBy | string | 否 | 排序字段：price, sales, createdAt |
| sortOrder | string | 否 | asc / desc，默认 desc |

#### 响应示例
```json
{
  "data": [
    {
      "id": "prod_123",
      "name": "无线蓝牙耳机",
      "price": 299.00,
      "category": "电子产品",
      "sales": 1520,
      "thumbnail": "https://cdn.example.com/prod_123.jpg"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  }
}
```

## 性能要求
- 响应时间 < 200ms (P95)
- 支持并发 100 QPS

## 技术方案
- 使用 Elasticsearch 作为搜索引擎
- Redis 缓存热门搜索结果（TTL 5min）
```

---

### 案例 4：数据库迁移

**场景**：将用户表从 MySQL 迁移到 PostgreSQL。

#### 规格文档

`openspec/changes/migrate-users-to-postgres.md`:

```markdown
# 用户表迁移到 PostgreSQL

## 背景
用户量增长，MySQL 单表性能瓶颈，迁移到 PostgreSQL。

## 目标
- 零停机迁移
- 数据一致性保证
- 支持回滚

## 迁移步骤

### Phase 1: 准备（1 天）
- [ ] 创建 PostgreSQL 表结构
- [ ] 配置双向同步（MySQL → PostgreSQL）
- [ ] 验证数据一致性

### Phase 2: 切换（维护窗口）
- [ ] 停止写入 MySQL
- [ ] 等待同步完成
- [ ] 切换应用连接
- [ ] 验证功能

### Phase 3: 清理
- [ ] 监控 1 周
- [ ] 下线 MySQL 用户表

## 回滚方案
1. 保持 MySQL 只读副本
2. 切换连接字符串即可回滚

## 表结构变更

### 新增字段
| 字段 | 类型 | 说明 |
|------|------|------|
| uuid | UUID | 替代自增 ID |
| created_at | TIMESTAMPTZ | 带时区 |
| updated_at | TIMESTAMPTZ | 自动更新 |

### 索引优化
```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
```
```

---

### 案例 5：团队协作场景

**场景**：多人协作开发一个功能。

#### 工作流程

```bash
# 开发者 A：创建提案
git checkout -b feature/payment
openspec init
# ... 创建 specs/payment-integration.md
git add openspec/
git commit -m "feat: 添加支付集成规格"
git push

# 团队评审
# 创建 PR，团队成员 review 规格文档

# 开发者 B：拉取并开始实现
git checkout feature/payment
/openspec:apply payment-integration

# 开发者 A：继续完善
openspec list  # 查看活跃变更

# 完成后归档
openspec archive payment-integration --yes
git add openspec/
git commit -m "feat: 完成支付集成"
```

#### 变更状态追踪

```bash
$ openspec list

活跃变更：
┌─────────────────────────┬────────────┬──────────┐
│ 名称                    │ 创建时间   │ 状态     │
├─────────────────────────┼────────────┼──────────┤
│ add-jwt-auth            │ 2026-03-05 │ 进行中   │
│ refactor-order-module   │ 2026-03-04 │ 待审核   │
│ product-search-api      │ 2026-03-06 │ 新建     │
└─────────────────────────┴────────────┴──────────┘
```

---

## 最佳实践

### 1. project.md 编写指南

`project.md` 是最重要的文件，应包含：

```markdown
# 项目名称

## 技术栈
- 前端：React + TypeScript
- 后端：Node.js + Express
- 数据库：PostgreSQL

## 架构概览
[架构图或描述]

## 编码规范
- 使用 ESLint + Prettier
- 测试覆盖率要求 > 80%

## 关键约束
- 必须支持 IE11
- API 响应时间 < 200ms
```

### 2. 规格文档编写规范

```markdown
# 功能名称

## 背景
为什么需要这个功能？

## 目标
- 目标 1
- 目标 2

## 非目标
- 明确不在范围内的事项

## 技术设计
### API 设计
### 数据模型
### 接口定义

## 测试策略
```

### 3. 变更管理建议

- **小步提交**：每个变更专注于单一功能
- **及时归档**：完成后立即归档，避免积累
- **定期回顾**：每周回顾 pending 的变更

---

## 常见问题

### Q1: OpenSpec 与 Spec Kit 有什么区别？

| 维度 | Spec Kit (GitHub) | OpenSpec (Fission AI) |
|------|-------------------|----------------------|
| 语言/安装 | Python/uv | TypeScript/npm |
| 设计理念 | 严格门控，逐步审核 | 依赖图驱动，灵活迭代 |
| 最佳场景 | 绿地项目（新项目） | 棕地项目（现有项目） |

### Q2: 如何在现有项目中引入 OpenSpec？

```bash
# 1. 在项目根目录初始化
cd existing-project
openspec init

# 2. 编辑 project.md 描述项目现状

# 3. 逐步添加规格文档，不需要一次性完成
```

### Q3: 规格文档写得很详细，AI 仍然理解错误怎么办？

1. 检查 `project.md` 是否提供了足够的上下文
2. 使用 `openspec validate` 验证格式
3. 尝试拆分大的规格为多个小规格

### Q4: 团队中如何协作？

- 将 `openspec/` 目录纳入 Git 版本控制
- 规格变更通过 Pull Request 审核
- 使用 `changes/` 目录追踪每个人的工作

### Q5: 支持哪些 AI 模型？

OpenSpec 工具无关，支持所有主流 AI 编程助手：
- Claude (Anthropic)
- GPT-4 / GPT-4o (OpenAI)
- Gemini (Google)
- Qwen (阿里云)
- ...更多

---

## 参考资源

- **GitHub 仓库**: https://github.com/Fission-AI/OpenSpec
- **npm 包**: https://www.npmjs.com/package/@fission-ai/openspec

---

## 快速参考卡

### CLI 命令速查

| 命令 | 说明 |
|------|------|
| `openspec init` | 初始化项目 |
| `openspec list` | 列出活跃变更 |
| `openspec show <name>` | 查看变更详情 |
| `openspec validate <name>` | 验证规格格式 |
| `openspec archive <name> --yes` | 归档变更 |
| `openspec view` | 交互式仪表盘 |
| `openspec update` | 更新版本 |

### AI 命令速查（Claude Code）

| 命令 | 说明 |
|------|------|
| `/openspec:explore` | 探索需求 |
| `/openspec:proposal` | 创建提案 |
| `/openspec:apply <name>` | 应用变更 |
| `/openspec:archive <name>` | 归档变更 |

### 典型工作流

```bash
# 一行命令完成整个流程
openspec init && /openspec:proposal 添加XXX功能 && /openspec:apply xxx && openspec archive xxx --yes
```

---

*本文档基于 OpenSpec v1.2.0 生成，更新日期：2026-03-06*
