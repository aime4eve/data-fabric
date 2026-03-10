"""
文件管理控制器
"""
import os
from flask import request, jsonify, send_file
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.datastructures import FileStorage

from infrastructure.config.dependency_injection import get_file_service, get_tag_service
from shared_kernel.exceptions.domain_exceptions import (
    FileNotFoundError, FileAlreadyExistsError, InvalidFileNameError,
    FileSizeTooLargeError, UnsupportedFileTypeError
)

# 创建命名空间
file_ns = Namespace('files', description='文件管理接口')

# 定义请求模型
upload_parser = file_ns.parser()
upload_parser.add_argument('file', location='files', type=FileStorage, required=True, help='上传的文件')
upload_parser.add_argument('directory_id', type=str, required=True, help='目录ID')
upload_parser.add_argument('description', type=str, help='文件描述')

update_file_model = file_ns.model('UpdateFile', {
    'name': fields.String(description='文件名称'),
    'description': fields.String(description='文件描述'),
    'metadata': fields.Raw(description='元数据')
})

# 定义响应模型
file_model = file_ns.model('File', {
    'id': fields.String(description='文件ID'),
    'name': fields.String(description='文件名称'),
    'original_name': fields.String(description='原始文件名'),
    'file_path': fields.String(description='文件路径'),
    'full_path': fields.String(description='完整路径'),
    'directory_id': fields.String(description='所属目录ID'),
    'file_size': fields.Integer(description='文件大小（字节）'),
    'file_type': fields.String(description='文件类型'),
    'file_extension': fields.String(description='文件扩展名'),
    'description': fields.String(description='文件描述'),
    'metadata': fields.Raw(description='元数据'),
    'created_at': fields.DateTime(description='创建时间'),
    'updated_at': fields.DateTime(description='更新时间')
})

file_stats_model = file_ns.model('FileStats', {
    'total_files': fields.Integer(description='总文件数'),
    'total_size': fields.Integer(description='总文件大小'),
    'by_type': fields.Raw(description='按类型统计'),
    'by_extension': fields.Raw(description='按扩展名统计')
})


@file_ns.route('')
class FileListResource(Resource):
    """文件列表资源"""
    
    @file_ns.doc('list_files')
    @file_ns.marshal_list_with(file_model)
    @jwt_required()
    def get(self):
        """获取文件列表"""
        try:
            directory_id = request.args.get('directory_id')
            file_type = request.args.get('file_type')
            extension = request.args.get('extension')
            name_pattern = request.args.get('name_pattern')
            page = int(request.args.get('page', 1))
            size = int(request.args.get('size', 20))
            
            file_service = get_file_service()
            
            if directory_id:
                files = file_service.get_files_by_directory(directory_id, page, size)
            elif file_type:
                files = file_service.get_files_by_type(file_type, page, size)
            elif extension:
                files = file_service.get_files_by_extension(extension, page, size)
            elif name_pattern:
                files = file_service.search_files_by_name(name_pattern, page, size)
            else:
                files = file_service.get_all_files(page, size)
            
            return [self._file_to_dict(f) for f in files]
        except Exception as e:
            file_ns.abort(500, f'获取文件列表失败: {str(e)}')
    
    @file_ns.doc('upload_file')
    @file_ns.expect(upload_parser)
    @file_ns.marshal_with(file_model, code=201)
    @jwt_required()
    def post(self):
        """上传文件"""
        try:
            args = upload_parser.parse_args()
            uploaded_file = args['file']
            directory_id = args['directory_id']
            description = args.get('description')
            
            file_service = get_file_service()
            file_entity = file_service.upload_file(
                uploaded_file=uploaded_file,
                directory_id=directory_id,
                description=description
            )
            
            return self._file_to_dict(file_entity), 201
        except FileAlreadyExistsError as e:
            file_ns.abort(409, str(e))
        except InvalidFileNameError as e:
            file_ns.abort(400, str(e))
        except FileSizeTooLargeError as e:
            file_ns.abort(413, str(e))
        except UnsupportedFileTypeError as e:
            file_ns.abort(415, str(e))
        except Exception as e:
            file_ns.abort(500, f'文件上传失败: {str(e)}')


@file_ns.route('/<string:file_id>')
class FileResource(Resource):
    """单个文件资源"""
    
    @file_ns.doc('get_file')
    @file_ns.marshal_with(file_model)
    @jwt_required()
    def get(self, file_id):
        """获取文件详情"""
        try:
            file_service = get_file_service()
            file_entity = file_service.get_file_by_id(file_id)
            return self._file_to_dict(file_entity)
        except FileNotFoundError as e:
            file_ns.abort(404, str(e))
        except Exception as e:
            file_ns.abort(500, f'获取文件详情失败: {str(e)}')
    
    @file_ns.doc('update_file')
    @file_ns.expect(update_file_model)
    @file_ns.marshal_with(file_model)
    @jwt_required()
    def put(self, file_id):
        """更新文件信息"""
        try:
            data = request.get_json()
            file_service = get_file_service()
            
            file_entity = file_service.update_file(
                file_id=file_id,
                name=data.get('name'),
                description=data.get('description'),
                metadata=data.get('metadata')
            )
            
            return self._file_to_dict(file_entity)
        except FileNotFoundError as e:
            file_ns.abort(404, str(e))
        except InvalidFileNameError as e:
            file_ns.abort(400, str(e))
        except Exception as e:
            file_ns.abort(500, f'更新文件失败: {str(e)}')
    
    @file_ns.doc('delete_file')
    @jwt_required()
    def delete(self, file_id):
        """删除文件"""
        try:
            file_service = get_file_service()
            file_service.delete_file(file_id)
            return {'message': '文件删除成功'}, 200
        except FileNotFoundError as e:
            file_ns.abort(404, str(e))
        except Exception as e:
            file_ns.abort(500, f'删除文件失败: {str(e)}')


@file_ns.route('/<string:file_id>/download')
class FileDownloadResource(Resource):
    """文件下载资源"""
    
    @file_ns.doc('download_file')
    @jwt_required()
    def get(self, file_id):
        """下载文件"""
        try:
            file_service = get_file_service()
            file_entity = file_service.get_file_by_id(file_id)
            
            # 检查文件是否存在
            if not os.path.exists(file_entity.full_path):
                file_ns.abort(404, '文件不存在')
            
            return send_file(
                file_entity.full_path,
                as_attachment=True,
                download_name=file_entity.original_name
            )
        except FileNotFoundError as e:
            file_ns.abort(404, str(e))
        except Exception as e:
            file_ns.abort(500, f'文件下载失败: {str(e)}')


@file_ns.route('/<string:file_id>/tags')
class FileTagsResource(Resource):
    """文件标签资源"""
    
    @file_ns.doc('get_file_tags')
    @jwt_required()
    def get(self, file_id):
        """获取文件标签"""
        try:
            tag_service = get_tag_service()
            tags = tag_service.get_file_tags(file_id)
            return [self._tag_to_dict(tag) for tag in tags]
        except Exception as e:
            file_ns.abort(500, f'获取文件标签失败: {str(e)}')
    
    @file_ns.doc('add_file_tag')
    @jwt_required()
    def post(self, file_id):
        """添加文件标签"""
        try:
            data = request.get_json()
            tag_id = data.get('tag_id')
            
            tag_service = get_tag_service()
            tag_service.add_file_tag(file_id, tag_id)
            return {'message': '标签添加成功'}, 201
        except Exception as e:
            file_ns.abort(500, f'添加文件标签失败: {str(e)}')


@file_ns.route('/<string:file_id>/tags/<string:tag_id>')
class FileTagResource(Resource):
    """文件单个标签资源"""
    
    @file_ns.doc('remove_file_tag')
    @jwt_required()
    def delete(self, file_id, tag_id):
        """移除文件标签"""
        try:
            tag_service = get_tag_service()
            tag_service.remove_file_tag(file_id, tag_id)
            return {'message': '标签移除成功'}, 200
        except Exception as e:
            file_ns.abort(500, f'移除文件标签失败: {str(e)}')


@file_ns.route('/stats')
class FileStatsResource(Resource):
    """文件统计资源"""
    
    @file_ns.doc('get_file_stats')
    @file_ns.marshal_with(file_stats_model)
    @jwt_required()
    def get(self):
        """获取文件统计信息"""
        try:
            directory_id = request.args.get('directory_id')
            file_service = get_file_service()
            
            if directory_id:
                stats = file_service.get_directory_file_stats(directory_id)
            else:
                stats = file_service.get_global_file_stats()
            
            return stats
        except Exception as e:
            file_ns.abort(500, f'获取文件统计失败: {str(e)}')


# 辅助方法
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
        'description': file_entity.description,
        'metadata': file_entity.metadata,
        'created_at': file_entity.created_at,
        'updated_at': file_entity.updated_at
    }


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
FileListResource._file_to_dict = staticmethod(_file_to_dict)
FileResource._file_to_dict = staticmethod(_file_to_dict)
FileTagsResource._tag_to_dict = staticmethod(_tag_to_dict)