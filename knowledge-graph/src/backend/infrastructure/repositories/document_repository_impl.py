"""
文档仓储实现
"""
import uuid
from typing import List, Optional
from datetime import datetime

from domain.entities.document import Document, DocumentStatus
from domain.repositories.document_repository import DocumentRepository
from infrastructure.persistence.database import db
from infrastructure.persistence.models import DocumentModel


class DocumentRepositoryImpl(DocumentRepository):
    """文档仓储实现"""
    
    def save(self, document: Document) -> Document:
        """保存文档"""
        doc_id_uuid = uuid.UUID(document.id)
        # 检查是否已存在
        existing_model = DocumentModel.query.filter_by(id=doc_id_uuid).first()
        
        if existing_model:
            # 更新现有文档
            existing_model.title = document.title
            existing_model.content_path = document.content_path
            existing_model.category_id = uuid.UUID(document.category_id)
            existing_model.author_id = uuid.UUID(document.author_id)
            existing_model.status = document.status.value if isinstance(document.status, DocumentStatus) else document.status
            existing_model.doc_metadata = document.metadata
            existing_model.updated_at = document.updated_at
            model = existing_model
        else:
            # 创建新文档
            model = DocumentModel(
                id=doc_id_uuid,
                title=document.title,
                content_path=document.content_path,
                category_id=uuid.UUID(document.category_id),
                author_id=uuid.UUID(document.author_id),
                status=document.status.value,
                doc_metadata=document.metadata,
                created_at=document.created_at,
                updated_at=document.updated_at
            )
            db.session.add(model)
        
        db.session.commit()
        return self._model_to_entity(model)
    
    def find_by_id(self, document_id: str) -> Optional[Document]:
        """根据ID查找文档"""
        model = DocumentModel.query.filter_by(id=uuid.UUID(document_id)).first()
        return self._model_to_entity(model) if model else None
    
    def find_by_category_id(self, category_id: str) -> List[Document]:
        """根据分类ID查找文档"""
        models = DocumentModel.query.filter_by(category_id=category_id).all()
        return [self._model_to_entity(model) for model in models]
    
    def find_by_author_id(self, author_id: str) -> List[Document]:
        """根据作者ID查找文档"""
        import uuid
        models = DocumentModel.query.filter_by(author_id=uuid.UUID(author_id)).all()
        return [self._model_to_entity(model) for model in models]
    
    def find_by_status(self, status: DocumentStatus) -> List[Document]:
        """根据状态查找文档"""
        models = DocumentModel.query.filter_by(status=status.value).all()
        return [self._model_to_entity(model) for model in models]
    
    def count_by_status(self, status: str) -> int:
        """根据状态计算文档数量"""
        return DocumentModel.query.filter_by(status=status).count()

    def find_all(self, page: int = 1, size: int = 20) -> List[Document]:
        """分页查找所有文档"""
        models = DocumentModel.query.filter(
            DocumentModel.status != DocumentStatus.DELETED.value
        ).paginate(
            page=page, per_page=size, error_out=False
        ).items
        return [self._model_to_entity(model) for model in models]
    
    def search_by_title(self, title: str) -> List[Document]:
        """根据标题搜索文档"""
        models = DocumentModel.query.filter(
            DocumentModel.title.contains(title)
        ).all()
        return [self._model_to_entity(model) for model in models]
    
    def search_documents(self, query: str, category_id: str = None, author_id: str = None, 
                        status: DocumentStatus = None, page: int = 1, size: int = 20) -> List[Document]:
        """全文搜索文档"""
        from sqlalchemy import or_
        
        # 构建基础查询
        base_query = DocumentModel.query
        
        # 添加搜索条件
        if query:
            search_conditions = []
            # 标题搜索（只有当字段不为空时才搜索）
            title_condition = (
                (DocumentModel.title.isnot(None)) & 
                (DocumentModel.title != '') &
                (DocumentModel.title.contains(query))
            )
            search_conditions.append(title_condition)
            
            # 内容搜索（只有当字段不为空时才搜索）
            content_condition = (
                (DocumentModel.content_text.isnot(None)) & 
                (DocumentModel.content_text != '') &
                (DocumentModel.content_text.contains(query))
            )
            search_conditions.append(content_condition)
            
            # 摘要搜索（只有当字段不为空时才搜索）
            summary_condition = (
                (DocumentModel.content_summary.isnot(None)) & 
                (DocumentModel.content_summary != '') &
                (DocumentModel.content_summary.contains(query))
            )
            search_conditions.append(summary_condition)
            
            # 路径搜索（只有当字段不为空时才搜索）
            path_condition = (
                (DocumentModel.content_path.isnot(None)) & 
                (DocumentModel.content_path != '') &
                (DocumentModel.content_path.contains(query))
            )
            search_conditions.append(path_condition)
            
            base_query = base_query.filter(or_(*search_conditions))
        
        # 添加过滤条件
        if category_id:
            base_query = base_query.filter(DocumentModel.category_id == category_id)
        if author_id:
            base_query = base_query.filter(DocumentModel.author_id == author_id)
        if status:
            base_query = base_query.filter(DocumentModel.status == status.value)
        # 注释掉默认只搜索已发布文档的限制，允许搜索所有状态的文档
        # else:
        #     # 默认只搜索已发布的文档
        #     base_query = base_query.filter(DocumentModel.status == 'published')
        
        # 分页查询
        if page is None or size is None:
            # 不分页，返回所有结果
            models = base_query.all()
        else:
            try:
                models = base_query.paginate(
                    page=page, per_page=size, error_out=False
                ).items
            except Exception as e:
                # 如果分页失败，直接查询所有结果
                models = base_query.all()
        
        return [self._model_to_entity(model) for model in models]
    
    def search_by_content(self, content: str) -> List[Document]:
        """根据内容搜索文档"""
        from sqlalchemy import or_
        
        models = DocumentModel.query.filter(
            or_(
                DocumentModel.content_text.contains(content),
                DocumentModel.content_summary.contains(content)
            )
        ).all()
        return [self._model_to_entity(model) for model in models]
    
    def update(self, document: Document) -> Document:
        """更新文档"""
        return self.save(document)
    
    def delete(self, document_id: str) -> bool:
        """软删除文档"""
        model = DocumentModel.query.filter_by(id=document_id).first()
        if model:
            model.status = DocumentStatus.DELETED.value
            db.session.commit()
            return True
        return False
    
    def exists(self, document_id: str) -> bool:
        """检查文档是否存在"""
        return DocumentModel.query.filter_by(id=document_id).first() is not None
    
    def count_by_category(self, category_id: str) -> int:
        """统计分类下的文档数量"""
        return DocumentModel.query.filter_by(category_id=category_id).count()
    
    def count_by_author(self, author_id: str) -> int:
        """统计作者的文档数量"""
        import uuid
        return DocumentModel.query.filter_by(author_id=uuid.UUID(author_id)).count()
    
    def count_by_status(self, status: DocumentStatus = None) -> int:
        """统计指定状态的文档数量"""
        query = DocumentModel.query
        if status:
            # 处理字符串和枚举两种类型的status参数
            if isinstance(status, str):
                query = query.filter_by(status=status)
            else:
                query = query.filter_by(status=status.value)
        return query.count()
    
    def get_document_statistics(self) -> dict:
        """获取文档统计信息"""
        from sqlalchemy import func
        
        # 使用SQLAlchemy的聚合查询来高效统计不同状态的文档数量
        result = db.session.query(
            DocumentModel.status,
            func.count(DocumentModel.id).label('count')
        ).group_by(DocumentModel.status).all()
        
        # 将结果转换为字典
        status_counts = {status: count for status, count in result}
        
        # 计算总数
        total_count = sum(status_counts.values())
        
        return {
            'total_documents': total_count,
            'published_documents': status_counts.get('published', 0),
            'draft_documents': status_counts.get('draft', 0),
            'archived_documents': status_counts.get('archived', 0),
            'deleted_documents': status_counts.get('deleted', 0)
        }
    
    def _model_to_entity(self, model: DocumentModel) -> Document:
        """将模型转换为实体"""
        if not model:
            return None
            
        metadata = model.doc_metadata or {}
        # 添加内容相关的元数据
        if hasattr(model, 'content_text') and model.content_text:
            metadata['has_content'] = True
        if hasattr(model, 'content_summary') and model.content_summary:
            metadata['has_summary'] = True
            
        return Document(
            id=str(model.id),
            title=model.title,
            content_path=model.content_path,
            category_id=str(model.category_id),
            author_id=str(model.author_id),
            status=DocumentStatus(model.status) if model.status else None,
            created_at=model.created_at,
            updated_at=model.updated_at,
            metadata=metadata
        )