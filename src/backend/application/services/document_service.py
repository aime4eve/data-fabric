"""
文档服务
"""
import os
import uuid
from typing import List, Optional, BinaryIO
from datetime import datetime

from domain.entities.document import Document, DocumentStatus
from domain.repositories.document_repository import DocumentRepository
from infrastructure.storage.file_storage import FileStorageService
from shared_kernel.exceptions.auth_exceptions import AuthorizationError


class DocumentService:
    """文档服务"""
    
    def __init__(self, document_repository: DocumentRepository):
        self.document_repository = document_repository
        # 暂时不初始化文件存储服务，避免MinIO连接错误
        self.file_storage = None
    
    def upload_document(
        self, 
        title: str, 
        file_data: BinaryIO, 
        filename: str,
        category_id: str,
        author_id: str,
        content_type: str = None,
        description: str = '',
        upload_directory: str = ''
    ) -> Document:
        """上传文档"""
        print("--- Starting document upload ---")
        try:
            print(f"Title: {title}, Filename: {filename}, Category: {category_id}")
            # 暂时使用本地路径，避免MinIO连接错误
            content_path = f"local/documents/{filename}"
            
            # 读取文件内容用于索引
            file_content = ""
            if hasattr(file_data, 'read'):
                file_data.seek(0)  # 重置文件指针
                content_bytes = file_data.read()
                file_size = len(content_bytes)
                
                # 如果是文本文件，读取内容
                if filename.endswith(('.md', '.txt', '.py', '.js', '.html', '.css', '.json')):
                    try:
                        file_content = content_bytes.decode('utf-8')
                    except UnicodeDecodeError:
                        try:
                            file_content = content_bytes.decode('gbk')
                        except UnicodeDecodeError:
                            file_content = str(content_bytes)[:1000]  # 如果解码失败，取前1000字符
            else:
                file_size = 0
            
            # 创建文档实体
            document = Document(
                id=str(uuid.uuid4()),
                title=title,
                content_path=content_path,
                category_id=category_id,
                author_id=author_id,
                status=DocumentStatus.DRAFT,
                metadata={
                    'original_filename': filename,
                    'content_type': content_type,
                    'file_size': file_size,
                    'description': description,
                    'upload_directory': upload_directory
                }
            )
            
            # 保存到数据库
            saved_document = self.document_repository.save(document)
            
            # 索引文档内容
            if file_content:
                self.index_document_content(
                    document_id=saved_document.id,
                    content_text=file_content,
                    content_summary=file_content[:500] if len(file_content) > 500 else file_content
                )
            
            return saved_document
            
        except Exception as e:
            raise Exception(f"文档上传失败: {str(e)}")
    
    def download_document(self, document_id: str, user_id: str) -> Optional[bytes]:
        """下载文档"""
        # 获取文档信息
        document = self.document_repository.find_by_id(document_id)
        if not document:
            raise Exception("文档不存在")
        
        # 检查权限（简单实现，可以根据需要扩展）
        if document.status == DocumentStatus.DELETED:
            raise AuthorizationError("文档已删除")
        
        # 暂时返回空数据，避免MinIO连接错误
        return b"Document content placeholder"
    
    def get_document_info(self, document_id: str) -> Optional[Document]:
        """获取文档信息"""
        return self.document_repository.find_by_id(document_id)
    
    def get_document_by_id(self, document_id: str) -> Optional[Document]:
        """根据ID获取文档（别名方法）"""
        return self.get_document_info(document_id)
    
    def update_document(
        self, 
        document_id: str, 
        title: str = None,
        category_id: str = None,
        user_id: str = None
    ) -> Document:
        """更新文档信息"""
        document = self.document_repository.find_by_id(document_id)
        if not document:
            raise Exception("文档不存在")
        
        # 检查权限
        if document.author_id != user_id:
            raise AuthorizationError("无权限修改此文档")
        
        # 更新文档信息
        if title:
            document.update_title(title)
        if category_id:
            document.update_category(category_id)
        
        return self.document_repository.update(document)
    
    def delete_document(self, document_id: str, user_id: str) -> bool:
        """删除文档"""
        document = self.document_repository.find_by_id(document_id)
        if not document:
            raise Exception("文档不存在")
        
        # 检查权限
        if document.author_id != user_id:
            raise AuthorizationError("无权限删除此文档")
        
        # 软删除
        return self.document_repository.delete(document_id)
    
    def publish_document(self, document_id: str, user_id: str) -> Document:
        """发布文档"""
        document = self.document_repository.find_by_id(document_id)
        if not document:
            raise Exception("文档不存在")
        
        # 检查权限
        if document.author_id != user_id:
            raise AuthorizationError("无权限发布此文档")
        
        # 发布文档
        document.publish()
        return self.document_repository.update(document)
    
    def archive_document(self, document_id: str, user_id: str) -> Document:
        """归档文档"""
        document = self.document_repository.find_by_id(document_id)
        if not document:
            raise Exception("文档不存在")
        
        # 检查权限
        if document.author_id != user_id:
            raise AuthorizationError("无权限归档此文档")
        
        # 归档文档
        document.archive()
        return self.document_repository.update(document)
    
    def count_documents_by_status(self, status: str) -> int:
        """根据状态计算文档数量"""
        return self.document_repository.count_by_status(status)
    
    def list_documents(
        self, 
        category_id: str = None,
        author_id: str = None,
        status: DocumentStatus = None,
        page: int = 1,
        size: int = 20
    ) -> List[Document]:
        """列出文档"""
        if category_id:
            return self.document_repository.find_by_category_id(category_id)
        elif author_id:
            return self.document_repository.find_by_author_id(author_id)
        elif status:
            return self.document_repository.find_by_status(status)
        else:
            return self.document_repository.find_all(page, size)
    
    def search_documents(self, query: str, category_id: str = None, author_id: str = None, 
                        status: DocumentStatus = None, page: int = 1, size: int = 20) -> List[Document]:
        """全文搜索文档"""
        return self.document_repository.search_documents(
            query=query,
            category_id=category_id,
            author_id=author_id,
            status=status,
            page=page,
            size=size
        )
    
    def search_by_title(self, title: str) -> List[Document]:
        """根据标题搜索文档（保持向后兼容）"""
        return self.document_repository.search_by_title(title)
    
    def search_by_content(self, content: str) -> List[Document]:
        """根据内容搜索文档"""
        return self.document_repository.search_by_content(content)
    
    def index_document_content(self, document_id: str, content_text: str, content_summary: str = None) -> bool:
        """索引文档内容"""
        try:
            document = self.document_repository.find_by_id(document_id)
            if not document:
                return False
            
            # 更新文档的内容字段
            from infrastructure.database.models import DocumentModel
            from infrastructure.database.database import db
            
            doc_model = DocumentModel.query.filter_by(id=document_id).first()
            if doc_model:
                doc_model.content_text = content_text
                doc_model.content_summary = content_summary or content_text[:500]  # 默认取前500字符作为摘要
                db.session.commit()
                return True
            return False
        except Exception as e:
            print(f"索引文档内容失败: {str(e)}")
            return False
    
    def get_document_url(self, document_id: str, user_id: str, expires: int = 3600) -> Optional[str]:
        """获取文档访问URL"""
        document = self.document_repository.find_by_id(document_id)
        if not document:
            return None
        
        # 检查权限（简化实现）
        if document.author_id != user_id:
            raise AuthorizationError("无权限访问此文档")
        
        # 暂时返回本地路径，避免MinIO连接错误
        return f"/local/documents/{document.id}"
    
    def get_document_statistics(self, user_id: str = None) -> dict:
        """获取文档统计信息"""
        if user_id:
            total_count = self.document_repository.count_by_author(user_id)
            return {
                'total_documents': total_count,
                'user_id': user_id
            }
        else:
            # 使用高效的统计方法
            return self.document_repository.get_document_statistics()