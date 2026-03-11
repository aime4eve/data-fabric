## 1. Playwright 依赖修复

- [x] 1.1 编写测试：验证 `require('playwright')` 成功加载模块
- [x] 1.2 修改 package.json：将 `playwright` 添加到 dependencies
- [x] 1.3 执行 `pnpm install` 安装依赖
- [x] 1.4 运行测试确认模块加载成功

## 2. Phase 0 首页截图功能

- [x] 2.1 编写测试：验证截图目录创建功能
- [x] 2.2 编写测试：验证首页截图生成功能（模拟域名）
- [x] 2.3 编写测试：验证截图失败时不中断流程
- [x] 2.4 实现 `captureHomeScreenshots` 函数
- [x] 2.5 在 `collectSerpResults` 中集成截图调用
- [x] 2.6 运行测试确认功能正常

## 3. 集成验证

- [x] 3.1 手动验证：执行 `node src/index.js --keywords-file "./Mold_keywords.csv" --max-domains 2`
- [x] 3.2 检查输出：`outputs/<run_id>/screenshots/` 目录存在且包含截图文件 (16 个 PNG)
- [x] 3.3 检查 SERP 数据：`serp_results_raw.csv` 包含真实 Google 搜索结果
- [x] 3.4 确认浏览器正常启动并访问真实 Google
