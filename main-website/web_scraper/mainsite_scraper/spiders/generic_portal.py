"""
通用企业门户网站爬虫

通过 CLI 参数接收目标网站 URL，支持：
- Sitemap 优先 + 链接发现兜底
- 增量爬取（基于历史记录和内容哈希）
- URL 过滤（语言优先、域名边界、排除规则）

作者：伍志勇
"""

import scrapy
import re
import logging
import urllib.parse
from typing import Generator, Any

from mainsite_scraper.items import WebPageItem
from mainsite_scraper.utils.url_filter import (
    is_allowed_domain,
    is_english_url,
    should_exclude,
    get_allowed_domains,
    filter_url,
)
from mainsite_scraper.utils.history_manager import (
    load_history,
    save_history,
    is_new_or_updated,
    update_history,
    cleanup_expired,
    CrawlHistory,
)
from mainsite_scraper.utils.sitemap_parser import (
    parse_sitemap,
    get_urls_with_lastmod,
    is_sitemap_index,
)
from mainsite_scraper.utils.content_hash import compute_hash

logger = logging.getLogger(__name__)


class GenericPortalSpider(scrapy.Spider):
    """通用企业门户网站爬虫"""

    name = 'generic_portal'

    custom_settings = {
        'DEPTH_LIMIT': 0,  # 不限制深度
        'DOWNLOAD_DELAY': 3,
    }

    def __init__(self, *args, **kwargs):
        super(GenericPortalSpider, self).__init__(*args, **kwargs)

        # 解析 CLI 参数
        self.target_url = kwargs.get('url') or kwargs.get('target_url')
        self.output_dir = kwargs.get('output_dir', './output')
        self.force_full = kwargs.get('force_full', 'false').lower() == 'true'
        self.download_assets = kwargs.get('download_assets', 'false').lower() == 'true'

        if not self.target_url:
            raise ValueError("必须提供 --url 参数")

        # 解析目标域名
        parsed = urllib.parse.urlparse(self.target_url)
        self.target_domain = parsed.netloc.lower()
        if self.target_domain.startswith('www.'):
            self.target_domain = self.target_domain[4:]

        # 获取允许的域名列表
        self.allowed_domains = get_allowed_domains(self.target_url)

        # 加载爬取历史
        self.history = load_history(self.target_domain, self.output_dir)

        # 清理过期历史
        expired_count = cleanup_expired(self.history, days=90)
        if expired_count > 0:
            logger.info(f"清理了 {expired_count} 条过期历史记录")

        # 已访问的 URL 集合
        self.visited_urls = set()

        # Sitemap URL
        sitemap_url = kwargs.get('sitemap_url')
        if sitemap_url:
            self.sitemap_urls = [sitemap_url]
        else:
            # 尝试常见的 sitemap 路径
            base_url = f"{parsed.scheme}://{parsed.netloc}"
            self.sitemap_urls = [
                f"{base_url}/sitemap.xml",
                f"{base_url}/sitemap_index.xml",
            ]

        logger.info(f"目标域名: {self.target_domain}")
        logger.info(f"允许域名: {self.allowed_domains}")
        logger.info(f"输出目录: {self.output_dir}")
        logger.info(f"强制全量: {self.force_full}")

    def start_requests(self) -> Generator[scrapy.Request, None, None]:
        """从 sitemap 开始爬取，失败则从首页跟随链接"""

        # 首先尝试 sitemap
        for sitemap_url in self.sitemap_urls:
            yield scrapy.Request(
                url=sitemap_url,
                callback=self.parse_sitemap,
                errback=self.errback,
                meta={'sitemap_attempt': True},
                dont_filter=True,
            )

    def parse_sitemap(self, response) -> Generator[scrapy.Request | dict, None, None]:
        """解析 sitemap 并过滤 URL"""

        sitemap_url = response.url
        logger.info(f"解析 sitemap: {sitemap_url}")

        # 检查是否为 sitemap 索引
        if is_sitemap_index(sitemap_url, response.text):
            logger.info(f"发现 sitemap 索引: {sitemap_url}")
            # 提取子 sitemap URL
            for sub_sitemap_url in self._extract_sitemap_urls(response.text):
                yield scrapy.Request(
                    url=sub_sitemap_url,
                    callback=self.parse_sitemap,
                    errback=self.errback,
                    dont_filter=True,
                )
        else:
            # 解析标准 sitemap
            url_map = get_urls_with_lastmod(sitemap_url, response.text)
            logger.info(f"从 sitemap 获取 {len(url_map)} 个 URL")

            for url, lastmod in url_map.items():
                should_crawl, reason = self._should_crawl(url, lastmod)
                if should_crawl:
                    yield scrapy.Request(
                        url=url,
                        callback=self.parse_page,
                        errback=self.errback,
                        meta={'lastmod': lastmod, 'source': 'sitemap'}
                    )
                else:
                    logger.debug(f"跳过 URL ({reason}): {url}")

    def parse_page(self, response) -> Generator[dict | scrapy.Request, None, None]:
        """解析页面并提取内容"""

        url = response.url

        # 检查是否已访问
        if url in self.visited_urls:
            logger.debug(f"已跳过重复 URL: {url}")
            return

        self.visited_urls.add(url)

        # 检查内容类型
        content_type = response.headers.get('Content-Type', b'').decode('utf-8', errors='ignore')
        if 'text/html' not in content_type:
            logger.debug(f"跳过非 HTML 内容: {url}")
            return

        # 提取页面标题
        title = response.css('title::text').get('').strip()
        if not title:
            title = response.css('h1::text').get('').strip()

        # 计算内容哈希
        content_hash = compute_hash(response.text)

        # 获取 lastmod
        lastmod = response.meta.get('lastmod')

        # 更新历史记录
        update_history(
            self.history,
            url,
            content_hash,
            None,  # local_path 将在 pipeline 中设置
            lastmod
        )

        # 创建 Item
        item = WebPageItem()
        item['url'] = url
        item['html'] = response.text
        item['depth'] = response.meta.get('depth', 0)
        item['title'] = title
        item['content_hash'] = content_hash
        item['domain'] = self.target_domain
        item['download_assets'] = self.download_assets

        logger.info(f"处理页面: {url} - {title}")

        yield item

    def _should_crawl(self, url: str, lastmod: str | None = None) -> tuple[bool, str]:
        """
        判断 URL 是否应该被爬取。

        Args:
            url: 要检查的 URL
            lastmod: sitemap lastmod 时间戳

        Returns:
            tuple[bool, str]: (是否爬取, 原因)
        """
        # 检查 URL 过滤规则
        valid, reason = filter_url(url, self.target_domain)
        if not valid:
            return False, reason

        # 如果强制全量爬取，跳过历史检查
        if self.force_full:
            return True, "强制全量爬取"

        # 检查是否为新页面或已更新
        is_new, history_reason = is_new_or_updated(url, lastmod, self.history)
        if not is_new:
            return False, history_reason

        return True, "需要爬取"

    def _extract_sitemap_urls(self, sitemap_text: str) -> list[str]:
        """从 sitemap 索引中提取子 sitemap URL"""
        import xml.etree.ElementTree as ET

        urls = []
        try:
            root = ET.fromstring(sitemap_text)
            # 获取命名空间
            ns = {}
            if root.tag.startswith('{'):
                ns_uri = root.tag[1:root.tag.index('}')]
                ns = {'ns': ns_uri}

            # 提取 sitemap loc
            if ns:
                sitemaps = root.findall('ns:sitemap/ns:loc', ns)
            else:
                sitemaps = root.findall('.sitemap/loc')

            for sitemap in sitemaps:
                if sitemap.text:
                    urls.append(sitemap.text.strip())
        except Exception as e:
            logger.error(f"解析 sitemap 索引失败: {e}")

        return urls

    def errback(self, failure):
        """处理请求失败"""
        request = failure.request

        # 如果是 sitemap 请求失败，尝试从首页开始
        if request.meta.get('sitemap_attempt'):
            logger.warning(f"Sitemap 请求失败: {request.url}, 从首页开始爬取")
            yield scrapy.Request(
                url=self.target_url,
                callback=self.parse_page,
                errback=self.errback,
                meta={'source': 'fallback'}
            )
        else:
            logger.error(f"请求失败: {request.url}, 错误: {failure.value}")

    def closed(self, reason):
        """爬虫结束时保存历史记录"""
        save_history(self.history, self.output_dir)
        logger.info(f"爬虫结束，保存历史记录: {self.target_domain}")
