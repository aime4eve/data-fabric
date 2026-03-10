"""
标签管理控制器
"""
from flask import request, jsonify
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity

from infrastructure.config.dependency_injection import get_tag_service
from shared_kernel.exceptions.domain_exceptions import (
    TagNotFoundError, TagAlreadyExistsError, InvalidTagNameError, TagAssociationError
)

# 创建命名空间
tag_ns = Namespace('tags', description='标签管理接口')

# 定义请求模型
create_tag_model = tag_ns.model('CreateTag', {
    'name': fields.String(required=True, description='标签名称'),
    'color': fields.String(description='标签颜色（十六进制）'),
    'description': fields.String(description='标签描述'),
    'category': fields.String(description='标签分类')
})

update_tag_model = tag_ns.model('UpdateTag', {
    'name': fields.String(description='标签名称'),
    'color': fields.String(description='标签颜色（十六进制）'),
    'description': fields.String(description='标签描述'),
    'category': fields.String(description='标签分类')
})

tag_association_model = tag_ns.model('TagAssociation', {
    'target_id': fields.String(required=True, description='目标ID（目录或文件）'),
    'target_type': fields.String(required=True, description='目标类型（directory或file）')
})

# 定义响应模型
tag_model = tag_ns.model('Tag', {
    'id': fields.String(description='标签ID'),
    'name': fields.String(description='标签名称'),
    'color': fields.String(description='标签颜色'),
    'description': fields.String(description='标签描述'),
    'category': fields.String(description='标签分类'),
    'created_at': fields.DateTime(description='创建时间'),
    'updated_at': fields.DateTime(description='更新时间')
})

tag_stats_model = tag_ns.model('TagStats', {
    'total_tags': fields.Integer(description='总标签数'),
    'by_category': fields.Raw(description='按分类统计'),
    'usage_count': fields.Raw(description='使用次数统计')
})


@tag_ns.route('')
class TagListResource(Resource):
    """标签列表资源"""
    
    @tag_ns.doc('list_tags')
    @tag_ns.marshal_list_with(tag_model)
    @jwt_required()
    async def get(self):
        """获取标签列表"""
        try:
            category = request.args.get('category')
            name_pattern = request.args.get('name_pattern')
            page = int(request.args.get('page', 1))
            size = int(request.args.get('size', 20))
            
            tag_service = get_tag_service()
            
            if category:
                tags = await tag_service.get_tags_by_category(category)
            elif name_pattern:
                tags = await tag_service.search_tags(name_pattern)
            else:
                tags = await tag_service.get_all_tags()
            
            return [self._tag_to_dict(tag) for tag in tags]
        except Exception as e:
            tag_ns.abort(500, f'获取标签列表失败: {str(e)}')
    
    @tag_ns.doc('create_tag')
    @tag_ns.expect(create_tag_model)
    @tag_ns.marshal_with(tag_model, code=201)
    @jwt_required()
    async def post(self):
        """创建标签"""
        try:
            data = request.get_json()
            tag_service = get_tag_service()
            
            tag = await tag_service.create_tag(
                name=data['name'],
                color=data.get('color'),
                description=data.get('description'),
                category=data.get('category')
            )
            
            return self._tag_to_dict(tag), 201
        except TagAlreadyExistsError as e:
            tag_ns.abort(409, str(e))
        except InvalidTagNameError as e:
            tag_ns.abort(400, str(e))
        except Exception as e:
            tag_ns.abort(500, f'创建标签失败: {str(e)}')


@tag_ns.route('/<string:tag_id>')
class TagResource(Resource):
    """单个标签资源"""
    
    @tag_ns.doc('get_tag')
    @tag_ns.marshal_with(tag_model)
    @jwt_required()
    def get(self, tag_id):
        """获取标签详情"""
        try:
            from uuid import UUID
            tag_service = get_tag_service()
            tag = tag_service.get_tag_by_id(UUID(tag_id))
            return self._tag_to_dict(tag)
        except TagNotFoundError as e:
            tag_ns.abort(404, str(e))
        except Exception as e:
            tag_ns.abort(500, f'获取标签详情失败: {str(e)}')
    
    @tag_ns.doc('update_tag')
    @tag_ns.expect(update_tag_model)
    @tag_ns.marshal_with(tag_model)
    @jwt_required()
    async def put(self, tag_id):
        """更新标签"""
        try:
            from uuid import UUID
            data = request.get_json()
            tag_service = get_tag_service()
            
            tag = await tag_service.update_tag(
                tag_id=UUID(tag_id),
                name=data.get('name'),
                color=data.get('color'),
                description=data.get('description'),
                category=data.get('category')
            )
            
            return self._tag_to_dict(tag)
        except TagNotFoundError as e:
            tag_ns.abort(404, str(e))
        except InvalidTagNameError as e:
            tag_ns.abort(400, str(e))
        except Exception as e:
            tag_ns.abort(500, f'更新标签失败: {str(e)}')
    
    @tag_ns.doc('delete_tag')
    @jwt_required()
    def delete(self, tag_id):
        """删除标签"""
        try:
            from uuid import UUID
            tag_service = get_tag_service()
            success = tag_service.delete_tag(UUID(tag_id))
            if success:
                return {'message': '标签删除成功'}, 200
            else:
                return {'error': '标签删除失败'}, 500
        except TagNotFoundError as e:
            tag_ns.abort(404, str(e))
        except Exception as e:
            tag_ns.abort(500, f'删除标签失败: {str(e)}')


@tag_ns.route('/categories')
class TagCategoriesResource(Resource):
    """标签分类资源"""
    
    @tag_ns.doc('get_tag_categories')
    @jwt_required()
    def get(self):
        """获取所有标签分类"""
        try:
            tag_service = get_tag_service()
            categories = tag_service.get_all_categories()
            return {'categories': categories}
        except Exception as e:
            tag_ns.abort(500, f'获取标签分类失败: {str(e)}')


@tag_ns.route('/statistics')
class TagStatsResource(Resource):
    """标签统计资源"""
    
    @tag_ns.doc('get_tag_stats')
    @tag_ns.marshal_with(tag_stats_model)
    @jwt_required()
    async def get(self):
        """获取标签统计信息"""
        try:
            tag_service = get_tag_service()
            stats = await tag_service.get_tag_statistics()
            return stats
        except Exception as e:
            tag_ns.abort(500, f'获取标签统计失败: {str(e)}')


@tag_ns.route('/<string:tag_id>/directories')
class TagDirectoriesResource(Resource):
    """标签关联目录资源"""
    
    @tag_ns.doc('get_tag_directories')
    @jwt_required()
    def get(self, tag_id):
        """获取标签关联的目录"""
        try:
            tag_service = get_tag_service()
            directories = tag_service.get_directories_by_tag(tag_id)
            return [self._directory_to_dict(d) for d in directories]
        except TagNotFoundError as e:
            tag_ns.abort(404, str(e))
        except Exception as e:
            tag_ns.abort(500, f'获取标签关联目录失败: {str(e)}')
    
    @tag_ns.doc('add_tag_directory')
    @jwt_required()
    def post(self, tag_id):
        """添加标签到目录"""
        try:
            data = request.get_json()
            directory_id = data.get('directory_id')
            
            tag_service = get_tag_service()
            tag_service.add_directory_tag(directory_id, tag_id)
            return {'message': '标签关联成功'}, 201
        except TagAssociationError as e:
            tag_ns.abort(409, str(e))
        except Exception as e:
            tag_ns.abort(500, f'添加标签关联失败: {str(e)}')


@tag_ns.route('/<string:tag_id>/files')
class TagFilesResource(Resource):
    """标签关联文件资源"""
    
    @tag_ns.doc('get_tag_files')
    @jwt_required()
    def get(self, tag_id):
        """获取标签关联的文件"""
        try:
            tag_service = get_tag_service()
            files = tag_service.get_files_by_tag(tag_id)
            return [self._file_to_dict(f) for f in files]
        except TagNotFoundError as e:
            tag_ns.abort(404, str(e))
        except Exception as e:
            tag_ns.abort(500, f'获取标签关联文件失败: {str(e)}')
    
    @tag_ns.doc('add_tag_file')
    @jwt_required()
    def post(self, tag_id):
        """添加标签到文件"""
        try:
            data = request.get_json()
            file_id = data.get('file_id')
            
            tag_service = get_tag_service()
            tag_service.add_file_tag(file_id, tag_id)
            return {'message': '标签关联成功'}, 201
        except TagAssociationError as e:
            tag_ns.abort(409, str(e))
        except Exception as e:
            tag_ns.abort(500, f'添加标签关联失败: {str(e)}')


@tag_ns.route('/search')
class TagSearchResource(Resource):
    """标签搜索资源"""
    
    @tag_ns.doc('search_by_tags')
    @jwt_required()
    def get(self):
        """根据标签搜索目录和文件"""
        try:
            tag_ids = request.args.getlist('tag_ids')
            search_type = request.args.get('type', 'all')  # all, directories, files
            
            tag_service = get_tag_service()
            result = {'directories': [], 'files': []}
            
            if search_type in ['all', 'directories']:
                directories = tag_service.search_directories_by_tags(tag_ids)
                result['directories'] = [self._directory_to_dict(d) for d in directories]
            
            if search_type in ['all', 'files']:
                files = tag_service.search_files_by_tags(tag_ids)
                result['files'] = [self._file_to_dict(f) for f in files]
            
            return result
        except Exception as e:
            tag_ns.abort(500, f'标签搜索失败: {str(e)}')


# 辅助方法
def _tag_to_dict(tag):
    """将标签实体转换为字典"""
    return {
        'id': tag.id,
        'name': tag.name,
        'color': tag.color,
        'description': tag.description,
        'category': tag.category,
        'created_at': tag.created_at,
        'updated_at': tag.updated_at
    }


def _directory_to_dict(directory):
    """将目录实体转换为字典"""
    return {
        'id': directory.id,
        'name': directory.name,
        'path': directory.path.value,
        'full_path': directory.full_path,
        'parent_id': directory.parent_id,
        'level': directory.level,
        'description': directory.description
    }


def _file_to_dict(file_entity):
    """将文件实体转换为字典"""
    return {
        'id': file_entity.id,
        'name': file_entity.name,
        'original_name': file_entity.original_name,
        'file_path': file_entity.file_path.value,
        'full_path': file_entity.full_path,
        'directory_id': file_entity.directory_id,
        'file_size': file_entity.file_size,
        'file_type': file_entity.file_type,
        'file_extension': file_entity.file_extension,
        'description': file_entity.description
    }


# 将辅助方法绑定到资源类
TagListResource._tag_to_dict = staticmethod(_tag_to_dict)
TagResource._tag_to_dict = staticmethod(_tag_to_dict)
TagDirectoriesResource._directory_to_dict = staticmethod(_directory_to_dict)
TagFilesResource._file_to_dict = staticmethod(_file_to_dict)
TagSearchResource._directory_to_dict = staticmethod(_directory_to_dict)
TagSearchResource._file_to_dict = staticmethod(_file_to_dict)