"""标签管理REST API控制器"""
from flask import Blueprint, request, jsonify
from flask_restx import Api, Resource, fields, Namespace
from uuid import UUID
from typing import Optional

from ...application.services.tag_service import TagService
from ...shared_kernel.exceptions.domain_exceptions import (
    TagNotFoundError,
    TagAlreadyExistsError,
    InvalidTagNameError,
    TagAssociationError
)

# 创建蓝图
tag_bp = Blueprint('tag', __name__, url_prefix='/api/v1/tags')

# 创建命名空间
tag_ns = Namespace('tags', description='标签管理API')

# 定义数据模型
tag_model = tag_ns.model('Tag', {
    'id': fields.String(required=True, description='标签ID'),
    'name': fields.String(required=True, description='标签名称'),
    'color': fields.String(description='标签颜色'),
    'description': fields.String(description='标签描述'),
    'category': fields.String(description='标签分类'),
    'created_at': fields.DateTime(required=True, description='创建时间'),
    'updated_at': fields.DateTime(required=True, description='更新时间')
})

create_tag_model = tag_ns.model('CreateTag', {
    'name': fields.String(required=True, description='标签名称'),
    'color': fields.String(description='标签颜色', default='#007bff'),
    'description': fields.String(description='标签描述'),
    'category': fields.String(description='标签分类', default='general')
})

update_tag_model = tag_ns.model('UpdateTag', {
    'name': fields.String(description='标签名称'),
    'color': fields.String(description='标签颜色'),
    'description': fields.String(description='标签描述'),
    'category': fields.String(description='标签分类')
})

tag_statistics_model = tag_ns.model('TagStatistics', {
    'total_tags': fields.Integer(description='标签总数'),
    'categories': fields.Raw(description='分类统计'),
    'usage_stats': fields.Raw(description='使用统计')
})

tag_association_model = tag_ns.model('TagAssociation', {
    'tag_id': fields.String(required=True, description='标签ID'),
    'target_id': fields.String(required=True, description='目标ID（目录或文件）'),
    'target_type': fields.String(required=True, description='目标类型（directory/file）')
})

# 初始化服务
tag_service = TagService()


@tag_ns.route('')
class TagListResource(Resource):
    """标签列表资源"""
    
    @tag_ns.doc('get_tags')
    @tag_ns.param('category', '标签分类', type='string')
    @tag_ns.param('search', '搜索关键词', type='string')
    @tag_ns.marshal_list_with(tag_model)
    def get(self):
        """获取标签列表"""
        try:
            category = request.args.get('category')
            search = request.args.get('search')
            
            if category:
                tags = tag_service.get_tags_by_category(category)
            elif search:
                tags = tag_service.search_tags(search)
            else:
                tags = tag_service.get_all_tags()
            
            return [
                {
                    'id': str(tag.id),
                    'name': tag.name,
                    'color': tag.color,
                    'description': tag.description,
                    'category': tag.category,
                    'created_at': tag.created_at,
                    'updated_at': tag.updated_at
                }
                for tag in tags
            ]
            
        except Exception as e:
            return {'error': str(e)}, 500
    
    @tag_ns.doc('create_tag')
    @tag_ns.expect(create_tag_model)
    @tag_ns.marshal_with(tag_model, code=201)
    def post(self):
        """创建标签"""
        try:
            data = request.get_json()
            
            tag = tag_service.create_tag(
                name=data['name'],
                color=data.get('color', '#007bff'),
                description=data.get('description'),
                category=data.get('category', 'general')
            )
            
            return {
                'id': str(tag.id),
                'name': tag.name,
                'color': tag.color,
                'description': tag.description,
                'category': tag.category,
                'created_at': tag.created_at,
                'updated_at': tag.updated_at
            }, 201
            
        except TagAlreadyExistsError as e:
            return {'error': str(e)}, 409
        except InvalidTagNameError as e:
            return {'error': str(e)}, 400
        except Exception as e:
            return {'error': str(e)}, 500


@tag_ns.route('/<string:tag_id>')
class TagResource(Resource):
    """单个标签资源"""
    
    @tag_ns.doc('get_tag')
    @tag_ns.marshal_with(tag_model)
    def get(self, tag_id):
        """获取标签详情"""
        try:
            tag = tag_service.get_tag_by_id(UUID(tag_id))
            
            return {
                'id': str(tag.id),
                'name': tag.name,
                'color': tag.color,
                'description': tag.description,
                'category': tag.category,
                'created_at': tag.created_at,
                'updated_at': tag.updated_at
            }
            
        except TagNotFoundError as e:
            return {'error': str(e)}, 404
        except Exception as e:
            return {'error': str(e)}, 500
    
    @tag_ns.doc('update_tag')
    @tag_ns.expect(update_tag_model)
    @tag_ns.marshal_with(tag_model)
    def put(self, tag_id):
        """更新标签"""
        try:
            data = request.get_json()
            
            tag = tag_service.update_tag(
                tag_id=UUID(tag_id),
                name=data.get('name'),
                color=data.get('color'),
                description=data.get('description'),
                category=data.get('category')
            )
            
            return {
                'id': str(tag.id),
                'name': tag.name,
                'color': tag.color,
                'description': tag.description,
                'category': tag.category,
                'created_at': tag.created_at,
                'updated_at': tag.updated_at
            }
            
        except TagNotFoundError as e:
            return {'error': str(e)}, 404
        except TagAlreadyExistsError as e:
            return {'error': str(e)}, 409
        except InvalidTagNameError as e:
            return {'error': str(e)}, 400
        except Exception as e:
            return {'error': str(e)}, 500
    
    @tag_ns.doc('delete_tag')
    def delete(self, tag_id):
        """删除标签"""
        try:
            success = tag_service.delete_tag(UUID(tag_id))
            
            if success:
                return {'message': '标签删除成功'}, 200
            else:
                return {'error': '标签删除失败'}, 500
                
        except TagNotFoundError as e:
            return {'error': str(e)}, 404
        except Exception as e:
            return {'error': str(e)}, 500


@tag_ns.route('/categories')
class TagCategoriesResource(Resource):
    """标签分类资源"""
    
    @tag_ns.doc('get_tag_categories')
    def get(self):
        """获取所有标签分类"""
        try:
            categories = tag_service.get_tag_categories()
            
            return [
                {
                    'name': category,
                    'count': count
                }
                for category, count in categories.items()
            ]
            
        except Exception as e:
            return {'error': str(e)}, 500


@tag_ns.route('/statistics')
class TagStatisticsResource(Resource):
    """标签统计资源"""
    
    @tag_ns.doc('get_tag_statistics')
    @tag_ns.marshal_with(tag_statistics_model)
    def get(self):
        """获取标签统计信息"""
        try:
            stats = tag_service.get_tag_statistics()
            
            return {
                'total_tags': stats['total_tags'],
                'categories': stats['categories'],
                'usage_stats': stats['usage_stats']
            }
            
        except Exception as e:
            return {'error': str(e)}, 500


@tag_ns.route('/associations')
class TagAssociationsResource(Resource):
    """标签关联资源"""
    
    @tag_ns.doc('create_tag_association')
    @tag_ns.expect(tag_association_model)
    def post(self):
        """创建标签关联"""
        try:
            data = request.get_json()
            
            tag_id = UUID(data['tag_id'])
            target_id = UUID(data['target_id'])
            target_type = data['target_type']
            
            if target_type == 'directory':
                success = tag_service.add_directory_tag(target_id, tag_id)
            elif target_type == 'file':
                success = tag_service.add_file_tag(target_id, tag_id)
            else:
                return {'error': '不支持的目标类型'}, 400
            
            if success:
                return {'message': '标签关联成功'}, 201
            else:
                return {'error': '标签已存在'}, 409
                
        except Exception as e:
            return {'error': str(e)}, 500
    
    @tag_ns.doc('delete_tag_association')
    @tag_ns.expect(tag_association_model)
    def delete(self):
        """删除标签关联"""
        try:
            data = request.get_json()
            
            tag_id = UUID(data['tag_id'])
            target_id = UUID(data['target_id'])
            target_type = data['target_type']
            
            if target_type == 'directory':
                success = tag_service.remove_directory_tag(target_id, tag_id)
            elif target_type == 'file':
                success = tag_service.remove_file_tag(target_id, tag_id)
            else:
                return {'error': '不支持的目标类型'}, 400
            
            if success:
                return {'message': '标签关联删除成功'}, 200
            else:
                return {'error': '标签关联不存在'}, 404
                
        except Exception as e:
            return {'error': str(e)}, 500


@tag_ns.route('/<string:tag_id>/directories')
class TagDirectoriesResource(Resource):
    """标签关联的目录资源"""
    
    @tag_ns.doc('get_tag_directories')
    def get(self, tag_id):
        """获取标签关联的目录"""
        try:
            directories = tag_service.get_directories_by_tag(UUID(tag_id))
            
            return [
                {
                    'id': str(directory.id),
                    'name': directory.name,
                    'path': directory.path.value,
                    'full_path': directory.full_path,
                    'level': directory.level
                }
                for directory in directories
            ]
            
        except Exception as e:
            return {'error': str(e)}, 500


@tag_ns.route('/<string:tag_id>/files')
class TagFilesResource(Resource):
    """标签关联的文件资源"""
    
    @tag_ns.doc('get_tag_files')
    def get(self, tag_id):
        """获取标签关联的文件"""
        try:
            files = tag_service.get_files_by_tag(UUID(tag_id))
            
            return [
                {
                    'id': str(file.id),
                    'name': file.name,
                    'original_name': file.original_name,
                    'file_path': file.file_path,
                    'file_size': file.file_size,
                    'file_type': file.file_type,
                    'file_extension': file.file_extension
                }
                for file in files
            ]
            
        except Exception as e:
            return {'error': str(e)}, 500


@tag_ns.route('/search')
class TagSearchResource(Resource):
    """标签搜索资源"""
    
    @tag_ns.doc('search_by_tags')
    @tag_ns.param('tag_names', '标签名称列表（逗号分隔）', type='string', required=True)
    @tag_ns.param('target_type', '目标类型（directory/file/all）', type='string', default='all')
    def get(self):
        """根据标签搜索目录和文件"""
        try:
            tag_names = request.args.get('tag_names', '').split(',')
            target_type = request.args.get('target_type', 'all')
            
            if not tag_names or not tag_names[0]:
                return {'error': '标签名称不能为空'}, 400
            
            result = {
                'directories': [],
                'files': []
            }
            
            if target_type in ['directory', 'all']:
                # 搜索目录
                for tag_name in tag_names:
                    tag = tag_service.get_tag_by_name(tag_name.strip())
                    if tag:
                        directories = tag_service.get_directories_by_tag(tag.id)
                        result['directories'].extend([
                            {
                                'id': str(directory.id),
                                'name': directory.name,
                                'path': directory.path.value,
                                'full_path': directory.full_path,
                                'level': directory.level
                            }
                            for directory in directories
                        ])
            
            if target_type in ['file', 'all']:
                # 搜索文件
                for tag_name in tag_names:
                    tag = tag_service.get_tag_by_name(tag_name.strip())
                    if tag:
                        files = tag_service.get_files_by_tag(tag.id)
                        result['files'].extend([
                            {
                                'id': str(file.id),
                                'name': file.name,
                                'original_name': file.original_name,
                                'file_path': file.file_path,
                                'file_size': file.file_size,
                                'file_type': file.file_type,
                                'file_extension': file.file_extension
                            }
                            for file in files
                        ])
            
            # 去重
            result['directories'] = list({d['id']: d for d in result['directories']}.values())
            result['files'] = list({f['id']: f for f in result['files']}.values())
            
            return result
            
        except Exception as e:
            return {'error': str(e)}, 500


# 注册蓝图
def register_tag_routes(app):
    """注册标签路由"""
    app.register_blueprint(tag_bp)