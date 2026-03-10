"""审计应用服务（占位）"""
from typing import List, Dict, Any

from domain.entities.audit_event import AuditEvent
from domain.repositories.audit_repository import AuditRepository


class AuditService:
    def __init__(self, audit_repository: AuditRepository):
        self.audit_repository = audit_repository

    async def record_event(self, actor: str, action: str, resource_type: str, resource_id: str, metadata: Dict[str, Any]) -> AuditEvent:
        event = AuditEvent.create(actor, action, resource_type, resource_id, metadata)
        return await self.audit_repository.save(event)

    async def list_events(self, **filters) -> List[AuditEvent]:
        return await self.audit_repository.list_events(
            resource_type=filters.get('resource_type'),
            resource_id=filters.get('resource_id'),
            actor=filters.get('actor'),
            action=filters.get('action'),
            limit=filters.get('limit', 50),
            offset=filters.get('offset', 0)
        )