# Generic Portal Scraper

## Why

当前爬虫（milesight.py）是 Milesight 网站专用实现，存在大量硬编码（域名、sitemap URL、排除规则），无法复用于其他企业门户网站。每次爬取新站点需要复制代码并手动修改，维护成本高且容易出错。

需要一个通用的企业门户网站爬虫，通过参数传入目标 URL 即可工作，支持增量爬取和智能过滤。

## What Changes

- **新增**通用爬虫 `generic_portal.py`，通过 CLI 参数接收目标网站 URL
- **新增** URL 过滤模块，支持语言优先（英文）、域名边界控制、通用排除规则
- **新增**增量爬取支持，基于历史记录检测新页面和内容更新
- **新增**历史管理模块，3 个月自动过期，支持清理命令
- **重构** Pipeline 为通用版本，移除 Milesight 硬编码
- **删除** `milesight.py` 专用爬虫（功能由通用版覆盖）
- **更新** `settings.py`，移除硬编码配置

## Capabilities

### New Capabilities

- `generic-portal-crawler`: 通用企业门户网站爬虫，支持任意门户 URL 输入，自动发现页面，增量爬取
- `url-filtering`: URL 过滤策略（语言优先、域名边界、排除规则）
- `incremental-crawling`: 增量爬取能力（历史记录、内容变化检测、3 个月过期）
- `asset-downloader`: 资源下载与链接重写（CSS/JS/图片/字体）

### Modified Capabilities

无（原有功能为专用实现，无通用规格）

## Impact

**代码变更**：
- `mainsite_scraper/spiders/milesight.py` → 删除
- `mainsite_scraper/spiders/generic_portal.py` → 新增
- `mainsite_scraper/pipelines.py` → 重构
- `mainsite_scraper/settings.py` → 更新
- `mainsite_scraper/utils/` → 新增目录（url_filter.py, history_manager.py, sitemap_parser.py, content_hash.py）

**CLI 接口变更**：
- 原：`scrapy crawl milesight`
- 新：`scrapy crawl generic_portal -a url="https://example.com"`

**输出结构变更**：
- 原：`output/*.html`
- 新：`output/{domain}/*.html` + `output/{domain}/crawl_history.json`
