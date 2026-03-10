"""权限规则实体（占位）"""
from dataclasses import dataclass
from typing import Optional, Dict, Any


@dataclass
class PermissionRule:
    role: str
    action: str
    effect: str  # allow/deny
    resource_scope: Optional[str] = None
    conditions: Optional[Dict[str, Any]] = None