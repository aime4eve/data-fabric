# Milesight网站静态HTML保存爬虫

本爬虫仅供学习研究使用，请遵守目标网站的robots协议及所有法律法规。不得用于任何商业用途或非法用途。

## 项目说明

这是一个用于抓取 https://www.milesight.cn/ 网站并保存为本地静态HTML文件的Scrapy爬虫项目。爬虫会：

1. 从网站的sitemap.xml获取所有公开页面URL
2. 下载每个页面的HTML内容
3. 保存为本地静态HTML文件，保持网站的组织结构
4. 自动修正HTML中的相对链接为绝对链接

## robots.txt分析

目标网站 robots.txt 允许爬取的范围：

- ✅ **允许**: 所有公开页面（除以下禁用路径）
- ❌ **禁止**:
  - `/wp-admin/` - 管理后台
  - `/wp-content/` - WordPress内容目录
  - `/wp-includes/` - WordPress核心文件
  - `/feed` - RSS feeds
  - `/attachment/` - 附件页面
  - `/m/` - 移动版页面
  - `/comment-page-*` - 评论分页
  - `/category/*/page/` - 分类分页
  - `/tag/*/page/` - 标签分页
  - `/attachment/` - 附件
  - 搜索页面
  - trackback

## 技术特点

- ✅ 遵守robots.txt协议
- ⏱️ 请求间隔: 3秒（可调整）
- 🔄 随机User-Agent轮换
- 🚫 自动排除管理后台、附件等非公开内容
- 📦 自动将相对链接转换为绝对链接
- 🗂️ 保持网站目录结构
- 🛡️ 完整的异常处理和日志记录

## 安装依赖

```bash
pip install scrapy requests user-agents
```

## 项目结构

```
milesight_scraper/
├── milesight_scraper/
│   ├── __init__.py
│   ├── items.py          # 数据项定义
│   ├── middlewares.py    # 中间件（随机UA等）
│   ├── pipelines.py      # 管道（保存HTML文件）
│   ├── settings.py       # 爬虫配置
│   └── spiders/
│       ├── __init__.py
│       └── milesight.py  # 主爬虫
└── output/               # 输出目录（自动创建）
```

## 运行爬虫

### 基本运行

```bash
cd milesight_scraper
scrapy crawl milesight
```

### 查看详细日志

```bash
scrapy crawl milesight -L INFO
```

### 保存日志到文件

```bash
scrapy crawl milesight -L INFO 2>&1 | tee crawl.log
```

## 配置说明

编辑 `milesight_scraper/settings.py` 可以调整以下参数：

```python
# 请求延迟（秒）
DOWNLOAD_DELAY = 3

# 并发请求数
CONCURRENT_REQUESTS = 8

# 输出目录
OUTPUT_DIR = './output'

# 排除的URL模式
EXCLUDE_PATTERNS = [
    r'/wp-admin/',
    r'/wp-content/',
    ...
]
```

## 输出说明

爬取的HTML文件将保存在 `output/` 目录下，目录结构保持与网站一致：

```
output/
├── index.html                      # 首页
├── products/                       # 产品中心
│   ├── index.html
│   └── ...
├── solutions/                      # 解决方案
│   ├── index.html
│   └── ...
├── success-stories/                # 成功案例
│   └── ...
└── ...
```

所有HTML文件中的相对链接都会自动转换为绝对链接，可以直接在浏览器中打开浏览。

## 注意事项

1. **尊重网站**: 请确保爬取行为不影响网站正常运行
2. **法律合规**: 仅用于学习研究，不得用于商业用途
3. **合理使用**: 避免高频请求，已设置请求延迟
4. **数据使用**: 抓取的数据仅限个人学习使用

## 故障排除

### 请求失败

如果出现大量请求失败，可以：

1. 增加请求延迟：`DOWNLOAD_DELAY = 5`
2. 减少并发数：`CONCURRENT_REQUESTS = 4`
3. 检查网络连接

### 文件保存失败

检查：

1. 磁盘空间是否充足
2. 输出目录是否有写入权限
3. 文件名是否包含非法字符

## 许可声明

本爬虫仅供学习研究使用，请遵守目标网站的robots协议及所有法律法规。不得用于任何商业用途或非法用途。

使用本爬虫所产生的一切后果由使用者自行承担。
