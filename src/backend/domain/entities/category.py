"""
分类实体类
"""
from datetime import datetime
from typing import Optional, Dict, Any
from dataclasses import dataclass

from shared_kernel.utils.uuid_utils import generate_uuid


@dataclass
class Category:
    """分类实体"""
    
    id: str
    name: str
    path: str
    parent_id: Optional[str]
    sort_order: int
    permissions: Dict[str, Any]
    created_at: datetime
    updated_at: datetime
    
    def __init__(
        self,
        name: str,
        path: str,
        parent_id: Optional[str] = None,
        sort_order: int = 0,
        permissions: Optional[Dict[str, Any]] = None,
        id: Optional[str] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None
    ):
        self.id = id or generate_uuid()
        self.name = name
        self.path = path
        self.parent_id = parent_id
        self.sort_order = sort_order
        self.permissions = permissions or {}
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()
    
    def update_name(self, new_name: str) -> None:
        """更新分类名称"""
        self.name = new_name
        self.updated_at = datetime.utcnow()
    
    def update_path(self, new_path: str) -> None:
        """更新分类路径"""
        self.path = new_path
        self.updated_at = datetime.utcnow()
    
    def update_sort_order(self, new_order: int) -> None:
        """更新排序"""
        self.sort_order = new_order
        self.updated_at = datetime.utcnow()
    
    def update_permissions(self, new_permissions: Dict[str, Any]) -> None:
        """更新权限"""
        self.permissions = new_permissions
        self.updated_at = datetime.utcnow()
    
    def is_root_category(self) -> bool:
        """检查是否为根分类"""
        return self.parent_id is None
    
    def get_depth_level(self) -> int:
        """获取分类层级深度"""
        return len([p for p in self.path.split('/') if p.strip()])