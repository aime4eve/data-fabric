"""
本爬虫仅供学习研究使用，请遵守目标网站的robots协议及所有法律法规。不得用于任何商业用途或非法用途。
"""

import scrapy
import re
import logging
import urllib.parse
from milesight_scraper.items import WebPageItem


class MilesightSpider(scrapy.Spider):
    """Milesight网站静态HTML保存爬虫"""
    
    name = 'milesight'
    allowed_domains = ['www.milesight.cn', 'milesight.cn']
    
    custom_settings = {
        'DEPTH_LIMIT': 0,  # 不进行深度爬取，所有URL都从sitemap获取
        'DOWNLOAD_DELAY': 3,
    }
    
    def __init__(self, *args, **kwargs):
        super(MilesightSpider, self).__init__(*args, **kwargs)
        self.target_url = kwargs.get('target_url')
        
        # 要排除的URL模式
        self.exclude_patterns = [
            r'/wp-admin/',
            r'/wp-content/',
            r'/wp-includes/',
            r'/feed',
            r'/attachment/',
            r'/m/',
            r'/comment-page-',
            r'\?replytocom=',
            r'\?s=',
            r'/category/[^/]+/page/\d+',
            r'/tag/[^/]+/page/\d+',
        ]
        
        # 已访问的URL集合
        self.visited_urls = set()
        
        # 站点地图URL
        self.sitemap_urls = [
            'https://www.milesight.cn/sitemap.xml',
        ]
    
    def start_requests(self):
        """从站点地图开始爬取"""
        if self.target_url:
            yield scrapy.Request(
                url=self.target_url,
                callback=self.parse_page,
                errback=self.errback,
                meta={'depth': 0}
            )
            return
        for sitemap_url in self.sitemap_urls:
            yield scrapy.Request(
                url=sitemap_url,
                callback=self.parse_sitemap,
                errback=self.errback,
            )
    
    def parse_sitemap(self, response):
        """解析站点地图，获取所有URL"""
        
        logging.info(f"正在解析站点地图: {response.url}")
        
        # 提取所有的sitemap链接
        sitemap_links = response.xpath('//*[local-name()="sitemap"]/*[local-name()="loc"]/text()').getall()
        
        if sitemap_links:
            logging.info(f"找到 {len(sitemap_links)} 个子站点地图")
            for sitemap_link in sitemap_links:
                yield scrapy.Request(
                    url=sitemap_link,
                    callback=self.parse_sub_sitemap,
                    errback=self.errback,
                )
        else:
            # 如果没有子站点地图，直接解析URL
            urls = response.xpath('//*[local-name()="url"]/*[local-name()="loc"]/text()').getall()
            logging.info(f"从站点地图找到 {len(urls)} 个URL")
            for url in urls:
                if self._should_crawl(url):
                    yield scrapy.Request(
                        url=url,
                        callback=self.parse_page,
                        errback=self.errback,
                        meta={'depth': 0}
                    )
    
    def parse_sub_sitemap(self, response):
        """解析子站点地图"""
        
        logging.info(f"正在解析子站点地图: {response.url}")
        
        # 提取所有URL
        urls = response.xpath('//*[local-name()="url"]/*[local-name()="loc"]/text()').getall()
        logging.info(f"从子站点地图找到 {len(urls)} 个URL")
        
        for url in urls:
            if self._should_crawl(url):
                yield scrapy.Request(
                    url=url,
                    callback=self.parse_page,
                    errback=self.errback,
                    meta={'depth': 0}
                )
    
    def parse_page(self, response):
        """解析并保存每个页面"""
        
        url = response.url
        
        # 检查是否已访问
        if url in self.visited_urls:
            logging.debug(f"已跳过重复URL: {url}")
            return
        
        self.visited_urls.add(url)
        
        # 检查内容类型
        content_type = response.headers.get('Content-Type', b'').decode('utf-8', errors='ignore')
        if 'text/html' not in content_type:
            logging.debug(f"跳过非HTML内容: {url} (Content-Type: {content_type})")
            return
        
        # 提取页面标题
        title = response.css('title::text').get('').strip()
        if not title:
            title = response.css('h1::text').get('').strip()
        
        # 创建Item
        item = WebPageItem()
        item['url'] = url
        item['html'] = response.text
        item['depth'] = response.meta.get('depth', 0)
        item['title'] = title
        
        logging.info(f"正在处理: {url} - {title}")
        
        yield item
    
    def _should_crawl(self, url: str) -> bool:
        """判断URL是否应该被爬取"""
        
        # 必须是允许的域名
        parsed = urllib.parse.urlparse(url)
        if parsed.netloc not in self.allowed_domains:
            return False
        
        # 检查排除模式
        for pattern in self.exclude_patterns:
            if re.search(pattern, url):
                logging.debug(f"排除URL (匹配模式 {pattern}): {url}")
                return False
        
        # 排除文件类型（不下载PDF、图片等大文件）
        exclude_extensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.ico', 
                            '.css', '.js', '.mp4', '.avi', '.mov', '.zip', '.rar', 
                            '.exe', '.dmg', '.pkg']
        for ext in exclude_extensions:
            if url.lower().endswith(ext):
                logging.debug(f"排除URL (文件类型 {ext}): {url}")
                return False
        
        return True
    
    def errback(self, failure):
        """处理请求失败"""
        request = failure.request
        logging.error(f"请求失败: {request.url}, 错误: {failure.value}")
