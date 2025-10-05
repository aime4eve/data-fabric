"""
UUID工具类
"""
import uuid
from typing import Union


def generate_uuid() -> str:
    """生成UUID字符串"""
    return str(uuid.uuid4())


def is_valid_uuid(uuid_string: Union[str, None]) -> bool:
    """验证UUID格式是否有效"""
    if not uuid_string:
        return False
    
    try:
        uuid.UUID(uuid_string)
        return True
    except ValueError:
        return False