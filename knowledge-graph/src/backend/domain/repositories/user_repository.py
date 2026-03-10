"""
用户仓储接口
"""
from abc import ABC, abstractmethod
from typing import Optional, List

from domain.entities.user import User


class UserRepository(ABC):
    """用户仓储接口"""
    
    @abstractmethod
    def save(self, user: User) -> User:
        """保存用户"""
        pass
    
    @abstractmethod
    def find_by_id(self, user_id: str) -> Optional[User]:
        """根据ID查找用户"""
        pass
    
    @abstractmethod
    def find_by_username(self, username: str) -> Optional[User]:
        """根据用户名查找用户"""
        pass
    
    @abstractmethod
    def find_by_email(self, email: str) -> Optional[User]:
        """根据邮箱查找用户"""
        pass
    
    @abstractmethod
    def find_all(self, page: int = 1, size: int = 20) -> List[User]:
        """查找所有用户"""
        pass
    
    @abstractmethod
    def update(self, user: User) -> User:
        """更新用户"""
        pass
    
    @abstractmethod
    def delete(self, user_id: str) -> bool:
        """删除用户"""
        pass
    
    @abstractmethod
    def exists_by_username(self, username: str) -> bool:
        """检查用户名是否存在"""
        pass
    
    @abstractmethod
    def exists_by_email(self, email: str) -> bool:
        """检查邮箱是否存在"""
        pass