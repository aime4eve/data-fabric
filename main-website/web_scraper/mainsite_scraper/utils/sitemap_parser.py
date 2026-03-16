"""
Sitemap 解析模块 - 解析 sitemap.xml 获取 URL 列表

作者：伍志勇
"""

import logging
import urllib.parse
import xml.etree.ElementTree as ET
from typing import Generator
from dataclasses import dataclass
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class SitemapUrl:
    """Sitemap URL 条目"""
    url: str
    lastmod: str | None = None
    changefreq: str | None = None
    priority: float | None = None


def parse_sitemap(sitemap_url: str, response_text: str) -> Generator[SitemapUrl, None, None]:
    """
    解析 sitemap.xml 内容，获取 URL 列表。

    支持两种格式：
    1. 标准 sitemap (urlset)
    2. Sitemap 索引 (sitemapindex) - 递归解析

    Args:
        sitemap_url: sitemap 的 URL（用于解析相对路径）
        response_text: sitemap XML 内容

    Yields:
        SitemapUrl: URL 条目
    """
    try:
        root = ET.fromstring(response_text)
    except ET.ParseError as e:
        logger.error(f"解析 sitemap 失败: {sitemap_url}, 错误: {e}")
        return

    # 获取 XML 命名空间
    ns = _get_namespace(root)

    # 判断是 sitemap 索引还是标准 sitemap
    if root.tag.endswith('sitemapindex'):
        # Sitemap 索引，提取子 sitemap URL
        yield from _parse_sitemap_index(root, ns)
    elif root.tag.endswith('urlset'):
        # 标准 sitemap
        yield from _parse_urlset(root, ns)
    else:
        logger.warning(f"未知的 sitemap 格式: {root.tag}")


def _get_namespace(element: ET.Element) -> dict[str, str]:
    """获取 XML 命名空间"""
    if element.tag.startswith('{'):
        ns_uri = element.tag[1:element.tag.index('}')]
        return {'ns': ns_uri}
    return {}


def _parse_sitemap_index(root: ET.Element, ns: dict[str, str]) -> Generator[str, None, None]:
    """解析 sitemap 索引，返回子 sitemap URL"""
    if ns:
        sitemaps = root.findall('ns:sitemap', ns)
    else:
        sitemaps = root.findall('sitemap')

    for sitemap in sitemaps:
        if ns:
            loc = sitemap.find('ns:loc', ns)
        else:
            loc = sitemap.find('loc')

        if loc is not None and loc.text:
            yield loc.text.strip()


def _parse_urlset(root: ET.Element, ns: dict[str, str]) -> Generator[SitemapUrl, None, None]:
    """解析标准 sitemap urlset"""
    if ns:
        urls = root.findall('ns:url', ns)
    else:
        urls = root.findall('url')

    for url_elem in urls:
        url_data = _parse_url_element(url_elem, ns)
        if url_data and url_data.url:
            yield url_data


def _parse_url_element(url_elem: ET.Element, ns: dict[str, str]) -> SitemapUrl | None:
    """解析单个 URL 元素"""
    # 获取 loc
    if ns:
        loc = url_elem.find('ns:loc', ns)
        lastmod = url_elem.find('ns:lastmod', ns)
        changefreq = url_elem.find('ns:changefreq', ns)
        priority = url_elem.find('ns:priority', ns)
    else:
        loc = url_elem.find('loc')
        lastmod = url_elem.find('lastmod')
        changefreq = url_elem.find('changefreq')
        priority = url_elem.find('priority')

    if loc is None or not loc.text:
        return None

    return SitemapUrl(
        url=loc.text.strip(),
        lastmod=lastmod.text.strip() if lastmod is not None and lastmod.text else None,
        changefreq=changefreq.text.strip() if changefreq is not None and changefreq.text else None,
        priority=float(priority.text.strip()) if priority is not None and priority.text else None,
    )


def get_urls_with_lastmod(sitemap_url: str, response_text: str) -> dict[str, str | None]:
    """
    获取 URL 及其 lastmod 时间戳。

    Args:
        sitemap_url: sitemap 的 URL
        response_text: sitemap XML 内容

    Returns:
        dict[url, lastmod]: URL 到 lastmod 的映射（无 lastmod 时为 None）
    """
    result = {}
    for sitemap_url_entry in parse_sitemap(sitemap_url, response_text):
        result[sitemap_url_entry.url] = sitemap_url_entry.lastmod
    return result


def get_all_urls(sitemap_url: str, response_text: str) -> list[str]:
    """
    获取所有 URL 列表（不含 lastmod）。

    Args:
        sitemap_url: sitemap 的 URL
        response_text: sitemap XML 内容

    Returns:
        list[str]: URL 列表
    """
    return [entry.url for entry in parse_sitemap(sitemap_url, response_text)]


def is_sitemap_index(response_text: str) -> bool:
    """
    检查是否为 sitemap 索引文件。

    Args:
        response_text: sitemap XML 内容

    Returns:
        bool: 如果是 sitemap 索引返回 True
    """
    try:
        root = ET.fromstring(response_text)
        return root.tag.endswith('sitemapindex')
    except ET.ParseError:
        return False


def parse_lastmod(lastmod_str: str | None) -> datetime | None:
    """
    解析 lastmod 字符串为 datetime 对象。

    支持的格式：
    - YYYY-MM-DD
    - YYYY-MM-DDThh:mm:ss+TZ:00
    - YYYY-MM-DDThh:mm:ssZ

    Args:
        lastmod_str: lastmod 字符串

    Returns:
        datetime | None: 解析后的 datetime 对象
    """
    if not lastmod_str:
        return None

    formats = [
        '%Y-%m-%d',
        '%Y-%m-%dT%H:%M:%S%z',
        '%Y-%m-%dT%H:%M:%S+%z',
        '%Y-%m-%dT%H:%M:%SZ',
    ]

    for fmt in formats:
        try:
            return datetime.strptime(lastmod_str, fmt)
        except ValueError:
            continue

    # 尝试处理带时区格式 (YYYY-MM-DDThh:mm:ss+HH:MM)
    try:
        # 将 +HH:MM 转换为 +HHMM
        if '+' in lastmod_str and lastmod_str.count(':') == 3:
            parts = lastmod_str.rsplit('+', 1)
            tz_part = parts[1].replace(':', '')
            normalized = f"{parts[0]}+{tz_part}"
            return datetime.strptime(normalized, '%Y-%m-%dT%H:%M:%S%z')
    except ValueError:
        pass

    logger.debug(f"无法解析 lastmod: {lastmod_str}")
    return None
