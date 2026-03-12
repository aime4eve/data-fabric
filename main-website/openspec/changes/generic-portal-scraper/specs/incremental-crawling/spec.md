# Incremental Crawling

## Overview

增量爬取能力，支持检测新页面和内容更新，避免重复下载。

## ADDED Requirements

### Requirement: 历史记录存储

系统 SHALL 为每个域名维护独立的爬取历史记录文件。

#### Scenario: 创建历史记录
- **WHEN** 首次爬取 `example.com` 网站
- **THEN** 系统 SHALL 在 `output/example.com/crawl_history.json` 创建历史记录文件

#### Scenario: 历史记录格式
- **WHEN** 系统保存爬取历史
- **THEN** 历史记录 SHALL 包含：站点域名、首次爬取时间、最后爬取时间、URL 列表（含首次发现时间、内容哈希、本地路径）

#### Scenario: 更新历史记录
- **WHEN** 完成一次爬取任务
- **THEN** 系统 SHALL 更新 `last_crawl` 时间戳和 URL 列表

### Requirement: 新页面检测

系统 SHALL 检测首次出现的 URL 并进行爬取。

#### Scenario: URL 不在历史记录
- **WHEN** 发现的 URL 不存在于 `crawl_history.json` 中
- **THEN** 系统 SHALL 将其标记为新页面并爬取

#### Scenario: URL 已在历史记录
- **WHEN** 发现的 URL 已存在于 `crawl_history.json` 中
- **THEN** 系统 SHALL 检查内容是否有更新

### Requirement: 内容更新检测

系统 SHALL 检测页面内容变化并重新爬取更新的页面。

#### Scenario: Sitemap lastmod 更新
- **WHEN** sitemap.xml 中 URL 的 `lastmod` 时间晚于历史记录中的 `last_modified`
- **THEN** 系统 SHALL 将该 URL 标记为已更新并重新爬取

#### Scenario: 内容哈希变化
- **WHEN** 页面内容的 SHA256 哈希值与历史记录中的不同
- **THEN** 系统 SHALL 将该 URL 标记为已更新并重新爬取

#### Scenario: 内容无变化
- **WHEN** 页面内容哈希与历史记录相同
- **THEN** 系统 SHALL 跳过该 URL，不重新下载

### Requirement: 历史记录过期

系统 SHALL 自动清理超过 3 个月的历史记录条目。

#### Scenario: 自动过期
- **WHEN** 历史记录中的 URL 条目超过 90 天未被访问
- **THEN** 系统 SHALL 在下次爬取时自动删除该条目

#### Scenario: 过期后重新爬取
- **WHEN** URL 条目因过期被删除后再次被发现
- **THEN** 系统 SHALL 将其视为新页面并爬取

### Requirement: 手动清理命令

系统 SHALL 提供命令行工具清理历史记录。

#### Scenario: 清理指定站点
- **WHEN** 用户执行 `python scripts/clean_history.py --site example.com`
- **THEN** 系统 SHALL 删除 `output/example.com/crawl_history.json` 文件

#### Scenario: 清理所有站点
- **WHEN** 用户执行 `python scripts/clean_history.py --all`
- **THEN** 系统 SHALL 删除所有 `crawl_history.json` 文件

#### Scenario: 按时间清理
- **WHEN** 用户执行 `python scripts/clean_history.py --older-than 30`
- **THEN** 系统 SHALL 仅删除超过 30 天的历史记录条目（保留文件）

### Requirement: 强制全量爬取

系统 SHALL 支持忽略历史记录的强制全量爬取模式。

#### Scenario: 启用强制全量
- **WHEN** 用户执行 `scrapy crawl generic_portal -a url="..." -a force_full=true`
- **THEN** 系统 SHALL 忽略现有历史记录，重新爬取所有页面

#### Scenario: 全量爬取后更新历史
- **WHEN** 强制全量爬取完成
- **THEN** 系统 SHALL 用新的爬取结果覆盖现有历史记录
