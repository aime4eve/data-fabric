"""标签实体"""
from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4
import re


@dataclass
class Tag:
    """标签实体"""
    
    id: UUID
    name: str
    color: Optional[str] = None  # 标签颜色，格式：#FFFFFF
    description: Optional[str] = None
    category: Optional[str] = None  # 标签分类
    created_at: datetime = None
    updated_at: datetime = None
    
    def __post_init__(self):
        if self.id is None:
            self.id = uuid4()
        if self.created_at is None:
            self.created_at = datetime.utcnow()
        if self.updated_at is None:
            self.updated_at = datetime.utcnow()
        
        # 验证标签名称
        self._validate_name()
        
        # 验证颜色格式
        if self.color:
            self._validate_color()
    
    def _validate_name(self) -> None:
        """验证标签名称"""
        if not self.name or not self.name.strip():
            raise ValueError("标签名称不能为空")
        
        if len(self.name) > 50:
            raise ValueError("标签名称长度不能超过50个字符")
        
        # 标签名称只能包含字母、数字、中文、下划线和连字符
        if not re.match(r'^[\w\u4e00-\u9fff\-]+$', self.name):
            raise ValueError("标签名称只能包含字母、数字、中文、下划线和连字符")
    
    def _validate_color(self) -> None:
        """验证颜色格式"""
        if not re.match(r'^#[0-9A-Fa-f]{6}$', self.color):
            raise ValueError("颜色格式必须为 #RRGGBB")
    
    @classmethod
    def create(
        cls,
        name: str,
        color: Optional[str] = None,
        description: Optional[str] = None,
        category: Optional[str] = None
    ) -> 'Tag':
        """创建新标签"""
        return cls(
            id=uuid4(),
            name=name.strip(),
            color=color,
            description=description,
            category=category,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
    
    def update_name(self, name: str) -> None:
        """更新标签名称"""
        old_name = self.name
        self.name = name.strip()
        try:
            self._validate_name()
            self.updated_at = datetime.utcnow()
        except ValueError:
            self.name = old_name  # 恢复原名称
            raise
    
    def update_color(self, color: Optional[str]) -> None:
        """更新标签颜色"""
        old_color = self.color
        self.color = color
        try:
            if self.color:
                self._validate_color()
            self.updated_at = datetime.utcnow()
        except ValueError:
            self.color = old_color  # 恢复原颜色
            raise
    
    def update_description(self, description: Optional[str]) -> None:
        """更新标签描述"""
        self.description = description
        self.updated_at = datetime.utcnow()
    
    def update_category(self, category: Optional[str]) -> None:
        """更新标签分类"""
        self.category = category
        self.updated_at = datetime.utcnow()
    
    def get_display_name(self) -> str:
        """获取显示名称"""
        if self.category:
            return f"{self.category}:{self.name}"
        return self.name
    
    def __str__(self) -> str:
        return f"Tag(name={self.name})"
    
    def __repr__(self) -> str:
        return f"Tag(id={self.id}, name={self.name}, category={self.category})"