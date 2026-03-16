# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

main-website 是一个网站静态化工具集，用于将目标网站爬取并保存为本地静态 HTML 文件。目前包含：

| 目录 | 用途 |
|------|------|
| [web_scraper/](web_scraper/) | Scrapy 通用企业门户爬虫 |
| [www.hktlora.com/](www.hktlora.com/) | 静态 HTML 原型文件 |

## web_scraper - Scrapy 爬虫

通用企业门户网站爬虫，支持任意门户 URL 输入，自动发现页面，增量爬取。

### 常用命令

```bash
cd web_scraper

# 激活虚拟环境
source venv/Scripts/activate  # Linux/Mac
venv\Scripts\activate         # Windows

# 安装依赖
pip install -r requirements.txt

# 运行爬虫（必需参数）
scrapy crawl generic_portal -a url="https://www.example.com/"

# 指定输出目录
scrapy crawl generic_portal -a url="https://www.example.com/" -a output_dir="./output"

# 强制全量爬取（忽略历史记录）
scrapy crawl generic_portal -a url="https://www.example.com/" -a force_full=true

# 启用资源下载（CSS/JS/图片）
scrapy crawl generic_portal -a url="https://www.example.com/" -a download_assets=true

# 指定 sitemap URL
scrapy crawl generic_portal -a url="https://www.example.com/" -a sitemap_url="https://www.example.com/sitemap.xml"

# 查看详细日志
scrapy crawl generic_portal -a url="https://www.example.com/" -L DEBUG
```

### CLI 参数

| 参数 | 必需 | 说明 | 默认值 |
|------|------|------|--------|
| `url` | 是 | 目标网站 URL | - |
| `output_dir` | 否 | 输出目录 | `./output` |
| `force_full` | 否 | 强制全量爬取 | `false` |
| `download_assets` | 否 | 下载资源文件 | `false` |
| `sitemap_url` | 否 | 指定 sitemap URL | 自动发现 |

### 架构

```
web_scraper/
├── mainsite_scraper/
│   ├── spiders/
│   │   └── generic_portal.py   # 通用爬虫
│   ├── utils/
│   │   ├── url_filter.py       # URL 过滤（语言、域名、排除规则）
│   │   ├── sitemap_parser.py   # Sitemap 解析
│   │   ├── history_manager.py  # 增量爬取历史管理
│   │   └── content_hash.py     # 内容哈希计算
│   ├── items.py                # WebPageItem 数据结构
│   ├── middlewares.py          # RandomUserAgentMiddleware
│   ├── pipelines.py            # SaveHtmlPipeline（保存 HTML + 下载资源）
│   └── settings.py             # 爬虫配置
├── scripts/
│   └── clean_history.py        # 历史记录清理脚本
├── tests/                      # 单元测试
├── output/                     # 输出目录（按域名组织）
├── scrapy.cfg                  # Scrapy 配置
└── requirements.txt            # Python 依赖
```

### 数据流

```
目标 URL → Sitemap 发现 → URL 过滤 → 历史检查 → 页面抓取 → 内容哈希 → HTML 保存
```

**增量爬取逻辑**：
1. URL 不在历史 → 新页面 → 爬取
2. URL 在历史 + Sitemap lastmod 更新 → 内容更新 → 爬取
3. URL 在历史 + 无 lastmod + Hash 变化 → 内容更新 → 爬取
4. URL 在历史 + 无变化 → 跳过

### URL 过滤规则

**语言过滤**（优先英文）：
- 排除：`/zh/`、`/cn/`、`/de/`、`zh.`、`cn.` 等非英文路径/子域名
- 保留：`/en/`、`en.` 或无语言标识

**域名边界**：
- 允许：目标域名、`www.` 子域名、`en.` 子域名
- 排除：其他子域名（`blog.`、`cdn.` 等）

**通用排除**：
- WordPress 路径：`/wp-admin/`、`/feed/`、`/attachment/`
- 购物流程：`/cart/`、`/checkout/`
- 文件类型：`.pdf`、`.jpg`、`.png`、`.zip` 等

### 关键配置 (settings.py)

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `DOWNLOAD_DELAY` | 3 | 请求间隔（秒） |
| `CONCURRENT_REQUESTS` | 8 | 并发请求数 |
| `OUTPUT_DIR` | `./output` | 输出目录 |
| `HISTORY_EXPIRE_DAYS` | 90 | 历史记录过期天数 |
| `ROBOTSTXT_OBEY` | True | 遵守 robots.txt |

### 输出结构

```
output/
├── example.com/                    # 按域名组织
│   ├── crawl_history.json          # 爬取历史记录
│   ├── index.html                  # 首页
│   ├── products/                   # 产品页
│   │   └── *.html
│   └── _assets/                    # 下载的资源文件（可选）
│       └── css/js/img/...
└── other-site.com/                 # 其他站点独立目录
    └── ...
```

### 历史记录清理

```bash
# 列出所有站点
python scripts/clean_history.py --list

# 清理指定站点
python scripts/clean_history.py --site example.com

# 清理所有站点
python scripts/clean_history.py --all

# 清理 30 天前的记录
python scripts/clean_history.py --site example.com --older-than 30

# 只显示不执行
python scripts/clean_history.py --site example.com --dry-run
```

### 单元测试

```bash
# 运行所有测试
pytest tests/ -v

# 运行单个测试文件
pytest tests/test_url_filter.py -v
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
- 增量爬取依赖历史记录，首次运行会爬取所有页面
