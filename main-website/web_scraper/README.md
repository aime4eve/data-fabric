# 通用企业门户网站爬虫

本爬虫仅供学习研究使用，请遵守目标网站的robots协议及所有法律法规。不得用于任何商业用途或非法用途。

## 项目说明

这是一个通用的企业门户网站爬虫，支持任意门户 URL 输入，自动发现页面，增量爬取。主要功能：

1. **通用性**: 通过 CLI 参数传入任意门户 URL 即可工作
2. **Sitemap 优先**: 自动发现并解析 sitemap.xml，失败时从首页跟随链接
3. **增量爬取**: 基于历史记录和内容哈希检测变化，避免重复下载
4. **URL 过滤**: 语言优先（英文）、域名边界控制、通用排除规则
5. **资源下载**: 可选下载 CSS/JS/图片等资源，自动重写链接

## 安装

### 环境要求

- Python 3.11+
- pip 或 conda

### 安装步骤

```bash
# 创建虚拟环境（推荐）
python -m venv venv
source venv/Scripts/activate  # Windows
# source venv/bin/activate    # Linux/Mac

# 安装依赖
pip install -r requirements.txt
```

## 快速开始

```bash
# 基本使用
scrapy crawl generic_portal -a url="https://www.example.com/"

# 启用资源下载
scrapy crawl generic_portal -a url="https://www.example.com/" -a download_assets=true

# 强制全量爬取（忽略历史记录）
scrapy crawl generic_portal -a url="https://www.example.com/" -a force_full=true

# 指定输出目录
scrapy crawl generic_portal -a url="https://www.example.com/" -a output_dir="./my_output"

# 指定 sitemap URL
scrapy crawl generic_portal -a url="https://www.example.com/" -a sitemap_url="https://www.example.com/custom_sitemap.xml"

# 查看详细日志
scrapy crawl generic_portal -a url="https://www.example.com/" -L DEBUG
```

## CLI 参数

| 参数 | 必需 | 说明 | 默认值 |
|------|------|------|--------|
| `url` | 是 | 目标网站 URL | - |
| `output_dir` | 否 | 输出目录 | `./output` |
| `force_full` | 否 | 强制全量爬取 | `false` |
| `download_assets` | 否 | 下载资源文件 | `false` |
| `sitemap_url` | 否 | 指定 sitemap URL | 自动发现 |

## 项目结构

```
web_scraper/
├── mainsite_scraper/
│   ├── spiders/
│   │   └── generic_portal.py   # 通用爬虫
│   ├── utils/
│   │   ├── url_filter.py       # URL 过滤（语言/域名/排除规则）
│   │   ├── sitemap_parser.py   # Sitemap 解析
│   │   ├── history_manager.py  # 增量爬取历史管理
│   │   └── content_hash.py     # 内容哈希计算
│   ├── items.py                # WebPageItem 数据结构
│   ├── middlewares.py          # 随机 UserAgent 中间件
│   ├── pipelines.py            # SaveHtmlPipeline
│   └── settings.py             # 爬虫配置
├── scripts/
│   └── clean_history.py        # 历史记录清理脚本
├── tests/                      # 单元测试
│   ├── test_url_filter.py
│   ├── test_sitemap_parser.py
│   ├── test_history_manager.py
│   └── test_content_hash.py
├── output/                     # 输出目录（按域名组织）
├── scrapy.cfg                  # Scrapy 配置
└── requirements.txt            # Python 依赖
```

## 数据流

```
目标 URL → Sitemap 发现 → URL 过滤 → 历史检查 → 页面抓取 → 内容哈希 → HTML 保存
```

### 增量爬取逻辑

1. URL 不在历史 → 新页面 → 爬取
2. URL 在历史 + Sitemap lastmod 更新 → 内容更新 → 爬取
3. URL 在历史 + 无 lastmod + Hash 变化 → 内容更新 → 爬取
4. URL 在历史 + 无变化 → 跳过

## URL 过滤规则

### 语言过滤（优先英文）

- **排除**: `/zh/`、`/cn/`、`/de/`、`zh.`、`cn.` 等非英文路径/子域名
- **保留**: `/en/`、`en.` 或无语言标识

### 域名边界

- **允许**: 目标域名、`www.` 子域名、`en.` 子域名
- **排除**: 其他子域名（`blog.`、`cdn.` 等）

### 通用排除

- WordPress 路径: `/wp-admin/`、`/feed/`、`/attachment/`
- 购物流程: `/cart/`、`/checkout/`
- 文件类型: `.pdf`、`.jpg`、`.png`、`.zip` 等

## 配置说明

编辑 `mainsite_scraper/settings.py` 可以调整以下参数：

```python
# 请求延迟（秒）
DOWNLOAD_DELAY = 3

# 并发请求数
CONCURRENT_REQUESTS = 8

# 输出目录
OUTPUT_DIR = './output'

# 历史记录过期天数
HISTORY_EXPIRE_DAYS = 90

# 遵守 robots.txt
ROBOTSTXT_OBEY = True
```

## 输出结构

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

### 历史记录格式

```json
{
  "site": "example.com",
  "first_crawl": "2026-03-13T10:00:00",
  "last_crawl": "2026-03-13T11:30:00",
  "urls": {
    "https://example.com/": {
      "first_seen": "2026-03-13T10:00:05",
      "content_hash": "sha256:abc123...",
      "local_path": "index.html",
      "last_modified": "2026-03-01"
    }
  }
}
```

## 历史记录清理

```bash
# 列出所有站点
python scripts/clean_history.py --list

# 清理指定站点
python scripts/clean_history.py --site example.com

# 清理所有站点
python scripts/clean_history.py --all

# 清理 30 天前的记录
python scripts/clean_history.py --site example.com --older-than 30

# 只显示不执行（预览）
python scripts/clean_history.py --site example.com --dry-run
```

## 单元测试

```bash
# 运行所有测试
pytest tests/ -v

# 运行单个测试文件
pytest tests/test_url_filter.py -v

# 运行带覆盖率
pytest tests/ -v --cov=mainsite_scraper
```

## 故障排除

### 请求失败

如果出现大量请求失败，可以：

1. 增加请求延迟: `DOWNLOAD_DELAY = 5`
2. 减少并发数: `CONCURRENT_REQUESTS = 4`
3. 检查网络连接
4. 检查目标网站是否封禁

### 文件保存失败

检查：

1. 磁盘空间是否充足
2. 输出目录是否有写入权限
3. 文件名是否包含非法字符

### Sitemap 解析失败

爬虫会自动从首页开始跟随链接，无需手动处理。

## 注意事项

1. **尊重网站**: 请确保爬取行为不影响网站正常运行
2. **法律合规**: 仅用于学习研究，不得用于商业用途
3. **合理使用**: 避免高频请求，已设置请求延迟
4. **数据使用**: 抓取的数据仅限个人学习使用

## 许可声明

本爬虫仅供学习研究使用，请遵守目标网站的robots协议及所有法律法规。不得用于任何商业用途或非法用途。

使用本爬虫所产生的一切后果由使用者自行承担。

---

作者：伍志勇
