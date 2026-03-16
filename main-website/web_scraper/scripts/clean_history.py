#!/usr/bin/env python3
"""
历史记录清理脚本

用于清理爬取历史记录，支持：
- 按站点清理
- 清理所有站点
- 按时间清理

作者：伍志勇
"""

import argparse
import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

# 添加项目路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'mainsite_scraper'))

from utils.history_manager import load_history, save_history, cleanup_expired, CrawlHistory


def clean_site(site: str, output_dir: str, days: int | None, dry_run: bool = False) -> int:
    """
    清理指定站点的历史记录。

    Args:
        site: 站点域名
        output_dir: 输出目录
        days: 清理多少天前的记录（None 表示不过期清理）
        dry_run: 是否只显示不实际执行

    Returns:
        int: 清理的条目数量
    """
    history = load_history(site, output_dir)

    if days is not None:
        removed = cleanup_expired(history, days)
    else:
        removed = 0

    if removed > 0 and not dry_run:
        save_history(history, output_dir)
        print(f"已清理 {site}: {removed} 条记录")
    elif removed > 0 and dry_run:
        print(f"[DRY-RUN] 将清理 {site}: {removed} 条记录")
    else:
        print(f"{site}: 无需清理")

    return removed


def clean_all_sites(output_dir: str, days: int | None, dry_run: bool = False) -> int:
    """
    清理所有站点的历史记录。

    Args:
        output_dir: 输出目录
        days: 清理多少天前的记录
        dry_run: 是否只显示不实际执行

    Returns:
        int: 总清理条目数量
    """
    total_removed = 0
    sites_cleaned = 0

    # 遍历输出目录下的所有站点
    output_path = Path(output_dir)
    if not output_path.exists():
        print(f"输出目录不存在: {output_dir}")
        return 0

    for site_dir in output_path.iterdir():
        if site_dir.is_dir():
                site = site_dir.name
                removed = clean_site(site, output_dir, days, dry_run)
                if removed > 0:
                    total_removed += removed
                    sites_cleaned += 1

    print(f"\n总计: 清理 {sites_cleaned} 个站点, {total_removed} 条记录")
    return total_removed


def list_sites(output_dir: str) -> None:
    """
    列出所有站点及其统计信息。

    Args:
        output_dir: 输出目录
    """
    output_path = Path(output_dir)
    if not output_path.exists():
        print(f"输出目录不存在: {output_dir}")
        return

    print("\n站点列表:")
    print("-" * 60)

    for site_dir in output_path.iterdir():
        if site_dir.is_dir():
                site = site_dir.name
                history = load_history(site, output_dir)

                total_urls = len(history.urls)
                first_crawl = history.first_crawl[:19] if history.first_crawl else 'N/A'
                last_crawl = history.last_crawl[:19] if history.last_crawl else 'N/A'

                print(f"\n{site}:")
                print(f"  URL 数量: {total_urls}")
                print(f"  首次爬取: {first_crawl}")
                print(f"  最后爬取: {last_crawl}")


def main():
    parser = argparse.ArgumentParser(
        description='清理爬取历史记录',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )

    parser.add_argument(
        '--site',
        type=str,
        help='指定要清理的站点域名'
    )

    parser.add_argument(
        '--all',
        action='store_true',
        help='清理所有站点'
    )

    parser.add_argument(
        '--older-than',
        type=int,
        metavar='DAYS',
        help='清理指定天数前的记录（默认：不按时间清理）'
    )

    parser.add_argument(
        '--output-dir',
        type=str,
        default='./output',
        help='输出目录（默认：./output）'
    )

    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='只显示将要清理的内容，不实际执行'
    )

    parser.add_argument(
        '--list',
        action='store_true',
        help='列出所有站点及其统计信息'
    )

    args = parser.parse_args()

    # 验证参数
    if not args.site and not args.all and not args.list:
        parser.error('请指定 --site, --all 或 --list')
        sys.exit(1)

    # 列出站点
    if args.list:
        list_sites(args.output_dir)
        return

    # 清理指定站点
    if args.site:
        clean_site(args.site, args.output_dir, args.older_than, args.dry_run)
        return

    # 清理所有站点
    if args.all:
        clean_all_sites(args.output_dir, args.older_than, args.dry_run)


if __name__ == '__main__':
    main()
