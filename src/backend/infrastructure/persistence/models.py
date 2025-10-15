"""
SQLAlchemy ORM模型定义
"""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, Text, ForeignKey, JSON, UniqueConstraint
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
    # 扩展资料字段
    full_name = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    department = Column(String(100), nullable=True)
    position = Column(String(100), nullable=True)
    avatar_url = Column(String(512), nullable=True)
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


class DirectoryModel(db.Model):
    """目录模型 - 管理company_knowledge_base目录结构"""
    __tablename__ = 'directories'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)  # 目录名称
    path = Column(String(1024), nullable=False, index=True)  # 相对于company_knowledge_base的路径
    full_path = Column(String(1024), nullable=False, unique=True, index=True)  # 完整的文件系统路径
    parent_id = Column(UUID(as_uuid=True), ForeignKey('directories.id'), nullable=True, index=True)
    level = Column(Integer, default=0, nullable=False)  # 目录层级，根目录为0
    sort_order = Column(Integer, default=0, nullable=False)  # 同级目录排序
    description = Column(Text, nullable=True)  # 目录描述
    meta_data = Column(JSON, nullable=True)  # 目录元数据
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # 关系
    parent = relationship("DirectoryModel", remote_side=[id], backref="children")
    files = relationship("FileModel", back_populates="directory", lazy='dynamic')
    tags = relationship("DirectoryTagModel", back_populates="directory", lazy='dynamic')
    
    def __repr__(self):
        return f'<Directory {self.name} at {self.path}>'


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


class FileModel(db.Model):
    """文件模型 - 管理上传到目录中的文件"""
    __tablename__ = 'files'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)  # 文件名
    original_name = Column(String(255), nullable=False)  # 原始文件名
    file_path = Column(String(1024), nullable=False)  # 相对于company_knowledge_base的文件路径
    full_path = Column(String(1024), nullable=False, unique=True, index=True)  # 完整的文件系统路径
    directory_id = Column(UUID(as_uuid=True), ForeignKey('directories.id'), nullable=False, index=True)
    file_size = Column(Integer, nullable=False)  # 文件大小（字节）
    file_type = Column(String(100), nullable=False)  # 文件类型/MIME类型
    file_extension = Column(String(20), nullable=False)  # 文件扩展名
    description = Column(Text, nullable=True)  # 文件描述
    meta_data = Column(JSON, nullable=True)  # 文件元数据
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # 关系
    directory = relationship("DirectoryModel", back_populates="files")
    tags = relationship("FileTagModel", back_populates="file", lazy='dynamic')
    
    def __repr__(self):
        return f'<File {self.name} in {self.file_path}>'


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
    name = Column(String(50), unique=True, nullable=False, index=True)
    color = Column(String(7), nullable=True)  # 标签颜色，格式：#FFFFFF
    description = Column(String(255), nullable=True)
    category = Column(String(50), nullable=True)  # 标签分类
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # 关系
    documents = relationship("DocumentTagModel", back_populates="tag", lazy='dynamic')
    directories = relationship("DirectoryTagModel", back_populates="tag", lazy='dynamic')
    files = relationship("FileTagModel", back_populates="tag", lazy='dynamic')
    
    def __repr__(self):
        return f'<Tag {self.name}>'


class DocumentTagModel(db.Model):
    """文档标签关联模型"""
    __tablename__ = 'document_tags'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey('documents.id'), nullable=False, index=True)
    tag_id = Column(UUID(as_uuid=True), ForeignKey('tags.id'), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # 关系
    document = relationship("DocumentModel", back_populates="tags")
    tag = relationship("TagModel", back_populates="documents")
    
    # 复合唯一约束
    __table_args__ = (UniqueConstraint('document_id', 'tag_id', name='uq_document_tag'),)
    
    def __repr__(self):
        return f'<DocumentTag {self.document_id}-{self.tag_id}>'


class DirectoryTagModel(db.Model):
    """目录标签关联模型"""
    __tablename__ = 'directory_tags'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    directory_id = Column(UUID(as_uuid=True), ForeignKey('directories.id'), nullable=False, index=True)
    tag_id = Column(UUID(as_uuid=True), ForeignKey('tags.id'), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # 关系
    directory = relationship("DirectoryModel", back_populates="tags")
    tag = relationship("TagModel", back_populates="directories")
    
    # 复合唯一约束
    __table_args__ = (UniqueConstraint('directory_id', 'tag_id', name='uq_directory_tag'),)
    
    def __repr__(self):
        return f'<DirectoryTag {self.directory_id}-{self.tag_id}>'


class FileTagModel(db.Model):
    """文件标签关联模型"""
    __tablename__ = 'file_tags'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    file_id = Column(UUID(as_uuid=True), ForeignKey('files.id'), nullable=False, index=True)
    tag_id = Column(UUID(as_uuid=True), ForeignKey('tags.id'), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # 关系
    file = relationship("FileModel", back_populates="tags")
    tag = relationship("TagModel", back_populates="files")
    
    # 复合唯一约束
    __table_args__ = (UniqueConstraint('file_id', 'tag_id', name='uq_file_tag'),)
    
    def __repr__(self):
        return f'<FileTag {self.file_id}-{self.tag_id}>'


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


class PermissionConfigModel(db.Model):
    """目录权限配置模型"""
    __tablename__ = 'permission_configs'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    directory_id = Column(UUID(as_uuid=True), ForeignKey('directories.id', ondelete='CASCADE'), nullable=False, unique=True, index=True)
    rules = Column(JSON, nullable=False, default=list)
    version = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    directory = relationship("DirectoryModel", backref="permission_config", uselist=False)

    def __repr__(self):
        return f'<PermissionConfig directory={self.directory_id} version={self.version}>'


class AuditEventModel(db.Model):
    """审计事件模型"""
    __tablename__ = 'audit_events'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor = Column(String(100), nullable=False, index=True)
    action = Column(String(100), nullable=False, index=True)
    resource_type = Column(String(100), nullable=False, index=True)
    resource_id = Column(String(200), nullable=False, index=True)
    # 注意：SQLAlchemy 声明式模型中 'metadata' 是保留名称，这里使用 'meta_data'
    meta_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    def __repr__(self):
        return f'<AuditEvent {self.action} {self.resource_type}:{self.resource_id}>'