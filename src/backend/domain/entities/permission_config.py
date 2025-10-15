"""权限配置实体（占位）"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional
from uuid import UUID, uuid4

from .permission_rule import PermissionRule


@dataclass
class PermissionConfig:
    id: UUID
    directory_id: UUID
    rules: List[PermissionRule] = field(default_factory=list)
    version: int = 0
    created_at: datetime = datetime.utcnow()
    updated_at: datetime = datetime.utcnow()

    @staticmethod
    def create(directory_id: UUID, rules: Optional[List[PermissionRule]] = None) -> "PermissionConfig":
        return PermissionConfig(
            id=uuid4(),
            directory_id=directory_id,
            rules=rules or [],
            version=0,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )