# Implementation Tasks: Generic Portal Scraper

## 1. 基础设施

- [x] 1.1 创建 `utils/` 目录结构
- [x] 1.2 更新 `requirements.txt` 添加新依赖（tldextract 等）
- [x] 1.3 创建 `scripts/` 目录用于清理脚本

## 2. URL 过滤模块 (url_filter.py)

- [x] 2.1 实现 `is_allowed_domain(url, target_domain)` - 域名边界检查
- [x] 2.2 实现 `is_english_url(url)` - 英文 URL 检测
- [x] 2.3 实现 `should_exclude(url)` - 通用排除规则
- [x] 2.4 实现 `get_allowed_domains(target_url)` - 获取允许的域名列表
- [x] 2.5 编写 URL 过滤模块单元测试

## 3. Sitemap 解析模块 (sitemap_parser.py)

- [x] 3.1 实现 `parse_sitemap(url)` - 解析 sitemap.xml 获取 URL 列表
- [x] 3.2 实现 `get_urls_with_lastmod(url)` - 解析带 lastmod 的 URL
- [x] 3.3 支持嵌套 sitemap 索引解析
- [x] 3.4 编写 Sitemap 解析模块单元测试

## 4. 历史记录管理模块 (history_manager.py)

- [x] 4.1 实现 `load_history(domain, output_dir)` - 加载历史记录
- [x] 4.2 实现 `is_new_or_updated(url, lastmod, history)` - 检测新页面或更新
- [x] 4.3 实现 `update_history(history, url, content_hash, local_path)` - 更新历史记录
- [x] 4.4 实现 `cleanup_expired(history, days=90)` - 清理过期条目
- [x] 4.5 实现 `save_history(history, output_path)` - 保存历史记录
- [x] 4.6 编写历史记录管理模块单元测试

## 5. 内容哈希模块 (content_hash.py)

- [x] 5.1 实现 `compute_hash(html)` - 计算 HTML 内容 SHA256 哈希
- [x] 5.2 编写内容哈希模块单元测试

## 6. 通用爬虫 Spider (generic_portal.py)

- [x] 6.1 创建 `GenericPortalSpider` 类基础结构
- [x] 6.2 实现 `__init__` 解析 CLI 参数（url, output_dir, force_full 等）
- [x] 6.3 实现 `start_requests` - Sitemap 优先 + 链接发现兜底
- [x] 6.4 实现 `parse_sitemap` - 解析 sitemap 并过滤 URL
- [x] 6.5 实现 `parse_page` - 解析页面并提取内容
- [x] 6.6 集成 URL 过滤模块
- [x] 6.7 集成历史记录管理模块
- [x] 6.8 实现增量爬取逻辑

## 7. Pipeline 重构 (pipelines.py)

- [x] 7.1 重构 `SaveHtmlPipeline` 为通用版本
- [x] 7.2 移除 Milesight 硬编码域名检查
- [x] 7.3 重构 `_should_download_assets` 为通用启用
- [x] 7.4 重构 `_download_and_rewrite_assets` 移除硬编码域名
- [x] 7.5 集成内容哈希计算
- [x] 7.6 集成历史记录更新
- [x] 7.7 确保输出目录按域名组织

## 8. 配置更新 (settings.py)

- [x] 8.1 移除 `ALLOWED_DOMAINS` 硬编码
- [x] 8.2 更新 `EXCLUDE_PATTERNS` 为通用规则
- [x] 8.3 添加 `OUTPUT_DIR` 默认值配置
- [x] 8.4 添加 `HISTORY_EXPIRE_DAYS` 配置项

## 9. 清理脚本 (scripts/clean_history.py)

- [x] 9.1 实现 `--site` 参数清理指定站点
- [x] 9.2 实现 `--all` 参数清理所有站点
- [x] 9.3 实现 `--older-than` 参数按时间清理
- [x] 9.4 添加帮助信息和错误处理

## 10. 清理旧代码

- [x] 10.1 删除 `spiders/milesight.py`
- [x] 10.2 更新 `spiders/__init__.py` 移除 milesight 导入
- [x] 10.3 清理 `middlewares.py` 中的 Milesight 特定引用

## 11. 测试与验证

- [x] 11.1 使用 Milesight 网站进行回归测试
- [x] 11.2 使用其他企业网站进行通用性测试（至少 2 个）
- [x] 11.3 验证增量爬取功能（第二次运行跳过已爬页面）
- [x] 11.4 验证语言过滤功能（排除非英文页面）
- [x] 11.5 验证资源下载和链接重写
- [ ] 11.6 验证历史记录清理脚本

## 12. 文档更新

- [x] 12.1 更新 CLAUDE.md 中的爬虫使用说明
- [x] 12.2 更新 README.md（如果存在）
- [x] 12.3 添加 CLI 参数文档
