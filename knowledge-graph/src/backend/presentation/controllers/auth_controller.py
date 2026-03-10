"""
认证控制器
"""
from flask import request, jsonify
from flask_restx import Resource, Namespace, fields
from flask_jwt_extended import jwt_required, get_jwt_identity

from application.services.auth_service import AuthService
from infrastructure.repositories.user_repository_impl import UserRepositoryImpl
from shared_kernel.exceptions.auth_exceptions import AuthenticationError, AuthorizationError
from shared_kernel.utils.validators import validate_email_ex

# 创建命名空间
auth_ns = Namespace('auth', description='用户认证相关接口')

# 定义请求模型
login_model = auth_ns.model('Login', {
    'username': fields.String(required=True, description='用户名或邮箱'),
    'password': fields.String(required=True, description='密码')
})

register_model = auth_ns.model('Register', {
    'username': fields.String(required=True, description='用户名'),
    'email': fields.String(required=True, description='邮箱'),
    'password': fields.String(required=True, description='密码'),
    'role': fields.String(description='角色', default='user')
})

change_password_model = auth_ns.model('ChangePassword', {
    'old_password': fields.String(required=True, description='原密码'),
    'new_password': fields.String(required=True, description='新密码')
})

refresh_token_model = auth_ns.model('RefreshToken', {
    'refresh_token': fields.String(required=True, description='刷新令牌')
})

# 定义响应模型
user_model = auth_ns.model('User', {
    'id': fields.String(description='用户ID'),
    'username': fields.String(description='用户名'),
    'email': fields.String(description='邮箱'),
    'role': fields.String(description='角色')
})

login_response_model = auth_ns.model('LoginResponse', {
    'success': fields.Boolean(description='是否成功'),
    'message': fields.String(description='消息'),
    'access_token': fields.String(description='访问令牌'),
    'refresh_token': fields.String(description='刷新令牌'),
    'user': fields.Nested(user_model, description='用户信息')
})

# 注册响应模型
register_response_model = auth_ns.model('RegisterResponse', {
    'success': fields.Boolean(description='是否成功'),
    'message': fields.String(description='消息'),
    'code': fields.String(description='错误编码'),
    'reason': fields.String(description='错误原因分类'),
    'user': fields.Nested(user_model, description='用户信息')
})

# 用户信息响应模型（用于 /auth/profile）
profile_response_model = auth_ns.model('ProfileResponse', {
    'success': fields.Boolean(description='是否成功'),
    'message': fields.String(description='消息'),
    'user': fields.Nested(user_model, description='用户信息')
})

@auth_ns.route('/login')
class LoginResource(Resource):
    """登录接口"""
    
    @auth_ns.expect(login_model)
    @auth_ns.marshal_with(login_response_model)
    def post(self):
        """用户登录"""
        try:
            data = request.get_json()
            username = data.get('username')
            password = data.get('password')
            
            if not username or not password:
                return {
                    'success': False,
                    'message': '用户名和密码不能为空'
                }, 400
            
            # 创建认证服务
            user_repository = UserRepositoryImpl()
            auth_service = AuthService(user_repository)
            
            # 执行认证
            result = auth_service.authenticate(username, password)
            
            return {
                'success': True,
                'message': '登录成功',
                'access_token': result['access_token'],
                'refresh_token': result['refresh_token'],
                'user': result['user']
            }, 200
            
        except AuthenticationError as e:
            return {
                'success': False,
                'message': str(e)
            }, 401
        except Exception as e:
            return {
                'success': False,
                'message': '登录失败，请稍后重试'
            }, 500


@auth_ns.route('/register')
class RegisterResource(Resource):
    """注册接口"""
    
    @auth_ns.expect(register_model)
    @auth_ns.marshal_with(register_response_model)
    def post(self):
        """用户注册"""
        try:
            data = request.get_json()
            username = data.get('username')
            email = data.get('email')
            password = data.get('password')
            role = data.get('role', 'user')
            
            if not all([username, email, password]):
                return {
                    'success': False,
                    'message': '用户名、邮箱和密码不能为空'
                }, 400
            
            # 预校验邮箱（格式与可达性，使用环境默认策略）
            email_check = validate_email_ex(email, allow_empty=False)
            if not email_check.get('ok'):
                return {
                    'success': False,
                    'message': email_check.get('message') or '邮箱格式不正确',
                    'code': email_check.get('code'),
                    'reason': email_check.get('reason'),
                }, 400
            email = email_check.get('email') or email

            # 创建认证服务
            user_repository = UserRepositoryImpl()
            auth_service = AuthService(user_repository)
            
            # 执行注册
            user = auth_service.register(username, email, password, role)
            
            return {
                'success': True,
                'message': '注册成功',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'role': user.role
                }
            }, 201
            
        except AuthenticationError as e:
            return {
                'success': False,
                'message': str(e)
            }, 400
        except Exception as e:
            return {
                'success': False,
                'message': '注册失败，请稍后重试'
            }, 500


@auth_ns.route('/refresh')
class RefreshTokenResource(Resource):
    """刷新令牌接口"""
    
    @auth_ns.expect(refresh_token_model)
    def post(self):
        """刷新访问令牌"""
        try:
            data = request.get_json()
            refresh_token = data.get('refresh_token')
            
            if not refresh_token:
                return {
                    'success': False,
                    'message': '刷新令牌不能为空'
                }, 400
            
            # 创建认证服务
            user_repository = UserRepositoryImpl()
            auth_service = AuthService(user_repository)
            
            # 刷新令牌
            result = auth_service.refresh_token(refresh_token)
            
            return {
                'success': True,
                'message': '令牌刷新成功',
                'access_token': result['access_token']
            }, 200
            
        except AuthenticationError as e:
            return {
                'success': False,
                'message': str(e)
            }, 401
        except Exception as e:
            return {
                'success': False,
                'message': '令牌刷新失败'
            }, 500


@auth_ns.route('/change-password')
class ChangePasswordResource(Resource):
    """修改密码接口"""
    
    @jwt_required()
    @auth_ns.expect(change_password_model)
    def post(self):
        """修改密码"""
        try:
            user_id = get_jwt_identity()
            data = request.get_json()
            old_password = data.get('old_password')
            new_password = data.get('new_password')
            
            if not all([old_password, new_password]):
                return {
                    'success': False,
                    'message': '原密码和新密码不能为空'
                }, 400
            
            # 创建认证服务
            user_repository = UserRepositoryImpl()
            auth_service = AuthService(user_repository)
            
            # 修改密码
            auth_service.change_password(user_id, old_password, new_password)
            
            return {
                'success': True,
                'message': '密码修改成功'
            }, 200
            
        except AuthenticationError as e:
            return {
                'success': False,
                'message': str(e)
            }, 400
        except Exception as e:
            return {
                'success': False,
                'message': '密码修改失败'
            }, 500


@auth_ns.route('/profile')
class ProfileResource(Resource):
    """用户信息接口"""
    
    @jwt_required()
    @auth_ns.marshal_with(profile_response_model)
    def get(self):
        """获取当前用户信息"""
        try:
            user_id = get_jwt_identity()
            
            # 获取用户信息
            user_repository = UserRepositoryImpl()
            user = user_repository.find_by_id(user_id)
            
            if not user:
                return {
                    'success': False,
                    'message': '用户不存在'
                }, 404
            
            return {
                'success': True,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'role': user.role
                }
            }, 200
            
        except Exception as e:
            return {
                'success': False,
                'message': '获取用户信息失败'
            }, 500