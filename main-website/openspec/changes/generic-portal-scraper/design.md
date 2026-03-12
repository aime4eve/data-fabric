# Technical Design: Generic Portal Scraper

## Context

### 当前状态

现有 `milesight.py` 是 Milesight 网站专用爬虫：

```
milesight.py
├── 硬编码域名: ['www.milesight.cn', 'milesight.cn']
├── 硬编码 sitemap: ['https://www.milesight.cn/sitemap.xml']
├── WordPress 专用排除规则: /wp-admin/, /feed/, /attachment/...
└── 无增量爬取支持

pipelines.py
├── 硬编码域名检查 (milesight.cn)
├── 特定路径资源下载 (/lorawan/node/ws50x/)
└── 无历史记录
```

### 约束

- 目标网站：企业门户网站（几十到几千页）
- Scrapy 框架：保持现有架构
- 向后兼容：CLI 接口变更，但功能覆盖原版

## Goals / Non-Goals

**Goals:**

1. 通用化：通过参数传入任意门户 URL 即可爬取
2. 增量爬取：检测新页面和内容更新，避免重复下载
3. 语言过滤：优先爬取英文页面
4. 子域名隔离：不同子域名独立爬取任务
5. 资源完整：下载 CSS/JS/图片/字体，重写链接

**Non-Goals:**

1. 不支持需要登录的页面
2. 不支持 JavaScript 渲染（纯静态 HTML 爬取）
3. 不支持大规模爬取（百万页级别）
4. 不支持非企业门户类型网站（电商、社交等）

## Decisions

### D1: URL 发现策略

**决策**：Sitemap 优先 + 链接发现兜底

```
┌─────────────────┐     ┌─────────────────┐
│ 尝试 sitemap.xml │────▶│ 存在 → 解析 URL  │
└─────────────────┘     └────────┬────────┘
                                 │
                        ┌────────┴────────┐
                        │ 不存在          │
                        ▼                 │
                ┌─────────────────┐       │
                │ CrawlSpider     │       │
                │ 从首页跟随链接   │◀──────┘
                └─────────────────┘
```

**备选方案**：
- A) 仅 Sitemap → 简单但覆盖率低
- B) 仅链接发现 → 可能爬到不需要的页面
- C) 混合模式（选中）→ 最佳覆盖率

### D2: 语言过滤策略

**决策**：路径前缀 + 子域名黑名单

排除模式：
```python
LANGUAGE_EXCLUDE_PATTERNS = [
    # 路径前缀
    r'^/zh/', r'^/cn/', r'^/de/', r'^/fr/', r'^/ja/', r'^/ko/',
    r'^/es/', r'^/pt/', r'^/ru/', r'^/ar/', r'^/it/',
    # 子域名
    r'^https?://zh\.', r'^https?://cn\.', r'^https?://de\.',
    # ... 其他语言子域名
]
```

保留模式：
```python
LANGUAGE_INCLUDE_PATTERNS = [
    r'^/en/', r'^/english/',
    r'^https?://en\.',
    # 无语言标识的默认保留
]
```

**备选方案**：
- A) 检测 `<html lang="...">` → 需要下载页面后才能判断，效率低
- B) URL 模式匹配（选中）→ 在 URL 层面过滤，效率高

### D3: 增量爬取策略

**决策**：URL 历史 + 内容 Hash + Sitemap lastmod

```json
// crawl_history.json
{
  "site": "example.com",
  "first_crawl": "2026-03-01T10:00:00+08:00",
  "last_crawl": "2026-03-12T15:30:00+08:00",
  "urls": {
    "https://example.com/products/": {
      "first_seen": "2026-03-01T10:00:05+08:00",
      "content_hash": "sha256:abc123...",
      "local_path": "products/index.html"
    }
  }
}
```

爬取判断逻辑：
```
1. URL 不在历史 → 新页面 → 爬取
2. URL 在历史 + Sitemap lastmod 更新 → 内容更新 → 爬取
3. URL 在历史 + 无 lastmod + Hash 变化 → 内容更新 → 爬取
4. URL 在历史 + 无变化 → 跳过
```

**备选方案**：
- A) 仅文件存在性检查 → 无法检测内容更新
- B) 仅 Sitemap lastmod → 依赖 sitemap 质量
- C) 混合模式（选中）→ 最可靠

### D4: 历史记录过期

**决策**：3 个月自动过期 + 手动清理命令

```bash
# 自动过期：历史记录超过 90 天的条目自动清理
# 手动清理：
python scripts/clean_history.py --site example.com      # 清理指定站点
python scripts/clean_history.py --all                   # 清理所有
python scripts/clean_history.py --older-than 30         # 清理 30 天前的
```

### D5: 输出目录结构

**决策**：按域名分目录

```
output/
├── example.com/
│   ├── crawl_history.json
│   ├── index.html
│   ├── products/
│   │   └── *.html
│   └── _assets/
│       └── css/js/img/...
├── blog.example.com/          # 子域名独立
│   └── ...
└── www.milesight.com/
    └── ...
```

### D6: 域名边界控制

**决策**：主域名 + www + en 子域名

```python
def get_allowed_domains(target_url):
    root = extract_root_domain(target_url)  # example.com
    return [
        root,                    # example.com
        f'www.{root}',           # www.example.com
        f'en.{root}',            # en.example.com
    ]
```

排除：
- 非 en 子域名（zh.*, de.* 等）
- 外部域名
- 资源域名（cdn.* → 只下载资源不爬页面）

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              模块架构                                        │
└─────────────────────────────────────────────────────────────────────────────┘

generic_portal.py (Spider)
        │
        ├──▶ url_filter.py
        │       ├── is_allowed_domain(url)
        │       ├── is_english_url(url)
        │       └── should_exclude(url)
        │
        ├──▶ sitemap_parser.py
        │       ├── parse_sitemap(url)
        │       └── get_urls_with_lastmod(url)
        │
        └──▶ history_manager.py
                ├── load_history(domain)
                ├── is_new_or_updated(url, lastmod)
                ├── update_history(url, hash, path)
                └── cleanup_expired(days=90)

pipelines.py
        │
        ├──▶ content_hash.py
        │       └── compute_hash(html)
        │
        └──▶ asset_downloader.py (内联)
                ├── download_assets(html, base_url)
                └── rewrite_links(html, local_paths)
```

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Sitemap 质量差 | 遗漏页面 | 链接发现兜底 |
| 语言误判 | 爬取非英文页面 | 可配置白名单/黑名单 |
| Hash 计算开销 | 大站点慢 | 仅对 HTML 计算哈希 |
| 资源下载失败 | 页面显示异常 | 记录失败，保留原链接 |
| robots.txt 禁止 | 无法爬取 | 遵守协议，记录原因 |

## Migration Plan

### 阶段 1：新增通用模块

1. 创建 `utils/` 目录及工具模块
2. 创建 `generic_portal.py` 爬虫
3. 重构 `pipelines.py`

### 阶段 2：验证

1. 用 Milesight 网站测试（回归测试）
2. 用其他企业网站测试（通用性测试）
3. 验证增量爬取

### 阶段 3：清理

1. 删除 `milesight.py`
2. 更新 `settings.py`
3. 创建清理脚本

### 回滚策略

如果通用版出现问题：
```bash
git revert <commit>  # 回滚到原版
scrapy crawl milesight  # 原版仍可使用（回滚后）
```

## Open Questions

1. **多语言默认页面**：部分网站默认语言不是英文，是否需要额外检测？
   - 当前方案：爬取后让用户判断
   - 备选：检测 `<html lang="en">` 属性

2. **深度限制**：链接发现模式下是否需要深度限制？
   - 当前方案：无限制（企业站规模可控）
   - 备选：默认 3 层，可配置
