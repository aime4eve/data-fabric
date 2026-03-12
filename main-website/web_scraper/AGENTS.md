# PROJECT KNOWLEDGE BASE - Milesight Scraper

**Generated:** 2026-01-20

## OVERVIEW
Python Scrapy web scraper for https://www.milesight.cn/. Saves pages as static HTML, respects robots.txt, rate-limited.

**Legal:** Educational only. Respect robots.txt and all laws. No commercial use.

## STRUCTURE
```
milesight_scraper/
├── scrapy.cfg              # Scrapy config
├── requirements.txt        # Dependencies
├── run.bat / run.sh        # Launch scripts
├── output/                # Saved HTML
└── milesight_scraper/      # Main package
    ├── settings.py         # Config
    ├── items.py           # Data models
    ├── middlewares.py      # UA rotation
    ├── pipelines.py        # HTML saving
    └── spiders/
        └── milesight.py   # Main spider
```

## WHERE TO LOOK
| Task | Location |
|------|----------|
| Change crawl behavior | `settings.py` |
| Modify spider logic | `spiders/milesight.py` |
| Change saving logic | `pipelines.py` |
| Add new spider | `spiders/` |

## CODE MAP
| Symbol | Type | Location | Role |
|--------|------|----------|------|
| MilesightSpider | Class | spiders/milesight.py | Main spider |
| WebPageItem | Class | items.py | Data model |
| SaveHtmlPipeline | Class | pipelines.py | HTML saving |
| RandomUserAgentMiddleware | Class | middlewares.py | UA rotation |

## CONVENTIONS

### File Headers (MANDATORY)
```python
"""
本爬虫仅供学习研究使用，请遵守目标网站的robots协议及所有法律法规。不得用于任何商业用途或非法用途。
"""
```

### Import Order
Standard lib → Third-party → Local

### Naming
- Classes: `PascalCase`
- Functions: `snake_case`
- Private methods: prefix with `_`

### Docstrings
Chinese for all classes and public methods.

### Logging
Use logging module (never print), Chinese comments.

## ANTI-PATTERNS
1. **Never disable robots.txt** - `ROBOTSTXT_OBEY = True`
2. **Never reduce DELAY below 3** - `DOWNLOAD_DELAY >= 3`
3. **Never remove legal disclaimer**
4. **Never use print()** - Use logging
5. **Never skip errback** - Always implement error callbacks

## COMMANDS
```bash
# Install & run
pip install -r requirements.txt
cd milesight_scraper
scrapy crawl milesight

# Custom settings
scrapy crawl milesight -s DOWNLOAD_DELAY=5 -L INFO

# Windows
run.bat

# Linux/Mac
./run.sh
```

## SETTINGS (Key)

| Parameter | Default | Purpose |
|-----------|---------|---------|
| `ROBOTSTXT_OBEY` | `True` | Never change |
| `DOWNLOAD_DELAY` | `3` | Min 3 seconds |
| `OUTPUT_DIR` | `'./output'` | Save location |
| `EXCLUDE_PATTERNS` | `[...]` | URL exclusions |

## PATTERNS

### Spider Request
```python
yield scrapy.Request(url=url, callback=self.parse_page, errback=self.errback)
```

### Pipeline
```python
@classmethod
def from_crawler(cls, crawler):
    return cls(output_dir=crawler.settings.get('OUTPUT_DIR', './output'))
```

### Error Handling
```python
try:
    # operation
    logging.info(f"已保存: {url}")
except Exception as e:
    logging.error(f"保存失败: {e}")
    raise DropItem(f"Failed to save: {url}")
```
