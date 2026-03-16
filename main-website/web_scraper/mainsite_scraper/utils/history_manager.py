"""
历史记录管理模块 - 增量爬取支持

作者：伍志勇
"""

import json
import os
import logging
from datetime import datetime, timedelta
from typing import Optional
from dataclasses import dataclass, field, asdict
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class UrlHistory:
    """单个 URL 的历史记录"""
    first_seen: str  # ISO 格式时间戳
    content_hash: str | None = None  # SHA256 哈希
    local_path: str | None = None  # 本地保存路径
    last_modified: str | None = None  # sitemap lastmod


@dataclass
class CrawlHistory:
    """站点爬取历史记录"""
    site: str  # 域名
    first_crawl: str  # 首次爬取时间
    last_crawl: str  # 最后爬取时间
    urls: dict[str, dict] = field(default_factory=dict)  # URL -> UrlHistory

    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            'site': self.site,
            'first_crawl': self.first_crawl,
            'last_crawl': self.last_crawl,
            'urls': self.urls
        }

    @classmethod
    def from_dict(cls, data: dict) -> 'CrawlHistory':
        """从字典创建"""
        return cls(
            site=data.get('site', ''),
            first_crawl=data.get('first_crawl', ''),
            last_crawl=data.get('last_crawl', ''),
            urls=data.get('urls', {})
        )


def load_history(domain: str, output_dir: str) -> CrawlHistory:
    """
    加载站点的爬取历史记录。

    Args:
        domain: 站点域名
        output_dir: 输出目录

    Returns:
        CrawlHistory: 爬取历史记录
    """
    history_path = _get_history_path(domain, output_dir)

    if not os.path.exists(history_path):
        logger.info(f"创建新的历史记录: {domain}")
        return CrawlHistory(
            site=domain,
            first_crawl=_get_timestamp(),
            last_crawl=_get_timestamp(),
            urls={}
        )

    try:
        with open(history_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        logger.info(f"加载历史记录: {domain}, {len(data.get('urls', {}))} 个 URL")
        return CrawlHistory.from_dict(data)
    except Exception as e:
        logger.error(f"加载历史记录失败: {history_path}, 错误: {e}")
        return CrawlHistory(
            site=domain,
            first_crawl=_get_timestamp(),
            last_crawl=_get_timestamp(),
            urls={}
        )


def save_history(history: CrawlHistory, output_dir: str) -> None:
    """
    保存爬取历史记录。

    Args:
        history: 爬取历史记录
        output_dir: 输出目录
    """
    history_path = _get_history_path(history.site, output_dir)

    # 确保目录存在
    os.makedirs(os.path.dirname(history_path), exist_ok=True)

    # 更新最后爬取时间
    history.last_crawl = _get_timestamp()

    try:
        with open(history_path, 'w', encoding='utf-8') as f:
            json.dump(history.to_dict(), f, ensure_ascii=False, indent=2)
        logger.info(f"保存历史记录: {history.site}, {len(history.urls)} 个 URL")
    except Exception as e:
        logger.error(f"保存历史记录失败: {history_path}, 错误: {e}")


def is_new_or_updated(
    url: str,
    lastmod: str | None,
    history: CrawlHistory,
    content_hash: str | None = None
) -> tuple[bool, str]:
    """
    检测 URL 是否为新页面或已更新。

    判断逻辑：
    1. URL 不在历史 → 新页面 → 爬取
    2. URL 在历史 + Sitemap lastmod 更新 → 内容更新 → 爬取
    3. URL 在历史 + 无 lastmod + Hash 变化 → 内容更新 → 爬取
    4. URL 在历史 + 无变化 → 跳过

    Args:
        url: 要检查的 URL
        lastmod: sitemap 中的 lastmod 时间戳
        history: 爬取历史记录
        content_hash: 内容哈希（可选）

    Returns:
        tuple[bool, str]: (是否需要爬取, 原因)
    """
    if url not in history.urls:
        return True, "新页面"

    url_history = history.urls[url]
    stored_lastmod = url_history.get('last_modified')
    stored_hash = url_history.get('content_hash')

    # 检查 sitemap lastmod
    if lastmod and stored_lastmod:
        if lastmod > stored_lastmod:
            return True, "sitemap 更新"

    # 检查内容哈希
    if content_hash and stored_hash:
        if content_hash != stored_hash:
            return True, "内容变化"

    return False, "无变化"


def update_history(
    history: CrawlHistory,
    url: str,
    content_hash: str | None,
    local_path: str | None,
    lastmod: str | None = None
) -> None:
    """
    更新 URL 的历史记录。

    Args:
        history: 爬取历史记录
        url: URL
        content_hash: 内容哈希
        local_path: 本地保存路径
        lastmod: sitemap lastmod
    """
    now = _get_timestamp()

    if url in history.urls:
        # 更新现有记录
        entry = history.urls[url]
        entry['content_hash'] = content_hash
        entry['local_path'] = local_path
        if lastmod:
            entry['last_modified'] = lastmod
    else:
        # 创建新记录
        history.urls[url] = {
            'first_seen': now,
            'content_hash': content_hash,
            'local_path': local_path,
            'last_modified': lastmod
        }


def cleanup_expired(history: CrawlHistory, days: int = 90) -> int:
    """
    清理过期的历史记录条目。

    Args:
        history: 爬取历史记录
        days: 过期天数（默认 90 天）

    Returns:
        int: 清理的条目数量
    """
    cutoff = datetime.now() - timedelta(days=days)
    cutoff_str = cutoff.isoformat()

    expired_urls = [
        url for url, entry in history.urls.items()
        if entry.get('first_seen', '') < cutoff_str
    ]

    for url in expired_urls:
        del history.urls[url]

    if expired_urls:
        logger.info(f"清理过期历史记录: {history.site}, {len(expired_urls)} 个条目")

    return len(expired_urls)


def get_stats(history: CrawlHistory) -> dict:
    """
    获取历史记录统计信息。

    Args:
        history: 爬取历史记录

    Returns:
        dict: 统计信息
    """
    return {
        'site': history.site,
        'first_crawl': history.first_crawl,
        'last_crawl': history.last_crawl,
        'total_urls': len(history.urls),
        'urls_with_hash': sum(1 for e in history.urls.values() if e.get('content_hash')),
        'urls_with_local_path': sum(1 for e in history.urls.values() if e.get('local_path')),
    }


def _get_history_path(domain: str, output_dir: str) -> str:
    """获取历史记录文件路径"""
    return os.path.join(output_dir, domain, 'crawl_history.json')


def _get_timestamp() -> str:
    """获取当前时间戳（ISO 格式）"""
    return datetime.now().isoformat()
