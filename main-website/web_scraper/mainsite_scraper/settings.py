# Scrapy settings for generic_portal_scraper project
#
# 本爬虫仅供学习研究使用，请遵守目标网站的robots协议及所有法律法规。不得用于任何商业用途或非法用途。
#
# 通用企业门户网站爬虫配置
# 作者：伍志勇

BOT_NAME = 'generic_portal_scraper'

SPIDER_MODULES = ['mainsite_scraper.spiders']
NEWSPIDER_MODULE = 'mainsite_scraper.spiders'

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
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
}

# Enable or disable spider middlewares
SPIDER_MIDDLEWARES = {
    'mainsite_scraper.middlewares.GenericPortalSpiderMiddleware': 543,
}

# Enable or disable downloader middlewares
DOWNLOADER_MIDDLEWARES = {
    'mainsite_scraper.middlewares.RandomUserAgentMiddleware': 400,
    'scrapy.downloadermiddlewares.useragent.UserAgentMiddleware': None,
}

# Enable or disable extensions
EXTENSIONS = {
    'scrapy.extensions.telnet.TelnetConsole': None,
}

# Configure item pipelines
ITEM_PIPELINES = {
    'mainsite_scraper.pipelines.SaveHtmlPipeline': 300,
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

# Depth limit (0 = unlimited)
DEPTH_LIMIT = 0

# ============================================================
# 通用爬虫配置（不再硬编码特定域名）
# ============================================================

# Output directory for saved HTML files
OUTPUT_DIR = './output'

# History expire days (for incremental crawling)
HISTORY_EXPIRE_DAYS = 90

# File size limit in bytes (skip very large files like PDFs, videos)
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# Follow links settings
FOLLOW_LINKS = True

# ============================================================
# URL 过滤配置
# ============================================================

# 语言排除模式（路径前缀和子域名）
LANGUAGE_EXCLUDE_PATTERNS = [
    # 路径前缀
    r'^/zh/', r'^/cn/', r'^/de/', r'^/fr/', r'^/ja/', r'^/ko/',
    r'^/es/', r'^/pt/', r'^/ru/', r'^/ar/', r'^/it/', r'^/nl/',
    # 子域名
    r'^https?://zh\.', r'^https?://cn\.', r'^https?://de\.',
    r'^https?://fr\.', r'^https?://ja\.', r'^https?://ko\.',
]

# 通用排除模式
EXCLUDE_PATTERNS = [
    # WordPress
    r'/wp-admin/',
    r'/wp-content/',
    r'/wp-includes/',
    r'/feed',
    r'/attachment/',
    r'/comment-page-',
    r'\?replytocom=',
    # 搜索
    r'\?s=',
    # 分页
    r'/page/\d+',
    r'/category/[^/]+/page/',
    r'/tag/[^/]+/page/',
    # 移动端
    r'/m/',
    # 购物车/结账
    r'/cart',
    r'/checkout',
    r'/basket',
    # 其他
    r'/print/',
    r'/pdf/',
    r'\?print=',
    r'\?pdf=',
]

# 排除的文件扩展名
EXCLUDE_EXTENSIONS = [
    '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.ico', '.webp', '.bmp',
    '.css', '.js', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm',
    '.mp3', '.wav', '.ogg', '.flac',
    '.zip', '.rar', '.7z', '.tar', '.gz',
    '.exe', '.dmg', '.pkg', '.apk', '.ipa',
    '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.json', '.xml', '.rss', '.atom',
]
