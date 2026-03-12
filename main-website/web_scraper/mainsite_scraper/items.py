# Scrapy items for milesight_scraper project
#
# 本爬虫仅供学习研究使用，请遵守目标网站的robots协议及所有法律法规。不得用于任何商业用途或非法用途。

import scrapy


class WebPageItem(scrapy.Item):
    """保存网页的Item"""
    
    url = scrapy.Field()
    """网页的原始URL"""
    
    html = scrapy.Field()
    """网页的HTML内容"""
    
    local_path = scrapy.Field()
    """本地保存的文件路径"""
    
    depth = scrapy.Field()
    """爬取深度"""
    
    title = scrapy.Field()
    """网页标题"""
