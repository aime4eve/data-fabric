"""
内容哈希模块单元测试

作者：伍志勇
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'mainsite_scraper'))

from utils.content_hash import (
    compute_hash,
    compute_hash_fast,
    hash_changed,
)


class TestComputeHash:
    """测试 compute_hash 函数"""

    def test_basic_hash(self):
        """测试基本哈希计算"""
        html = '<html><body>Hello World</body></html>'
        hash1 = compute_hash(html)
        assert len(hash1) == 64  # SHA256 输出 64 个十六进制字符
        assert hash1 == compute_hash(html)  # 相同内容相同哈希

    def test_different_content(self):
        """测试不同内容产生不同哈希"""
        html1 = '<html><body>Hello</body></html>'
        html2 = '<html><body>World</body></html>'
        hash1 = compute_hash(html1)
        hash2 = compute_hash(html2)
        assert hash1 != hash2

    def test_normalized_hash(self):
        """测试规范化后的哈希（忽略空白差异）"""
        html1 = '<html><body>Hello</body></html>'
        html2 = '<html>\n<body>\n  Hello\n</body>\n</html>'
        hash1 = compute_hash(html1, normalize=True)
        hash2 = compute_hash(html2, normalize=True)
        assert hash1 == hash2

    def test_non_normalized_hash(self):
        """测试非规范化哈希（空白差异产生不同哈希）"""
        html1 = '<html><body>Hello</body></html>'
        html2 = '<html>\n<body>\n  Hello\n</body>\n</html>'
        hash1 = compute_hash(html1, normalize=False)
        hash2 = compute_hash(html2, normalize=False)
        assert hash1 != hash2

    def test_ignore_comments(self):
        """测试忽略注释"""
        html1 = '<html><body>Hello</body></html>'
        html2 = '<html><!-- comment --><body>Hello</body></html>'
        hash1 = compute_hash(html1, normalize=True)
        hash2 = compute_hash(html2, normalize=True)
        assert hash1 == hash2

    def test_ignore_scripts(self):
        """测试忽略脚本"""
        html1 = '<html><body>Hello</body></html>'
        html2 = '<html><script>var x = 1;</script><body>Hello</body></html>'
        hash1 = compute_hash(html1, normalize=True)
        hash2 = compute_hash(html2, normalize=True)
        assert hash1 == hash2

    def test_ignore_styles(self):
        """测试忽略样式"""
        html1 = '<html><body>Hello</body></html>'
        html2 = '<html><style>.class { color: red; }</style><body>Hello</body></html>'
        hash1 = compute_hash(html1, normalize=True)
        hash2 = compute_hash(html2, normalize=True)
        assert hash1 == hash2

    def test_empty_html(self):
        """测试空 HTML"""
        hash1 = compute_hash('')
        assert hash1 == ''

    def test_none_input(self):
        """测试 None 输入"""
        hash1 = compute_hash(None)
        assert hash1 == ''


class TestComputeHashFast:
    """测试 compute_hash_fast 函数"""

    def test_fast_hash(self):
        """测试快速哈希"""
        html = '<html><body>Hello World</body></html>'
        hash1 = compute_hash_fast(html)
        hash2 = compute_hash_fast(html)
        assert hash1 == hash2

    def test_fast_vs_normalized(self):
        """测试快速哈希与规范化哈希不同"""
        html = '<html>\n<body>\n  Hello\n</body>\n</html>'
        fast_hash = compute_hash_fast(html)
        normalized_hash = compute_hash(html, normalize=True)
        assert fast_hash != normalized_hash


class TestHashChanged:
    """测试 hash_changed 函数"""

    def test_same_hash(self):
        """测试相同哈希"""
        hash1 = 'abc123'
        hash2 = 'abc123'
        assert hash_changed(hash1, hash2) is False

    def test_different_hash(self):
        """测试不同哈希"""
        hash1 = 'abc123'
        hash2 = 'def456'
        assert hash_changed(hash1, hash2) is True

    def test_empty_hash(self):
        """测试空哈希"""
        assert hash_changed('', 'abc123') is True
        assert hash_changed('abc123', '') is True
        assert hash_changed('', '') is True


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
