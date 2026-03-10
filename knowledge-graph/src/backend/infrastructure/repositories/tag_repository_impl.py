"""
标签仓库实现
"""
from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy import text, and_

from domain.entities.tag import Tag
from domain.entities.directory import Directory
from domain.entities.file import File
from domain.repositories.tag_repository import TagRepository
from infrastructure.persistence.models import TagModel, DirectoryTagModel, FileTagModel, DirectoryModel, FileModel
from infrastructure.persistence.database import db, get_db
from shared_kernel.exceptions.domain_exceptions import TagNotFoundError


class TagRepositoryImpl(TagRepository):
    """标签仓库实现"""
    
    def __init__(self, db_session: Session = None):
        self.db_session = db_session or get_db()
    
    async def save(self, tag: Tag) -> Tag:
        """保存标签"""
        # 查找是否已存在
        existing = self.db_session.query(TagModel).filter(
            TagModel.id == tag.id
        ).first()
        
        if existing:
            # 更新现有记录
            existing.name = tag.name
            existing.color = tag.color
            existing.description = tag.description
            existing.category = tag.category
            existing.updated_at = tag.updated_at
        else:
            # 创建新记录
            tag_model = TagModel(
                id=tag.id,
                name=tag.name,
                color=tag.color,
                description=tag.description,
                category=tag.category,
                created_at=tag.created_at,
                updated_at=tag.updated_at
            )
            self.db_session.add(tag_model)
        
        self.db_session.commit()
        return tag
    
    async def find_by_id(self, tag_id: UUID) -> Optional[Tag]:
        """根据ID查找标签"""
        model = self.db_session.query(TagModel).filter(
            TagModel.id == tag_id
        ).first()
        
        return self._model_to_entity(model) if model else None
    
    async def find_by_name(self, name: str) -> Optional[Tag]:
        """根据名称查找标签"""
        model = self.db_session.query(TagModel).filter(
            TagModel.name == name
        ).first()
        
        return self._model_to_entity(model) if model else None
    
    async def find_by_category(self, category: str) -> List[Tag]:
        """根据分类查找标签"""
        models = self.db_session.query(TagModel).filter(
            TagModel.category == category
        ).order_by(TagModel.name).all()
        
        return [self._model_to_entity(model) for model in models]
    
    async def find_by_name_pattern(self, pattern: str) -> List[Tag]:
        """根据名称模式查找标签"""
        models = self.db_session.query(TagModel).filter(
            TagModel.name.like(f"%{pattern}%")
        ).order_by(TagModel.name).all()
        
        return [self._model_to_entity(model) for model in models]
    
    async def find_all(self) -> List[Tag]:
        """查找所有标签"""
        models = self.db_session.query(TagModel).order_by(TagModel.name).all()
        return [self._model_to_entity(model) for model in models]
    
    async def exists_by_name(self, name: str) -> bool:
        """检查名称是否存在"""
        count = self.db_session.query(TagModel).filter(
            TagModel.name == name
        ).count()
        return count > 0
    
    async def delete_by_id(self, tag_id: UUID) -> bool:
        """根据ID删除标签"""
        # 先删除所有关联关系
        self.db_session.query(DirectoryTagModel).filter(
            DirectoryTagModel.tag_id == tag_id
        ).delete()
        
        self.db_session.query(FileTagModel).filter(
            FileTagModel.tag_id == tag_id
        ).delete()
        
        self.db_session.query(DocumentTagModel).filter(
            DocumentTagModel.tag_id == tag_id
        ).delete()
        
        # 删除标签
        model = self.db_session.query(TagModel).filter(
            TagModel.id == tag_id
        ).first()
        
        if model:
            self.db_session.delete(model)
            self.db_session.commit()
            return True
        return False
    
    async def count_all(self) -> int:
        """统计所有标签数量"""
        return self.db_session.query(TagModel).count()
    
    # 目录标签关联方法
    async def add_directory_tag(self, directory_id: UUID, tag_id: UUID) -> bool:
        """为目录添加标签"""
        # 检查是否已存在关联
        existing = self.db_session.query(DirectoryTagModel).filter(
            and_(
                DirectoryTagModel.directory_id == directory_id,
                DirectoryTagModel.tag_id == tag_id
            )
        ).first()
        
        if not existing:
            association = DirectoryTagModel(
                directory_id=directory_id,
                tag_id=tag_id
            )
            self.db_session.add(association)
            self.db_session.commit()
            return True
        return False
    
    async def remove_directory_tag(self, directory_id: UUID, tag_id: UUID) -> bool:
        """移除目录标签"""
        association = self.db_session.query(DirectoryTagModel).filter(
            and_(
                DirectoryTagModel.directory_id == directory_id,
                DirectoryTagModel.tag_id == tag_id
            )
        ).first()
        
        if association:
            self.db_session.delete(association)
            self.db_session.commit()
            return True
        return False
    
    async def find_directory_tags(self, directory_id: UUID) -> List[Tag]:
        """查找目录的所有标签"""
        models = self.db_session.query(TagModel).join(
            DirectoryTagModel,
            TagModel.id == DirectoryTagModel.tag_id
        ).filter(
            DirectoryTagModel.directory_id == directory_id
        ).order_by(TagModel.name).all()
        
        return [self._model_to_entity(model) for model in models]
    
    async def find_directories_by_tag(self, tag_id: UUID) -> List[UUID]:
        """查找使用该标签的所有目录ID"""
        associations = self.db_session.query(DirectoryTagModel).filter(
            DirectoryTagModel.tag_id == tag_id
        ).all()
        
        return [assoc.directory_id for assoc in associations]
    
    # 文件标签关联方法
    async def add_file_tag(self, file_id: UUID, tag_id: UUID) -> bool:
        """为文件添加标签"""
        # 检查是否已存在关联
        existing = self.db_session.query(FileTagModel).filter(
            and_(
                FileTagModel.file_id == file_id,
                FileTagModel.tag_id == tag_id
            )
        ).first()
        
        if not existing:
            association = FileTagModel(
                file_id=file_id,
                tag_id=tag_id
            )
            self.db_session.add(association)
            self.db_session.commit()
            return True
        return False
    
    async def remove_file_tag(self, file_id: UUID, tag_id: UUID) -> bool:
        """移除文件标签"""
        association = self.db_session.query(FileTagModel).filter(
            and_(
                FileTagModel.file_id == file_id,
                FileTagModel.tag_id == tag_id
            )
        ).first()
        
        if association:
            self.db_session.delete(association)
            self.db_session.commit()
            return True
        return False
    
    async def find_file_tags(self, file_id: UUID) -> List[Tag]:
        """查找文件的所有标签"""
        models = self.db_session.query(TagModel).join(
            FileTagModel,
            TagModel.id == FileTagModel.tag_id
        ).filter(
            FileTagModel.file_id == file_id
        ).order_by(TagModel.name).all()
        
        return [self._model_to_entity(model) for model in models]
    
    async def find_files_by_tag(self, tag_id: UUID) -> List[UUID]:
        """查找使用该标签的所有文件ID"""
        associations = self.db_session.query(FileTagModel).filter(
            FileTagModel.tag_id == tag_id
        ).all()
        
        return [assoc.file_id for assoc in associations]
    
    def _model_to_entity(self, model: TagModel) -> Tag:
        """将模型转换为实体"""
        return Tag(
            id=model.id,
            name=model.name,
            color=model.color,
            description=model.description,
            category=model.category,
            created_at=model.created_at,
            updated_at=model.updated_at
        )