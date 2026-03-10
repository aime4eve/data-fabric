"""文件管理REST API控制器"""
import os
from flask import Blueprint, request, jsonify, send_file
from flask_restx import Api, Resource, fields, Namespace
from werkzeug.utils import secure_filename
from uuid import UUID
from typing import Optional

from ...application.services.file_service import FileService
from ...application.services.tag_service import TagService
from ...shared_kernel.exceptions.domain_exceptions import (
    FileNotFoundError,
    FileAlreadyExistsError,
    InvalidFileNameError,
    FileSizeTooLargeError,
    UnsupportedFileTypeError,
    DirectoryNotFoundError
)

# 创建蓝图
file_bp = Blueprint('file', __name__, url_prefix='/api/v1/files')

# 创建命名空间
file_ns = Namespace('files', description='文件管理API')

# 定义数据模型
file_model = file_ns.model('File', {
    'id': fields.String(required=True, description='文件ID'),
    'name': fields.String(required=True, description='文件名称'),
    'original_name': fields.String(required=True, description='原始文件名'),
    'file_path': fields.String(required=True, description='文件路径'),
    'full_path': fields.String(required=True, description='完整路径'),
    'directory_id': fields.String(required=True, description='所属目录ID'),
    'file_size': fields.Integer(required=True, description='文件大小（字节）'),
    'file_type': fields.String(required=True, description='文件类型'),
    'file_extension': fields.String(required=True, description='文件扩展名'),
    'description': fields.String(description='文件描述'),
    'metadata': fields.Raw(description='元数据'),
    'created_at': fields.DateTime(required=True, description='创建时间'),
    'updated_at': fields.DateTime(required=True, description='更新时间'),
    'tags': fields.List(fields.Raw, description='标签列表')
})

upload_response_model = file_ns.model('UploadResponse', {
    'file': fields.Nested(file_model),
    'message': fields.String(description='上传结果消息')
})

update_file_model = file_ns.model('UpdateFile', {
    'name': fields.String(description='文件名称'),
    'description': fields.String(description='文件描述')
})

file_search_model = file_ns.model('FileSearch', {
    'files': fields.List(fields.Nested(file_model)),
    'total': fields.Integer(description='总数量'),
    'page': fields.Integer(description='当前页码'),
    'per_page': fields.Integer(description='每页数量')
})

# 初始化服务
file_service = FileService()
tag_service = TagService()


@file_ns.route('')
class FileListResource(Resource):
    """文件列表资源"""
    
    @file_ns.doc('get_files')
    @file_ns.param('directory_id', '目录ID', type='string')
    @file_ns.param('file_type', '文件类型', type='string')
    @file_ns.param('extension', '文件扩展名', type='string')
    @file_ns.param('search', '搜索关键词', type='string')
    @file_ns.param('page', '页码', type='int', default=1)
    @file_ns.param('per_page', '每页数量', type='int', default=20)
    @file_ns.marshal_with(file_search_model)
    def get(self):
        """获取文件列表"""
        try:
            directory_id = request.args.get('directory_id')
            file_type = request.args.get('file_type')
            extension = request.args.get('extension')
            search = request.args.get('search')
            page = int(request.args.get('page', 1))
            per_page = int(request.args.get('per_page', 20))
            
            if directory_id:
                # 获取指定目录下的文件
                files = file_service.get_files_by_directory(UUID(directory_id))
            elif search:
                # 搜索文件
                files = file_service.search_files(search)
            elif file_type:
                # 按文件类型筛选
                files = file_service.get_files_by_type(file_type)
            elif extension:
                # 按扩展名筛选
                files = file_service.get_files_by_extension(extension)
            else:
                # 获取所有文件（分页）
                files = []  # 这里可以实现获取所有文件的逻辑
            
            # 分页处理
            total = len(files)
            start = (page - 1) * per_page
            end = start + per_page
            paginated_files = files[start:end]
            
            # 添加标签信息
            result_files = []
            for file in paginated_files:
                file_dict = {
                    'id': str(file.id),
                    'name': file.name,
                    'original_name': file.original_name,
                    'file_path': file.file_path,
                    'full_path': file.full_path,
                    'directory_id': str(file.directory_id),
                    'file_size': file.file_size,
                    'file_type': file.file_type,
                    'file_extension': file.file_extension,
                    'description': file.description,
                    'metadata': file.metadata,
                    'created_at': file.created_at,
                    'updated_at': file.updated_at,
                    'tags': []
                }
                
                # 获取标签
                try:
                    tags = tag_service.get_file_tags(file.id)
                    file_dict['tags'] = [
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
                
                result_files.append(file_dict)
            
            return {
                'files': result_files,
                'total': total,
                'page': page,
                'per_page': per_page
            }
            
        except Exception as e:
            return {'error': str(e)}, 500


@file_ns.route('/upload')
class FileUploadResource(Resource):
    """文件上传资源"""
    
    @file_ns.doc('upload_file')
    @file_ns.param('directory_id', '目录ID', type='string', required=True)
    @file_ns.param('description', '文件描述', type='string')
    @file_ns.marshal_with(upload_response_model, code=201)
    def post(self):
        """上传文件"""
        try:
            # 检查是否有文件
            if 'file' not in request.files:
                return {'error': '没有选择文件'}, 400
            
            uploaded_file = request.files['file']
            if uploaded_file.filename == '':
                return {'error': '没有选择文件'}, 400
            
            # 获取参数
            directory_id = request.form.get('directory_id')
            description = request.form.get('description', '')
            
            if not directory_id:
                return {'error': '目录ID不能为空'}, 400
            
            # 上传文件
            file_entity = file_service.upload_file(
                uploaded_file=uploaded_file,
                directory_id=UUID(directory_id),
                description=description
            )
            
            file_dict = {
                'id': str(file_entity.id),
                'name': file_entity.name,
                'original_name': file_entity.original_name,
                'file_path': file_entity.file_path,
                'full_path': file_entity.full_path,
                'directory_id': str(file_entity.directory_id),
                'file_size': file_entity.file_size,
                'file_type': file_entity.file_type,
                'file_extension': file_entity.file_extension,
                'description': file_entity.description,
                'metadata': file_entity.metadata,
                'created_at': file_entity.created_at,
                'updated_at': file_entity.updated_at,
                'tags': []
            }
            
            return {
                'file': file_dict,
                'message': '文件上传成功'
            }, 201
            
        except DirectoryNotFoundError as e:
            return {'error': str(e)}, 404
        except FileAlreadyExistsError as e:
            return {'error': str(e)}, 409
        except FileSizeTooLargeError as e:
            return {'error': str(e)}, 413
        except UnsupportedFileTypeError as e:
            return {'error': str(e)}, 415
        except Exception as e:
            return {'error': str(e)}, 500


@file_ns.route('/<string:file_id>')
class FileResource(Resource):
    """单个文件资源"""
    
    @file_ns.doc('get_file')
    @file_ns.marshal_with(file_model)
    def get(self, file_id):
        """获取文件详情"""
        try:
            file_entity = file_service.get_file_by_id(UUID(file_id))
            
            # 获取标签
            tags = []
            try:
                tag_list = tag_service.get_file_tags(file_entity.id)
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
                'id': str(file_entity.id),
                'name': file_entity.name,
                'original_name': file_entity.original_name,
                'file_path': file_entity.file_path,
                'full_path': file_entity.full_path,
                'directory_id': str(file_entity.directory_id),
                'file_size': file_entity.file_size,
                'file_type': file_entity.file_type,
                'file_extension': file_entity.file_extension,
                'description': file_entity.description,
                'metadata': file_entity.metadata,
                'created_at': file_entity.created_at,
                'updated_at': file_entity.updated_at,
                'tags': tags
            }
            
        except FileNotFoundError as e:
            return {'error': str(e)}, 404
        except Exception as e:
            return {'error': str(e)}, 500
    
    @file_ns.doc('update_file')
    @file_ns.expect(update_file_model)
    @file_ns.marshal_with(file_model)
    def put(self, file_id):
        """更新文件信息"""
        try:
            data = request.get_json()
            
            file_entity = file_service.update_file(
                file_id=UUID(file_id),
                name=data.get('name'),
                description=data.get('description')
            )
            
            return {
                'id': str(file_entity.id),
                'name': file_entity.name,
                'original_name': file_entity.original_name,
                'file_path': file_entity.file_path,
                'full_path': file_entity.full_path,
                'directory_id': str(file_entity.directory_id),
                'file_size': file_entity.file_size,
                'file_type': file_entity.file_type,
                'file_extension': file_entity.file_extension,
                'description': file_entity.description,
                'metadata': file_entity.metadata,
                'created_at': file_entity.created_at,
                'updated_at': file_entity.updated_at,
                'tags': []
            }
            
        except FileNotFoundError as e:
            return {'error': str(e)}, 404
        except InvalidFileNameError as e:
            return {'error': str(e)}, 400
        except Exception as e:
            return {'error': str(e)}, 500
    
    @file_ns.doc('delete_file')
    def delete(self, file_id):
        """删除文件"""
        try:
            success = file_service.delete_file(UUID(file_id))
            
            if success:
                return {'message': '文件删除成功'}, 200
            else:
                return {'error': '文件删除失败'}, 500
                
        except FileNotFoundError as e:
            return {'error': str(e)}, 404
        except Exception as e:
            return {'error': str(e)}, 500


@file_ns.route('/<string:file_id>/download')
class FileDownloadResource(Resource):
    """文件下载资源"""
    
    @file_ns.doc('download_file')
    def get(self, file_id):
        """下载文件"""
        try:
            file_entity = file_service.get_file_by_id(UUID(file_id))
            
            # 检查文件是否存在
            if not os.path.exists(file_entity.full_path):
                return {'error': '文件不存在'}, 404
            
            return send_file(
                file_entity.full_path,
                as_attachment=True,
                download_name=file_entity.original_name
            )
            
        except FileNotFoundError as e:
            return {'error': str(e)}, 404
        except Exception as e:
            return {'error': str(e)}, 500


@file_ns.route('/<string:file_id>/tags')
class FileTagsResource(Resource):
    """文件标签资源"""
    
    @file_ns.doc('get_file_tags')
    def get(self, file_id):
        """获取文件标签"""
        try:
            tags = tag_service.get_file_tags(UUID(file_id))
            
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
    
    @file_ns.doc('add_file_tag')
    def post(self, file_id):
        """为文件添加标签"""
        try:
            data = request.get_json()
            tag_id = UUID(data['tag_id'])
            
            success = tag_service.add_file_tag(UUID(file_id), tag_id)
            
            if success:
                return {'message': '标签添加成功'}, 201
            else:
                return {'error': '标签已存在'}, 409
                
        except Exception as e:
            return {'error': str(e)}, 500
    
    @file_ns.doc('remove_file_tag')
    def delete(self, file_id):
        """移除文件标签"""
        try:
            data = request.get_json()
            tag_id = UUID(data['tag_id'])
            
            success = tag_service.remove_file_tag(UUID(file_id), tag_id)
            
            if success:
                return {'message': '标签移除成功'}, 200
            else:
                return {'error': '标签不存在'}, 404
                
        except Exception as e:
            return {'error': str(e)}, 500


@file_ns.route('/statistics')
class FileStatisticsResource(Resource):
    """文件统计资源"""
    
    @file_ns.doc('get_file_statistics')
    def get(self):
        """获取文件统计信息"""
        try:
            directory_id = request.args.get('directory_id')
            
            if directory_id:
                stats = file_service.get_directory_file_stats(UUID(directory_id))
            else:
                # 获取全局统计
                stats = {
                    'total_files': 0,
                    'total_size': 0,
                    'file_types': {}
                }
            
            return stats
            
        except Exception as e:
            return {'error': str(e)}, 500


# 注册蓝图
def register_file_routes(app):
    """注册文件路由"""
    app.register_blueprint(file_bp)