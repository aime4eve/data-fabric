# 知识库应用开发环境管理脚本

本目录包含知识库应用的开发环境管理脚本，用于简化开发环境的启动、停止、监控和数据库管理。

## 📁 目录结构

```
scripts/dev/
├── README.md                    # 本文档
├── check_env.sh                 # 环境检查脚本
├── restart_dev.sh               # 重启开发环境脚本
├── start_dev.sh                 # 启动开发环境脚本
├── status_dev.sh                # 状态监控脚本
├── stop_dev.sh                  # 停止开发环境脚本
├── migrate/                     # 数据库迁移脚本目录
│   ├── migrate_down.sh          # 数据库回滚脚本
│   └── migrate_up.sh            # 数据库迁移脚本
└── seed/                        # 数据种子脚本目录
    ├── clear_test_data.sh       # 清理测试数据脚本
    └── seed_knowledge.sh        # 填充测试数据脚本
```

## 🚀 快速开始

### 1. 启动开发环境
```bash
./scripts/dev/start_dev.sh
```

### 2. 停止开发环境
```bash
./scripts/dev/stop_dev.sh
```

### 3. 重启开发环境
```bash
./scripts/dev/restart_dev.sh
```

### 4. 检查环境状态
```bash
./scripts/dev/status_dev.sh
```

## 📋 脚本功能详解

### start_dev.sh - 启动开发环境
**功能**: 启动完整的开发环境，包括前端、后端和基础设施服务

**主要功能**:
- ✅ 环境检查和依赖验证
- ✅ 虚拟环境设置和激活
- ✅ 基础设施服务启动（PostgreSQL、Redis、Elasticsearch、NebulaGraph）
- ✅ 后端API服务启动（端口5000）
- ✅ 前端应用启动（端口3000）
- ✅ 健康检查和状态监控
- ✅ 日志文件创建和管理

**启动的服务**:
- **前端应用**: http://localhost:3000
- **后端API**: http://localhost:5000
- **数据库服务**: PostgreSQL、Redis、Elasticsearch、NebulaGraph

### stop_dev.sh - 停止开发环境
**功能**: 安全停止所有开发环境服务

**主要功能**:
- ✅ 停止前端和后端服务进程
- ✅ 停止Docker Compose基础设施服务
- ✅ 清理残留容器和进程
- ✅ 删除临时文件和PID文件
- ✅ 状态报告和清理确认

**清理内容**:
- 前端和后端服务进程
- Docker Compose服务
- 所有名称包含"knowledge-base-"的容器
- PID文件和临时文件

### restart_dev.sh - 重启开发环境
**功能**: 重启开发环境，确保服务状态一致

**主要功能**:
- ✅ 调用stop_dev.sh停止服务
- ✅ 等待服务完全停止
- ✅ 调用start_dev.sh重新启动
- ✅ 状态检查和确认

### status_dev.sh - 状态监控脚本
**功能**: 实时监控开发环境状态和系统资源

**主要功能**:
- ✅ 服务进程状态检查
- ✅ 端口占用情况检查
- ✅ 系统资源监控（CPU、内存、磁盘）
- ✅ 数据库连接状态检查
- ✅ 日志文件查看功能
- ✅ 健康检查API调用

**监控指标**:
- 服务进程状态
- 端口5000和3000占用情况
- CPU和内存使用率
- 磁盘空间使用情况
- 数据库连接状态

### check_env.sh - 环境检查脚本
**功能**: 验证开发环境配置和依赖

**主要功能**:
- ✅ 系统环境检查（Python、Node.js、Docker）
- ✅ 依赖包版本检查
- ✅ 端口可用性检查
- ✅ 数据库服务状态检查
- ✅ 配置文件验证

**检查项目**:
- Python 3.8+ 和 Node.js 16+
- Docker 和 Docker Compose
- 端口5000和3000可用性
- 数据库服务连接
- 配置文件完整性

## 🗄️ 数据库管理脚本

### migrate_up.sh - 数据库迁移
**功能**: 创建NebulaGraph数据库schema

**创建内容**:
- 图空间: knowledge_base
- 标签: Knowledge, User, Category
- 边: RelatedTo, Created, BelongsTo
- 索引: 各种查询优化索引

**使用**:
```bash
./scripts/dev/migrate/migrate_up.sh
```

### migrate_down.sh - 数据库回滚
**功能**: 删除NebulaGraph数据库schema（⚠️ 会删除所有数据）

**删除内容**:
- 整个knowledge_base图空间
- 所有标签、边、索引
- 所有数据

**使用**:
```bash
./scripts/dev/migrate/migrate_down.sh
```

## 🌱 数据管理脚本

### seed_knowledge.sh - 填充测试数据
**功能**: 向数据库填充测试数据

**填充数据**:
- 3个测试用户（admin, zhangsan, lisi）
- 7个分类（技术文档、前端开发、后端开发等）
- 6个知识条目（React、Flask、NebulaGraph等）
- 完整的关联关系

**使用**:
```bash
./scripts/dev/seed/seed_knowledge.sh
```

### clear_test_data.sh - 清理测试数据
**功能**: 清理数据库中的测试数据

**清理内容**:
- 所有知识条目
- 所有用户数据
- 所有分类数据
- 所有关系数据

**使用**:
```bash
./scripts/dev/seed/clear_test_data.sh
```

## 🔧 使用流程

### 首次设置
1. 运行环境检查：`./scripts/dev/check_env.sh`
2. 启动开发环境：`./scripts/dev/start_dev.sh`
3. 执行数据库迁移：`./scripts/dev/migrate/migrate_up.sh`
4. 填充测试数据：`./scripts/dev/seed/seed_knowledge.sh`

### 日常开发
1. 启动环境：`./scripts/dev/start_dev.sh`
2. 开发完成后停止：`./scripts/dev/stop_dev.sh`
3. 需要时重启：`./scripts/dev/restart_dev.sh`
4. 监控状态：`./scripts/dev/status_dev.sh`

### 数据库管理
- 重置数据库：先运行`migrate_down.sh`，再运行`migrate_up.sh`
- 重新填充数据：运行`clear_test_data.sh`后运行`seed_knowledge.sh`

## 🎯 访问地址

- **前端应用**: http://localhost:3000
- **后端API**: http://localhost:5000
- **API文档**: http://localhost:5000/docs
- **健康检查**: http://localhost:5000/health

## 📊 日志文件

- 前端日志：`/tmp/knowledge_base_frontend.log`
- 后端日志：`/tmp/knowledge_base_backend.log`
- 基础设施日志：Docker Compose日志

## 🔍 故障排除

### 常见问题
1. **端口占用**: 使用`status_dev.sh`检查端口占用情况
2. **容器冲突**: `stop_dev.sh`会自动清理残留容器
3. **服务启动失败**: 检查日志文件获取详细信息
4. **数据库连接问题**: 验证数据库服务状态

### 调试命令
```bash
# 检查服务状态
./scripts/dev/status_dev.sh

# 查看日志
./scripts/dev/status_dev.sh --logs

# 检查环境
./scripts/dev/check_env.sh

# 手动停止容器
docker ps | grep knowledge-base | awk '{print $1}' | xargs docker stop
```

## 📝 注意事项

1. ⚠️ 数据库迁移和清理脚本会删除数据，请谨慎使用
2. 🔒 确保端口5000和3000未被其他应用占用
3. 💾 定期备份重要数据
4. 🔄 重启脚本会完全重新启动所有服务
5. 📈 状态监控脚本提供实时系统资源信息

## 🤝 贡献指南

欢迎提交改进建议和问题报告。请确保：
- 脚本修改后测试所有相关功能
- 更新本文档中的相应部分
- 遵循现有的代码风格和结构

---

**最后更新**: 2024年
**维护者**: 知识库应用开发团队