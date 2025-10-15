"""
用户仓储实现
"""
from typing import Optional, List
from sqlalchemy.orm import Session
import uuid

from domain.entities.user import User
from domain.repositories.user_repository import UserRepository
from infrastructure.persistence.models import UserModel
from infrastructure.persistence.database import db


class UserRepositoryImpl(UserRepository):
    """用户仓储实现"""
    
    def __init__(self, session: Optional[Session] = None):
        self.session = session or db.session
    
    def save(self, user: User) -> User:
        """保存用户"""
        # 将字符串UUID转换为uuid.UUID以适配数据库模型
        user_id_uuid = uuid.UUID(user.id) if isinstance(user.id, str) else user.id
        user_model = UserModel(
            id=user_id_uuid,
            username=user.username,
            email=user.email,
            password_hash=user.password_hash,
            role=user.role,
            full_name=user.full_name,
            phone=user.phone,
            department=user.department,
            position=user.position,
            avatar_url=user.avatar_url,
            created_at=user.created_at,
            updated_at=user.updated_at
        )
        
        self.session.add(user_model)
        self.session.commit()
        
        return self._model_to_entity(user_model)
    
    def find_by_id(self, user_id: str) -> Optional[User]:
        """根据ID查找用户"""
        # 将字符串UUID转换为uuid.UUID以进行查询
        try:
            user_id_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
        except (ValueError, TypeError):
            return None
        user_model = self.session.query(UserModel).filter_by(id=user_id_uuid).first()
        return self._model_to_entity(user_model) if user_model else None
    
    def find_by_username(self, username: str) -> Optional[User]:
        """根据用户名查找用户"""
        user_model = self.session.query(UserModel).filter_by(username=username).first()
        return self._model_to_entity(user_model) if user_model else None
    
    def find_by_email(self, email: str) -> Optional[User]:
        """根据邮箱查找用户"""
        user_model = self.session.query(UserModel).filter_by(email=email).first()
        return self._model_to_entity(user_model) if user_model else None
    
    def find_all(self, page: int = 1, size: int = 20) -> List[User]:
        """查找所有用户"""
        offset = (page - 1) * size
        user_models = self.session.query(UserModel).offset(offset).limit(size).all()
        return [self._model_to_entity(model) for model in user_models]
    
    def update(self, user: User) -> User:
        """更新用户"""
        try:
            user_id_uuid = uuid.UUID(user.id) if isinstance(user.id, str) else user.id
        except (ValueError, TypeError):
            raise ValueError(f"User with id {user.id} not found")
        user_model = self.session.query(UserModel).filter_by(id=user_id_uuid).first()
        if not user_model:
            raise ValueError(f"User with id {user.id} not found")
        
        user_model.username = user.username
        user_model.email = user.email
        user_model.password_hash = user.password_hash
        user_model.role = user.role
        user_model.full_name = user.full_name
        user_model.phone = user.phone
        user_model.department = user.department
        user_model.position = user.position
        user_model.avatar_url = user.avatar_url
        user_model.updated_at = user.updated_at
        
        self.session.commit()
        return self._model_to_entity(user_model)
    
    def delete(self, user_id: str) -> bool:
        """删除用户"""
        try:
            user_id_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
        except (ValueError, TypeError):
            return False
        user_model = self.session.query(UserModel).filter_by(id=user_id_uuid).first()
        if not user_model:
            return False
        
        self.session.delete(user_model)
        self.session.commit()
        return True
    
    def exists_by_username(self, username: str) -> bool:
        """检查用户名是否存在"""
        return self.session.query(UserModel).filter_by(username=username).first() is not None
    
    def exists_by_email(self, email: str) -> bool:
        """检查邮箱是否存在"""
        return self.session.query(UserModel).filter_by(email=email).first() is not None
    
    def _model_to_entity(self, model: UserModel) -> User:
        """将模型转换为实体"""
        return User(
            id=str(model.id),
            username=model.username,
            email=model.email,
            password_hash=model.password_hash,
            role=model.role,
            full_name=getattr(model, 'full_name', None),
            phone=getattr(model, 'phone', None),
            department=getattr(model, 'department', None),
            position=getattr(model, 'position', None),
            avatar_url=getattr(model, 'avatar_url', None),
            created_at=model.created_at,
            updated_at=model.updated_at
        )