# Scrapy settings for milesight_scraper project
#
# 本爬虫仅供学习研究使用，请遵守目标网站的robots协议及所有法律法规。不得用于任何商业用途或非法用途。

BOT_NAME = 'milesight_scraper'

SPIDER_MODULES = ['milesight_scraper.spiders']
NEWSPIDER_MODULE = 'milesight_scraper.spiders'

# Crawl responsibly by identifying yourself (and your website) on the user-agent
USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

# Obey robots.txt rules
ROBOTSTXT_OBEY = True

# Configure maximum concurrent requests performed by Scrapy (default: 16)
CONCURRENT_REQUESTS = 8

# Configure a delay for requests for the same website (default: 0)
DOWNLOAD_DELAY = 3

# The download delay setting will honor only one of:
CONCURRENT_REQUESTS_PER_DOMAIN = 4

# Disable cookies (enabled by default)
COOKIES_ENABLED = False

# Disable Telnet Console (enabled by default)
TELNETCONSOLE_ENABLED = False

# Override the default request headers:
DEFAULT_REQUEST_HEADERS = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
}

# Enable or disable spider middlewares
SPIDER_MIDDLEWARES = {
    'milesight_scraper.middlewares.MilesightScraperSpiderMiddleware': 543,
}

# Enable or disable downloader middlewares
DOWNLOADER_MIDDLEWARES = {
    'milesight_scraper.middlewares.RandomUserAgentMiddleware': 400,
    'scrapy.downloadermiddlewares.useragent.UserAgentMiddleware': None,
}

# Enable or disable extensions
EXTENSIONS = {
    'scrapy.extensions.telnet.TelnetConsole': None,
}

# Configure item pipelines
ITEM_PIPELINES = {
    'milesight_scraper.pipelines.SaveHtmlPipeline': 300,
}

# Enable and configure the AutoThrottle extension (disabled by default)
AUTOTHROTTLE_ENABLED = True
AUTOTHROTTLE_START_DELAY = 3
AUTOTHROTTLE_MAX_DELAY = 10
AUTOTHROTTLE_TARGET_CONCURRENCY = 4.0
AUTOTHROTTLE_DEBUG = False

# Enable and configure HTTP caching (disabled by default)
HTTPCACHE_ENABLED = False

# Retry settings
RETRY_ENABLED = True
RETRY_TIMES = 3
RETRY_HTTP_CODES = [500, 502, 503, 504, 522, 524, 408, 429]

# Depth limit
DEPTH_LIMIT = 0

# Custom settings
ALLOWED_DOMAINS = ['www.milesight.cn', 'milesight.cn']

# Output directory for saved HTML files
OUTPUT_DIR = './output'

# URL patterns to exclude
EXCLUDE_PATTERNS = [
    r'/wp-admin/',
    r'/wp-content/',
    r'/wp-includes/',
    r'/feed',
    r'/attachment/',
    r'/m/',
    r'/comment-page-',
    r'\?replytocom=',
    r'\?s=',
    r'/category/[^/]+/page/',
    r'/tag/[^/]+/page/',
]

# File size limit in bytes (skip very large files like PDFs, videos)
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# Follow links settings
FOLLOW_LINKS = True
