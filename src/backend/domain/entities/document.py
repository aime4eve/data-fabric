"""
文档实体类
"""
from datetime import datetime
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from enum import Enum

from shared_kernel.utils.uuid_utils import generate_uuid


class DocumentStatus(Enum):
    """文档状态枚举"""
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"
    DELETED = "deleted"


@dataclass
class Document:
    """文档实体"""
    
    id: str
    title: str
    content_path: str
    category_id: str
    author_id: str
    status: DocumentStatus
    metadata: Dict[str, Any]
    created_at: datetime
    updated_at: datetime
    
    def __init__(
        self,
        title: str,
        content_path: str,
        category_id: str,
        author_id: str,
        status: DocumentStatus = DocumentStatus.DRAFT,
        metadata: Optional[Dict[str, Any]] = None,
        id: Optional[str] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None
    ):
        self.id = id or generate_uuid()
        self.title = title
        self.content_path = content_path
        self.category_id = category_id
        self.author_id = author_id
        self.status = status
        self.metadata = metadata or {}
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()
    
    def update_title(self, new_title: str) -> None:
        """更新文档标题"""
        self.title = new_title
        self.updated_at = datetime.utcnow()
    
    def update_content_path(self, new_path: str) -> None:
        """更新文档内容路径"""
        self.content_path = new_path
        self.updated_at = datetime.utcnow()
    
    def update_category(self, new_category_id: str) -> None:
        """更新文档分类"""
        self.category_id = new_category_id
        self.updated_at = datetime.utcnow()
    
    def update_status(self, new_status: DocumentStatus) -> None:
        """更新文档状态"""
        self.status = new_status
        self.updated_at = datetime.utcnow()
    
    def update_metadata(self, new_metadata: Dict[str, Any]) -> None:
        """更新文档元数据"""
        self.metadata.update(new_metadata)
        self.updated_at = datetime.utcnow()
    
    def publish(self) -> None:
        """发布文档"""
        self.status = DocumentStatus.PUBLISHED
        self.updated_at = datetime.utcnow()
    
    def archive(self) -> None:
        """归档文档"""
        self.status = DocumentStatus.ARCHIVED
        self.updated_at = datetime.utcnow()
    
    def soft_delete(self) -> None:
        """软删除文档"""
        self.status = DocumentStatus.DELETED
        self.updated_at = datetime.utcnow()
    
    def is_published(self) -> bool:
        """检查文档是否已发布"""
        return self.status == DocumentStatus.PUBLISHED
    
    def is_editable(self) -> bool:
        """检查文档是否可编辑"""
        return self.status in [DocumentStatus.DRAFT, DocumentStatus.PUBLISHED]


@dataclass
class DocumentVersion:
    """文档版本实体"""
    
    id: str
    document_id: str
    version_number: str
    content_path: str
    change_log: str
    created_at: datetime
    
    def __init__(
        self,
        document_id: str,
        version_number: str,
        content_path: str,
        change_log: str = "",
        id: Optional[str] = None,
        created_at: Optional[datetime] = None
    ):
        self.id = id or generate_uuid()
        self.document_id = document_id
        self.version_number = version_number
        self.content_path = content_path
        self.change_log = change_log
        self.created_at = created_at or datetime.utcnow()


@dataclass
class Tag:
    """标签实体"""
    
    id: str
    name: str
    
    def __init__(
        self,
        name: str,
        id: Optional[str] = None
    ):
        self.id = id or generate_uuid()
        self.name = name