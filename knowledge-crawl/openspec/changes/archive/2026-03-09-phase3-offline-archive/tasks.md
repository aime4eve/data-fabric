# Phase 3 任务清单

## 准备工作

- [ ] 安装 single-file npm 依赖
  ```bash
  npm install single-file --save
  ```

## CLI 参数扩展

- [ ] 在 `src/utils/cli.js` 中新增 Phase 3 参数
  - `--phase3` (boolean)
  - `--url-list` (string)
  - `--archive-dir` (string)
  - `--timeout` (number)
  - `--max-size` (number)

- [ ] 在 `src/utils/cli.js` 的 `getDefaultConfig()` 中添加默认值

## 离线归档服务 (offline-archiver.js)

- [ ] 创建 `src/services/offline-archiver.js`
- [ ] 实现 `readUrlList(filePath)` - 读取 URL 清单（支持 TXT/CSV）
- [ ] 实现 `loadDownloadHistory(archiveDir)` - 加载下载历史
- [ ] 实现 `filterNewUrls(urls, history)` - 过滤已下载 URL
- [ ] 实现 `scrollPage(page)` - 滚动页面触发懒加载
- [ ] 实现 `saveWithSingleFile(page)` - SingleFile 保存
- [ ] 实现 `appendHistory(archiveDir, record)` - 追加下载记录
- [ ] 实现 `downloadWithRetry(page, url, options)` - 带重试的下载
- [ ] 实现 `downloadAll(urls, options)` - 批量下载

## 索引页生成 (index-generator.js)

- [ ] 创建 `src/services/index-generator.js`
- [ ] 实现 `loadVendorsData(csvPath)` - 加载厂商数据
- [ ] 实现 `loadHistoryData(archiveDir)` - 加载下载历史
- [ ] 实现 `mergeData(vendors, history)` - 聚合数据（只保留成功）
- [ ] 实现 `generateHtml(data)` - 生成 HTML（内联 CSS/JS）
- [ ] 实现 `writeIndex(archiveDir, html)` - 写入索引页

## 主入口集成

- [ ] 在 `src/index.js` 中添加 Phase 3 模式判断
  ```javascript
  if (config.phase3) {
    await runPhase3(config);
    return;
  }
  ```

- [ ] 实现 `runPhase3(config)` 函数
  - 读取 URL 清单
  - 加载下载历史
  - 过滤已下载
  - 批量下载
  - 生成索引页

## 测试

- [ ] 创建 `tests/offline-archiver.test.js`
  - 测试 URL 清单读取
  - 测试历史记录过滤
  - 测试失败重试逻辑

- [ ] 创建 `tests/index-generator.test.js`
  - 测试数据聚合
  - 测试 HTML 生成

## 文档更新

- [ ] 更新 `CLAUDE.md` 中的 CLI 参数表
- [ ] 更新 `PRD-厂商门户搜索采集系统.md` 标记 Phase 3 为已完成

## 验收测试

- [ ] 手动测试：运行 `--phase3` 模式下载 5 个厂商页面
- [ ] 验证离线页面在断网环境下可正常打开
- [ ] 验证索引页搜索/筛选功能正常
- [ ] 验证失败重试和错误记录正常
