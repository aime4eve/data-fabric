# 修复 index.js 中的 ReferenceError

## Context

`src/index.js` 在第 391 行调用了 `setLogLevel` 函数，但该文件头部的 `require` 语句中只导入了 `createLogger` 和 `setLogContext`，遗漏了 `setLogLevel`。
`src/utils/logger.js` 已经导出了 `setLogLevel`。

## Goals / Non-Goals

**Goals:**
- 修复 `src/index.js` 中的 `ReferenceError`。
- 确保 `setLogLevel` 被正确导入和使用。

**Non-Goals:**
- 修改 `logger.js` 的逻辑。

## Decisions

### Decision 1: 修改导入语句
**Rationale:**
- 这是一个简单的引用错误，通过修改 `require` 语句即可修复。
- 修改 `src/index.js` 中的 `const { createLogger, setLogContext } = require('./utils/logger');` 为 `const { createLogger, setLogContext, setLogLevel } = require('./utils/logger');`。

## Risks / Trade-offs

无明显风险。
