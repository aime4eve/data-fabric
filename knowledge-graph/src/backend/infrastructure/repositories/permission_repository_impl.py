"""权限配置仓储实现"""
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session

from domain.repositories.permission_repository import PermissionRepository
from domain.entities.permission_config import PermissionConfig
from domain.entities.permission_rule import PermissionRule
from infrastructure.persistence.models import PermissionConfigModel
from infrastructure.persistence.database import get_db


class PermissionRepositoryImpl(PermissionRepository):
    def __init__(self, db_session: Session = None):
        self.db_session = db_session or get_db()

    async def save(self, config: PermissionConfig) -> PermissionConfig:
        """保存或更新目录的权限配置"""
        # 查找是否已有该目录的权限配置
        existing: PermissionConfigModel = self.db_session.query(PermissionConfigModel).filter(
            PermissionConfigModel.directory_id == config.directory_id
        ).first()

        # 将规则序列化为JSON
        rules_json: List[Dict[str, Any]] = [
            {
                'role': r.role,
                'action': r.action,
                'effect': r.effect,
                'resource_scope': r.resource_scope,
                'conditions': r.conditions,
            }
            for r in (config.rules or [])
        ]

        now = datetime.utcnow()

        if existing:
            existing.rules = rules_json
            # 简单版本策略：每次更新自增版本
            existing.version = (existing.version or 0) + 1
            existing.updated_at = now
            self.db_session.commit()

            # 回填到领域实体
            config.version = existing.version
            config.updated_at = existing.updated_at
            config.id = existing.id
            return config
        else:
            model = PermissionConfigModel(
                id=config.id,
                directory_id=config.directory_id,
                rules=rules_json,
                version=config.version or 0,
                created_at=config.created_at or now,
                updated_at=config.updated_at or now,
            )
            self.db_session.add(model)
            self.db_session.commit()
            return config

    async def find_by_directory_id(self, directory_id: UUID) -> Optional[PermissionConfig]:
        """根据目录ID查询权限配置"""
        model: PermissionConfigModel = self.db_session.query(PermissionConfigModel).filter(
            PermissionConfigModel.directory_id == directory_id
        ).first()
        if not model:
            return None

        rules: List[PermissionRule] = []
        for item in (model.rules or []):
            rules.append(PermissionRule(
                role=item.get('role'),
                action=item.get('action'),
                effect=item.get('effect'),
                resource_scope=item.get('resource_scope'),
                conditions=item.get('conditions'),
            ))

        return PermissionConfig(
            id=model.id,
            directory_id=model.directory_id,
            rules=rules,
            version=model.version or 0,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    async def delete_by_directory_id(self, directory_id: UUID) -> bool:
        """删除目录的权限配置"""
        count = self.db_session.query(PermissionConfigModel).filter(
            PermissionConfigModel.directory_id == directory_id
        ).delete()
        self.db_session.commit()
        return count > 0