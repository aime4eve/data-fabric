# Phase 3: 离线归档与索引

## 背景

厂商门户搜索采集系统已完成 Phase 0-2，能够采集 SERP 结果、抓取证据页、提取联系方式并通过 LLM 增强。现在需要实现 Phase 3：将厂商网页离线保存到本地，形成可离线浏览的知识库。

## 目标

- 支持从 URL 清单或 vendors_enriched.csv 批量下载厂商网页
- 使用 SingleFile 将网页保存为单文件 HTML（内联所有资源）
- 维护下载历史（download_history.csv），支持增量去重
- 生成离线索引页（offline_index.html），支持搜索/过滤/排序

## 非目标

- 不处理动态交互内容（如表单提交）
- 不支持视频/音频等大媒体文件的内联
- 不实现分布式下载或代理池

## 范围

- 新增 `--phase3` CLI 模式
- 新增 `offline-archiver.js` 服务模块
- 新增 `index-generator.js` 服务模块
- 新增 CLI 参数：`--url-list`, `--archive-dir`, `--timeout`, `--max-size`

## 验收标准

- [ ] `node src/index.js --phase3 --vendors-file "./outputs/xxx/vendors_enriched.csv"` 能正常执行
- [ ] 生成的 .html 文件在断网环境下可通过 Chrome 正常打开
- [ ] download_history.csv 正确记录增量下载
- [ ] offline_index.html 显示所有成功下载的厂商，支持搜索和筛选

## 风险

| 风险 | 缓解策略 |
|------|----------|
| 某些网站禁止保存 | 超时回退，记录失败状态 |
| 大文件下载超时 | 设置 30s 超时 + 10MB 限制 |
| 动态内容丢失 | 滚动页面触发懒加载后再保存 |
| SingleFile 兼容性 | 使用稳定版本 npm 包 |
