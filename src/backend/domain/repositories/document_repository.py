"""
文档仓储接口
"""
from abc import ABC, abstractmethod
from typing import List, Optional
from datetime import datetime

from domain.entities.document import Document, DocumentStatus


class DocumentRepository(ABC):
    """文档仓储接口"""
    
    @abstractmethod
    def save(self, document: Document) -> Document:
        """保存文档"""
        pass
    
    @abstractmethod
    def find_by_id(self, document_id: str) -> Optional[Document]:
        """根据ID查找文档"""
        pass
    
    @abstractmethod
    def find_by_category_id(self, category_id: str) -> List[Document]:
        """根据分类ID查找文档"""
        pass
    
    @abstractmethod
    def find_by_author_id(self, author_id: str) -> List[Document]:
        """根据作者ID查找文档"""
        pass
    
    @abstractmethod
    def find_by_status(self, status: DocumentStatus) -> List[Document]:
        """根据状态查找文档"""
        pass
    
    @abstractmethod
    def count_by_status(self, status: str) -> int:
        """根据状态计算文档数量"""
        pass

    @abstractmethod
    def find_all(self, page: int = 1, size: int = 20) -> List[Document]:
        """分页查找所有文档"""
        pass
    
    @abstractmethod
    def search_by_title(self, title: str) -> List[Document]:
        """根据标题搜索文档"""
        pass
    
    @abstractmethod
    def search_documents(self, query: str, category_id: str = None, author_id: str = None, 
                        status: DocumentStatus = None, page: int = 1, size: int = 20) -> List[Document]:
        """全文搜索文档"""
        pass
    
    @abstractmethod
    def search_by_content(self, content: str) -> List[Document]:
        """根据内容搜索文档"""
        pass
    
    @abstractmethod
    def update(self, document: Document) -> Document:
        """更新文档"""
        pass
    
    @abstractmethod
    def delete(self, document_id: str) -> bool:
        """删除文档"""
        pass
    
    @abstractmethod
    def exists(self, document_id: str) -> bool:
        """检查文档是否存在"""
        pass
    
    @abstractmethod
    def count_by_category(self, category_id: str) -> int:
        """统计分类下的文档数量"""
        pass
    
    @abstractmethod
    def count_by_author(self, author_id: str) -> int:
        """统计作者的文档数量"""
        pass
    
    @abstractmethod
    def count_by_status(self, status: DocumentStatus = None) -> int:
        """统计指定状态的文档数量"""
        pass
    
    @abstractmethod
    def get_document_statistics(self) -> dict:
        """获取文档统计信息"""
        pass