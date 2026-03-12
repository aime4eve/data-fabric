# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

main-website 是一个网站静态化工具集，用于将目标网站爬取并保存为本地静态 HTML 文件。目前包含：

| 目录 | 用途 |
|------|------|
| [web_scraper/](web_scraper/) | Scrapy 网站爬虫（Milesight 网站） |
| [www.hktlora.com/](www.hktlora.com/) | 静态 HTML 原型文件 |

## web_scraper - Scrapy 爬虫

### 常用命令

```bash
cd web_scraper

# 激活虚拟环境
source venv/Scripts/activate  # Linux/Mac
venv\Scripts\activate         # Windows

# 安装依赖
pip install -r requirements.txt

# 运行爬虫
scrapy crawl milesight

# 指定单个 URL 爬取
scrapy crawl milesight -a target_url="https://www.milesight.cn/products/"

# 查看详细日志
scrapy crawl milesight -L DEBUG
```

### 架构

```
web_scraper/
├── mainsite_scraper/
│   ├── spiders/
│   │   └── milesight.py    # 主爬虫（从 sitemap.xml 获取 URL）
│   ├── items.py            # WebPageItem 数据结构
│   ├── middlewares.py      # RandomUserAgentMiddleware
│   ├── pipelines.py        # SaveHtmlPipeline（保存 HTML + 下载资源）
│   └── settings.py         # 爬虫配置
├── output/                  # 输出目录（HTML 文件）
├── scrapy.cfg              # Scrapy 配置
└── requirements.txt        # Python 依赖
```

### 数据流

```
sitemap.xml → URL 解析 → robots.txt 过滤 → 页面抓取 → HTML 链接修正 → 保存到 output/
```

### 关键配置 (settings.py)

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `DOWNLOAD_DELAY` | 3 | 请求间隔（秒） |
| `CONCURRENT_REQUESTS` | 8 | 并发请求数 |
| `OUTPUT_DIR` | `./output` | 输出目录 |
| `ROBOTSTXT_OBEY` | True | 遵守 robots.txt |

### 特殊功能

- **资源下载**：特定 URL（如 `/lorawan/node/ws50x/`）会下载 CSS/JS/图片等资源到 `_assets/` 目录
- **链接修正**：自动将相对链接转换为绝对链接
- **URL 过滤**：排除 `/wp-admin/`、`/attachment/` 等非公开路径

### 输出结构

```
output/
├── index.html              # 首页
├── products/               # 产品页
│   └── *.html
├── solutions/              # 解决方案页
│   └── *.html
└── _assets/                # 下载的资源文件（CSS/JS/图片）
```

## OpenSpec 工作流

项目使用 OpenSpec 进行规格驱动开发：

| 命令 | 说明 |
|------|------|
| `/openspec:explore` | 探索需求 |
| `/openspec:propose` | 创建变更提案 |
| `/openspec:apply` | 应用变更实现 |
| `/openspec:archive` | 归档已完成变更 |

## 注意事项

- 爬虫仅供学习研究使用，需遵守目标网站 robots.txt 协议
- 默认请求间隔 3 秒，避免高频请求
- 虚拟环境位于 `web_scraper/venv/`
