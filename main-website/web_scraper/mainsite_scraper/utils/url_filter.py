"""
URL 过滤模块 - 域名边界检查、语言过滤、通用排除规则

作者：伍志勇
"""

import re
import urllib.parse
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# 语言排除模式（路径前缀和子域名）
LANGUAGE_EXCLUDE_PATTERNS = [
    # 路径前缀
    r'^/zh/', r'^/cn/', r'^/de/', r'^/fr/', r'^/ja/', r'^/ko/',
    r'^/es/', r'^/pt/', r'^/ru/', r'^/ar/', r'^/it/', r'^/nl/',
    r'^/pl/', r'^/tr/', r'^/vi/', r'^/th/', r'^/id/', r'^/ms/',
    # 子域名
    r'^https?://zh\.', r'^https?://cn\.', r'^https?://de\.',
    r'^https?://fr\.', r'^https?://ja\.', r'^https?://ko\.',
    r'^https?://es\.', r'^https?://pt\.', r'^https?://ru\.',
    r'^https?://ar\.', r'^https?://it\.', r'^https?://nl\.',
    r'^https?://pl\.', r'^https?://tr\.', r'^https?://vi\.',
    r'^https?://th\.', r'^https?://id\.', r'^https?://ms\.',
]

# 语言包含模式（英文）
LANGUAGE_INCLUDE_PATTERNS = [
    r'^/en/', r'^/english/',
    r'^https?://en\.', r'^https?://english\.',
]

# 通用排除模式
COMMON_EXCLUDE_PATTERNS = [
    # WordPress 后台
    r'/wp-admin/',
    r'/wp-login\.php',
    r'/wp-register\.php',
    # Feed
    r'/feed',
    r'/rss',
    r'/atom\.xml',
    # 附件和媒体
    r'/attachment/',
    r'/uploads/',
    # 移动版
    r'/m/',
    r'/mobile/',
    # 评论
    r'/comment-page-',
    r'\?replytocom=',
    # 搜索
    r'\?s=',
    r'/search\?',
    # 分页
    r'/page/\d+',
    r'/category/[^/]+/page/',
    r'/tag/[^/]+/page/',
    # 用户和登录
    r'/login',
    r'/register',
    r'/logout',
    r'/user/',
    r'/account/',
    r'/profile/',
    # API
    r'/api/',
    r'/api\.',
    r'\.json$',
    r'\.xml$',
    # 购物车和结账
    r'/cart',
    r'/checkout',
    r'/basket',
    # 其他
    r'/print/',
    r'/pdf/',
    r'\?print=',
    r'\?pdf=',
]

# 需要排除的文件扩展名
EXCLUDE_EXTENSIONS = [
    '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.ico', '.webp', '.bmp',
    '.css', '.js', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm',
    '.mp3', '.wav', '.ogg', '.flac',
    '.zip', '.rar', '.7z', '.tar', '.gz',
    '.exe', '.dmg', '.pkg', '.apk', '.ipa',
    '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.json', '.xml', '.rss', '.atom',
]


def is_allowed_domain(url: str, target_domain: str) -> bool:
    """
    检查 URL 是否在允许的域名范围内。

    Args:
        url: 要检查的 URL
        target_domain: 目标域名（如 example.com）

    Returns:
        bool: 如果域名在允许范围内返回 True
    """
    try:
        parsed = urllib.parse.urlparse(url)
        netloc = parsed.netloc.lower()

        # 获取允许的域名列表
        allowed = get_allowed_domains(target_domain)

        return netloc in allowed
    except Exception as e:
        logger.debug(f"域名检查失败: {url}, 错误: {e}")
        return False


def is_english_url(url: str) -> bool:
    """
    检测 URL 是否为英文页面。

    规则：
    1. 如果 URL 匹配语言排除模式，返回 False
    2. 如果 URL 匹配语言包含模式（英文），返回 True
    3. 如果没有语言标识，默认返回 True（保留）

    Args:
        url: 要检查的 URL

    Returns:
        bool: 如果是英文或无语言标识返回 True
    """
    url_lower = url.lower()

    # 检查排除模式
    for pattern in LANGUAGE_EXCLUDE_PATTERNS:
        if re.search(pattern, url_lower):
            logger.debug(f"排除非英文 URL (匹配模式 {pattern}): {url}")
            return False

    # 检查包含模式（如果有明确的英文标识，保留）
    for pattern in LANGUAGE_INCLUDE_PATTERNS:
        if re.search(pattern, url_lower):
            return True

    # 没有语言标识，默认保留
    return True


def should_exclude(url: str) -> bool:
    """
    检查 URL 是否应该被排除。

    Args:
        url: 要检查的 URL

    Returns:
        bool: 如果应该排除返回 True
    """
    # 检查排除模式
    for pattern in COMMON_EXCLUDE_PATTERNS:
        if re.search(pattern, url):
            logger.debug(f"排除 URL (匹配模式 {pattern}): {url}")
            return True

    # 检查文件扩展名
    for ext in EXCLUDE_EXTENSIONS:
        if url.lower().endswith(ext):
            logger.debug(f"排除 URL (文件类型 {ext}): {url}")
            return True

    return False


def get_allowed_domains(target_url: str) -> list[str]:
    """
    获取允许的域名列表。

    基于目标 URL 生成允许的域名列表，包括：
    - 根域名
    - www 子域名
    - en 子域名（英文）

    Args:
        target_url: 目标 URL

    Returns:
        list[str]: 允许的域名列表
    """
    try:
        parsed = urllib.parse.urlparse(target_url)
        netloc = parsed.netloc.lower()

        # 移除端口号
        if ':' in netloc:
            netloc = netloc.split(':')[0]

        # 移除 www 前缀获取根域名
        root = netloc
        if root.startswith('www.'):
            root = root[4:]

        # 构建允许的域名列表
        allowed = [
            root,              # example.com
            f'www.{root}',     # www.example.com
            f'en.{root}',      # en.example.com
        ]

        # 如果原始域名是子域名，也加入允许列表
        if netloc != root and netloc != f'www.{root}':
            allowed.append(netloc)

        return allowed
    except Exception as e:
        logger.warning(f"获取允许域名失败: {target_url}, 错误: {e}")
        return []


def filter_url(url: str, target_domain: str) -> tuple[bool, str]:
    """
    综合过滤 URL。

    Args:
        url: 要检查的 URL
        target_domain: 目标域名

    Returns:
        tuple[bool, str]: (是否保留, 原因)
    """
    # 检查域名
    if not is_allowed_domain(url, target_domain):
        return False, "域名不在允许范围内"

    # 检查语言
    if not is_english_url(url):
        return False, "非英文页面"

    # 检查排除规则
    if should_exclude(url):
        return False, "匹配排除模式"

    return True, "通过"
