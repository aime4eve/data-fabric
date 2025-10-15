"""文件实体"""
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID, uuid4
import os
import mimetypes


@dataclass
class File:
    """文件实体 - 管理上传到目录中的文件"""
    
    id: UUID
    name: str  # 文件名
    original_name: str  # 原始文件名
    file_path: str  # 相对于company_knowledge_base的文件路径
    full_path: str  # 完整的文件系统路径
    directory_id: UUID
    file_size: int  # 文件大小（字节）
    file_type: str  # 文件类型/MIME类型
    file_extension: str  # 文件扩展名
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
        original_name: str,
        file_path: str,
        full_path: str,
        directory_id: UUID,
        file_size: int,
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> 'File':
        """创建新文件"""
        # 自动检测文件类型和扩展名
        file_extension = os.path.splitext(original_name)[1].lower()
        file_type, _ = mimetypes.guess_type(original_name)
        if not file_type:
            file_type = 'application/octet-stream'
        
        return cls(
            id=uuid4(),
            name=name,
            original_name=original_name,
            file_path=file_path,
            full_path=full_path,
            directory_id=directory_id,
            file_size=file_size,
            file_type=file_type,
            file_extension=file_extension,
            description=description,
            metadata=metadata or {},
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
    
    def update_name(self, name: str) -> None:
        """更新文件名"""
        self.name = name
        self.updated_at = datetime.utcnow()
    
    def update_description(self, description: str) -> None:
        """更新文件描述"""
        self.description = description
        self.updated_at = datetime.utcnow()
    
    def update_metadata(self, metadata: Dict[str, Any]) -> None:
        """更新元数据"""
        self.metadata = metadata
        self.updated_at = datetime.utcnow()
    
    def is_image(self) -> bool:
        """判断是否为图片文件"""
        return self.file_type.startswith('image/')
    
    def is_document(self) -> bool:
        """判断是否为文档文件"""
        document_types = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain',
            'text/csv'
        ]
        return self.file_type in document_types
    
    def is_text(self) -> bool:
        """判断是否为文本文件"""
        return self.file_type.startswith('text/')
    
    def get_size_formatted(self) -> str:
        """获取格式化的文件大小"""
        size = self.file_size
        units = ['B', 'KB', 'MB', 'GB', 'TB']
        unit_index = 0
        
        while size >= 1024 and unit_index < len(units) - 1:
            size /= 1024
            unit_index += 1
        
        return f"{size:.1f} {units[unit_index]}"
    
    def get_relative_path(self) -> str:
        """获取相对路径"""
        return self.file_path
    
    def __str__(self) -> str:
        return f"File(name={self.name}, path={self.file_path})"
    
    def __repr__(self) -> str:
        return f"File(id={self.id}, name={self.name}, path={self.file_path})"