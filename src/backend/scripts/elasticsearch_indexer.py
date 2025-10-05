"""
Elasticsearch文档索引器
扫描company_knowledge_base目录并将文档内容索引到Elasticsearch
"""
import os
import sys
import json
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime
import hashlib

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from infrastructure.external_services.search import get_elasticsearch_client

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 支持的文件类型
SUPPORTED_EXTENSIONS = {'.txt', '.md', '.doc', '.docx', '.pdf', '.json', '.xml', '.html'}

# 文档索引映射配置
DOCUMENT_INDEX_MAPPING = {
    "mappings": {
        "properties": {
            "title": {
                "type": "text",
                "analyzer": "standard",
                "fields": {
                    "keyword": {"type": "keyword"},
                    "suggest": {
                        "type": "completion",
                        "analyzer": "simple"
                    }
                }
            },
            "content": {
                "type": "text",
                "analyzer": "standard"
            },
            "title_tokens": {
                "type": "text",
                "analyzer": "standard"
            },
            "content_tokens": {
                "type": "text", 
                "analyzer": "standard"
            },
            "category": {
                "type": "keyword"
            },
            "subcategory": {
                "type": "keyword"
            },
            "file_path": {
                "type": "keyword"
            },
            "file_name": {
                "type": "keyword"
            },
            "file_extension": {
                "type": "keyword"
            },
            "file_size": {
                "type": "long"
            },
            "created_at": {
                "type": "date"
            },
            "updated_at": {
                "type": "date"
            },
            "content_hash": {
                "type": "keyword"
            },
            "tags": {
                "type": "keyword"
            },
            "description": {
                "type": "text"
            }
        }
    },
    "settings": {
        "number_of_shards": 1,
        "number_of_replicas": 0,
        "analysis": {
            "analyzer": {
                "chinese_analyzer": {
                    "type": "standard"
                }
            }
        }
    }
}


class DocumentIndexer:
    """文档索引器"""
    
    def __init__(self, knowledge_base_path: str, index_name: str = "knowledge_base_documents"):
        self.knowledge_base_path = Path(knowledge_base_path)
        self.index_name = index_name
        self.es_client = get_elasticsearch_client()
        
        if not self.es_client.is_connected():
            raise ConnectionError("无法连接到Elasticsearch")
    
    def initialize_index(self) -> bool:
        """初始化索引"""
        logger.info(f"初始化索引: {self.index_name}")
        
        # 删除现有索引（如果存在）
        if self.es_client.es.indices.exists(index=self.index_name):
            logger.info(f"删除现有索引: {self.index_name}")
            self.es_client.delete_index(self.index_name)
        
        # 创建新索引
        return self.es_client.create_index(self.index_name, DOCUMENT_INDEX_MAPPING)
    
    def extract_category_info(self, file_path: Path) -> Dict[str, str]:
        """从文件路径提取分类信息"""
        relative_path = file_path.relative_to(self.knowledge_base_path)
        parts = relative_path.parts
        
        category = ""
        subcategory = ""
        
        if len(parts) >= 2:
            category = parts[0]  # 一级目录
            if len(parts) >= 3:
                subcategory = parts[1]  # 二级目录
        
        return {
            "category": category,
            "subcategory": subcategory
        }
    
    def read_file_content(self, file_path: Path) -> Optional[str]:
        """读取文件内容"""
        try:
            if file_path.suffix.lower() == '.md':
                with open(file_path, 'r', encoding='utf-8') as f:
                    return f.read()
            elif file_path.suffix.lower() == '.txt':
                with open(file_path, 'r', encoding='utf-8') as f:
                    return f.read()
            elif file_path.suffix.lower() == '.json':
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    return json.dumps(data, ensure_ascii=False, indent=2)
            else:
                # 对于其他文件类型，返回基本信息
                return f"文件类型: {file_path.suffix}\n文件大小: {file_path.stat().st_size} bytes"
                
        except Exception as e:
            logger.error(f"读取文件失败 {file_path}: {e}")
            return None
    
    def generate_document_title(self, file_path: Path) -> str:
        """生成文档标题"""
        # 使用文件名（不含扩展名）作为标题
        title = file_path.stem
        
        # 如果是README文件，使用父目录名
        if title.lower().startswith('readme'):
            parent_name = file_path.parent.name
            if parent_name != self.knowledge_base_path.name:
                title = f"{parent_name} - {title}"
        
        return title
    
    def generate_content_hash(self, content: str) -> str:
        """生成内容哈希"""
        return hashlib.md5(content.encode('utf-8')).hexdigest()
    
    def extract_tags_from_path(self, file_path: Path) -> List[str]:
        """从路径提取标签"""
        tags = []
        relative_path = file_path.relative_to(self.knowledge_base_path)
        
        # 添加目录名作为标签
        for part in relative_path.parts[:-1]:  # 排除文件名
            if part and not part.startswith('.'):
                tags.append(part)
        
        # 添加文件类型标签
        if file_path.suffix:
            tags.append(f"文件类型:{file_path.suffix[1:]}")
        
        return tags
    
    def create_document(self, file_path: Path) -> Optional[Dict[str, Any]]:
        """创建文档对象"""
        try:
            # 读取文件内容
            content = self.read_file_content(file_path)
            if content is None:
                return None
            
            # 获取文件统计信息
            stat = file_path.stat()
            
            # 提取分类信息
            category_info = self.extract_category_info(file_path)
            
            # 创建文档
            document = {
                "title": self.generate_document_title(file_path),
                "content": content,
                "category": category_info["category"],
                "subcategory": category_info["subcategory"],
                "file_path": str(file_path.relative_to(self.knowledge_base_path)),
                "file_name": file_path.name,
                "file_extension": file_path.suffix.lower(),
                "file_size": stat.st_size,
                "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                "updated_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "content_hash": self.generate_content_hash(content),
                "tags": self.extract_tags_from_path(file_path),
                "description": f"来自 {category_info['category']} 的文档"
            }
            
            # 生成文档ID
            document["id"] = hashlib.md5(str(file_path).encode('utf-8')).hexdigest()
            
            return document
            
        except Exception as e:
            logger.error(f"创建文档失败 {file_path}: {e}")
            return None
    
    def scan_directory(self) -> List[Dict[str, Any]]:
        """扫描目录获取所有文档"""
        documents = []
        
        logger.info(f"扫描目录: {self.knowledge_base_path}")
        
        for file_path in self.knowledge_base_path.rglob('*'):
            if file_path.is_file() and file_path.suffix.lower() in SUPPORTED_EXTENSIONS:
                document = self.create_document(file_path)
                if document:
                    documents.append(document)
                    logger.debug(f"添加文档: {file_path}")
        
        logger.info(f"找到 {len(documents)} 个文档")
        return documents
    
    def index_documents(self, documents: List[Dict[str, Any]]) -> bool:
        """索引文档到Elasticsearch"""
        if not documents:
            logger.warning("没有文档需要索引")
            return True
        
        logger.info(f"开始索引 {len(documents)} 个文档")
        
        # 批量索引
        success = self.es_client.bulk_index_documents(self.index_name, documents)
        
        if success:
            logger.info(f"成功索引 {len(documents)} 个文档")
        else:
            logger.error("文档索引失败")
        
        return success
    
    def reindex_all(self) -> bool:
        """重新索引所有文档"""
        try:
            # 初始化索引
            if not self.initialize_index():
                logger.error("索引初始化失败")
                return False
            
            # 扫描文档
            documents = self.scan_directory()
            
            # 索引文档
            return self.index_documents(documents)
            
        except Exception as e:
            logger.error(f"重新索引失败: {e}")
            return False
    
    def get_index_stats(self) -> Dict[str, Any]:
        """获取索引统计信息"""
        try:
            if not self.es_client.es.indices.exists(index=self.index_name):
                return {"exists": False}
            
            stats = self.es_client.es.indices.stats(index=self.index_name)
            count = self.es_client.es.count(index=self.index_name)
            
            return {
                "exists": True,
                "document_count": count["count"],
                "index_size": stats["indices"][self.index_name]["total"]["store"]["size_in_bytes"],
                "created": True
            }
            
        except Exception as e:
            logger.error(f"获取索引统计失败: {e}")
            return {"exists": False, "error": str(e)}


def main():
    """主函数"""
    # 配置路径
    knowledge_base_path = "/root/knowledge-base-app/company_knowledge_base"
    
    if not os.path.exists(knowledge_base_path):
        logger.error(f"知识库路径不存在: {knowledge_base_path}")
        return False
    
    try:
        # 创建索引器
        indexer = DocumentIndexer(knowledge_base_path)
        
        # 获取当前索引状态
        stats = indexer.get_index_stats()
        logger.info(f"当前索引状态: {stats}")
        
        # 重新索引
        success = indexer.reindex_all()
        
        if success:
            # 显示最终统计
            final_stats = indexer.get_index_stats()
            logger.info(f"索引完成，最终统计: {final_stats}")
        
        return success
        
    except Exception as e:
        logger.error(f"索引过程失败: {e}")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)