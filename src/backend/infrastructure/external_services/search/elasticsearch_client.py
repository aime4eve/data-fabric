"""
Elasticsearch客户端配置和连接管理
"""
import os
import logging
from typing import Dict, Any, List, Optional
from elasticsearch import Elasticsearch
from elasticsearch.exceptions import ConnectionError, NotFoundError
import jieba

logger = logging.getLogger(__name__)


class ElasticsearchClient:
    """Elasticsearch客户端管理类"""
    
    def __init__(self):
        self.host = os.getenv('ELASTICSEARCH_HOST', 'localhost')
        self.port = int(os.getenv('ELASTICSEARCH_PORT', '9200'))
        self.es = None
        self._connect()
    
    def _connect(self):
        """建立Elasticsearch连接"""
        try:
            self.es = Elasticsearch(
                [{'host': self.host, 'port': self.port, 'scheme': 'http'}],
                timeout=30,
                max_retries=10,
                retry_on_timeout=True
            )
            
            # 测试连接
            if self.es.ping():
                logger.info(f"Successfully connected to Elasticsearch at {self.host}:{self.port}")
            else:
                logger.error("Failed to ping Elasticsearch")
                
        except Exception as e:
            logger.error(f"Failed to connect to Elasticsearch: {e}")
            self.es = None
    
    def is_connected(self) -> bool:
        """检查连接状态"""
        try:
            return self.es is not None and self.es.ping()
        except:
            return False
    
    def create_index(self, index_name: str, mapping: Dict[str, Any]) -> bool:
        """创建索引"""
        try:
            if self.es.indices.exists(index=index_name):
                logger.info(f"Index {index_name} already exists")
                return True
                
            self.es.indices.create(index=index_name, body=mapping)
            logger.info(f"Created index: {index_name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to create index {index_name}: {e}")
            return False
    
    def delete_index(self, index_name: str) -> bool:
        """删除索引"""
        try:
            if self.es.indices.exists(index=index_name):
                self.es.indices.delete(index=index_name)
                logger.info(f"Deleted index: {index_name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete index {index_name}: {e}")
            return False
    
    def index_document(self, index_name: str, doc_id: str, document: Dict[str, Any]) -> bool:
        """索引单个文档"""
        try:
            # 对中文内容进行分词处理
            if 'content' in document:
                document['content_tokens'] = ' '.join(jieba.cut(document['content']))
            if 'title' in document:
                document['title_tokens'] = ' '.join(jieba.cut(document['title']))
                
            self.es.index(index=index_name, id=doc_id, body=document)
            logger.debug(f"Indexed document {doc_id} in {index_name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to index document {doc_id}: {e}")
            return False
    
    def bulk_index_documents(self, index_name: str, documents: List[Dict[str, Any]]) -> bool:
        """批量索引文档"""
        try:
            from elasticsearch.helpers import bulk
            
            actions = []
            for doc in documents:
                # 对中文内容进行分词处理
                if 'content' in doc:
                    doc['content_tokens'] = ' '.join(jieba.cut(doc['content']))
                if 'title' in doc:
                    doc['title_tokens'] = ' '.join(jieba.cut(doc['title']))
                
                action = {
                    "_index": index_name,
                    "_id": doc.get('id', doc.get('doc_id')),
                    "_source": doc
                }
                actions.append(action)
            
            success, failed = bulk(self.es, actions)
            logger.info(f"Bulk indexed {success} documents, {len(failed)} failed")
            return len(failed) == 0
            
        except Exception as e:
            logger.error(f"Failed to bulk index documents: {e}")
            return False
    
    def search_documents(self, index_name: str, query: str, 
                        filters: Optional[Dict[str, Any]] = None,
                        size: int = 10, from_: int = 0,
                        highlight: bool = True) -> Dict[str, Any]:
        """搜索文档"""
        try:
            # 构建搜索查询
            search_body = {
                "query": {
                    "bool": {
                        "should": [
                            {
                                "multi_match": {
                                    "query": query,
                                    "fields": ["title^3", "content^2", "title_tokens^2", "content_tokens"],
                                    "type": "best_fields",
                                    "fuzziness": "AUTO"
                                }
                            },
                            {
                                "match_phrase": {
                                    "content": {
                                        "query": query,
                                        "boost": 2
                                    }
                                }
                            }
                        ],
                        "minimum_should_match": 1
                    }
                },
                "size": size,
                "from": from_,
                "sort": [
                    {"_score": {"order": "desc"}},
                    {"created_at": {"order": "desc"}}
                ]
            }
            
            # 添加过滤条件
            if filters:
                filter_clauses = []
                for field, value in filters.items():
                    if isinstance(value, list):
                        filter_clauses.append({"terms": {field: value}})
                    else:
                        filter_clauses.append({"term": {field: value}})
                
                if filter_clauses:
                    search_body["query"]["bool"]["filter"] = filter_clauses
            
            # 添加高亮
            if highlight:
                search_body["highlight"] = {
                    "fields": {
                        "title": {"fragment_size": 100, "number_of_fragments": 1},
                        "content": {"fragment_size": 200, "number_of_fragments": 3}
                    },
                    "pre_tags": ["<mark>"],
                    "post_tags": ["</mark>"]
                }
            
            response = self.es.search(index=index_name, body=search_body)
            
            # 处理搜索结果
            results = {
                "total": response["hits"]["total"]["value"],
                "documents": [],
                "took": response["took"]
            }
            
            for hit in response["hits"]["hits"]:
                doc = hit["_source"]
                doc["id"] = hit["_id"]
                doc["score"] = hit["_score"]
                
                # 添加高亮信息
                if "highlight" in hit:
                    doc["highlight"] = hit["highlight"]
                
                results["documents"].append(doc)
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to search documents: {e}")
            return {"total": 0, "documents": [], "took": 0}
    
    def suggest_completions(self, index_name: str, text: str, field: str = "title") -> List[str]:
        """获取搜索建议"""
        try:
            search_body = {
                "suggest": {
                    "completion_suggest": {
                        "prefix": text,
                        "completion": {
                            "field": f"{field}_suggest",
                            "size": 5
                        }
                    }
                }
            }
            
            response = self.es.search(index=index_name, body=search_body)
            suggestions = []
            
            for suggestion in response["suggest"]["completion_suggest"]:
                for option in suggestion["options"]:
                    suggestions.append(option["text"])
            
            return suggestions
            
        except Exception as e:
            logger.error(f"Failed to get suggestions: {e}")
            return []
    
    def get_document_by_id(self, index_name: str, doc_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取文档"""
        try:
            response = self.es.get(index=index_name, id=doc_id)
            doc = response["_source"]
            doc["id"] = response["_id"]
            return doc
            
        except NotFoundError:
            return None
        except Exception as e:
            logger.error(f"Failed to get document {doc_id}: {e}")
            return None
    
    def update_document(self, index_name: str, doc_id: str, updates: Dict[str, Any]) -> bool:
        """更新文档"""
        try:
            # 对更新的中文内容进行分词处理
            if 'content' in updates:
                updates['content_tokens'] = ' '.join(jieba.cut(updates['content']))
            if 'title' in updates:
                updates['title_tokens'] = ' '.join(jieba.cut(updates['title']))
                
            self.es.update(index=index_name, id=doc_id, body={"doc": updates})
            logger.debug(f"Updated document {doc_id} in {index_name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update document {doc_id}: {e}")
            return False
    
    def delete_document(self, index_name: str, doc_id: str) -> bool:
        """删除文档"""
        try:
            self.es.delete(index=index_name, id=doc_id)
            logger.debug(f"Deleted document {doc_id} from {index_name}")
            return True
            
        except NotFoundError:
            logger.warning(f"Document {doc_id} not found for deletion")
            return True
        except Exception as e:
            logger.error(f"Failed to delete document {doc_id}: {e}")
            return False


# 全局Elasticsearch客户端实例
es_client = ElasticsearchClient()


def get_elasticsearch_client() -> ElasticsearchClient:
    """获取Elasticsearch客户端实例"""
    return es_client