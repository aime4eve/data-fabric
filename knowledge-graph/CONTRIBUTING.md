# 贡献指南

感谢您对 Data-Fabric 项目的关注！我们欢迎所有形式的贡献。

## 🚀 快速开始

### 环境准备

1. Fork 项目到您的 GitHub 账户
2. 克隆您的 fork 到本地
3. 安装依赖并启动开发环境

```bash
git clone https://github.com/your-username/Data-Fabric.git
cd Data-Fabric
./scripts/dev/start_dev.sh
```

## 📝 开发流程

### 1. 创建分支

```bash
git checkout -b feature/your-feature-name
# 或
git checkout -b bugfix/issue-number
```

### 2. 代码规范

#### Python 代码规范
- 遵循 PEP 8 规范
- 使用 Black 进行代码格式化
- 使用 isort 进行导入排序
- 添加类型注解

```bash
# 格式化代码
cd src/backend
black .
isort .
```

#### TypeScript 代码规范
- 遵循 ESLint 配置
- 使用 Prettier 进行格式化
- 使用严格的 TypeScript 配置

```bash
# 格式化代码
cd src/frontend
npm run lint:fix
npm run format
```

### 3. 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

类型包括：
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式化
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

示例：
```
feat(auth): add JWT token refresh mechanism

- Implement automatic token refresh
- Add refresh token storage
- Update authentication middleware

Closes #123
```

## 🧪 测试要求

### 运行测试

```bash
# 运行所有测试
./scripts/test/run-tests.sh

# 单独运行后端测试
cd src/backend && python -m pytest

# 单独运行前端测试
cd src/frontend && npm test

# E2E 测试
npx playwright test
```

### 测试覆盖率

- 新功能必须包含单元测试
- 测试覆盖率不低于 80%
- 所有 E2E 测试必须通过

## 📋 Pull Request 流程

### 1. 提交前检查

- [ ] 代码通过所有测试
- [ ] 代码符合规范要求
- [ ] 添加了必要的文档
- [ ] 更新了相关的 CHANGELOG

### 2. 创建 Pull Request

1. 推送您的分支到 GitHub
2. 创建 Pull Request
3. 填写 PR 模板
4. 等待代码审查

### 3. PR 模板

```markdown
## 变更类型
- [ ] Bug 修复
- [ ] 新功能
- [ ] 重构
- [ ] 文档更新
- [ ] 其他

## 变更描述
简要描述您的变更内容

## 测试
- [ ] 添加了单元测试
- [ ] 添加了集成测试
- [ ] 手动测试通过

## 检查清单
- [ ] 代码符合项目规范
- [ ] 所有测试通过
- [ ] 文档已更新
- [ ] 无破坏性变更
```

## 🐛 报告 Bug

### Bug 报告模板

```markdown
**Bug 描述**
简要描述 bug 的现象

**复现步骤**
1. 进入 '...'
2. 点击 '....'
3. 滚动到 '....'
4. 看到错误

**期望行为**
描述您期望发生的行为

**截图**
如果适用，添加截图来帮助解释您的问题

**环境信息**
- OS: [e.g. Ubuntu 20.04]
- Browser: [e.g. Chrome 91]
- Version: [e.g. 1.0.0]

**附加信息**
添加任何其他相关信息
```

## 💡 功能请求

### 功能请求模板

```markdown
**功能描述**
简要描述您希望添加的功能

**问题描述**
描述这个功能要解决的问题

**解决方案**
描述您希望的解决方案

**替代方案**
描述您考虑过的其他解决方案

**附加信息**
添加任何其他相关信息或截图
```

## 📚 文档贡献

### 文档类型

- API 文档
- 用户指南
- 开发者文档
- 架构文档

### 文档规范

- 使用 Markdown 格式
- 包含代码示例
- 添加适当的图表
- 保持简洁明了

## 🎯 代码审查

### 审查要点

- 代码逻辑正确性
- 性能影响
- 安全性考虑
- 可维护性
- 测试覆盖率

### 审查流程

1. 自动化检查通过
2. 至少一个维护者审查
3. 解决所有评论
4. 合并到主分支

## 🏷️ 发布流程

### 版本号规范

使用 [Semantic Versioning](https://semver.org/)：

- `MAJOR.MINOR.PATCH`
- `MAJOR`: 不兼容的 API 变更
- `MINOR`: 向后兼容的功能性新增
- `PATCH`: 向后兼容的问题修正

### 发布步骤

1. 更新版本号
2. 更新 CHANGELOG
3. 创建 Release Tag
4. 发布到生产环境

## 📞 获取帮助

如果您有任何问题，可以通过以下方式获取帮助：

- 创建 Issue
- 参与 Discussions
- 加入社区群组

## 🙏 致谢

感谢所有为 Data-Fabric 项目做出贡献的开发者！

---

再次感谢您的贡献！🎉