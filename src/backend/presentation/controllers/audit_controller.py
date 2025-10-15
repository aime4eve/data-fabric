"""
审计控制器
"""
from flask import request
from flask_restx import Namespace, Resource, fields

from infrastructure.config.dependency_injection import get_audit_service

audit_ns = Namespace('audits', description='审计查询接口')

audit_event_model = audit_ns.model('AuditEvent', {
    'id': fields.String,
    'actor': fields.String,
    'action': fields.String,
    'resource_type': fields.String,
    'resource_id': fields.String,
    'metadata': fields.Raw,
    'created_at': fields.DateTime,
})


@audit_ns.route('/events')
class AuditEvents(Resource):
    @audit_ns.marshal_list_with(audit_event_model)
    @audit_ns.doc(description='查询审计事件')
    async def get(self):
        params = request.args.to_dict()
        service = get_audit_service()
        events = await service.list_events(
            resource_type=params.get('resource_type'),
            resource_id=params.get('resource_id'),
            actor=params.get('actor'),
            action=params.get('action'),
            limit=int(params.get('limit', 50)),
            offset=int(params.get('offset', 0)),
        )
        return [
            {
                'id': str(e.id),
                'actor': e.actor,
                'action': e.action,
                'resource_type': e.resource_type,
                'resource_id': e.resource_id,
                'metadata': e.metadata,
                'created_at': e.created_at,
            }
            for e in events
        ]


@audit_ns.route('/directories/<string:directory_id>')
class DirectoryAudit(Resource):
    @audit_ns.marshal_list_with(audit_event_model)
    @audit_ns.doc(description='查询目录相关审计')
    async def get(self, directory_id: str):
        service = get_audit_service()
        events = await service.list_events(resource_type='directory', resource_id=directory_id)
        return [
            {
                'id': str(e.id),
                'actor': e.actor,
                'action': e.action,
                'resource_type': e.resource_type,
                'resource_id': e.resource_id,
                'metadata': e.metadata,
                'created_at': e.created_at,
            }
            for e in events
        ]