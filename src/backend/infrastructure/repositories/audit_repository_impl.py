"""审计事件仓储实现"""
from typing import List, Optional
from sqlalchemy.orm import Session

from domain.repositories.audit_repository import AuditRepository
from domain.entities.audit_event import AuditEvent
from infrastructure.persistence.models import AuditEventModel
from infrastructure.persistence.database import get_db


class AuditRepositoryImpl(AuditRepository):
    def __init__(self, db_session: Session = None):
        self.db_session = db_session or get_db()

    async def save(self, event: AuditEvent) -> AuditEvent:
        """保存审计事件"""
        model = AuditEventModel(
            id=event.id,
            actor=event.actor,
            action=event.action,
            resource_type=event.resource_type,
            resource_id=event.resource_id,
            meta_data=event.metadata,
            created_at=event.created_at,
        )
        self.db_session.add(model)
        self.db_session.commit()
        return event

    async def list_events(
        self,
        resource_type: str = None,
        resource_id: str = None,
        actor: str = None,
        action: str = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[AuditEvent]:
        """查询审计事件，支持多条件过滤与分页"""
        query = self.db_session.query(AuditEventModel)
        if resource_type:
            query = query.filter(AuditEventModel.resource_type == resource_type)
        if resource_id:
            query = query.filter(AuditEventModel.resource_id == resource_id)
        if actor:
            query = query.filter(AuditEventModel.actor == actor)
        if action:
            query = query.filter(AuditEventModel.action == action)

        query = query.order_by(AuditEventModel.created_at.desc())
        rows: List[AuditEventModel] = query.offset(offset).limit(limit).all()

        return [
            AuditEvent(
                id=row.id,
                actor=row.actor,
                action=row.action,
                resource_type=row.resource_type,
                resource_id=row.resource_id,
                metadata=row.meta_data or {},
                created_at=row.created_at,
            )
            for row in rows
        ]