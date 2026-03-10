"""
搜索控制器 - 处理Elasticsearch全文搜索请求
"""
import logging
from typing import Dict, Any, List, Optional
from flask import request, jsonify
from flask_restx import Resource, Namespace, fields

from infrastructure.external_services.search import get_elasticsearch_client
from application.services.document_service import DocumentService

logger = logging.getLogger(__name__)

# 创建搜索API命名空间
search_ns = Namespace('search', description='全文搜索API')

# 定义API模型
search_request_model = search_ns.model('SearchRequest', {
    'query': fields.String(required=True, description='搜索关键词'),
    'category': fields.String(description='文档分类过滤'),
    'subcategory': fields.String(description='文档子分类过滤'),
    'file_extension': fields.String(description='文件类型过滤'),
    'size': fields.Integer(default=10, description='返回结果数量'),
    'from': fields.Integer(default=0, description='分页偏移量'),
    'highlight': fields.Boolean(default=True, description='是否高亮显示')
})

search_response_model = search_ns.model('SearchResponse', {
    'total': fields.Integer(description='总结果数'),
    'took': fields.Integer(description='搜索耗时(毫秒)'),
    'documents': fields.List(fields.Raw, description='搜索结果文档列表')
})

suggestion_response_model = search_ns.model('SuggestionResponse', {
    'suggestions': fields.List(fields.String, description='搜索建议列表')
})

index_stats_model = search_ns.model('IndexStats', {
    'exists': fields.Boolean(description='索引是否存在'),
    'document_count': fields.Integer(description='文档总数'),
    'index_size': fields.Integer(description='索引大小(字节)'),
    'created': fields.Boolean(description='索引是否已创建')
})


@search_ns.route('/documents')
class DocumentSearchResource(Resource):
    """文档搜索资源"""
    
    @search_ns.expect(search_request_model)
    def post(self):
        """
        全文搜索文档
        ---
        执行基于Elasticsearch的全文搜索，支持中文分词、高亮显示和多字段搜索
        """
        try:
            data = request.get_json()
            
            # 验证必需参数
            if not data or 'query' not in data:
                return {
                    'success': False,
                    'message': '缺少搜索关键词',
                    'data': {
                        'results': [],
                        'total': 0,
                        'page': 1,
                        'size': 10,
                        'total_pages': 0,
                        'took': 0
                    }
                }, 400
            
            query = data['query'].strip()
            if not query:
                return {
                    'success': False,
                    'message': '搜索关键词不能为空',
                    'data': {
                        'results': [],
                        'total': 0,
                        'page': 1,
                        'size': 10,
                        'total_pages': 0,
                        'took': 0
                    }
                }, 400
            
            # 获取搜索参数
            category = data.get('category')
            subcategory = data.get('subcategory')
            file_extension = data.get('file_extension')
            size = min(data.get('size', 10), 100)  # 限制最大返回数量
            page = max(data.get('page', 1), 1)
            from_ = (page - 1) * size  # 根据页码计算偏移量
            highlight = data.get('highlight', True)
            
            # 构建过滤条件
            filters = {}
            if category:
                filters['category'] = category
            if subcategory:
                filters['subcategory'] = subcategory
            if file_extension:
                filters['file_extension'] = file_extension.lower()
            
            # 获取Elasticsearch客户端
            es_client = get_elasticsearch_client()
            if not es_client.is_connected():
                return {
                    'success': False,
                    'message': 'Elasticsearch服务不可用',
                    'data': {
                        'results': [],
                        'total': 0,
                        'page': 1,
                        'size': 10,
                        'total_pages': 0,
                        'took': 0
                    }
                }, 503
            
            # 执行搜索
            results = es_client.search_documents(
                index_name='knowledge_base_documents',
                query=query,
                filters=filters if filters else None,
                size=size,
                from_=from_,
                highlight=highlight
            )
            
            # 处理搜索结果
            formatted_documents = []
            
            for doc in results['documents']:
                # 清理和格式化文档数据
                formatted_doc = {
                    'id': doc['id'],
                    'title': doc['title'],
                    'content': doc['content'][:500] + '...' if len(doc['content']) > 500 else doc['content'],
                    'category': doc.get('category', ''),
                    'subcategory': doc.get('subcategory', ''),
                    'file_path': doc.get('file_path', ''),
                    'file_name': doc.get('file_name', ''),
                    'file_extension': doc.get('file_extension', ''),
                    'file_size': doc.get('file_size', 0),
                    'created_at': doc.get('created_at', ''),
                    'updated_at': doc.get('updated_at', ''),
                    'content_hash': doc.get('content_hash', ''),
                    'tags': doc.get('tags', []),
                    'description': doc.get('description', ''),
                    'score': doc.get('score', 0)
                }
                
                # 添加高亮信息
                if 'highlight' in doc:
                    formatted_doc['highlight'] = doc['highlight']
                
                formatted_documents.append(formatted_doc)
            
            # 计算分页信息
            total_pages = (results['total'] + size - 1) // size if results['total'] > 0 else 0
            
            # 返回符合前端期望的格式
            response_data = {
                'success': True,
                'data': {
                    'results': formatted_documents,
                    'total': results['total'],
                    'page': page,
                    'size': size,
                    'total_pages': total_pages,
                    'took': results['took']
                },
                'message': f'搜索完成，找到 {results["total"]} 个相关文档'
            }
            
            logger.info(f"搜索完成: 关键词='{query}', 结果数={results['total']}, 耗时={results['took']}ms")
            return response_data
            
        except Exception as e:
            logger.error(f"搜索失败: {e}")
            return {
                'success': False,
                'message': f'搜索失败: {str(e)}',
                'data': {
                    'results': [],
                    'total': 0,
                    'page': 1,
                    'size': 10,
                    'total_pages': 0,
                    'took': 0
                }
            }, 500


@search_ns.route('/suggestions')
class SearchSuggestionsResource(Resource):
    """搜索建议资源"""
    
    @search_ns.marshal_with(suggestion_response_model)
    def get(self):
        """
        获取搜索建议
        ---
        根据输入的文本前缀获取搜索建议
        """
        try:
            text = request.args.get('text', '').strip()
            if not text:
                return {'suggestions': []}
            
            # 获取Elasticsearch客户端
            es_client = get_elasticsearch_client()
            if not es_client.is_connected():
                return {'error': 'Elasticsearch服务不可用'}, 503
            
            # 获取搜索建议
            suggestions = es_client.suggest_completions(
                index_name='knowledge_base_documents',
                text=text,
                field='title'
            )
            
            return {'suggestions': suggestions}
            
        except Exception as e:
            logger.error(f"获取搜索建议失败: {e}")
            return {'error': f'获取搜索建议失败: {str(e)}'}, 500


@search_ns.route('/categories')
class SearchCategoriesResource(Resource):
    """搜索分类资源"""
    
    def get(self):
        """
        获取所有文档分类
        ---
        返回索引中所有可用的文档分类和子分类
        """
        try:
            # 获取Elasticsearch客户端
            es_client = get_elasticsearch_client()
            if not es_client.is_connected():
                return {'error': 'Elasticsearch服务不可用'}, 503
            
            # 构建聚合查询获取分类信息
            search_body = {
                "size": 0,
                "aggs": {
                    "categories": {
                        "terms": {
                            "field": "category",
                            "size": 100
                        },
                        "aggs": {
                            "subcategories": {
                                "terms": {
                                    "field": "subcategory",
                                    "size": 100
                                }
                            }
                        }
                    },
                    "file_extensions": {
                        "terms": {
                            "field": "file_extension",
                            "size": 20
                        }
                    }
                }
            }
            
            response = es_client.es.search(
                index='knowledge_base_documents',
                body=search_body
            )
            
            # 处理聚合结果
            categories = {}
            for bucket in response['aggregations']['categories']['buckets']:
                category_name = bucket['key']
                subcategories = [
                    sub_bucket['key'] 
                    for sub_bucket in bucket['subcategories']['buckets']
                ]
                categories[category_name] = subcategories
            
            file_extensions = [
                bucket['key'] 
                for bucket in response['aggregations']['file_extensions']['buckets']
            ]
            
            return {
                'categories': categories,
                'file_extensions': file_extensions
            }
            
        except Exception as e:
            logger.error(f"获取分类信息失败: {e}")
            return {'error': f'获取分类信息失败: {str(e)}'}, 500


@search_ns.route('/stats')
class SearchStatsResource(Resource):
    """搜索统计资源"""
    
    @search_ns.marshal_with(index_stats_model)
    def get(self):
        """
        获取搜索索引统计信息
        ---
        返回Elasticsearch索引的统计信息，包括文档数量、索引大小等
        """
        try:
            # 获取Elasticsearch客户端
            es_client = get_elasticsearch_client()
            if not es_client.is_connected():
                return {'error': 'Elasticsearch服务不可用'}, 503
            
            # 检查索引是否存在
            index_name = 'knowledge_base_documents'
            if not es_client.es.indices.exists(index=index_name):
                return {
                    'exists': False,
                    'document_count': 0,
                    'index_size': 0,
                    'created': False
                }
            
            # 获取数据库中的文档总数
            document_service = DocumentService()
            db_stats = document_service.get_document_statistics()
            
            # 获取索引统计信息
            stats = es_client.es.indices.stats(index=index_name)
            
            return {
                'exists': True,
                'document_count': db_stats['total_documents'],
                'index_size': stats['indices'][index_name]['total']['store']['size_in_bytes'],
                'created': True
            }
            
        except Exception as e:
            logger.error(f"获取索引统计失败: {e}")
            return {'error': f'获取索引统计失败: {str(e)}'}, 500


@search_ns.route('/reindex')
class SearchReindexResource(Resource):
    """重新索引资源"""
    
    def post(self):
        """
        重新索引所有文档
        ---
        重新扫描company_knowledge_base目录并更新Elasticsearch索引
        """
        try:
            # 导入索引器
            import sys
            import os
            sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
            
            from scripts.elasticsearch_indexer import DocumentIndexer
            
            # 创建索引器并执行重新索引
            knowledge_base_path = "/root/knowledge-base-app/company_knowledge_base"
            indexer = DocumentIndexer(knowledge_base_path)
            
            success = indexer.reindex_all()
            
            if success:
                stats = indexer.get_index_stats()
                return {
                    'success': True,
                    'message': '重新索引完成',
                    'stats': stats
                }
            else:
                return {'error': '重新索引失败'}, 500
                
        except Exception as e:
            logger.error(f"重新索引失败: {e}")
            return {'error': f'重新索引失败: {str(e)}'}, 500