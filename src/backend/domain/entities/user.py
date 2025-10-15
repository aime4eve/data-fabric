"""
用户实体类
"""
from datetime import datetime
from typing import Optional
from dataclasses import dataclass

from shared_kernel.utils.uuid_utils import generate_uuid


@dataclass
class User:
    """用户实体"""
    
    id: str
    username: str
    email: str
    password_hash: str
    role: str
    # 扩展资料字段
    full_name: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    avatar_url: Optional[str] = None
    # 为了避免 dataclass 生成 __init__ 时的“non-default argument follows default”错误，
    # 将时间字段声明为可选并提供默认值，由自定义 __init__ 负责填充。
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    def __init__(
        self,
        username: str,
        email: str,
        password_hash: str,
        role: str = 'user',
        id: Optional[str] = None,
        full_name: Optional[str] = None,
        phone: Optional[str] = None,
        department: Optional[str] = None,
        position: Optional[str] = None,
        avatar_url: Optional[str] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None
    ):
        self.id = id or generate_uuid()
        self.username = username
        self.email = email
        self.password_hash = password_hash
        self.role = role
        self.full_name = full_name
        self.phone = phone
        self.department = department
        self.position = position
        self.avatar_url = avatar_url
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()
    
    def update_password(self, new_password_hash: str) -> None:
        """更新密码"""
        self.password_hash = new_password_hash
        self.updated_at = datetime.utcnow()
    
    def update_role(self, new_role: str) -> None:
        """更新角色"""
        self.role = new_role
        self.updated_at = datetime.utcnow()
    
    def is_admin(self) -> bool:
        """检查是否为管理员"""
        return self.role == 'admin'
    
    def is_manager(self) -> bool:
        """检查是否为管理者"""
        return self.role in ['admin', 'manager']