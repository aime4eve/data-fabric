# 修复 serp-collector.js 语法错误

## Why

用户在运行 `node src/index.js` 时遇到 `SyntaxError: Unexpected end of input` 错误。
经检查，`src/services/serp-collector.js` 文件中的 `collectSerpResults` 函数缺少闭合的大括号 `}`，导致解析失败。
修复此错误对于系统正常运行是必要的。

## What Changes

- 在 `src/services/serp-collector.js` 文件末尾添加缺少的闭合大括号 `}`。
- 确保 `collectSerpResults` 函数正确闭合。

## Capabilities

### New Capabilities
- `fix-serp-collector`: 修复 SERP 采集服务的语法错误。

### Modified Capabilities
<!-- 无现有规格变更 -->

## Impact

- `src/services/serp-collector.js`: 修复语法错误。
- 影响所有依赖 `collectSerpResults` 的功能（主要是 Phase 0 采集流程）。
