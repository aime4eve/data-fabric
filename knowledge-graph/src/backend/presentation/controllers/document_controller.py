"""
文档控制器
"""
import os
import logging
from flask import request, jsonify, send_file
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.datastructures import FileStorage

from application.services.document_service import DocumentService
from infrastructure.repositories.document_repository_impl import DocumentRepositoryImpl
from domain.entities.document import DocumentStatus
from infrastructure.persistence.database import db
from shared_kernel.exceptions.auth_exceptions import AuthorizationError

# 设置日志记录
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 创建命名空间
document_ns = Namespace('documents', description='文档管理接口')

# 初始化服务（延迟初始化，避免循环导入）
document_repository = None
document_service = None

def get_document_service():
    global document_repository, document_service
    if document_service is None:
        document_repository = DocumentRepositoryImpl()
        document_service = DocumentService(document_repository)
    return document_service

# 定义模型
document_model = document_ns.model('Document', {
    'id': fields.String(description='文档ID'),
    'title': fields.String(description='文档标题'),
    'content_path': fields.String(description='文档内容路径'),
    'status': fields.String(description='文档状态'),
    'created_at': fields.DateTime(description='创建时间'),
    'updated_at': fields.DateTime(description='更新时间')
})

document_list_response = document_ns.model('DocumentListResponse', {
    'success': fields.Boolean(description='是否成功'),
    'message': fields.String(description='消息'),
    'data': fields.List(fields.Nested(document_model), description='文档列表'),
    'total': fields.Integer(description='总数'),
    'page': fields.Integer(description='当前页'),
    'size': fields.Integer(description='每页大小')
})

# 文档上传响应模型
document_upload_response = document_ns.model('DocumentUploadResponse', {
    'success': fields.Boolean(description='是否成功'),
    'message': fields.String(description='消息'),
    'data': fields.Nested(document_model, description='上传的文档信息')
})

# 文档统计响应模型
document_statistics_response = document_ns.model('DocumentStatisticsResponse', {
    'success': fields.Boolean(description='是否成功'),
    'message': fields.String(description='消息'),
    'data': fields.Raw(description='统计数据')
})


@document_ns.route('/')
class DocumentListResource(Resource):
    """文档列表接口"""
    
    @document_ns.marshal_with(document_list_response)
    def get(self):
        """获取文档列表"""
        try:
            # 获取查询参数
            page = int(request.args.get('page', 1))
            size = int(request.args.get('size', 10))
            
            # 从数据库获取文档列表
            service = get_document_service()
            documents = service.list_documents(page=page, size=size)
            
            # 转换为响应格式
            document_data = []
            for doc in documents:
                document_data.append({
                    'id': str(doc.id),
                    'title': doc.title,
                    'content_path': doc.content_path,
                    'status': doc.status.value,
                    'created_at': doc.created_at.isoformat() + 'Z',
                    'updated_at': doc.updated_at.isoformat() + 'Z',
                    'metadata': doc.metadata
                })
            
            # 获取总数
            total_count = service.count_documents_by_status(status=DocumentStatus.PUBLISHED.value)
            
            return {
                'success': True,
                'message': '获取文档列表成功',
                'data': document_data,
                'total': total_count,
                'page': page,
                'size': size
            }, 200
            
        except Exception as e:
            return {
                'success': False,
                'message': f'获取文档列表失败: {str(e)}',
                'data': [],
                'total': 0,
                'page': 1,
                'size': 10
            }, 500
    
    @jwt_required()
    @document_ns.expect(document_model)
    @document_ns.marshal_with(document_model)
    def post(self):
        """创建新文档"""
        try:
            data = request.get_json()
            # TODO: 实现文档创建逻辑
            return {
                'success': False,
                'message': '文档创建功能暂未实现，请使用文档上传接口'
            }, 501
        except Exception as e:
            return {'error': str(e)}, 500


@document_ns.route('/<string:document_id>')
class DocumentResource(Resource):
    """单个文档接口"""
    
    @jwt_required()
    def get(self, document_id):
        """获取文档详情"""
        try:
            current_user_id = get_jwt_identity()
            service = get_document_service()
            
            # 获取文档信息
            document = service.get_document_info(document_id)
            if not document:
                return {
                    'success': False,
                    'message': '文档不存在或已被删除'
                }, 404
            
            # 返回文档详情 - 保持与前端期望的格式一致
            return {
                'success': True,
                'message': '获取文档详情成功',
                'data': {
                    'id': str(document.id),
                    'title': document.title,
                    'content_path': document.content_path,
                    'status': document.status.value,
                    'created_at': document.created_at.isoformat() + 'Z',
                    'updated_at': document.updated_at.isoformat() + 'Z',
                    'metadata': document.metadata,
                    'author_id': str(document.author_id) if document.author_id else None,
                    'category_id': str(document.category_id) if document.category_id else None
                }
            }, 200
        except Exception as e:
            return {
                'success': False,
                'message': f'获取文档详情失败: {str(e)}'
            }, 500
    
    @jwt_required()
    @document_ns.expect(document_model)
    @document_ns.marshal_with(document_model)
    def put(self, document_id):
        """更新文档"""
        try:
            data = request.get_json()
            # TODO: 实现文档更新逻辑
            return {
                'success': False,
                'message': '文档更新功能暂未实现'
            }, 501
        except Exception as e:
            return {'error': str(e)}, 500
    
    @jwt_required()
    def delete(self, document_id):
        """删除文档"""
        print(f"Attempting to delete document with ID: {document_id}")
        try:
            current_user_id = get_jwt_identity()
            print(f"Current user ID: {current_user_id}")
            
            service = get_document_service()
            print("Document service obtained.")
            
            # 调用服务层删除文档
            print("Calling document service to delete document...")
            success = service.delete_document(document_id, current_user_id)
            print(f"Document service returned: {success}")
            
            if success:
                print("Document deleted successfully.")
                return {
                    'success': True,
                    'message': '文档删除成功'
                }, 200
            else:
                print("Document deletion failed.")
                return {
                    'success': False,
                    'message': '文档删除失败'
                }, 400
                
        except AuthorizationError as e:
            print(f"Authorization error: {e}")
            return {
                'success': False,
                'message': str(e)
            }, 403
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"An unexpected error occurred: {e}")
            return {
                'success': False,
                'message': f'删除文档时发生错误: {str(e)}'
            }, 500

@document_ns.route('/upload')
class DocumentUploadResource(Resource):
    """文档上传接口"""

    @jwt_required()
    def post(self):
        """上传文档"""
        print("Received file upload request")
        print(f"Request headers: {request.headers}")
        print(f"Request form: {request.form}")
        print(f"Request files: {request.files}")
        try:
            current_user_id = get_jwt_identity()

            # 检查是否有文件上传
            if 'file' not in request.files:
                print("No file part in request")
                return {'success': False, 'message': '没有上传文件'}, 400

            file = request.files['file']
            if file.filename == '':
                print("No selected file")
                return {'success': False, 'message': '没有选择文件'}, 400

            # 从表单数据中获取参数
            title = request.form.get('title', file.filename)
            description = request.form.get('description', '')
            category_id = request.form.get('category_id')
            upload_directory = request.form.get('upload_directory', '')

            print(f"Title: {title}")
            print(f"Description: {description}")
            print(f"Category ID: {category_id}")
            print(f"Upload Directory: {upload_directory}")

            # 验证必要参数
            if not title:
                print("Title is missing")
                return {'success': False, 'message': '文档标题不能为空'}, 400
            if not category_id:
                print("Category ID is missing")
                return {'success': False, 'message': '目录ID不能为空'}, 400

            # 调用服务层处理文档上传
            service = get_document_service()
            document = service.upload_document(
                file_data=file.stream,
                filename=file.filename,
                title=title,
                description=description,
                category_id=category_id,
                author_id=current_user_id,
                upload_directory=upload_directory,
                content_type=file.content_type
            )

            # 返回成功响应
            return {
                'success': True,
                'message': '文档上传成功',
                'data': {
                    'id': str(document.id),
                    'title': document.title,
                    'content_path': document.content_path,
                    'status': document.status.value,
                    'created_at': document.created_at.isoformat() + 'Z',
                    'updated_at': document.updated_at.isoformat() + 'Z',
                    'metadata': document.metadata,
                    'author_id': str(document.author_id),
                    'category_id': str(document.category_id)
                }
            }, 201

        except Exception as e:
            import traceback
            traceback.print_exc()
            return {'success': False, 'message': f'服务器内部错误: {str(e)}'}, 500


@document_ns.route('/statistics')
class DocumentStatisticsResource(Resource):
    """文档统计接口"""
    
    @document_ns.marshal_with(document_statistics_response)
    def get(self):
        """获取文档统计信息"""
        try:
            service = get_document_service()
            
            # 获取统计数据
            statistics = service.get_document_statistics()
            
            return {
                'success': True,
                'message': '获取文档统计成功',
                'data': statistics
            }, 200
            
        except Exception as e:
            return {
                'success': False,
                'message': f'获取文档统计失败: {str(e)}',
                'data': {}
            }, 500

@document_ns.route('/<string:document_id>/download')
class DocumentDownloadResource(Resource):
    """文档下载接口"""
    
    @jwt_required()
    def get(self, document_id):
        """下载文档文件"""
        try:
            current_user_id = get_jwt_identity()
            service = get_document_service()
            
            # 获取文档信息
            document = service.get_document_info(document_id)
            if not document:
                return {
                    'success': False,
                    'message': '文档不存在'
                }, 404
            
            # 构建文件路径
            import os
            base_path = '/root/knowledge-base-app/company_knowledge_base'
            file_path = os.path.join(base_path, document.content_path)
            
            if not os.path.exists(file_path):
                return {
                    'success': False,
                    'message': '文件不存在'
                }, 404
            
            # 返回文件
            from flask import send_file
            return send_file(
                file_path,
                as_attachment=True,
                download_name=document.metadata.get('original_filename', document.title)
            )
            
        except Exception as e:
            return {
                'success': False,
                'message': f'下载文件失败: {str(e)}'
            }, 500

@document_ns.route('/<string:document_id>/preview')
class DocumentPreviewResource(Resource):
    """文档预览接口"""
    
    @jwt_required()
    def get(self, document_id):
        """预览文档文件"""
        try:
            current_user_id = get_jwt_identity()
            service = get_document_service()
            
            # 获取文档信息
            document = service.get_document_info(document_id)
            if not document:
                return {
                    'success': False,
                    'message': '文档不存在'
                }, 404
            
            # 构建文件路径
            import os
            base_path = '/root/knowledge-base-app/company_knowledge_base'
            file_path = os.path.join(base_path, document.content_path)
            
            if not os.path.exists(file_path):
                return {
                    'success': False,
                    'message': '文件不存在'
                }, 404
            
            # 返回文件用于预览
            from flask import send_file
            return send_file(file_path)
            
        except Exception as e:
            return {
                'success': False,
                'message': f'预览文件失败: {str(e)}'
            }, 500

@document_ns.route('/file-preview')
class FilePreviewResource(Resource):
    """通用文件预览接口（通过文件路径）"""
    
    def get(self):
        """通过文件路径预览文件"""
        try:
            file_path = request.args.get('path')
            if not file_path:
                return {
                    'success': False,
                    'message': '文件路径不能为空'
                }, 400
            
            # 安全检查：确保文件路径在允许的目录内
            base_path = '/root/knowledge-base-app/company_knowledge_base'
            
            # 如果是相对路径，转换为绝对路径
            if not file_path.startswith('/'):
                full_path = os.path.join(base_path, file_path)
            else:
                full_path = file_path
            
            # 安全检查：确保路径在基础目录内
            full_path = os.path.abspath(full_path)
            base_path = os.path.abspath(base_path)
            
            if not full_path.startswith(base_path):
                return {
                    'success': False,
                    'message': '无权访问该文件'
                }, 403
            
            if not os.path.exists(full_path):
                return {
                    'success': False,
                    'message': '文件不存在'
                }, 404
            
            # 返回文件用于预览
            return send_file(full_path)
            
        except Exception as e:
            return {
                'success': False,
                'message': f'预览文件失败: {str(e)}'
            }, 500