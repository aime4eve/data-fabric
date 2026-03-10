"""审计事件实体（占位）"""
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, Any, Optional
from uuid import UUID, uuid4


@dataclass
class AuditEvent:
    id: UUID
    actor: str
    action: str
    resource_type: str
    resource_id: str
    metadata: Dict[str, Any]
    created_at: datetime

    @staticmethod
    def create(actor: str, action: str, resource_type: str, resource_id: str, metadata: Optional[Dict[str, Any]] = None) -> "AuditEvent":
        return AuditEvent(
            id=uuid4(),
            actor=actor,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            metadata=metadata or {},
            created_at=datetime.utcnow(),
        )