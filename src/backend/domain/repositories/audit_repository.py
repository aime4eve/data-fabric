"""审计事件仓库接口（占位）"""
from abc import ABC, abstractmethod
from typing import List

from ..entities.audit_event import AuditEvent


class AuditRepository(ABC):
    @abstractmethod
    async def save(self, event: AuditEvent) -> AuditEvent:
        pass

    @abstractmethod
    async def list_events(self, resource_type: str = None, resource_id: str = None, actor: str = None, action: str = None, limit: int = 50, offset: int = 0) -> List[AuditEvent]:
        pass