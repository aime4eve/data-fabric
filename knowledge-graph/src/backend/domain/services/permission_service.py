"""权限领域服务（占位）"""
from typing import List
from uuid import UUID

from domain.entities.permission_rule import PermissionRule
from domain.entities.permission_config import PermissionConfig
from domain.repositories.permission_repository import PermissionRepository


class PermissionService:
    def __init__(self, permission_repository: PermissionRepository):
        self.permission_repository = permission_repository

    async def get_permissions(self, directory_id: UUID) -> PermissionConfig:
        existing = await self.permission_repository.find_by_directory_id(directory_id)
        if existing:
            return existing
        return PermissionConfig.create(directory_id, [])

    async def set_permissions(self, directory_id: UUID, rules: List[PermissionRule]) -> PermissionConfig:
        config = PermissionConfig.create(directory_id, rules)
        return await self.permission_repository.save(config)