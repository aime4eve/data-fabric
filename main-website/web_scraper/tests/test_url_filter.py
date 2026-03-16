"""
URL 过滤模块单元测试

作者：伍志勇
"""

import pytest
import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'mainsite_scraper'))

from utils.url_filter import (
    is_allowed_domain,
    is_english_url,
    should_exclude,
    get_allowed_domains,
    filter_url,
)


class TestIsAllowedDomain:
    """测试 is_allowed_domain 函数"""

    def test_root_domain(self):
        """测试根域名"""
        assert is_allowed_domain('https://example.com/page', 'example.com') is True

    def test_www_subdomain(self):
        """测试 www 子域名"""
        assert is_allowed_domain('https://www.example.com/page', 'example.com') is True

    def test_en_subdomain(self):
        """测试 en 子域名"""
        assert is_allowed_domain('https://en.example.com/page', 'example.com') is True

    def test_other_subdomain(self):
        """测试其他子域名（应该被排除）"""
        assert is_allowed_domain('https://blog.example.com/page', 'example.com') is False

    def test_different_domain(self):
        """测试不同域名"""
        assert is_allowed_domain('https://other.com/page', 'example.com') is False

    def test_chinese_subdomain(self):
        """测试中文子域名（应该被排除）"""
        assert is_allowed_domain('https://zh.example.com/page', 'example.com') is False


class TestIsEnglishUrl:
    """测试 is_english_url 函数"""

    def test_english_path(self):
        """测试英文路径"""
        assert is_english_url('https://example.com/en/products') is True

    def test_chinese_path(self):
        """测试中文路径（应该被排除）"""
        assert is_english_url('https://example.com/zh/products') is False

    def test_german_path(self):
        """测试德语路径（应该被排除）"""
        assert is_english_url('https://example.com/de/products') is False

    def test_chinese_subdomain(self):
        """测试中文子域名（应该被排除）"""
        assert is_english_url('https://zh.example.com/products') is False

    def test_english_subdomain(self):
        """测试英文子域名"""
        assert is_english_url('https://en.example.com/products') is True

    def test_no_language_indicator(self):
        """测试无语言标识（默认保留）"""
        assert is_english_url('https://example.com/products') is True


class TestShouldExclude:
    """测试 should_exclude 函数"""

    def test_wp_admin(self):
        """测试 WordPress 管理路径"""
        assert should_exclude('https://example.com/wp-admin/') is True

    def test_feed(self):
        """测试 RSS feed"""
        assert should_exclude('https://example.com/feed') is True

    def test_pdf_file(self):
        """测试 PDF 文件"""
        assert should_exclude('https://example.com/document.pdf') is True

    def test_image_file(self):
        """测试图片文件"""
        assert should_exclude('https://example.com/image.jpg') is True

    def test_normal_page(self):
        """测试正常页面"""
        assert should_exclude('https://example.com/products/item') is False

    def test_product_page(self):
        """测试产品页面"""
        assert should_exclude('https://example.com/products/') is False


class TestGetAllowedDomains:
    """测试 get_allowed_domains 函数"""

    def test_basic_domain(self):
        """测试基本域名"""
        domains = get_allowed_domains('https://example.com')
        assert 'example.com' in domains
        assert 'www.example.com' in domains
        assert 'en.example.com' in domains

    def test_www_domain(self):
        """测试 www 开头的域名"""
        domains = get_allowed_domains('https://www.example.com')
        assert 'example.com' in domains
        assert 'www.example.com' in domains

    def test_subdomain(self):
        """测试子域名"""
        domains = get_allowed_domains('https://blog.example.com')
        assert 'example.com' in domains
        assert 'blog.example.com' in domains

    def test_with_port(self):
        """测试带端口的 URL"""
        domains = get_allowed_domains('https://example.com:8080')
        assert 'example.com' in domains


class TestFilterUrl:
    """测试 filter_url 综合过滤函数"""

    def test_valid_english_page(self):
        """测试有效的英文页面"""
        valid, reason = filter_url('https://example.com/products/', 'example.com')
        assert valid is True
        assert reason == "通过"

    def test_chinese_page(self):
        """测试中文页面"""
        valid, reason = filter_url('https://example.com/zh/products/', 'example.com')
        assert valid is False
        assert "非英文" in reason

    def test_external_domain(self):
        """测试外部域名"""
        valid, reason = filter_url('https://other.com/page/', 'example.com')
        assert valid is False
        assert "域名" in reason

    def test_excluded_path(self):
        """测试排除路径"""
        valid, reason = filter_url('https://example.com/wp-admin/', 'example.com')
        assert valid is False
        assert "排除" in reason


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
