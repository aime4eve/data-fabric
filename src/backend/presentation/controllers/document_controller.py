"""
文档控制器
"""
from flask import request, jsonify
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.datastructures import FileStorage

from application.services.document_service import DocumentService
from infrastructure.repositories.document_repository_impl import DocumentRepositoryImpl
from domain.entities.document import DocumentStatus
from infrastructure.persistence.database import db

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
            
            # 获取总数（简化实现，实际应该从repository获取）
            total_count = len(document_data)
            
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
                'id': 'new_doc_id',
                'title': data.get('title', '新文档'),
                'content_path': '/documents/new_doc.md',
                'status': 'draft',
                'created_at': '2025-01-01T00:00:00Z',
                'updated_at': '2025-01-01T00:00:00Z'
            }, 201
        except Exception as e:
            return {'error': str(e)}, 500


@document_ns.route('/<string:document_id>')
class DocumentResource(Resource):
    """单个文档接口"""
    
    @jwt_required()
    @document_ns.marshal_with(document_model)
    def get(self, document_id):
        """获取文档详情"""
        try:
            # TODO: 实现文档详情获取逻辑
            return {
                'id': document_id,
                'title': f'文档 {document_id}',
                'content_path': f'/documents/{document_id}.md',
                'status': 'published',
                'created_at': '2025-01-01T00:00:00Z',
                'updated_at': '2025-01-01T00:00:00Z'
            }, 200
        except Exception as e:
            return {'error': str(e)}, 500
    
    @jwt_required()
    @document_ns.expect(document_model)
    @document_ns.marshal_with(document_model)
    def put(self, document_id):
        """更新文档"""
        try:
            data = request.get_json()
            # TODO: 实现文档更新逻辑
            return {
                'id': document_id,
                'title': data.get('title', f'更新的文档 {document_id}'),
                'content_path': f'/documents/{document_id}.md',
                'status': data.get('status', 'published'),
                'created_at': '2025-01-01T00:00:00Z',
                'updated_at': '2025-01-01T00:00:00Z'
            }, 200
        except Exception as e:
            return {'error': str(e)}, 500
    
    @jwt_required()
    def delete(self, document_id):
        """删除文档"""
        try:
            # TODO: 实现文档删除逻辑
            return {'message': f'文档 {document_id} 删除成功'}, 204
        except Exception as e:
            return {'error': str(e)}, 500

@document_ns.route('/upload')
class DocumentUploadResource(Resource):
    """文档上传接口"""
    
    @jwt_required()
    @document_ns.marshal_with(document_upload_response)
    def post(self):
        """上传文档"""
        try:
            # 获取当前用户ID
            current_user_id = get_jwt_identity()
            
            # 检查是否有文件上传
            if 'file' not in request.files:
                return {
                    'success': False,
                    'message': '没有上传文件',
                    'data': None
                }, 400
            
            file = request.files['file']
            if file.filename == '':
                return {
                    'success': False,
                    'message': '没有选择文件',
                    'data': None
                }, 400
            
            # 获取表单数据
            title = request.form.get('title', file.filename)
            description = request.form.get('description', '')
            category_id = request.form.get('category_id', '')
            upload_directory = request.form.get('upload_directory', '')
            
            # 验证必填字段
            if not title:
                return {
                    'success': False,
                    'message': '文档标题不能为空',
                    'data': None
                }, 400
            
            # 检查文件类型
            allowed_extensions = {
                'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 
                'txt', 'md', 'rtf', 'odt', 'ods', 'odp'
            }
            
            file_extension = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
            if file_extension not in allowed_extensions:
                return {
                    'success': False,
                    'message': f'不支持的文件类型: {file_extension}。支持的类型: {", ".join(allowed_extensions)}',
                    'data': None
                }, 400
            
            # 检查文件大小 (限制为50MB)
            max_file_size = 50 * 1024 * 1024  # 50MB
            file.seek(0, 2)  # 移动到文件末尾
            file_size = file.tell()
            file.seek(0)  # 重置文件指针
            
            if file_size > max_file_size:
                return {
                    'success': False,
                    'message': f'文件大小超过限制 (最大50MB)，当前文件大小: {file_size / (1024*1024):.2f}MB',
                    'data': None
                }, 400
            
            # 实际文件保存逻辑
            import uuid
            import os
            from datetime import datetime
            
            # 确定文件保存路径
            base_path = '/root/knowledge-base-app/company_knowledge_base'
            if upload_directory:
                # 使用用户选择的目录
                save_directory = os.path.join(base_path, upload_directory)
            else:
                # 默认保存到根目录
                save_directory = base_path
            
            # 确保目录存在
            os.makedirs(save_directory, exist_ok=True)
            
            # 生成唯一文件名
            document_id = str(uuid.uuid4())
            file_extension = os.path.splitext(file.filename)[1]
            unique_filename = f"{document_id}_{file.filename}"
            file_path = os.path.join(save_directory, unique_filename)
            
            # 保存文件
            file.save(file_path)
            
            # 相对路径用于数据库存储
            relative_path = os.path.relpath(file_path, base_path)
            
            # 使用DocumentService保存到数据库
            try:
                # 重置文件指针以便DocumentService读取
                file.seek(0)
                
                # 创建文档实体并直接保存到数据库
                from domain.entities.document import Document
                import uuid
                from datetime import datetime
                
                document = Document(
                    id=str(uuid.uuid4()),
                    title=title,
                    content_path=relative_path,
                    category_id=category_id or 'default',
                    author_id=current_user_id,
                    status=DocumentStatus.DRAFT,
                    metadata={
                        'original_filename': file.filename,
                        'content_type': file.content_type,
                        'file_size': file_size,
                        'description': description,
                        'upload_directory': upload_directory,
                        'full_path': file_path
                    }
                )
                
                # 保存文档到数据库
                service = get_document_service()
                document = service.document_repository.save(document)
                
                # 构建响应数据
                document_data = {
                    'id': str(document.id),
                    'title': document.title,
                    'content_path': document.content_path,
                    'status': document.status.value,
                    'created_at': document.created_at.isoformat() + 'Z',
                    'updated_at': document.updated_at.isoformat() + 'Z',
                    'metadata': document.metadata
                }
                
                return {
                    'success': True,
                    'message': '文档上传成功',
                    'data': document_data
                }, 201
                
            except Exception as db_error:
                # 如果数据库保存失败，删除已保存的文件
                if os.path.exists(file_path):
                    os.remove(file_path)
                raise Exception(f"数据库保存失败: {str(db_error)}")
            
        except Exception as e:
            return {
                'success': False,
                'message': f'文档上传失败: {str(e)}',
                'data': None
            }, 500

@document_ns.route('/search')
class DocumentSearchResource(Resource):
    """文档搜索接口"""
    
    @document_ns.marshal_with(document_list_response)
    def get(self):
        """搜索文档"""
        try:
            # 获取查询参数
            query = request.args.get('query', '').strip()
            category_id = request.args.get('category_id')
            author_id = request.args.get('author_id')
            status = request.args.get('status')
            page = int(request.args.get('page', 1))
            size = int(request.args.get('size', 20))
            
            # 验证查询参数
            if not query:
                return {
                    'success': False,
                    'message': '搜索关键词不能为空',
                    'data': [],
                    'total': 0,
                    'page': page,
                    'size': size
                }, 400
            
            # 转换状态参数
            document_status = None
            if status:
                try:
                    document_status = DocumentStatus(status)
                except ValueError:
                    return {
                        'success': False,
                        'message': f'无效的文档状态: {status}',
                        'data': [],
                        'total': 0,
                        'page': page,
                        'size': size
                    }, 400
            
            # 执行搜索
            service = get_document_service()
            documents = service.search_documents(
                query=query,
                category_id=category_id,
                author_id=author_id,
                status=document_status,
                page=page,
                size=size
            )
            
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
            
            return {
                'success': True,
                'message': f'搜索到 {len(document_data)} 个文档',
                'data': document_data,
                'total': len(document_data),
                'page': page,
                'size': size
            }, 200
            
        except Exception as e:
            return {
                'success': False,
                'message': f'搜索文档失败: {str(e)}',
                'data': [],
                'total': 0,
                'page': 1,
                'size': 20
            }, 500

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