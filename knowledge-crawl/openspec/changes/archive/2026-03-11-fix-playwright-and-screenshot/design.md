## Context

当前系统存在两个关键问题：

1. **Playwright 模块缺失**：`package.json` 中声明了 `@playwright/test` 作为 devDependency，但代码使用 `require('playwright')`。这两个是不同的包：
   - `playwright` - 核心浏览器自动化库
   - `@playwright/test` - 测试运行器（内部依赖 playwright）

2. **Phase 0 截图未实现**：PRD 3.1 明确要求"采集首页首屏截图"，但当前代码中只有 Phase 1 的证据页截图功能（`evidence-fetcher.js`）。

**约束**：
- Playwright chromium 浏览器已在 `C:\Users\wulogic\AppData\Local\ms-playwright\` 安装
- 使用 pnpm 作为包管理器
- 遵循 TDD 开发流程

## Goals / Non-Goals

**Goals:**
- 修复 Playwright 依赖，使真实 Google 搜索采集正常工作
- 实现 Phase 0 首页首屏截图功能
- 截图保存到 `outputs/<run_id>/screenshots/` 目录
- 文件命名格式：`<domain>_home.png`

**Non-Goals:**
- 不修改 Phase 1 的证据页截图逻辑
- 不改变现有的浏览器启动/关闭策略
- 不实现全页截图（仅首屏）

## Decisions

### Decision 1: 添加 playwright 作为 runtime dependency

**选择**：将 `playwright` 添加到 `dependencies` 而非 `devDependencies`

**理由**：
- `@playwright/test` 仅用于测试场景，不暴露 `playwright` 模块
- 生产代码需要 `require('playwright')` 进行浏览器自动化
- 这是官方推荐的做法

**备选方案**：
- ❌ 改用 `require('@playwright/test')` - 该包不导出浏览器启动 API
- ❌ 使用 puppeteer - 需要重写所有浏览器交互代码

### Decision 2: 截图时机与位置

**选择**：在域名聚合后、Phase 1 之前执行首页截图

**理由**：
- 此时已得到去重的域名列表，避免重复截图
- 使用同一个浏览器实例，减少启动开销
- 截图失败不影响后续 Phase 1 证据抓取

**实现位置**：在 `serp-collector.js` 的 `collectSerpResults` 函数末尾添加截图逻辑

### Decision 3: 截图参数

**选择**：
- `fullPage: false` - 仅首屏（符合 PRD 要求）
- 格式：PNG
- 超时：30 秒

**理由**：
- PRD 3.1 明确要求"首屏截图"而非全页
- PNG 格式保证截图质量
- 30 秒超时与页面加载超时一致

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| 部分域名无法访问（超时/404） | try-catch 包裹，记录错误但不中断流程 |
| 截图增加总运行时间 | 使用已有浏览器实例，避免重复启动 |
| 首页重定向到其他路径 | 截图当前 URL，文件名仍用原始域名 |
| pnpm 安装 playwright 需要额外步骤 | 安装后运行 `npx playwright install chromium` |
