# Generic Portal Crawler

## Overview

通用企业门户网站爬虫，支持通过 URL 参数指定目标网站，自动发现并爬取所有页面。

## ADDED Requirements

### Requirement: CLI 启动参数

系统 SHALL 支持通过 `-a url` 参数指定目标网站 URL。

#### Scenario: 基本爬取命令
- **WHEN** 用户执行 `scrapy crawl generic_portal -a url="https://example.com"`
- **THEN** 爬虫 SHALL 开始爬取 example.com 网站

#### Scenario: 指定输出目录
- **WHEN** 用户执行 `scrapy crawl generic_portal -a url="https://example.com" -a output_dir="./my_output"`
- **THEN** 爬虫 SHALL 将结果输出到 `./my_output/example.com/` 目录

#### Scenario: 强制全量爬取
- **WHEN** 用户执行 `scrapy crawl generic_portal -a url="https://example.com" -a force_full=true`
- **THEN** 爬虫 SHALL 忽略历史记录，重新爬取所有页面

### Requirement: URL 发现策略

系统 SHALL 支持 Sitemap 优先、链接发现兜底的 URL 发现策略。

#### Scenario: 存在 Sitemap
- **WHEN** 目标网站存在 `/sitemap.xml`
- **THEN** 系统 SHALL 从 sitemap 解析所有 URL 进行爬取

#### Scenario: Sitemap 不存在
- **WHEN** 目标网站不存在 `/sitemap.xml`
- **THEN** 系统 SHALL 从首页开始，使用 CrawlSpider 模式跟随链接发现页面

#### Scenario: Sitemap 包含 lastmod
- **WHEN** sitemap.xml 中的 URL 包含 `<lastmod>` 字段
- **THEN** 系统 SHALL 使用 lastmod 时间判断页面是否有更新

### Requirement: robots.txt 合规

系统 SHALL 遵守目标网站的 robots.txt 协议。

#### Scenario: robots.txt 禁止路径
- **WHEN** 目标网站的 robots.txt 禁止访问 `/admin/` 路径
- **THEN** 系统 SHALL 跳过所有 `/admin/` 下的页面

#### Scenario: robots.txt 不存在
- **WHEN** 目标网站不存在 robots.txt
- **THEN** 系统 SHALL 正常爬取所有页面

### Requirement: 域名边界控制

系统 SHALL 限制爬取范围在目标域名及其相关子域名。

#### Scenario: 主域名爬取
- **WHEN** 目标 URL 为 `example.com`
- **THEN** 系统 SHALL 爬取 `example.com` 和 `www.example.com` 下的页面

#### Scenario: 排除外部域名
- **WHEN** 页面包含指向 `external.com` 的链接
- **THEN** 系统 SHALL 不爬取外部域名的页面

#### Scenario: 资源域名特殊处理
- **WHEN** 页面引用 `cdn.example.com` 下的资源（CSS/JS/图片）
- **THEN** 系统 SHALL 下载资源但不爬取 cdn 子域名的页面
