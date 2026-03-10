"""
用户管理控制器
"""
from flask import request, jsonify, send_file
from flask_restx import Resource, Namespace, fields
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.security import check_password_hash, generate_password_hash
import io
import json
import re
from datetime import datetime
from infrastructure.repositories.user_repository_impl import UserRepositoryImpl
from infrastructure.persistence.database import db
from sqlalchemy.exc import IntegrityError
from shared_kernel.utils.validators import validate_email, validate_email_ex, validate_phone

# 创建用户管理命名空间
user_ns = Namespace('users', description='用户管理')

# 用户个人信息模型
user_profile_model = user_ns.model('UserProfile', {
    'id': fields.String(required=True, description='用户ID'),
    'username': fields.String(required=True, description='用户名'),
    'email': fields.String(required=True, description='邮箱'),
    'fullName': fields.String(required=True, description='姓名'),
    'avatar': fields.String(description='头像URL'),
    'phone': fields.String(description='手机号'),
    'department': fields.String(description='部门'),
    'position': fields.String(description='职位'),
    'createdAt': fields.DateTime(description='创建时间'),
    'updatedAt': fields.DateTime(description='更新时间')
})

# 统一与 /auth/profile 的响应外层结构：success/message/user
user_profile_response_model = user_ns.model('UserProfileResponse', {
    'success': fields.Boolean(description='是否成功'),
    'message': fields.String(description='消息'),
    'code': fields.String(description='错误编码'),
    'reason': fields.String(description='错误原因分类'),
    'user': fields.Nested(user_profile_model, description='用户信息')
})

# 更新个人信息请求模型
update_profile_model = user_ns.model('UpdateProfile', {
    'email': fields.String(description='邮箱'),
    'fullName': fields.String(description='姓名'),
    'phone': fields.String(description='手机号'),
    'department': fields.String(description='部门'),
    'position': fields.String(description='职位')
})

# 修改密码请求模型
change_password_model = user_ns.model('ChangePassword', {
    'currentPassword': fields.String(required=True, description='当前密码'),
    'newPassword': fields.String(required=True, description='新密码')
})

# 用户偏好设置模型
user_preferences_model = user_ns.model('UserPreferences', {
    'theme': fields.String(enum=['light', 'dark', 'auto'], description='主题设置'),
    'language': fields.String(enum=['zh-CN', 'en-US'], description='语言设置'),
    'emailNotifications': fields.Boolean(description='邮件通知'),
    'systemNotifications': fields.Boolean(description='系统通知'),
    'autoSave': fields.Boolean(description='自动保存'),
    'pageSize': fields.Integer(description='每页显示数量')
})

# 用户统计信息模型
user_stats_model = user_ns.model('UserStats', {
    'documentCount': fields.Integer(description='文档数量'),
    'categoryCount': fields.Integer(description='分类数量'),
    'searchCount': fields.Integer(description='搜索次数'),
    'lastLoginAt': fields.DateTime(description='最后登录时间')
})

# 活动日志模型
activity_log_model = user_ns.model('ActivityLog', {
    'id': fields.String(description='日志ID'),
    'action': fields.String(description='操作类型'),
    'description': fields.String(description='操作描述'),
    'ipAddress': fields.String(description='IP地址'),
    'userAgent': fields.String(description='用户代理'),
    'createdAt': fields.DateTime(description='创建时间')
})

# 用户会话模型
user_session_model = user_ns.model('UserSession', {
    'id': fields.String(description='会话ID'),
    'deviceInfo': fields.String(description='设备信息'),
    'ipAddress': fields.String(description='IP地址'),
    'location': fields.String(description='位置'),
    'isCurrent': fields.Boolean(description='是否当前会话'),
    'lastActiveAt': fields.DateTime(description='最后活跃时间'),
    'createdAt': fields.DateTime(description='创建时间')
})


@user_ns.route('/profile')
class UserProfileResource(Resource):
    @user_ns.doc('get_user_profile')
    @user_ns.marshal_with(user_profile_response_model)
    @jwt_required()
    def get(self):
        """获取当前用户个人信息"""
        current_user_id = get_jwt_identity()

        # 从仓储获取真实用户数据
        user_repository = UserRepositoryImpl()
        user = user_repository.find_by_id(current_user_id)

        if not user:
            return {
                'success': False,
                'message': '用户不存在'
            }, 404

        profile = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'fullName': user.full_name or user.username,
            'avatar': user.avatar_url,
            'phone': user.phone or '',
            'department': user.department or '',
            'position': user.position or '',
            'createdAt': (user.created_at.isoformat() + '+00:00') if user.created_at else datetime.utcnow().isoformat() + '+00:00',
            'updatedAt': (user.updated_at.isoformat() + '+00:00') if user.updated_at else datetime.utcnow().isoformat() + '+00:00'
        }

        return {
            'success': True,
            'message': '获取成功',
            'user': profile
        }, 200

    @user_ns.doc('update_user_profile')
    @user_ns.expect(update_profile_model)
    @user_ns.marshal_with(user_profile_response_model)
    @jwt_required()
    def put(self):
        """更新个人信息（统一响应结构 success/message/user）"""
        current_user_id = get_jwt_identity()
        data = request.get_json() or {}

        user_repository = UserRepositoryImpl()
        user = user_repository.find_by_id(current_user_id)
        if not user:
            return {
                'success': False,
                'message': '用户不存在'
            }, 404

        # 应用更新字段（做最小化更新，允许部分字段为空）
        email = data.get('email')
        full_name = data.get('fullName')
        phone = data.get('phone')
        department = data.get('department')
        position = data.get('position')

        # 字段校验
        errors = []

        # 手机号校验（共享工具）：允许清空，返回结构化并在失败时直接返回统一响应
        if phone is not None:
            from shared_kernel.utils.validators import validate_phone_ex
            phone_res = validate_phone_ex(phone, allow_empty=True)
            if not phone_res.get('ok'):
                return {
                    'success': False,
                    'message': phone_res.get('message') or '手机号格式不合法，应为国际格式（示例：+8613800138000）',
                    'code': phone_res.get('code'),
                    'reason': phone_res.get('reason'),
                }, 400
            phone = phone_res.get('phone')

        # 部门/职位校验：允许清空；非空时仅允许中文、英文、数字、空格及 -_/()，并限制长度≤100
        text_pattern = r"^[\u4e00-\u9fa5A-Za-z0-9\s\-/()_]{1,100}$"
        if department is not None:
            department = department.strip()
            if department != '':
                if len(department) > 100:
                    errors.append('部门长度不能超过100字符')
                elif not re.match(text_pattern, department):
                    errors.append('部门格式不合法，允许中文/英文/数字/空格及-_/()')
        if position is not None:
            position = position.strip()
            if position != '':
                if len(position) > 100:
                    errors.append('职位长度不能超过100字符')
                elif not re.match(text_pattern, position):
                    errors.append('职位格式不合法，允许中文/英文/数字/空格及-_/()')

        if errors:
            return {
                'success': False,
                'message': '参数校验失败：' + '; '.join(errors)
            }, 400

        # 邮箱格式与唯一性检查（共享工具，当提供且与当前不同时；默认策略决定是否启用 MX）
        if email is not None:
            ex_res = validate_email_ex(email, allow_empty=True)
            if not ex_res.get('ok'):
                return {
                    'success': False,
                    'message': ex_res.get('message') or '邮箱格式不正确',
                    'code': ex_res.get('code'),
                    'reason': ex_res.get('reason'),
                }, 400
            email = ex_res.get('email') or ''
            if email and email != user.email:
                existing_user = user_repository.find_by_email(email)
                if existing_user and existing_user.id != user.id:
                    return {
                        'success': False,
                        'message': '邮箱已被占用'
                    }, 409

        if email:
            user.email = email
        user.full_name = full_name if full_name is not None else user.full_name
        user.phone = phone if phone is not None else user.phone
        user.department = department if department is not None else user.department
        user.position = position if position is not None else user.position
        user.updated_at = datetime.utcnow()

        # 持久化到数据库
        try:
            updated = user_repository.update(user)
        except IntegrityError:
            db.session.rollback()
            return {
                'success': False,
                'message': '邮箱已被占用'
            }, 409
        except Exception:
            db.session.rollback()
            return {
                'success': False,
                'message': '更新失败，请稍后重试'
            }, 500

        profile = {
            'id': updated.id,
            'username': updated.username,
            'email': updated.email,
            'fullName': updated.full_name or updated.username,
            'avatar': updated.avatar_url,
            'phone': updated.phone or '',
            'department': updated.department or '',
            'position': updated.position or '',
            'createdAt': (updated.created_at.isoformat() + '+00:00') if updated.created_at else datetime.utcnow().isoformat() + '+00:00',
            'updatedAt': (updated.updated_at.isoformat() + '+00:00') if updated.updated_at else datetime.utcnow().isoformat() + '+00:00'
        }

        return {
            'success': True,
            'message': '更新成功',
            'user': profile
        }, 200


@user_ns.route('/change-password')
class ChangePasswordResource(Resource):
    @user_ns.doc('change_password')
    @user_ns.expect(change_password_model)
    @jwt_required()
    def post(self):
        """修改密码"""
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        current_password = data.get('currentPassword')
        new_password = data.get('newPassword')
        
        # 这里应该验证当前密码并更新新密码
        # 模拟密码修改成功
        return {'message': '密码修改成功'}, 200


@user_ns.route('/avatar')
class UserAvatarResource(Resource):
    @user_ns.doc('upload_avatar')
    @jwt_required()
    def post(self):
        """上传头像"""
        current_user_id = get_jwt_identity()
        
        if 'avatar' not in request.files:
            return {'message': '没有上传文件'}, 400
        
        file = request.files['avatar']
        if file.filename == '':
            return {'message': '没有选择文件'}, 400
        
        # 这里应该处理文件上传逻辑
        # 模拟上传成功
        avatar_url = f'/uploads/avatars/{current_user_id}.jpg'
        
        return {
            'data': {'avatarUrl': avatar_url},
            'message': '头像上传成功'
        }, 200


@user_ns.route('/preferences')
class UserPreferencesResource(Resource):
    @user_ns.doc('get_user_preferences')
    @user_ns.marshal_with(user_preferences_model)
    @jwt_required()
    def get(self):
        """获取用户偏好设置"""
        current_user_id = get_jwt_identity()
        
        # TODO: 从数据库获取用户偏好设置
        # 返回默认偏好设置
        return {
            'theme': 'light',
            'language': 'zh-CN',
            'emailNotifications': True,
            'systemNotifications': True,
            'autoSave': True,
            'pageSize': 20
        }

    @user_ns.doc('update_user_preferences')
    @user_ns.expect(user_preferences_model)
    @user_ns.marshal_with(user_preferences_model)
    @jwt_required()
    def put(self):
        """更新用户偏好设置"""
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # TODO: 更新数据库中的用户偏好设置
        return {
            'theme': data.get('theme', 'light'),
            'language': data.get('language', 'zh-CN'),
            'emailNotifications': data.get('emailNotifications', True),
            'systemNotifications': data.get('systemNotifications', True),
            'autoSave': data.get('autoSave', True),
            'pageSize': data.get('pageSize', 20)
        }


@user_ns.route('/stats')
class UserStatsResource(Resource):
    @user_ns.doc('get_user_stats')
    @user_ns.marshal_with(user_stats_model)
    @jwt_required()
    def get(self):
        """获取用户统计信息"""
        current_user_id = get_jwt_identity()
        
        # TODO: 从数据库获取真实统计数据
        # 返回空统计数据
        return {
            'documentCount': 0,
            'categoryCount': 0,
            'searchCount': 0,
            'lastLoginAt': datetime.utcnow().isoformat() + '+00:00'
        }


@user_ns.route('/verify-password')
class VerifyPasswordResource(Resource):
    @user_ns.doc('verify_password')
    @jwt_required()
    def post(self):
        """验证当前密码"""
        current_user_id = get_jwt_identity()
        data = request.get_json()
        password = data.get('password')
        
        # 这里应该验证密码
        # 模拟验证成功
        return {
            'data': True,
            'message': '密码验证成功'
        }, 200


@user_ns.route('/activity-logs')
class UserActivityLogsResource(Resource):
    @user_ns.doc('get_activity_logs')
    @jwt_required()
    def get(self):
        """获取用户活动日志"""
        current_user_id = get_jwt_identity()
        
        page = request.args.get('page', 1, type=int)
        page_size = request.args.get('pageSize', 20, type=int)
        
        # TODO: 从数据库获取真实活动日志
        # 返回2条模拟活动日志
        activity_logs = [
            {
                'id': 'log_001',
                'action': 'login',
                'description': '用户登录系统',
                'ipAddress': '192.168.1.100',
                'userAgent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'createdAt': '2025-01-15T10:30:00+08:00'
            },
            {
                'id': 'log_002',
                'action': 'document_view',
                'description': '查看文档 "项目需求文档"',
                'ipAddress': '192.168.1.100',
                'userAgent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'createdAt': '2025-01-15T10:35:00+08:00'
            }
        ]
        
        return {
            'data': activity_logs,
            'total': 2,
            'page': page,
            'pageSize': page_size
        }, 200


@user_ns.route('/sessions')
class UserSessionsResource(Resource):
    @user_ns.doc('get_user_sessions')
    @jwt_required()
    def get(self):
        """获取用户会话列表"""
        current_user_id = get_jwt_identity()
        
        # TODO: 从数据库获取真实会话数据
        # 返回空会话列表
        return {'data': []}, 200

    @user_ns.doc('terminate_all_other_sessions')
    @jwt_required()
    def delete(self):
        """终止所有其他会话"""
        current_user_id = get_jwt_identity()
        
        # 这里应该终止所有其他会话
        return {'message': '已终止所有其他会话'}, 200


@user_ns.route('/sessions/<string:session_id>')
class UserSessionResource(Resource):
    @user_ns.doc('terminate_session')
    @jwt_required()
    def delete(self, session_id):
        """终止指定会话"""
        current_user_id = get_jwt_identity()
        
        # 这里应该终止指定会话
        return {'message': f'会话 {session_id} 已终止'}, 200


@user_ns.route('/export')
class UserDataExportResource(Resource):
    @user_ns.doc('export_user_data')
    @jwt_required()
    def get(self):
        """导出用户数据"""
        current_user_id = get_jwt_identity()
        
        # TODO: 从数据库获取真实用户数据
        export_data = {
            'user_profile': {
                'id': current_user_id,
                'username': 'user',
                'email': 'user@example.com',
                'fullName': '用户'
            },
            'documents': [],
            'categories': [],
            'activity_logs': [],
            'export_date': datetime.utcnow().isoformat()
        }
        
        # 创建JSON文件
        json_data = json.dumps(export_data, ensure_ascii=False, indent=2)
        buffer = io.BytesIO()
        buffer.write(json_data.encode('utf-8'))
        buffer.seek(0)
        
        return send_file(
            buffer,
            as_attachment=True,
            download_name=f'user_data_{current_user_id}.json',
            mimetype='application/json'
        )


@user_ns.route('/account')
class UserAccountResource(Resource):
    @user_ns.doc('delete_account')
    @jwt_required()
    def delete(self):
        """删除用户账户"""
        current_user_id = get_jwt_identity()
        data = request.get_json()
        password = data.get('password')
        
        # 这里应该验证密码并删除账户
        # 模拟删除成功
        return {'message': '账户删除成功'}, 200