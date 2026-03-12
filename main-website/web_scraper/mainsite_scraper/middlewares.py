"""
本爬虫仅供学习研究使用，请遵守目标网站的robots协议及所有法律法规。不得用于任何商业用途或非法用途。
"""

from scrapy import signals
import logging
from user_agents import parse
import random


class MilesightScraperSpiderMiddleware:
    """爬虫中间件"""

    @classmethod
    def from_crawler(cls, crawler):
        s = cls()
        crawler.signals.connect(s.spider_opened, signal=signals.spider_opened)
        return s

    def process_spider_input(self, response):
        return None

    def process_spider_output(self, response, result):
        for i in result:
            yield i

    def process_spider_exception(self, response, exception):
        logging.error(f"Spider exception: {exception}")
        return None

    def spider_opened(self, spider):
        logging.info(f'Spider opened: {spider.name}')


class RandomUserAgentMiddleware:
    """随机User-Agent中间件"""
    
    USER_AGENTS = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ]
    
    def process_request(self, request):
        """为每个请求添加随机User-Agent"""
        request.headers['User-Agent'] = random.choice(self.USER_AGENTS)
        return None
