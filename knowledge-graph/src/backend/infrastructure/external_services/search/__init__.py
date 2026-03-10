"""
搜索服务模块
"""
from .elasticsearch_client import ElasticsearchClient, get_elasticsearch_client

__all__ = ['ElasticsearchClient', 'get_elasticsearch_client']