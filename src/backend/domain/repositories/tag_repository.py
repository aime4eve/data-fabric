"""标签仓库接口"""
from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID

from ..entities.tag import Tag


class TagRepository(ABC):
    """标签仓库接口"""
    
    @abstractmethod
    async def save(self, tag: Tag) -> Tag:
        """保存标签"""
        pass
    
    @abstractmethod
    async def find_by_id(self, tag_id: UUID) -> Optional[Tag]:
        """根据ID查找标签"""
        pass
    
    @abstractmethod
    async def find_by_name(self, name: str) -> Optional[Tag]:
        """根据名称查找标签"""
        pass
    
    @abstractmethod
    async def find_by_category(self, category: str) -> List[Tag]:
        """根据分类查找标签"""
        pass
    
    @abstractmethod
    async def find_all(self) -> List[Tag]:
        """查找所有标签"""
        pass
    
    @abstractmethod
    async def find_by_name_pattern(self, pattern: str) -> List[Tag]:
        """根据名称模式查找标签"""
        pass
    
    @abstractmethod
    async def exists_by_name(self, name: str) -> bool:
        """检查标签名称是否存在"""
        pass
    
    @abstractmethod
    async def delete_by_id(self, tag_id: UUID) -> bool:
        """根据ID删除标签"""
        pass
    
    @abstractmethod
    async def count_all(self) -> int:
        """统计标签总数"""
        pass
    
    # 标签关联相关方法
    @abstractmethod
    async def add_directory_tag(self, directory_id: UUID, tag_id: UUID) -> bool:
        """为目录添加标签"""
        pass
    
    @abstractmethod
    async def remove_directory_tag(self, directory_id: UUID, tag_id: UUID) -> bool:
        """移除目录标签"""
        pass
    
    @abstractmethod
    async def find_directory_tags(self, directory_id: UUID) -> List[Tag]:
        """查找目录的所有标签"""
        pass
    
    @abstractmethod
    async def add_file_tag(self, file_id: UUID, tag_id: UUID) -> bool:
        """为文件添加标签"""
        pass
    
    @abstractmethod
    async def remove_file_tag(self, file_id: UUID, tag_id: UUID) -> bool:
        """移除文件标签"""
        pass
    
    @abstractmethod
    async def find_file_tags(self, file_id: UUID) -> List[Tag]:
        """查找文件的所有标签"""
        pass
    
    @abstractmethod
    async def find_directories_by_tag(self, tag_id: UUID) -> List[UUID]:
        """查找使用指定标签的目录ID列表"""
        pass
    
    @abstractmethod
    async def find_files_by_tag(self, tag_id: UUID) -> List[UUID]:
        """查找使用指定标签的文件ID列表"""
        pass