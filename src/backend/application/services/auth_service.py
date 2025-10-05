"""
认证服务
"""
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import bcrypt
from flask_jwt_extended import create_access_token, create_refresh_token, decode_token

from domain.entities.user import User
from domain.repositories.user_repository import UserRepository
from shared_kernel.exceptions.auth_exceptions import AuthenticationError, AuthorizationError


class AuthService:
    """认证服务"""
    
    def __init__(self, user_repository: UserRepository):
        self.user_repository = user_repository
    
    def authenticate(self, username_or_email: str, password: str) -> Dict[str, Any]:
        """用户认证"""
        # 查找用户
        user = self._find_user_by_username_or_email(username_or_email)
        if not user:
            raise AuthenticationError("用户名或密码错误")
        
        # 验证密码
        if not self._verify_password(password, user.password_hash):
            raise AuthenticationError("用户名或密码错误")
        
        # 生成令牌
        access_token = create_access_token(
            identity=user.id,
            additional_claims={
                'username': user.username,
                'email': user.email,
                'role': user.role
            }
        )
        
        refresh_token = create_refresh_token(identity=user.id)
        
        return {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role
            }
        }
    
    def register(self, username: str, email: str, password: str, role: str = 'user') -> User:
        """用户注册"""
        # 检查用户名是否已存在
        if self.user_repository.exists_by_username(username):
            raise AuthenticationError("用户名已存在")
        
        # 检查邮箱是否已存在
        if self.user_repository.exists_by_email(email):
            raise AuthenticationError("邮箱已存在")
        
        # 创建用户
        password_hash = self._hash_password(password)
        user = User(
            username=username,
            email=email,
            password_hash=password_hash,
            role=role
        )
        
        return self.user_repository.save(user)
    
    def refresh_token(self, refresh_token: str) -> Dict[str, str]:
        """刷新令牌"""
        try:
            decoded_token = decode_token(refresh_token)
            user_id = decoded_token['sub']
            
            user = self.user_repository.find_by_id(user_id)
            if not user:
                raise AuthenticationError("用户不存在")
            
            access_token = create_access_token(
                identity=user.id,
                additional_claims={
                    'username': user.username,
                    'email': user.email,
                    'role': user.role
                }
            )
            
            return {'access_token': access_token}
            
        except Exception as e:
            raise AuthenticationError("令牌刷新失败")
    
    def change_password(self, user_id: str, old_password: str, new_password: str) -> bool:
        """修改密码"""
        user = self.user_repository.find_by_id(user_id)
        if not user:
            raise AuthenticationError("用户不存在")
        
        # 验证旧密码
        if not self._verify_password(old_password, user.password_hash):
            raise AuthenticationError("原密码错误")
        
        # 更新密码
        new_password_hash = self._hash_password(new_password)
        user.update_password(new_password_hash)
        
        self.user_repository.update(user)
        return True
    
    def reset_password(self, email: str, new_password: str) -> bool:
        """重置密码"""
        user = self.user_repository.find_by_email(email)
        if not user:
            raise AuthenticationError("用户不存在")
        
        # 更新密码
        new_password_hash = self._hash_password(new_password)
        user.update_password(new_password_hash)
        
        self.user_repository.update(user)
        return True
    
    def _find_user_by_username_or_email(self, username_or_email: str) -> Optional[User]:
        """根据用户名或邮箱查找用户"""
        # 先尝试用户名
        user = self.user_repository.find_by_username(username_or_email)
        if user:
            return user
        
        # 再尝试邮箱
        return self.user_repository.find_by_email(username_or_email)
    
    def _hash_password(self, password: str) -> str:
        """密码哈希"""
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    def _verify_password(self, password: str, password_hash: str) -> bool:
        """验证密码"""
        from werkzeug.security import check_password_hash
        # 使用 werkzeug 的密码验证，因为初始化脚本使用的是 werkzeug 的密码哈希
        return check_password_hash(password_hash, password)