"""
内容哈希模块 - 计算 HTML 内容 SHA256 哈希

作者：伍志勇
"""

import hashlib
import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def compute_hash(html: str, normalize: bool = True) -> str:
    """
    计算 HTML 内容的 SHA256 哈希。

    可选择在计算哈希前对 HTML 进行规范化处理，以忽略不重要的差异：
    - 移除空白字符
    - 移除注释
    - 移除脚本和样式内容
    - 统一大小写

    Args:
        html: HTML 内容
        normalize: 是否规范化 HTML（默认 True）

    Returns:
        str: SHA256 哈希值（十六进制字符串）
    """
    if not html:
        return ''

    content = html

    if normalize:
        content = _normalize_html(content)

    return hashlib.sha256(content.encode('utf-8')).hexdigest()


def compute_hash_fast(html: str) -> str:
    """
    快速哈希计算（不进行规范化）。

    适用于需要精确比较的场景。

    Args:
        html: HTML 内容

    Returns:
        str: SHA256 哈希值
    """
    if not html:
        return ''

    return hashlib.sha256(html.encode('utf-8')).hexdigest()


def _normalize_html(html: str) -> str:
    """
    规范化 HTML 内容。

    处理步骤：
    1. 移除 HTML 注释
    2. 移除 <script> 标签内容
    3. 移除 <style> 标签内容
    4. 压缩空白字符
    5. 转换为小写

    Args:
        html: 原始 HTML

    Returns:
        str: 规范化后的 HTML
    """
    # 移除 HTML 注释
    html = re.sub(r'<!--.*?-->', '', html, flags=re.DOTALL)

    # 移除 <script> 标签及其内容
    html = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)

    # 移除 <style> 标签及其内容
    html = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL | re.IGNORECASE)

    # 移除 noscript 标签
    html = re.sub(r'<noscript[^>]*>.*?</noscript>', '', html, flags=re.DOTALL | re.IGNORECASE)

    # 压缩空白字符
    html = re.sub(r'\s+', ' ', html)

    # 去除首尾空白
    html = html.strip()

    # 转换为小写（可选，根据需求）
    # html = html.lower()

    return html


def hash_changed(hash1: str, hash2: str) -> bool:
    """
    比较两个哈希值是否不同。

    Args:
        hash1: 第一个哈希值
        hash2: 第二个哈希值

    Returns:
        bool: 如果不同返回 True
    """
    if not hash1 or not hash2:
        return True

    return hash1 != hash2
