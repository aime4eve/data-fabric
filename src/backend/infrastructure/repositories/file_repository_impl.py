"""文件仓库实现"""
from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy import and_, or_, func, text

from domain.entities.file import File
from domain.repositories.file_repository import FileRepository
from infrastructure.persistence.models import FileModel
from infrastructure.persistence.database import db, get_db
from shared_kernel.exceptions.domain_exceptions import FileNotFoundError


class FileRepositoryImpl(FileRepository):
    """文件仓库实现"""
    
    def __init__(self, db_session: Session = None):
        self.db_session = db_session or get_db()
    
    async def save(self, file: File) -> File:
        """保存文件"""
        # 查找是否已存在
        existing = self.db_session.query(FileModel).filter(
            FileModel.id == file.id
        ).first()
        
        if existing:
            # 更新现有记录
            existing.name = file.name
            existing.original_name = file.original_name
            existing.file_path = file.file_path
            existing.full_path = file.full_path
            existing.directory_id = file.directory_id
            existing.file_size = file.file_size
            existing.file_type = file.file_type
            existing.file_extension = file.file_extension
            existing.description = file.description
            existing.metadata = file.metadata
            existing.updated_at = file.updated_at
        else:
            # 创建新记录
            file_model = FileModel(
                id=file.id,
                name=file.name,
                original_name=file.original_name,
                file_path=file.file_path,
                full_path=file.full_path,
                directory_id=file.directory_id,
                file_size=file.file_size,
                file_type=file.file_type,
                file_extension=file.file_extension,
                description=file.description,
                metadata=file.metadata,
                created_at=file.created_at,
                updated_at=file.updated_at
            )
            self.db_session.add(file_model)
        
        self.db_session.commit()
        return file
    
    async def find_by_id(self, file_id: UUID) -> Optional[File]:
        """根据ID查找文件"""
        model = self.db_session.query(FileModel).filter(
            FileModel.id == file_id
        ).first()
        
        return self._model_to_entity(model) if model else None
    
    async def find_by_path(self, path: str) -> Optional[File]:
        """根据路径查找文件"""
        model = self.db_session.query(FileModel).filter(
            FileModel.file_path == path
        ).first()
        
        return self._model_to_entity(model) if model else None
    
    async def find_by_directory_id(self, directory_id: UUID) -> List[File]:
        """根据目录ID查找文件"""
        models = self.db_session.query(FileModel).filter(
            FileModel.directory_id == directory_id
        ).order_by(FileModel.name).all()
        
        return [self._model_to_entity(model) for model in models]
    
    async def find_by_name_pattern(self, pattern: str, directory_id: Optional[UUID] = None) -> List[File]:
        """根据名称模式查找文件"""
        query = self.db_session.query(FileModel).filter(
            FileModel.name.like(f"%{pattern}%")
        )
        
        if directory_id:
            query = query.filter(FileModel.directory_id == directory_id)
        
        models = query.order_by(FileModel.name).all()
        return [self._model_to_entity(model) for model in models]
    
    async def find_by_file_type(self, file_type: str, directory_id: Optional[UUID] = None) -> List[File]:
        """根据文件类型查找文件"""
        query = self.db_session.query(FileModel).filter(
            FileModel.file_type == file_type
        )
        
        if directory_id:
            query = query.filter(FileModel.directory_id == directory_id)
        
        models = query.order_by(FileModel.name).all()
        return [self._model_to_entity(model) for model in models]
    
    async def find_by_extension(self, extension: str, directory_id: Optional[UUID] = None) -> List[File]:
        """根据文件扩展名查找文件"""
        query = self.db_session.query(FileModel).filter(
            FileModel.file_extension == extension.lower()
        )
        
        if directory_id:
            query = query.filter(FileModel.directory_id == directory_id)
        
        models = query.order_by(FileModel.name).all()
        return [self._model_to_entity(model) for model in models]
    
    async def exists_by_path(self, path: str) -> bool:
        """检查路径是否存在"""
        count = self.db_session.query(FileModel).filter(
            FileModel.file_path == path
        ).count()
        return count > 0
    
    async def exists_by_name_in_directory(self, name: str, directory_id: UUID) -> bool:
        """检查目录中是否存在同名文件"""
        count = self.db_session.query(FileModel).filter(
            and_(
                FileModel.name == name,
                FileModel.directory_id == directory_id
            )
        ).count()
        return count > 0
    
    async def exists_by_name_and_directory(self, name: str, directory_id: UUID) -> bool:
        """检查目录中是否存在同名文件"""
        count = self.db_session.query(FileModel).filter(
            and_(
                FileModel.name == name,
                FileModel.directory_id == directory_id
            )
        ).count()
        return count > 0
    
    async def delete_by_id(self, file_id: UUID) -> bool:
        """根据ID删除文件"""
        model = self.db_session.query(FileModel).filter(
            FileModel.id == file_id
        ).first()
        
        if model:
            self.db_session.delete(model)
            self.db_session.commit()
            return True
        return False
    
    async def delete_by_directory_id(self, directory_id: UUID) -> int:
        """删除目录下所有文件"""
        count = self.db_session.query(FileModel).filter(
            FileModel.directory_id == directory_id
        ).count()
        
        self.db_session.query(FileModel).filter(
            FileModel.directory_id == directory_id
        ).delete()
        
        self.db_session.commit()
        return count
    
    async def count_by_directory_id(self, directory_id: UUID) -> int:
        """统计目录中的文件数量"""
        return self.db_session.query(FileModel).filter(
            FileModel.directory_id == directory_id
        ).count()
    
    async def get_total_size_by_directory_id(self, directory_id: UUID) -> int:
        """获取目录中所有文件的总大小"""
        result = self.db_session.query(
            func.sum(FileModel.file_size)
        ).filter(
            FileModel.directory_id == directory_id
        ).scalar()
        
        return result or 0
    
    def _model_to_entity(self, model: FileModel) -> File:
        """将模型转换为实体"""
        return File(
            id=model.id,
            name=model.name,
            original_name=model.original_name,
            file_path=model.file_path,
            full_path=model.full_path,
            directory_id=model.directory_id,
            file_size=model.file_size,
            file_type=model.file_type,
            file_extension=model.file_extension,
            description=model.description,
            metadata=model.metadata,
            created_at=model.created_at,
            updated_at=model.updated_at
        )