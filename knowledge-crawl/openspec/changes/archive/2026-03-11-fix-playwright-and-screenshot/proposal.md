## Why

系统当前无法正常执行 Google 搜索采集，原因是 Playwright 模块未正确安装（package.json 中只有 `@playwright/test`，代码却 require `playwright`）。这导致系统回退到模拟数据模式，无法产出真实的厂商线索。同时，Phase 0 首页截图功能未实现，不符合 PRD 3.1 要求的"采集首页首屏截图"。

## What Changes

- **修复 Playwright 依赖**：将 `playwright` 添加为 dependencies，确保浏览器自动化正常工作
- **实现 Phase 0 首页截图**：在域名聚合后对每个候选域名的首页进行首屏截图
- **创建 screenshots/ 目录**：在每次运行的输出目录中生成截图文件

## Capabilities

### New Capabilities

- `phase0-screenshot`: Phase 0 阶段对候选域名首页进行首屏截图，辅助人工快速筛选

### Modified Capabilities

- `serp-collection`: 修复 Playwright 依赖问题，确保真实 Google 搜索采集正常执行

## Impact

**代码变更**：
- `package.json` - 添加 `playwright` 依赖
- `src/services/serp-collector.js` - 添加首页截图功能

**输出变更**：
- 新增 `outputs/<run_id>/screenshots/` 目录
- 新增 `<domain>_home.png` 截图文件

**依赖变更**：
- 新增 `playwright@^1.58.2` 作为 runtime dependency
