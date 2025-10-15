"""权限配置仓库接口（占位）"""
from abc import ABC, abstractmethod
from typing import Optional
from uuid import UUID

from ..entities.permission_config import PermissionConfig


class PermissionRepository(ABC):
    @abstractmethod
    async def save(self, config: PermissionConfig) -> PermissionConfig:
        pass

    @abstractmethod
    async def find_by_directory_id(self, directory_id: UUID) -> Optional[PermissionConfig]:
        pass

    @abstractmethod
    async def delete_by_directory_id(self, directory_id: UUID) -> bool:
        pass