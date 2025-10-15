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
from shared_kernel.utils.validators import validate_email


class AuthService:
    """认证服务"""
    
    def __init__(self, user_repository: UserRepository):
        self.user_repository = user_repository
    
    def authenticate(self, username_or_email: str, password: str) -> Dict[str, Any]:
        """用户认证"""
        # 输入验证
        if not username_or_email or not password:
            raise AuthenticationError("用户名和密码不能为空")
        
        if not username_or_email.strip() or not password.strip():
            raise AuthenticationError("用户名和密码不能为空")
        
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
        # 输入验证
        if not username or not email or not password:
            raise AuthenticationError("用户名、邮箱和密码不能为空")
        
        if not username.strip() or not email.strip() or not password.strip():
            raise AuthenticationError("用户名、邮箱和密码不能为空")
        
        # 邮箱格式与可达性校验（IDN/MX）
        # 使用环境默认策略决定是否启用可达性检查
        ok, normalized_email, err = validate_email(email, allow_empty=False)
        if not ok:
            raise AuthenticationError(err or "邮箱格式不正确")
        email = normalized_email or email
        
        # 密码强度验证
        if len(password) < 6:
            raise AuthenticationError("密码长度至少6位")
        
        # 检查是否为常见弱密码
        weak_passwords = ["password", "123456", "12345678", "qwerty", "abc123"]
        if password.lower() in weak_passwords:
            raise AuthenticationError("密码过于简单，请使用更复杂的密码")
        
        # 检查密码复杂度
        if password.isdigit():
            raise AuthenticationError("密码不能全为数字")
        
        if password.isalpha():
            raise AuthenticationError("密码不能全为字母")
        
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
        
        saved_user = self.user_repository.save(user)
        return saved_user if saved_user else user
    
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
            
            new_refresh_token = create_refresh_token(identity=user.id)
            
            return {
                'access_token': access_token,
                'refresh_token': new_refresh_token
            }
        except AuthenticationError:
            # 重新抛出认证错误，保持原始错误消息
            raise
        except Exception as e:
            raise AuthenticationError("令牌刷新失败")
    
    def change_password(self, user_id: str, old_password: str, new_password: str) -> bool:
        """修改密码"""
        user = self.user_repository.find_by_id(user_id)
        if not user:
            raise AuthenticationError("用户不存在")
        
        # 验证旧密码
        if not self._verify_password(old_password, user.password_hash):
            raise AuthenticationError("旧密码错误")
        
        # 检查新密码是否与旧密码相同
        if old_password == new_password:
            raise AuthenticationError("新密码不能与旧密码相同")
        
        # 更新密码
        new_password_hash = self._hash_password(new_password)
        user.update_password(new_password_hash)
        
        self.user_repository.save(user)
        return True
    
    def reset_password(self, email: str, new_password: str) -> bool:
        """重置密码"""
        user = self.user_repository.find_by_email(email)
        if not user:
            raise AuthenticationError("用户不存在")
        
        # 更新密码
        new_password_hash = self._hash_password(new_password)
        user.update_password(new_password_hash)
        
        self.user_repository.save(user)
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
        from werkzeug.security import generate_password_hash
        return generate_password_hash(password)
    
    def _verify_password(self, password: str, password_hash: str) -> bool:
        """验证密码"""
        from werkzeug.security import check_password_hash
        # 使用 werkzeug 的密码验证，因为初始化脚本使用的是 werkzeug 的密码哈希
        return check_password_hash(password_hash, password)