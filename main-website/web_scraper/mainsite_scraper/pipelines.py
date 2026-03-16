"""
通用 HTML 保存 Pipeline

本爬虫仅供学习研究使用，请遵守目标网站的robots协议及所有法律法规。不得用于任何商业用途或非法用途。

作者：伍志勇
"""

import os
import re
import urllib.parse
import logging
from typing import Set
from scrapy.exceptions import DropItem

logger = logging.getLogger(__name__)


class SaveHtmlPipeline:
    """通用 HTML 文件保存 Pipeline"""

    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        self.visited_urls: Set[str] = set()
        self.target_domain: str | None = None

    @classmethod
    def from_crawler(cls, crawler):
        return cls(
            output_dir=crawler.settings.get('OUTPUT_DIR', './output')
        )

    def open_spider(self, spider):
        """爬虫开始时初始化"""
        # 获取目标域名
        self.target_domain = getattr(spider, 'target_domain', None)

        # 创建按域名组织的输出目录
        if self.target_domain:
            domain_output_dir = os.path.join(self.output_dir, self.target_domain)
        else:
            domain_output_dir = self.output_dir

        if not os.path.exists(domain_output_dir):
            os.makedirs(domain_output_dir, exist_ok=True)

        logger.info(f"输出目录: {domain_output_dir}")

    def process_item(self, item, spider):
        """处理每个 item，保存为 HTML 文件"""

        url = item['url']

        # 检查 URL 是否已被处理
        if url in self.visited_urls:
            raise DropItem(f"Duplicate URL: {url}")

        self.visited_urls.add(url)

        # 获取域名（用于按域名组织输出）
        domain = item.get('domain', self.target_domain or self._extract_domain(url))

        # 生成本地文件路径（按域名组织）
        local_path = self._generate_local_path(url, domain, item.get('title', ''))

        # 修正 HTML 中的链接
        html_content = self._fix_html_links(item['html'], url)

        # 判断是否需要下载资源
        download_assets = item.get('download_assets', False)
        if download_assets:
            html_content = self._download_and_rewrite_assets(
                html_content, url, local_path, domain
            )

        # 保存 HTML 文件
        try:
            dir_path = os.path.dirname(local_path)
            if dir_path:
                os.makedirs(dir_path, exist_ok=True)

            with open(local_path, 'w', encoding='utf-8') as f:
                f.write(html_content)

            item['local_path'] = local_path
            logger.info(f"已保存: {url} -> {local_path}")

        except Exception as e:
            logger.error(f"保存文件失败: {url}, 错误: {e}")
            raise DropItem(f"Failed to save: {url}")

        return item

    def _extract_domain(self, url: str) -> str:
        """从 URL 提取域名"""
        parsed = urllib.parse.urlparse(url)
        domain = parsed.netloc.lower()
        if domain.startswith('www.'):
            domain = domain[4:]
        return domain

    def _generate_local_path(self, url: str, domain: str, title: str = '') -> str:
        """根据 URL 和域名生成本地文件路径"""

        # 解析 URL
        parsed = urllib.parse.urlparse(url)
        path = parsed.path.strip('/')

        # 如果路径为空，使用 index.html
        if not path:
            path = 'index.html'

        # 处理路径中的查询参数
        if parsed.query:
            query_hash = hash(parsed.query) % 10000
            path = f"{path}_q{query_hash}.html"

        # 如果路径不以 .html 结尾，添加 .html
        if not path.endswith('.html'):
            path = path.rstrip('/')
            if '.' not in path.split('/')[-1]:
                path = path + '.html'

        # 构建完整路径（按域名组织）
        domain_output_dir = os.path.join(self.output_dir, domain)
        full_path = os.path.join(domain_output_dir, path)

        return full_path

    def _fix_html_links(self, html: str, base_url: str) -> str:
        """修正 HTML 中的链接，将相对链接转换为绝对链接"""

        parsed_base = urllib.parse.urlparse(base_url)
        base_domain = f"{parsed_base.scheme}://{parsed_base.netloc}"

        patterns = [
            (r'href=["\'](?!#|javascript:|mailto:|tel:|data:)([^"\']+)["\']',
             lambda m: f'href="{self._to_absolute_url(m.group(1), base_domain, parsed_base.path)}"'),
            (r'src=["\'](?!#|javascript:|data:)([^"\']+)["\']',
             lambda m: f'src="{self._to_absolute_url(m.group(1), base_domain, parsed_base.path)}"'),
            (r'action=["\']([^"\']+)["\']',
             lambda m: f'action="{self._to_absolute_url(m.group(1), base_domain, parsed_base.path)}"'),
        ]

        for pattern, replacer in patterns:
            html = re.sub(pattern, replacer, html)

        return html

    def _to_absolute_url(self, url: str, base_domain: str, base_path: str) -> str:
        """将相对 URL 转换为绝对 URL"""

        if url.startswith('http://') or url.startswith('https://'):
            return url

        if url.startswith('//'):
            return base_domain.split('://')[0] + ':' + url

        if url.startswith('/'):
            return base_domain + url

        base_dir = os.path.dirname(base_path)
        if base_dir == '/':
            base_dir = ''

        return urllib.parse.urljoin(base_domain + '/' + base_dir, url)

    def _download_and_rewrite_assets(
        self,
        html: str,
        page_url: str,
        local_path: str,
        domain: str
    ) -> str:
        """下载资源并替换为本地路径"""
        import requests

        # 动态获取允许的域名
        allowed_domains = self._get_allowed_domains(page_url, domain)

        asset_exts = {
            '.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico',
            '.mp4', '.webm', '.ogg', '.mp3', '.wav', '.woff', '.woff2', '.ttf', '.eot', '.otf'
        }

        attr_re = re.compile(
            r'(?P<attr>href|src|poster|data-src|content)=["\'](?P<url>[^"\']+)["\']',
            re.IGNORECASE
        )
        srcset_re = re.compile(r'srcset=["\'](?P<value>[^"\']+)["\']', re.IGNORECASE)

        replacements = {}
        page_dir = os.path.dirname(local_path)

        def to_local(url: str) -> str | None:
            if url.startswith('//'):
                url = 'https:' + url
            if url.startswith('data:') or url.startswith('javascript:') or url.startswith('mailto:') or url.startswith('tel:'):
                return None

            abs_url = urllib.parse.urljoin(page_url, url)
            parsed = urllib.parse.urlparse(abs_url)

            if parsed.netloc not in allowed_domains:
                return None

            path = parsed.path.lstrip('/')
            _, ext = os.path.splitext(path)

            if ext.lower() not in asset_exts:
                return self._to_local_html_ref(abs_url, page_dir, allowed_domains)

            if parsed.query:
                base, ext = os.path.splitext(path)
                path = f"{base}_q{hash(parsed.query) % 10000}{ext}"

            # 使用域名特定的资源目录
            asset_full = os.path.join(self.output_dir, domain, '_assets', path)

            if abs_url in replacements:
                return replacements[abs_url]

            if not os.path.exists(asset_full):
                os.makedirs(os.path.dirname(asset_full), exist_ok=True)
                try:
                    resp = requests.get(abs_url, timeout=30, stream=True)
                    if resp.status_code == 200:
                        with open(asset_full, 'wb') as f:
                            for chunk in resp.iter_content(chunk_size=1024 * 64):
                                if chunk:
                                    f.write(chunk)
                    else:
                        return None
                except Exception as e:
                    logger.error(f"资源下载失败: {abs_url}, 错误: {e}")
                    return None

            rel = os.path.relpath(asset_full, start=page_dir).replace('\\', '/')
            replacements[abs_url] = rel
            return rel

        def replace_attr(match: re.Match) -> str:
            raw_url = match.group('url')
            local = to_local(raw_url)
            if not local:
                return match.group(0)
            return f"{match.group('attr')}=\"{local}\""

        def replace_srcset(match: re.Match) -> str:
            value = match.group('value')
            parts = [p.strip() for p in value.split(',') if p.strip()]
            new_parts = []
            changed = False
            for part in parts:
                pieces = part.split()
                if not pieces:
                    continue
                url_part = pieces[0]
                local = to_local(url_part)
                if local:
                    pieces[0] = local
                    changed = True
                new_parts.append(' '.join(pieces))
            if not changed:
                return match.group(0)
            return f"srcset=\"{', '.join(new_parts)}\""

        html = attr_re.sub(replace_attr, html)
        html = srcset_re.sub(replace_srcset, html)
        return html

    def _get_allowed_domains(self, page_url: str, domain: str) -> set[str]:
        """获取允许的域名列表"""
        parsed = urllib.parse.urlparse(page_url)
        netloc = parsed.netloc.lower()

        # 构建允许的域名集合
        allowed = {domain}
        if not domain.startswith('www.'):
            allowed.add(f'www.{domain}')
        allowed.add(f'en.{domain}')
        if netloc not in allowed:
            allowed.add(netloc)

        return allowed

    def _to_local_html_ref(
        self,
        abs_url: str,
        page_dir: str,
        allowed_domains: set[str]
    ) -> str | None:
        """将页面 URL 转换为本地 HTML 路径"""
        parsed = urllib.parse.urlparse(abs_url)

        if parsed.netloc not in allowed_domains:
            return None

        if parsed.scheme not in {'http', 'https'}:
            return None

        path = parsed.path.strip('/')
        if path and '.' in path.split('/')[-1] and not path.lower().endswith('.html'):
            return None

        local_full = self._generate_local_path(abs_url, self._extract_domain(abs_url))
        if not os.path.exists(local_full):
            return None

        return os.path.relpath(local_full, start=page_dir).replace('\\', '/')
