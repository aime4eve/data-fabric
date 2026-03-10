"""
目录管理控制器
"""
from flask import request, jsonify
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity

from infrastructure.config.dependency_injection import get_directory_service, get_tag_service
from shared_kernel.exceptions.domain_exceptions import (
    DirectoryNotFoundError, DirectoryAlreadyExistsError, 
    DirectoryNotEmptyError, InvalidDirectoryNameError
)

# 创建命名空间
directory_ns = Namespace('directories', description='目录管理接口')

# 定义请求模型
create_directory_model = directory_ns.model('CreateDirectory', {
    'name': fields.String(required=True, description='目录名称'),
    'parent_id': fields.String(description='父目录ID'),
    'description': fields.String(description='目录描述'),
    'metadata': fields.Raw(description='元数据')
})

update_directory_model = directory_ns.model('UpdateDirectory', {
    'name': fields.String(description='目录名称'),
    'description': fields.String(description='目录描述'),
    'metadata': fields.Raw(description='元数据'),
    'sort_order': fields.Integer(description='排序顺序')
})

# 定义响应模型
directory_model = directory_ns.model('Directory', {
    'id': fields.String(description='目录ID'),
    'name': fields.String(description='目录名称'),
    'path': fields.String(description='目录路径'),
    'full_path': fields.String(description='完整路径'),
    'parent_id': fields.String(description='父目录ID'),
    'level': fields.Integer(description='目录层级'),
    'sort_order': fields.Integer(description='排序顺序'),
    'description': fields.String(description='目录描述'),
    'metadata': fields.Raw(description='元数据'),
    'created_at': fields.DateTime(description='创建时间'),
    'updated_at': fields.DateTime(description='更新时间')
})

directory_tree_model = directory_ns.model('DirectoryTree', {
    'id': fields.String(description='目录ID'),
    'name': fields.String(description='目录名称'),
    'path': fields.String(description='目录路径'),
    'children': fields.List(fields.Nested(lambda: directory_tree_model), description='子目录')
})


@directory_ns.route('')
class DirectoryListResource(Resource):
    """目录列表资源"""
    
    @directory_ns.doc('list_directories')
    @directory_ns.marshal_list_with(directory_model)
    @jwt_required()
    def get(self):
        """获取目录列表"""
        try:
            parent_id = request.args.get('parent_id')
            directory_service = get_directory_service()
            
            if parent_id:
                directories = directory_service.get_children(parent_id)
            else:
                directories = directory_service.get_root_directories()
            
            return [self._directory_to_dict(d) for d in directories]
        except DirectoryNotFoundError as e:
            directory_ns.abort(404, str(e))
        except Exception as e:
            directory_ns.abort(500, f'获取目录列表失败: {str(e)}')
    
    @directory_ns.doc('create_directory')
    @directory_ns.expect(create_directory_model)
    @directory_ns.marshal_with(directory_model, code=201)
    @jwt_required()
    def post(self):
        """创建目录"""
        try:
            data = request.get_json()
            directory_service = get_directory_service()
            
            directory = directory_service.create_directory(
                name=data['name'],
                parent_id=data.get('parent_id'),
                description=data.get('description'),
                metadata=data.get('metadata', {})
            )
            
            return self._directory_to_dict(directory), 201
        except DirectoryAlreadyExistsError as e:
            directory_ns.abort(409, str(e))
        except InvalidDirectoryNameError as e:
            directory_ns.abort(400, str(e))
        except Exception as e:
            directory_ns.abort(500, f'创建目录失败: {str(e)}')


@directory_ns.route('/<string:directory_id>')
class DirectoryResource(Resource):
    """单个目录资源"""
    
    @directory_ns.doc('get_directory')
    @directory_ns.marshal_with(directory_model)
    @jwt_required()
    def get(self, directory_id):
        """获取目录详情"""
        try:
            directory_service = get_directory_service()
            directory = directory_service.get_directory_by_id(directory_id)
            return self._directory_to_dict(directory)
        except DirectoryNotFoundError as e:
            directory_ns.abort(404, str(e))
        except Exception as e:
            directory_ns.abort(500, f'获取目录详情失败: {str(e)}')
    
    @directory_ns.doc('update_directory')
    @directory_ns.expect(update_directory_model)
    @directory_ns.marshal_with(directory_model)
    @jwt_required()
    def put(self, directory_id):
        """更新目录"""
        try:
            data = request.get_json()
            directory_service = get_directory_service()
            
            directory = directory_service.update_directory(
                directory_id=directory_id,
                name=data.get('name'),
                description=data.get('description'),
                metadata=data.get('metadata'),
                sort_order=data.get('sort_order')
            )
            
            return self._directory_to_dict(directory)
        except DirectoryNotFoundError as e:
            directory_ns.abort(404, str(e))
        except InvalidDirectoryNameError as e:
            directory_ns.abort(400, str(e))
        except Exception as e:
            directory_ns.abort(500, f'更新目录失败: {str(e)}')
    
    @directory_ns.doc('delete_directory')
    @jwt_required()
    def delete(self, directory_id):
        """删除目录"""
        try:
            directory_service = get_directory_service()
            directory_service.delete_directory(directory_id)
            return {'message': '目录删除成功'}, 200
        except DirectoryNotFoundError as e:
            directory_ns.abort(404, str(e))
        except DirectoryNotEmptyError as e:
            directory_ns.abort(409, str(e))
        except Exception as e:
            directory_ns.abort(500, f'删除目录失败: {str(e)}')


@directory_ns.route('/tree')
class DirectoryTreeResource(Resource):
    """目录树资源"""
    
    @directory_ns.doc('get_directory_tree')
    @directory_ns.marshal_list_with(directory_tree_model)
    @jwt_required()
    async def get(self):
        """获取目录树结构"""
        try:
            directory_service = get_directory_service()
            tree = await directory_service.get_directory_tree()
            return self._build_tree_response(tree)
        except Exception as e:
            directory_ns.abort(500, f'获取目录树失败: {str(e)}')


@directory_ns.route('/<string:directory_id>/tags')
class DirectoryTagsResource(Resource):
    """目录标签资源"""
    
    @directory_ns.doc('get_directory_tags')
    @jwt_required()
    def get(self, directory_id):
        """获取目录标签"""
        try:
            tag_service = get_tag_service()
            tags = tag_service.get_directory_tags(directory_id)
            return [self._tag_to_dict(tag) for tag in tags]
        except Exception as e:
            directory_ns.abort(500, f'获取目录标签失败: {str(e)}')
    
    @directory_ns.doc('add_directory_tag')
    @jwt_required()
    def post(self, directory_id):
        """添加目录标签"""
        try:
            data = request.get_json()
            tag_id = data.get('tag_id')
            
            tag_service = get_tag_service()
            tag_service.add_directory_tag(directory_id, tag_id)
            return {'message': '标签添加成功'}, 201
        except Exception as e:
            directory_ns.abort(500, f'添加目录标签失败: {str(e)}')


@directory_ns.route('/<string:directory_id>/tags/<string:tag_id>')
class DirectoryTagResource(Resource):
    """目录单个标签资源"""
    
    @directory_ns.doc('remove_directory_tag')
    @jwt_required()
    def delete(self, directory_id, tag_id):
        """移除目录标签"""
        try:
            tag_service = get_tag_service()
            tag_service.remove_directory_tag(directory_id, tag_id)
            return {'message': '标签移除成功'}, 200
        except Exception as e:
            directory_ns.abort(500, f'移除目录标签失败: {str(e)}')


# 辅助方法
def _directory_to_dict(directory):
    """将目录实体转换为字典"""
    return {
        'id': directory.id,
        'name': directory.name,
        'path': directory.path.value,
        'full_path': directory.full_path,
        'parent_id': directory.parent_id,
        'level': directory.level,
        'sort_order': directory.sort_order,
        'description': directory.description,
        'metadata': directory.metadata,
        'created_at': directory.created_at,
        'updated_at': directory.updated_at
    }


def _build_tree_response(tree_data):
    """构建树形响应数据"""
    result = []
    for item in tree_data:
        node = {
            'id': item['directory'].id,
            'name': item['directory'].name,
            'path': item['directory'].path.value,
            'children': _build_tree_response(item['children'])
        }
        result.append(node)
    return result


def _tag_to_dict(tag):
    """将标签实体转换为字典"""
    return {
        'id': tag.id,
        'name': tag.name,
        'color': tag.color,
        'description': tag.description,
        'category': tag.category
    }


# 将辅助方法绑定到资源类
DirectoryListResource._directory_to_dict = staticmethod(_directory_to_dict)
DirectoryResource._directory_to_dict = staticmethod(_directory_to_dict)
DirectoryTreeResource._build_tree_response = staticmethod(_build_tree_response)
DirectoryTagsResource._tag_to_dict = staticmethod(_tag_to_dict)