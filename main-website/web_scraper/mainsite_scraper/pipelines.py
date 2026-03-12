"""
本爬虫仅供学习研究使用，请遵守目标网站的robots协议及所有法律法规。不得用于任何商业用途或非法用途。
"""

import os
import re
import urllib.parse
from scrapy.exceptions import DropItem
import logging
import requests


class SaveHtmlPipeline:
    """保存HTML文件到本地"""
    
    def __init__(self, output_dir):
        self.output_dir = output_dir
        self.visited_urls = set()
        
    @classmethod
    def from_crawler(cls, crawler):
        return cls(
            output_dir=crawler.settings.get('OUTPUT_DIR', './output')
        )
    
    def open_spider(self, spider):
        """爬虫开始时创建输出目录"""
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)
        logging.info(f"输出目录: {self.output_dir}")
        
    def process_item(self, item):
        """处理每个item，保存为HTML文件"""
        
        url = item['url']
        
        # 检查URL是否已被处理
        if url in self.visited_urls:
            raise DropItem(f"Duplicate URL: {url}")
        
        self.visited_urls.add(url)
        
        # 生成本地文件路径
        local_path = self._generate_local_path(url, item.get('title', ''))
        
        html_content = self._fix_html_links(item['html'], url)
        if self._should_download_assets(url):
            html_content = self._download_and_rewrite_assets(html_content, url, local_path)
        
        # 保存HTML文件
        try:
            # 获取目录部分
            dir_path = os.path.dirname(local_path)
            if dir_path:
                os.makedirs(dir_path, exist_ok=True)
            with open(local_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
            
            item['local_path'] = local_path
            logging.info(f"已保存: {url} -> {local_path}")
            
        except Exception as e:
            logging.error(f"保存文件失败: {url}, 错误: {e}")
            raise DropItem(f"Failed to save: {url}")
        
        return item

    def _should_download_assets(self, url: str) -> bool:
        """判断是否需要下载资源，作者：伍志勇"""
        return url.startswith('https://www.milesight.cn/lorawan/node/ws50x/') or url.startswith('https://www.milesight.cn/lorawan/node-switch/ws50x/')

    def _download_and_rewrite_assets(self, html: str, page_url: str, local_path: str) -> str:
        """下载资源并替换为本地路径，作者：伍志勇"""
        allowed_domains = {'www.milesight.cn', 'milesight.cn'}
        asset_exts = {
            '.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico',
            '.mp4', '.webm', '.ogg', '.mp3', '.wav', '.woff', '.woff2', '.ttf', '.eot', '.otf'
        }
        attr_re = re.compile(r'(?P<attr>href|src|poster|data-src|content)=["\'](?P<url>[^"\']+)["\']', re.IGNORECASE)
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
                return self._to_local_html_ref(abs_url, page_dir)
            if parsed.query:
                base, ext = os.path.splitext(path)
                path = f"{base}_q{hash(parsed.query) % 10000}{ext}"
            asset_full = os.path.join(self.output_dir, '_assets', path)
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
                    logging.error(f"资源下载失败: {abs_url}, 错误: {e}")
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

    def _to_local_html_ref(self, abs_url: str, page_dir: str) -> str | None:
        """将页面URL转换为本地HTML路径，作者：伍志勇"""
        parsed = urllib.parse.urlparse(abs_url)
        if parsed.netloc not in {'www.milesight.cn', 'milesight.cn'}:
            return None
        if parsed.scheme not in {'http', 'https'}:
            return None
        path = parsed.path.strip('/')
        if path and '.' in path.split('/')[-1] and not path.lower().endswith('.html'):
            return None
        local_full = self._generate_local_path(abs_url)
        if not os.path.exists(local_full):
            return None
        return os.path.relpath(local_full, start=page_dir).replace('\\', '/')
    
    def _generate_local_path(self, url: str, title: str = '') -> str:
        """根据URL生成本地文件路径"""
        
        # 解析URL
        parsed = urllib.parse.urlparse(url)
        path = parsed.path.strip('/')
        
        # 如果路径为空，使用index.html
        if not path:
            path = 'index.html'
        
        # 处理路径中的查询参数
        if parsed.query:
            # 将查询参数编码为文件名的一部分
            query_hash = hash(parsed.query) % 10000
            path = f"{path}_q{query_hash}.html"
        
        # 如果路径不以.html结尾，添加.html
        if not path.endswith('.html'):
            # 如果路径以/结尾，移除它
            path = path.rstrip('/')
            # 检查路径的最后一段是否有扩展名
            if '.' in path.split('/')[-1]:
                # 保留原有扩展名
                pass
            else:
                # 添加.html扩展名
                path = path + '.html'
        
        # 构建完整路径
        full_path = os.path.join(self.output_dir, path)
        
        return full_path
    
    def _fix_html_links(self, html: str, base_url: str) -> str:
        """修正HTML中的链接，将相对链接转换为绝对链接"""
        
        # 解析base_url
        parsed_base = urllib.parse.urlparse(base_url)
        base_domain = f"{parsed_base.scheme}://{parsed_base.netloc}"
        
        # 匹配所有href和src属性
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
        """将相对URL转换为绝对URL"""
        
        # 如果已经是绝对URL，直接返回
        if url.startswith('http://') or url.startswith('https://'):
            return url
        
        # 如果是协议相对URL（//example.com）
        if url.startswith('//'):
            return base_domain.split('://')[0] + ':' + url
        
        # 如果是根路径URL（/path）
        if url.startswith('/'):
            return base_domain + url
        
        # 如果是相对路径（../path 或 path）
        base_dir = os.path.dirname(base_path)
        if base_dir == '/':
            base_dir = ''
        
        absolute_path = urllib.parse.urljoin(base_domain + '/' + base_dir, url)
        
        return absolute_path
