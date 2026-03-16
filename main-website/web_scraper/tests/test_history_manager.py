"""
历史记录管理模块单元测试

作者：伍志勇
"""

import pytest
import json
import os
import tempfile
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'mainsite_scraper'))

from utils.history_manager import (
    load_history,
    save_history,
    is_new_or_updated,
    update_history,
    cleanup_expired,
    get_stats,
    CrawlHistory,
)


class TestLoadHistory:
    """测试 load_history 函数"""

    def test_load_new_history(self):
        """测试加载新历史（不存在文件）"""
        with tempfile.TemporaryDirectory() as tmpdir:
            history = load_history('example.com', tmpdir)
            assert history.site == 'example.com'
            assert len(history.urls) == 0

    def test_load_existing_history(self):
        """测试加载已存在的历史"""
        with tempfile.TemporaryDirectory() as tmpdir:
            # 创建历史文件
            domain = 'example.com'
            history_dir = os.path.join(tmpdir, domain)
            os.makedirs(history_dir)
            history_path = os.path.join(history_dir, 'crawl_history.json')

            data = {
                'site': domain,
                'first_crawl': '2026-01-01T00:00:00',
                'last_crawl': '2026-03-01T00:00:00',
                'urls': {
                    'https://example.com/': {
                        'first_seen': '2026-01-01T00:00:00',
                        'content_hash': 'abc123',
                        'local_path': 'index.html'
                    }
                }
            }

            with open(history_path, 'w') as f:
                json.dump(data, f)

            history = load_history(domain, tmpdir)
            assert history.site == domain
            assert len(history.urls) == 1
            assert 'https://example.com/' in history.urls

    def test_load_invalid_json(self):
        """测试加载无效 JSON"""
        with tempfile.TemporaryDirectory() as tmpdir:
            domain = 'example.com'
            history_dir = os.path.join(tmpdir, domain)
            os.makedirs(history_dir)
            history_path = os.path.join(history_dir, 'crawl_history.json')

            with open(history_path, 'w') as f:
                f.write('invalid json')

            history = load_history(domain, tmpdir)
            assert history.site == domain
            assert len(history.urls) == 0  # 返回空历史


class TestSaveHistory:
    """测试 save_history 函数"""

    def test_save_history(self):
        """测试保存历史"""
        with tempfile.TemporaryDirectory() as tmpdir:
            history = CrawlHistory(
                site='example.com',
                first_crawl='2026-01-01T00:00:00',
                last_crawl='2026-03-01T00:00:00',
                urls={
                    'https://example.com/': {
                        'first_seen': '2026-01-01T00:00:00',
                        'content_hash': 'abc123'
                    }
                }
            )

            save_history(history, tmpdir)

            history_path = os.path.join(tmpdir, 'example.com', 'crawl_history.json')
            assert os.path.exists(history_path)

            with open(history_path) as f:
                data = json.load(f)

            assert data['site'] == 'example.com'
            assert len(data['urls']) == 1


class TestIsNewOrUpdated:
    """测试 is_new_or_updated 函数"""

    def test_new_url(self):
        """测试新 URL"""
        history = CrawlHistory(
            site='example.com',
            first_crawl='2026-01-01T00:00:00',
            last_crawl='2026-03-01T00:00:00',
            urls={}
        )

        should_crawl, reason = is_new_or_updated(
            'https://example.com/new/',
            None,
            history
        )
        assert should_crawl is True
        assert "新页面" in reason

    def test_existing_url_no_change(self):
        """测试已存在且无变化的 URL"""
        history = CrawlHistory(
            site='example.com',
            first_crawl='2026-01-01T00:00:00',
            last_crawl='2026-03-01T00:00:00',
            urls={
                'https://example.com/': {
                    'first_seen': '2026-01-01T00:00:00',
                    'content_hash': 'abc123',
                    'last_modified': '2026-03-01'
                }
            }
        )

        should_crawl, reason = is_new_or_updated(
            'https://example.com/',
            '2026-03-01',  # 相同的 lastmod
            history,
            'abc123'  # 相同的 hash
        )
        assert should_crawl is False
        assert "无变化" in reason

    def test_updated_lastmod(self):
        """测试 sitemap lastmod 更新"""
        history = CrawlHistory(
            site='example.com',
            first_crawl='2026-01-01T00:00:00',
            last_crawl='2026-03-01T00:00:00',
            urls={
                'https://example.com/': {
                    'first_seen': '2026-01-01T00:00:00',
                    'content_hash': 'abc123',
                    'last_modified': '2026-03-01'
                }
            }
        )

        should_crawl, reason = is_new_or_updated(
            'https://example.com/',
            '2026-03-10',  # 更新的 lastmod
            history
        )
        assert should_crawl is True
        assert "sitemap" in reason or "更新" in reason

    def test_content_hash_changed(self):
        """测试内容哈希变化"""
        history = CrawlHistory(
            site='example.com',
            first_crawl='2026-01-01T00:00:00',
            last_crawl='2026-03-01T00:00:00',
            urls={
                'https://example.com/': {
                    'first_seen': '2026-01-01T00:00:00',
                    'content_hash': 'abc123'
                }
            }
        )

        should_crawl, reason = is_new_or_updated(
            'https://example.com/',
            None,
            history,
            'def456'  # 不同的 hash
        )
        assert should_crawl is True
        assert "内容" in reason


class TestUpdateHistory:
    """测试 update_history 函数"""

    def test_update_new_url(self):
        """测试更新新 URL"""
        history = CrawlHistory(
            site='example.com',
            first_crawl='2026-01-01T00:00:00',
            last_crawl='2026-03-01T00:00:00',
            urls={}
        )

        update_history(
            history,
            'https://example.com/new/',
            'hash123',
            'new/index.html',
            '2026-03-01'
        )

        assert 'https://example.com/new/' in history.urls
        entry = history.urls['https://example.com/new/']
        assert entry['content_hash'] == 'hash123'
        assert entry['local_path'] == 'new/index.html'
        assert entry['last_modified'] == '2026-03-01'

    def test_update_existing_url(self):
        """测试更新已存在的 URL"""
        history = CrawlHistory(
            site='example.com',
            first_crawl='2026-01-01T00:00:00',
            last_crawl='2026-03-01T00:00:00',
            urls={
                'https://example.com/': {
                    'first_seen': '2026-01-01T00:00:00',
                    'content_hash': 'old_hash'
                }
            }
        )

        update_history(
            history,
            'https://example.com/',
            'new_hash',
            'index.html'
        )

        entry = history.urls['https://example.com/']
        assert entry['content_hash'] == 'new_hash'
        assert entry['first_seen'] == '2026-01-01T00:00:00'  # 保持不变


class TestCleanupExpired:
    """测试 cleanup_expired 函数"""

    def test_cleanup_expired(self):
        """测试清理过期条目"""
        history = CrawlHistory(
            site='example.com',
            first_crawl='2025-01-01T00:00:00',
            last_crawl='2026-03-01T00:00:00',
            urls={
                'https://example.com/old/': {
                    'first_seen': '2025-01-01T00:00:00',  # 超过 90 天
                    'content_hash': 'old_hash'
                },
                'https://example.com/new/': {
                    'first_seen': '2026-03-01T00:00:00',  # 最近
                    'content_hash': 'new_hash'
                }
            }
        )

        removed = cleanup_expired(history, days=30)
        assert removed >= 1
        assert 'https://example.com/old/' not in history.urls
        assert 'https://example.com/new/' in history.urls


class TestGetStats:
    """测试 get_stats 函数"""

    def test_get_stats(self):
        """测试获取统计信息"""
        history = CrawlHistory(
            site='example.com',
            first_crawl='2026-01-01T00:00:00',
            last_crawl='2026-03-01T00:00:00',
            urls={
                'https://example.com/': {
                    'first_seen': '2026-01-01T00:00:00',
                    'content_hash': 'hash1',
                    'local_path': 'index.html'
                },
                'https://example.com/about/': {
                    'first_seen': '2026-02-01T00:00:00',
                    'content_hash': None,
                    'local_path': None
                }
            }
        )

        stats = get_stats(history)
        assert stats['site'] == 'example.com'
        assert stats['total_urls'] == 2
        assert stats['urls_with_hash'] == 1
        assert stats['urls_with_local_path'] == 1


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
