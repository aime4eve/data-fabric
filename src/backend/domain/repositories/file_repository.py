"""文件仓库接口"""
from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID

from ..entities.file import File


class FileRepository(ABC):
    """文件仓库接口"""
    
    @abstractmethod
    async def save(self, file: File) -> File:
        """保存文件"""
        pass
    
    @abstractmethod
    async def find_by_id(self, file_id: UUID) -> Optional[File]:
        """根据ID查找文件"""
        pass
    
    @abstractmethod
    async def find_by_path(self, file_path: str) -> Optional[File]:
        """根据文件路径查找文件"""
        pass
    
    @abstractmethod
    async def find_by_directory_id(self, directory_id: UUID) -> List[File]:
        """根据目录ID查找文件"""
        pass
    
    @abstractmethod
    async def find_by_name_pattern(self, pattern: str) -> List[File]:
        """根据文件名模式查找文件"""
        pass
    
    @abstractmethod
    async def find_by_file_type(self, file_type: str) -> List[File]:
        """根据文件类型查找文件"""
        pass
    
    @abstractmethod
    async def find_by_extension(self, extension: str) -> List[File]:
        """根据文件扩展名查找文件"""
        pass
    
    @abstractmethod
    async def exists_by_path(self, file_path: str) -> bool:
        """检查文件路径是否存在"""
        pass
    
    @abstractmethod
    async def exists_by_name_and_directory(self, name: str, directory_id: UUID) -> bool:
        """检查目录中是否存在同名文件"""
        pass
    
    @abstractmethod
    async def delete_by_id(self, file_id: UUID) -> bool:
        """根据ID删除文件"""
        pass
    
    @abstractmethod
    async def delete_by_directory_id(self, directory_id: UUID) -> int:
        """删除目录中的所有文件"""
        pass
    
    @abstractmethod
    async def count_by_directory_id(self, directory_id: UUID) -> int:
        """统计目录中的文件数量"""
        pass
    
    @abstractmethod
    async def get_total_size_by_directory_id(self, directory_id: UUID) -> int:
        """获取目录中所有文件的总大小"""
        pass