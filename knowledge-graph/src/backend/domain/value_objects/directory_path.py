"""目录路径值对象"""
from dataclasses import dataclass
from typing import List
import os


@dataclass(frozen=True)
class DirectoryPath:
    """目录路径值对象"""
    
    value: str
    
    def __post_init__(self):
        if not self.value:
            raise ValueError("目录路径不能为空")
        
        # 标准化路径格式
        normalized = os.path.normpath(self.value).replace('\\', '/')
        if normalized.startswith('/'):
            normalized = normalized[1:]
        
        object.__setattr__(self, 'value', normalized)
    
    @classmethod
    def from_parts(cls, parts: List[str]) -> 'DirectoryPath':
        """从路径部分列表创建路径"""
        if not parts:
            return cls("")
        
        # 过滤空字符串和None
        clean_parts = [part for part in parts if part and part.strip()]
        path = '/'.join(clean_parts)
        return cls(path)
    
    def get_parts(self) -> List[str]:
        """获取路径部分列表"""
        if not self.value:
            return []
        return self.value.split('/')
    
    def get_parent_path(self) -> 'DirectoryPath':
        """获取父目录路径"""
        parts = self.get_parts()
        if len(parts) <= 1:
            return DirectoryPath("")
        return DirectoryPath.from_parts(parts[:-1])
    
    def get_name(self) -> str:
        """获取目录名称（路径的最后一部分）"""
        parts = self.get_parts()
        return parts[-1] if parts else ""
    
    def join(self, name: str) -> 'DirectoryPath':
        """连接子路径"""
        if not name or not name.strip():
            return self
        
        if not self.value:
            return DirectoryPath(name)
        
        return DirectoryPath(f"{self.value}/{name}")
    
    def is_child_of(self, parent: 'DirectoryPath') -> bool:
        """判断是否为指定路径的子路径"""
        if not parent.value:
            return True  # 空路径是所有路径的父路径
        
        if not self.value:
            return False
        
        return self.value.startswith(f"{parent.value}/")
    
    def get_depth(self) -> int:
        """获取路径深度"""
        if not self.value:
            return 0
        return len(self.get_parts())
    
    def __str__(self) -> str:
        return self.value
    
    def __repr__(self) -> str:
        return f"DirectoryPath('{self.value}')"