"""目录仓库接口"""
from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID

from ..entities.directory import Directory


class DirectoryRepository(ABC):
    """目录仓库接口"""
    
    @abstractmethod
    async def save(self, directory: Directory) -> Directory:
        """保存目录"""
        pass
    
    @abstractmethod
    async def find_by_id(self, directory_id: UUID) -> Optional[Directory]:
        """根据ID查找目录"""
        pass
    
    @abstractmethod
    async def find_by_path(self, path: str) -> Optional[Directory]:
        """根据路径查找目录"""
        pass
    
    @abstractmethod
    async def find_by_parent_id(self, parent_id: Optional[UUID]) -> List[Directory]:
        """根据父目录ID查找子目录"""
        pass
    
    @abstractmethod
    async def find_all_children(self, parent_id: UUID) -> List[Directory]:
        """查找所有子目录（递归）"""
        pass
    
    @abstractmethod
    async def find_root_directories(self) -> List[Directory]:
        """查找根目录"""
        pass
    
    @abstractmethod
    async def exists_by_path(self, path: str) -> bool:
        """检查路径是否存在"""
        pass
    
    @abstractmethod
    async def exists_by_name_and_parent(self, name: str, parent_id: Optional[UUID]) -> bool:
        """检查同级目录中是否存在同名目录"""
        pass
    
    @abstractmethod
    async def delete_by_id(self, directory_id: UUID) -> bool:
        """根据ID删除目录"""
        pass
    
    @abstractmethod
    async def update_sort_orders(self, directories: List[Directory]) -> None:
        """批量更新排序顺序"""
        pass
    
    @abstractmethod
    async def count_by_parent_id(self, parent_id: Optional[UUID]) -> int:
        """统计子目录数量"""
        pass