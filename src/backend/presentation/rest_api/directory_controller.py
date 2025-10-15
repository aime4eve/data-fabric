"""目录管理REST API控制器"""
from flask import Blueprint, request, jsonify
from flask_restx import Api, Resource, fields, Namespace
from uuid import UUID
from typing import Optional

from ...application.services.directory_service import DirectoryService
from ...application.services.tag_service import TagService
from ...shared_kernel.exceptions.domain_exceptions import (
    DirectoryNotFoundError,
    DirectoryAlreadyExistsError,
    DirectoryNotEmptyError,
    InvalidDirectoryNameError
)

# 创建蓝图
directory_bp = Blueprint('directory', __name__, url_prefix='/api/v1/directories')

# 创建命名空间
directory_ns = Namespace('directories', description='目录管理API')

# 定义数据模型
directory_model = directory_ns.model('Directory', {
    'id': fields.String(required=True, description='目录ID'),
    'name': fields.String(required=True, description='目录名称'),
    'path': fields.String(required=True, description='目录路径'),
    'full_path': fields.String(required=True, description='完整路径'),
    'parent_id': fields.String(description='父目录ID'),
    'level': fields.Integer(required=True, description='目录层级'),
    'sort_order': fields.Integer(required=True, description='排序顺序'),
    'description': fields.String(description='目录描述'),
    'metadata': fields.Raw(description='元数据'),
    'created_at': fields.DateTime(required=True, description='创建时间'),
    'updated_at': fields.DateTime(required=True, description='更新时间'),
    'tags': fields.List(fields.Raw, description='标签列表')
})

create_directory_model = directory_ns.model('CreateDirectory', {
    'name': fields.String(required=True, description='目录名称'),
    'parent_id': fields.String(description='父目录ID'),
    'description': fields.String(description='目录描述'),
    'sort_order': fields.Integer(description='排序顺序', default=0)
})

update_directory_model = directory_ns.model('UpdateDirectory', {
    'name': fields.String(description='目录名称'),
    'description': fields.String(description='目录描述'),
    'sort_order': fields.Integer(description='排序顺序')
})

directory_tree_model = directory_ns.model('DirectoryTree', {
    'id': fields.String(required=True, description='目录ID'),
    'name': fields.String(required=True, description='目录名称'),
    'path': fields.String(required=True, description='目录路径'),
    'level': fields.Integer(required=True, description='目录层级'),
    'children': fields.List(fields.Nested('DirectoryTree'), description='子目录')
})

# 初始化服务
directory_service = DirectoryService()
tag_service = TagService()


@directory_ns.route('')
class DirectoryListResource(Resource):
    """目录列表资源"""
    
    @directory_ns.doc('get_directories')
    @directory_ns.param('parent_id', '父目录ID', type='string')
    @directory_ns.marshal_list_with(directory_model)
    def get(self):
        """获取目录列表"""
        try:
            parent_id = request.args.get('parent_id')
            parent_uuid = UUID(parent_id) if parent_id else None
            
            directories = directory_service.get_directories_by_parent(parent_uuid)
            
            # 添加标签信息
            result = []
            for directory in directories:
                directory_dict = {
                    'id': str(directory.id),
                    'name': directory.name,
                    'path': directory.path.value,
                    'full_path': directory.full_path,
                    'parent_id': str(directory.parent_id) if directory.parent_id else None,
                    'level': directory.level,
                    'sort_order': directory.sort_order,
                    'description': directory.description,
                    'metadata': directory.metadata,
                    'created_at': directory.created_at,
                    'updated_at': directory.updated_at,
                    'tags': []
                }
                
                # 获取标签
                try:
                    tags = tag_service.get_directory_tags(directory.id)
                    directory_dict['tags'] = [
                        {
                            'id': str(tag.id),
                            'name': tag.name,
                            'color': tag.color,
                            'category': tag.category
                        }
                        for tag in tags
                    ]
                except Exception:
                    pass
                
                result.append(directory_dict)
            
            return result
            
        except Exception as e:
            return {'error': str(e)}, 500
    
    @directory_ns.doc('create_directory')
    @directory_ns.expect(create_directory_model)
    @directory_ns.marshal_with(directory_model, code=201)
    def post(self):
        """创建目录"""
        try:
            data = request.get_json()
            
            parent_id = None
            if data.get('parent_id'):
                parent_id = UUID(data['parent_id'])
            
            directory = directory_service.create_directory(
                name=data['name'],
                parent_id=parent_id,
                description=data.get('description'),
                sort_order=data.get('sort_order', 0)
            )
            
            return {
                'id': str(directory.id),
                'name': directory.name,
                'path': directory.path.value,
                'full_path': directory.full_path,
                'parent_id': str(directory.parent_id) if directory.parent_id else None,
                'level': directory.level,
                'sort_order': directory.sort_order,
                'description': directory.description,
                'metadata': directory.metadata,
                'created_at': directory.created_at,
                'updated_at': directory.updated_at,
                'tags': []
            }, 201
            
        except DirectoryAlreadyExistsError as e:
            return {'error': str(e)}, 409
        except InvalidDirectoryNameError as e:
            return {'error': str(e)}, 400
        except Exception as e:
            return {'error': str(e)}, 500


@directory_ns.route('/<string:directory_id>')
class DirectoryResource(Resource):
    """单个目录资源"""
    
    @directory_ns.doc('get_directory')
    @directory_ns.marshal_with(directory_model)
    def get(self, directory_id):
        """获取目录详情"""
        try:
            directory = directory_service.get_directory_by_id(UUID(directory_id))
            
            # 获取标签
            tags = []
            try:
                tag_list = tag_service.get_directory_tags(directory.id)
                tags = [
                    {
                        'id': str(tag.id),
                        'name': tag.name,
                        'color': tag.color,
                        'category': tag.category
                    }
                    for tag in tag_list
                ]
            except Exception:
                pass
            
            return {
                'id': str(directory.id),
                'name': directory.name,
                'path': directory.path.value,
                'full_path': directory.full_path,
                'parent_id': str(directory.parent_id) if directory.parent_id else None,
                'level': directory.level,
                'sort_order': directory.sort_order,
                'description': directory.description,
                'metadata': directory.metadata,
                'created_at': directory.created_at,
                'updated_at': directory.updated_at,
                'tags': tags
            }
            
        except DirectoryNotFoundError as e:
            return {'error': str(e)}, 404
        except Exception as e:
            return {'error': str(e)}, 500
    
    @directory_ns.doc('update_directory')
    @directory_ns.expect(update_directory_model)
    @directory_ns.marshal_with(directory_model)
    def put(self, directory_id):
        """更新目录"""
        try:
            data = request.get_json()
            
            directory = directory_service.update_directory(
                directory_id=UUID(directory_id),
                name=data.get('name'),
                description=data.get('description'),
                sort_order=data.get('sort_order')
            )
            
            return {
                'id': str(directory.id),
                'name': directory.name,
                'path': directory.path.value,
                'full_path': directory.full_path,
                'parent_id': str(directory.parent_id) if directory.parent_id else None,
                'level': directory.level,
                'sort_order': directory.sort_order,
                'description': directory.description,
                'metadata': directory.metadata,
                'created_at': directory.created_at,
                'updated_at': directory.updated_at,
                'tags': []
            }
            
        except DirectoryNotFoundError as e:
            return {'error': str(e)}, 404
        except InvalidDirectoryNameError as e:
            return {'error': str(e)}, 400
        except Exception as e:
            return {'error': str(e)}, 500
    
    @directory_ns.doc('delete_directory')
    def delete(self, directory_id):
        """删除目录"""
        try:
            success = directory_service.delete_directory(UUID(directory_id))
            
            if success:
                return {'message': '目录删除成功'}, 200
            else:
                return {'error': '目录删除失败'}, 500
                
        except DirectoryNotFoundError as e:
            return {'error': str(e)}, 404
        except DirectoryNotEmptyError as e:
            return {'error': str(e)}, 409
        except Exception as e:
            return {'error': str(e)}, 500


@directory_ns.route('/tree')
class DirectoryTreeResource(Resource):
    """目录树资源"""
    
    @directory_ns.doc('get_directory_tree')
    @directory_ns.marshal_list_with(directory_tree_model)
    def get(self):
        """获取目录树结构"""
        try:
            tree = directory_service.get_directory_tree()
            
            def build_tree_dict(node):
                return {
                    'id': str(node['directory'].id),
                    'name': node['directory'].name,
                    'path': node['directory'].path.value,
                    'level': node['directory'].level,
                    'children': [build_tree_dict(child) for child in node['children']]
                }
            
            return [build_tree_dict(node) for node in tree]
            
        except Exception as e:
            return {'error': str(e)}, 500


@directory_ns.route('/<string:directory_id>/tags')
class DirectoryTagsResource(Resource):
    """目录标签资源"""
    
    @directory_ns.doc('get_directory_tags')
    def get(self, directory_id):
        """获取目录标签"""
        try:
            tags = tag_service.get_directory_tags(UUID(directory_id))
            
            return [
                {
                    'id': str(tag.id),
                    'name': tag.name,
                    'color': tag.color,
                    'description': tag.description,
                    'category': tag.category
                }
                for tag in tags
            ]
            
        except Exception as e:
            return {'error': str(e)}, 500
    
    @directory_ns.doc('add_directory_tag')
    def post(self, directory_id):
        """为目录添加标签"""
        try:
            data = request.get_json()
            tag_id = UUID(data['tag_id'])
            
            success = tag_service.add_directory_tag(UUID(directory_id), tag_id)
            
            if success:
                return {'message': '标签添加成功'}, 201
            else:
                return {'error': '标签已存在'}, 409
                
        except Exception as e:
            return {'error': str(e)}, 500
    
    @directory_ns.doc('remove_directory_tag')
    def delete(self, directory_id):
        """移除目录标签"""
        try:
            data = request.get_json()
            tag_id = UUID(data['tag_id'])
            
            success = tag_service.remove_directory_tag(UUID(directory_id), tag_id)
            
            if success:
                return {'message': '标签移除成功'}, 200
            else:
                return {'error': '标签不存在'}, 404
                
        except Exception as e:
            return {'error': str(e)}, 500


# 注册蓝图
def register_directory_routes(app):
    """注册目录路由"""
    app.register_blueprint(directory_bp)