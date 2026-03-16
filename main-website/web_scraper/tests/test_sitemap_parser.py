"""
Sitemap 解析模块单元测试

作者：伍志勇
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'mainsite_scraper'))

from utils.sitemap_parser import (
    parse_sitemap,
    get_urls_with_lastmod,
    is_sitemap_index,
    parse_lastmod,
    SitemapUrl,
)


# 标准 sitemap XML 示例
STANDARD_SITEMAP = '''<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2026-03-01</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://example.com/products/</loc>
    <lastmod>2026-03-10</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://example.com/about/</loc>
    <lastmod>2026-02-15</lastmod>
  </url>
</urlset>
'''

# Sitemap 索引示例
SITEMAP_INDEX = '''<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://example.com/sitemap-products.xml</loc>
    <lastmod>2026-03-01</lastmod>
  </urlset>
</urlset>
'''

# 无命名空间的 sitemap
NO_NS_SITEMAP = '''<?xml version="1.0" encoding="UTF-8"?>
<urlset>
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2026-03-01</lastmod>
  </url>
  <url>
    <loc>https://example.com/products/</loc>
  </url>
</urlset>
'''


class TestParseSitemap:
    """测试 parse_sitemap 函数"""

    def test_standard_sitemap(self):
        """测试标准 sitemap 解析"""
        urls = list(parse_sitemap('https://example.com/sitemap.xml', STANDARD_SITEMAP))
        assert len(urls) == 3
        assert urls[0].url == 'https://example.com/'
        assert urls[0].lastmod == '2026-03-01'
        assert urls[0].priority == 1.0

    def test_no_namespace_sitemap(self):
        """测试无命名空间的 sitemap"""
        urls = list(parse_sitemap('https://example.com/sitemap.xml', NO_NS_SITEMAP))
        assert len(urls) == 2
        assert urls[0].url == 'https://example.com/'

    def test_invalid_xml(self):
        """测试无效 XML"""
        urls = list(parse_sitemap('https://example.com/sitemap.xml', 'not xml'))
        assert len(urls) == 0


class TestGetUrlsWithLastmod:
    """测试 get_urls_with_lastmod 函数"""

    def test_urls_with_lastmod(self):
        """测试获取 URL 和 lastmod"""
        url_map = get_urls_with_lastmod('https://example.com/sitemap.xml', STANDARD_SITEMAP)
        assert 'https://example.com/' in url_map
        assert url_map['https://example.com/'] == '2026-03-01'
        assert 'https://example.com/products/' in url_map
        assert url_map['https://example.com/products/'] == '2026-03-10'

    def test_url_without_lastmod(self):
        """测试没有 lastmod 的 URL"""
        url_map = get_urls_with_lastmod('https://example.com/sitemap.xml', STANDARD_SITEMAP)
        # about 页面没有 lastmod
        assert url_map.get('https://example.com/about/') is None


class TestIsSitemapIndex:
    """测试 is_sitemap_index 函数"""

    def test_is_index(self):
        """测试 sitemap 索引"""
        assert is_sitemap_index('https://example.com/sitemap.xml', SITEMAP_INDEX) is True

    def test_is_not_index(self):
        """测试标准 sitemap"""
        assert is_sitemap_index('https://example.com/sitemap.xml', STANDARD_SITEMAP) is False


class TestParseLastmod:
    """测试 parse_lastmod 函数"""

    def test_date_only(self):
        """测试日期格式"""
        dt = parse_lastmod('2026-03-01')
        assert dt is not None
        assert dt.year == 2026
        assert dt.month == 3
        assert dt.day == 1

    def test_datetime_with_tz(self):
        """测试带时区的日期时间"""
        dt = parse_lastmod('2026-03-01T10:30:00+08:00')
        assert dt is not None
        assert dt.hour == 10
        assert dt.minute == 30

    def test_datetime_zulu(self):
        """测试 Zulu 时间"""
        dt = parse_lastmod('2026-03-01T10:30:00Z')
        assert dt is not None

    def test_invalid_format(self):
        """测试无效格式"""
        dt = parse_lastmod('invalid')
        assert dt is None

    def test_none_input(self):
        """测试 None 输入"""
        dt = parse_lastmod(None)
        assert dt is None


class TestSitemapUrl:
    """测试 SitemapUrl 数据类"""

    def test_create(self):
        """测试创建 SitemapUrl"""
        url = SitemapUrl(
            url='https://example.com/',
            lastmod='2026-03-01',
            changefreq='daily',
            priority=1.0
        )
        assert url.url == 'https://example.com/'
        assert url.lastmod == '2026-03-01'
        assert url.changefreq == 'daily'
        assert url.priority == 1.0

    def test_minimal(self):
        """测试最小化 SitemapUrl"""
        url = SitemapUrl(url='https://example.com/')
        assert url.url == 'https://example.com/'
        assert url.lastmod is None
        assert url.changefreq is None
        assert url.priority is None


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
