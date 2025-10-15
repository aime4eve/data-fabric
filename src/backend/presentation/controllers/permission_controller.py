"""
权限控制器
"""
from flask import request
from flask_restx import Namespace, Resource, fields
from uuid import UUID

from infrastructure.config.dependency_injection import get_permission_service
from domain.entities.permission_rule import PermissionRule

permission_ns = Namespace('permissions', description='权限管理接口')

permission_rule_model = permission_ns.model('PermissionRule', {
    'role': fields.String(required=True),
    'action': fields.String(required=True),
    'effect': fields.String(required=True, description='allow/deny'),
    'resource_scope': fields.String,
    'conditions': fields.Raw,
})

permission_config_model = permission_ns.model('PermissionConfig', {
    'directory_id': fields.String(required=True),
    'rules': fields.List(fields.Nested(permission_rule_model)),
    'version': fields.Integer(description='版本'),
})


@permission_ns.route('/directories/<string:directory_id>/permissions')
class DirectoryPermissions(Resource):
    @permission_ns.marshal_with(permission_config_model)
    @permission_ns.doc(description='获取目录权限配置')
    async def get(self, directory_id: str):
        service = get_permission_service()
        config = await service.get_permissions(UUID(directory_id))
        return {
            'directory_id': str(config.directory_id),
            'rules': [
                {
                    'role': r.role,
                    'action': r.action,
                    'effect': r.effect,
                    'resource_scope': r.resource_scope,
                    'conditions': r.conditions,
                }
                for r in config.rules
            ],
            'version': config.version,
        }

    @permission_ns.expect(permission_config_model, validate=True)
    @permission_ns.marshal_with(permission_config_model)
    @permission_ns.doc(description='设置目录权限配置')
    async def put(self, directory_id: str):
        payload = request.json or {}
        service = get_permission_service()
        rules = [
            PermissionRule(
                role=item.get('role'),
                action=item.get('action'),
                effect=item.get('effect'),
                resource_scope=item.get('resource_scope'),
                conditions=item.get('conditions'),
            )
            for item in payload.get('rules', [])
        ]
        config = await service.set_permissions(UUID(directory_id), rules)
        return {
            'directory_id': str(config.directory_id),
            'rules': [
                {
                    'role': r.role,
                    'action': r.action,
                    'effect': r.effect,
                    'resource_scope': r.resource_scope,
                    'conditions': r.conditions,
                }
                for r in config.rules
            ],
            'version': config.version,
        }


@permission_ns.route('/templates/apply')
class ApplyTemplate(Resource):
    @permission_ns.doc(description='应用权限模板到目录（暂未实现）')
    def post(self):
        return {'success': False, 'message': 'Not Implemented'}, 501