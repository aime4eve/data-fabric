"""
本爬虫仅供学习研究使用，请遵守目标网站的robots协议及所有法律法规。不得用于任何商业用途或非法用途。
"""

import scrapy


class MilesightScraperSpider(scrapy.Spider):
    name = 'milesight_scraper'
    allowed_domains = ['www.milesight.cn']
    start_urls = ['https://www.milesight.cn/']

    def parse(self, response):
        pass
