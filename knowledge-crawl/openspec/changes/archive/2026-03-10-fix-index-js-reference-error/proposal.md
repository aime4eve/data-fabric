# 修复 index.js 中的 ReferenceError

## Why

用户在运行 `node src/index.js` 时遇到 `ReferenceError: setLogLevel is not defined` 错误。
经检查，`src/index.js` 调用了 `setLogLevel` 函数，但未在导入语句中引入该函数。

## What Changes

- 在 `src/index.js` 中从 `./utils/logger` 导入 `setLogLevel` 函数。

## Capabilities

### New Capabilities
- `fix-index-js-imports`: 修复 `index.js` 中的导入缺失问题。

## Impact

- `src/index.js`: 修复 `ReferenceError`。
- 允许系统正常启动并根据配置设置日志级别。
