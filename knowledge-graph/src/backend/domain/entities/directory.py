"""目录实体"""
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import UUID, uuid4

from ..value_objects.directory_path import DirectoryPath


@dataclass
class Directory:
    """目录实体 - 管理company_knowledge_base目录结构"""
    
    id: UUID
    name: str
    path: DirectoryPath  # 相对于company_knowledge_base的路径
    full_path: str  # 完整的文件系统路径
    parent_id: Optional[UUID]
    level: int  # 目录层级，根目录为0
    sort_order: int = 0
    description: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime = None
    updated_at: datetime = None
    
    def __post_init__(self):
        if self.id is None:
            self.id = uuid4()
        if self.created_at is None:
            self.created_at = datetime.utcnow()
        if self.updated_at is None:
            self.updated_at = datetime.utcnow()
    
    @classmethod
    def create(
        cls,
        name: str,
        path: str,
        full_path: str,
        parent_id: Optional[UUID] = None,
        level: int = 0,
        sort_order: int = 0,
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> 'Directory':
        """创建新目录"""
        return cls(
            id=uuid4(),
            name=name,
            path=DirectoryPath(path),
            full_path=full_path,
            parent_id=parent_id,
            level=level,
            sort_order=sort_order,
            description=description,
            metadata=metadata or {},
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
    
    def update_name(self, name: str) -> None:
        """更新目录名称"""
        self.name = name
        self.updated_at = datetime.utcnow()
    
    def update_description(self, description: str) -> None:
        """更新目录描述"""
        self.description = description
        self.updated_at = datetime.utcnow()
    
    def update_sort_order(self, sort_order: int) -> None:
        """更新排序顺序"""
        self.sort_order = sort_order
        self.updated_at = datetime.utcnow()
    
    def update_metadata(self, metadata: Dict[str, Any]) -> None:
        """更新元数据"""
        self.metadata = metadata
        self.updated_at = datetime.utcnow()
    
    def is_root(self) -> bool:
        """判断是否为根目录"""
        return self.parent_id is None and self.level == 0
    
    def is_child_of(self, parent_id: UUID) -> bool:
        """判断是否为指定目录的子目录"""
        return self.parent_id == parent_id
    
    def get_relative_path(self) -> str:
        """获取相对路径"""
        return self.path.value
    
    def __str__(self) -> str:
        return f"Directory(name={self.name}, path={self.path.value})"
    
    def __repr__(self) -> str:
        return f"Directory(id={self.id}, name={self.name}, path={self.path.value})"