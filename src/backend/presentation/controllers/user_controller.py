"""
用户管理控制器
"""
from flask import request, jsonify, send_file
from flask_restx import Resource, Namespace, fields
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.security import check_password_hash, generate_password_hash
import io
import json
from datetime import datetime

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
    @user_ns.marshal_with(user_profile_model)
    @jwt_required()
    def get(self):
        """获取当前用户个人信息"""
        current_user_id = get_jwt_identity()
        
        # 模拟用户数据
        mock_profile = {
            'id': current_user_id,
            'username': 'admin',
            'email': 'admin@example.com',
            'fullName': '管理员',
            'avatar': None,
            'phone': '138****8888',
            'department': '技术部',
            'position': '系统管理员',
            'createdAt': '2025-01-01T00:00:00+00:00',
            'updatedAt': '2025-01-01T00:00:00+00:00'
        }
        
        return mock_profile

    @user_ns.doc('update_user_profile')
    @user_ns.expect(update_profile_model)
    @user_ns.marshal_with(user_profile_model)
    @jwt_required()
    def put(self):
        """更新个人信息"""
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # 模拟更新用户信息
        updated_profile = {
            'id': current_user_id,
            'username': 'admin',
            'email': data.get('email', 'admin@example.com'),
            'fullName': data.get('fullName', '管理员'),
            'avatar': None,
            'phone': data.get('phone', '138****8888'),
            'department': data.get('department', '技术部'),
            'position': data.get('position', '系统管理员'),
            'createdAt': '2025-01-01T00:00:00+00:00',
            'updatedAt': datetime.utcnow().isoformat() + '+00:00'
        }
        
        return updated_profile


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
        
        # 模拟偏好设置数据
        mock_preferences = {
            'theme': 'light',
            'language': 'zh-CN',
            'emailNotifications': True,
            'systemNotifications': True,
            'autoSave': True,
            'pageSize': 20
        }
        
        return mock_preferences

    @user_ns.doc('update_user_preferences')
    @user_ns.expect(user_preferences_model)
    @user_ns.marshal_with(user_preferences_model)
    @jwt_required()
    def put(self):
        """更新用户偏好设置"""
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # 模拟更新偏好设置
        updated_preferences = {
            'theme': data.get('theme', 'light'),
            'language': data.get('language', 'zh-CN'),
            'emailNotifications': data.get('emailNotifications', True),
            'systemNotifications': data.get('systemNotifications', True),
            'autoSave': data.get('autoSave', True),
            'pageSize': data.get('pageSize', 20)
        }
        
        return updated_preferences


@user_ns.route('/stats')
class UserStatsResource(Resource):
    @user_ns.doc('get_user_stats')
    @user_ns.marshal_with(user_stats_model)
    @jwt_required()
    def get(self):
        """获取用户统计信息"""
        current_user_id = get_jwt_identity()
        
        # 模拟统计数据
        mock_stats = {
            'documentCount': 25,
            'categoryCount': 8,
            'searchCount': 156,
            'lastLoginAt': datetime.utcnow().isoformat() + '+00:00'
        }
        
        return mock_stats


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
        
        # 模拟活动日志数据
        mock_logs = [
            {
                'id': '1',
                'action': 'LOGIN',
                'description': '用户登录系统',
                'ipAddress': '192.168.1.100',
                'userAgent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'createdAt': '2025-01-01T10:00:00+00:00'
            },
            {
                'id': '2',
                'action': 'DOCUMENT_CREATE',
                'description': '创建文档：技术文档.pdf',
                'ipAddress': '192.168.1.100',
                'userAgent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'createdAt': '2025-01-01T09:30:00+00:00'
            }
        ]
        
        return {
            'data': mock_logs,
            'total': len(mock_logs),
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
        
        # 模拟会话数据
        mock_sessions = [
            {
                'id': '1',
                'deviceInfo': 'Chrome on Windows 10',
                'ipAddress': '192.168.1.100',
                'location': '北京市',
                'isCurrent': True,
                'lastActiveAt': datetime.utcnow().isoformat() + '+00:00',
                'createdAt': '2025-01-01T08:00:00+00:00'
            },
            {
                'id': '2',
                'deviceInfo': 'Safari on iPhone',
                'ipAddress': '192.168.1.101',
                'location': '上海市',
                'isCurrent': False,
                'lastActiveAt': '2025-01-01T07:00:00+00:00',
                'createdAt': '2024-12-31T20:00:00+00:00'
            }
        ]
        
        return {'data': mock_sessions}, 200

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
        
        # 模拟导出数据
        export_data = {
            'user_profile': {
                'id': current_user_id,
                'username': 'admin',
                'email': 'admin@example.com',
                'fullName': '管理员'
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