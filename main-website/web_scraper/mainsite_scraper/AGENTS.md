# PACKAGE INTERNALS - milesight_scraper

## OVERVIEW
Core Scrapy package with spider, pipeline, middleware implementations.

## STRUCTURE
```
items.py          # Data models
middlewares.py    # UA rotation
pipelines.py      # HTML saving
settings.py       # Scrapy config
spiders/milesight.py  # Main spider
```

## WHERE TO LOOK
| Module | Purpose | Key |
|--------|---------|------|
| `items.py` | Data structures | `WebPageItem` |
| `middlewares.py` | UA middleware | `RandomUserAgentMiddleware` |
| `pipelines.py` | Save HTML | `SaveHtmlPipeline` |
| `settings.py` | Config | `EXCLUDE_PATTERNS`, `OUTPUT_DIR` |
| `spiders/milesight.py` | Crawling | `MilesightSpider` |

## MODULE ROLES

**items.py** - `WebPageItem`: url, html, local_path, depth, title

**middlewares.py**
- `RandomUserAgentMiddleware` - Rotates 6 predefined UAs

**pipelines.py** - `SaveHtmlPipeline`
- Saves HTML to `OUTPUT_DIR`
- Converts relative → absolute links
- Filters duplicates

**settings.py**
- Never touch: `ROBOTSTXT_OBEY`, `DOWNLOAD_DELAY`, `COOKIES_ENABLED`
- Custom: `OUTPUT_DIR`, `EXCLUDE_PATTERNS`, `ALLOWED_DOMAINS`

**spiders/milesight.py** - `MilesightSpider`
- Fetches sitemap.xml → extracts URLs
- Non-recursive crawling (depth=0)
- Filters by domain, regex, file extension

## DATA FLOW
```
sitemap → extract URLs → fetch pages → WebPageItem → SaveHtmlPipeline → disk
```

## MODIFICATION POINTS

**Add exclusion pattern:**
```python
# settings.py
EXCLUDE_PATTERNS = [..., r'/pattern/']

# spiders/milesight.py
self.exclude_patterns = [..., r'/pattern/']
```

**Change User-Agents:**
```python
# middlewares.py
USER_AGENTS = ['UA1', 'UA2', ...]
```

**Modify link fixing:**
```python
# pipelines.py, _fix_html_links()
patterns = [(r'pattern', lambda m: ...)]
```

## ANTI-PATTERNS
- Don't disable robots.txt or reduce DELAY below 3
- Don't skip errback in Requests
- Don't use print(), use logging
- Don't remove legal disclaimer
- Don't hardcode URLs
