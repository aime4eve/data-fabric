"""
SQLAlchemy ORM模型定义
"""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, Text, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import uuid

from infrastructure.persistence.database import db

Base = declarative_base()


class UserModel(db.Model):
    """用户模型"""
    __tablename__ = 'users'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default='user', index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # 关系
    documents = relationship("DocumentModel", back_populates="author", lazy='dynamic')
    favorites = relationship("UserFavoriteModel", back_populates="user", lazy='dynamic')
    
    def __repr__(self):
        return f'<User {self.username}>'


class CategoryModel(db.Model):
    """分类模型"""
    __tablename__ = 'categories'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    path = Column(String(255), unique=True, nullable=False, index=True)
    parent_id = Column(UUID(as_uuid=True), ForeignKey('categories.id'), nullable=True, index=True)
    sort_order = Column(Integer, default=0, nullable=False)
    permissions = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # 关系
    parent = relationship("CategoryModel", remote_side=[id], backref="children")
    documents = relationship("DocumentModel", back_populates="category", lazy='dynamic')
    
    def __repr__(self):
        return f'<Category {self.name}>'


class DocumentModel(db.Model):
    """文档模型"""
    __tablename__ = 'documents'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False, index=True)
    content_path = Column(String(512), nullable=False)
    content_text = Column(Text, nullable=True)  # 文档内容文本，用于全文搜索
    content_summary = Column(Text, nullable=True)  # 文档摘要
    category_id = Column(UUID(as_uuid=True), ForeignKey('categories.id'), nullable=False, index=True)
    author_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, index=True)
    status = Column(String(50), default='draft', nullable=False, index=True)
    doc_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # 关系
    category = relationship("CategoryModel", back_populates="documents")
    author = relationship("UserModel", back_populates="documents")
    versions = relationship("DocumentVersionModel", back_populates="document", lazy='dynamic')
    tags = relationship("DocumentTagModel", back_populates="document", lazy='dynamic')
    favorites = relationship("UserFavoriteModel", back_populates="document", lazy='dynamic')
    
    def __repr__(self):
        return f'<Document {self.title}>'


class DocumentVersionModel(db.Model):
    """文档版本模型"""
    __tablename__ = 'document_versions'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey('documents.id', ondelete='CASCADE'), nullable=False)
    version_number = Column(String(50), nullable=False)
    content_path = Column(String(512), nullable=False)
    change_log = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # 关系
    document = relationship("DocumentModel", back_populates="versions")
    
    def __repr__(self):
        return f'<DocumentVersion {self.version_number}>'


class TagModel(db.Model):
    """标签模型"""
    __tablename__ = 'tags'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False, index=True)
    
    # 关系
    documents = relationship("DocumentTagModel", back_populates="tag", lazy='dynamic')
    
    def __repr__(self):
        return f'<Tag {self.name}>'


class DocumentTagModel(db.Model):
    """文档标签关联模型"""
    __tablename__ = 'document_tags'
    
    document_id = Column(UUID(as_uuid=True), ForeignKey('documents.id', ondelete='CASCADE'), primary_key=True)
    tag_id = Column(UUID(as_uuid=True), ForeignKey('tags.id', ondelete='CASCADE'), primary_key=True)
    
    # 关系
    document = relationship("DocumentModel", back_populates="tags")
    tag = relationship("TagModel", back_populates="documents")
    
    def __repr__(self):
        return f'<DocumentTag {self.document_id}-{self.tag_id}>'


class UserFavoriteModel(db.Model):
    """用户收藏模型"""
    __tablename__ = 'user_favorites'
    
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    document_id = Column(UUID(as_uuid=True), ForeignKey('documents.id', ondelete='CASCADE'), primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # 关系
    user = relationship("UserModel", back_populates="favorites")
    document = relationship("DocumentModel", back_populates="favorites")
    
    def __repr__(self):
        return f'<UserFavorite {self.user_id}-{self.document_id}>'