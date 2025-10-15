"""
目录仓库实现
"""
from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy import text

from domain.entities.directory import Directory
from domain.value_objects.directory_path import DirectoryPath
from domain.repositories.directory_repository import DirectoryRepository
from infrastructure.persistence.models import DirectoryModel
from infrastructure.persistence.database import db, get_db
from shared_kernel.exceptions.domain_exceptions import DirectoryNotFoundError


class DirectoryRepositoryImpl(DirectoryRepository):
    """目录仓库实现"""
    
    def __init__(self, db_session: Session = None):
        self.db_session = db_session or get_db()
    
    async def save(self, directory: Directory) -> Directory:
        """保存目录"""
        # 查找是否已存在
        existing = self.db_session.query(DirectoryModel).filter(
            DirectoryModel.id == directory.id
        ).first()
        
        if existing:
            # 更新现有记录
            existing.name = directory.name
            existing.path = directory.path.value
            existing.full_path = directory.full_path
            existing.parent_id = directory.parent_id
            existing.level = directory.level
            existing.sort_order = directory.sort_order
            existing.description = directory.description
            existing.meta_data = directory.metadata
            existing.updated_at = directory.updated_at
        else:
            # 创建新记录
            directory_model = DirectoryModel(
                id=directory.id,
                name=directory.name,
                path=directory.path.value,
                full_path=directory.full_path,
                parent_id=directory.parent_id,
                level=directory.level,
                sort_order=directory.sort_order,
                description=directory.description,
                meta_data=directory.metadata,
                created_at=directory.created_at,
                updated_at=directory.updated_at
            )
            self.db_session.add(directory_model)
        
        self.db_session.commit()
        return directory
    
    async def find_by_id(self, directory_id: UUID) -> Optional[Directory]:
        """根据ID查找目录"""
        model = self.db_session.query(DirectoryModel).filter(
            DirectoryModel.id == directory_id
        ).first()
        
        return self._model_to_entity(model) if model else None
    
    async def find_by_path(self, path: str) -> Optional[Directory]:
        """根据路径查找目录"""
        model = self.db_session.query(DirectoryModel).filter(
            DirectoryModel.path == path
        ).first()
        
        return self._model_to_entity(model) if model else None
    
    async def find_by_parent_id(self, parent_id: Optional[UUID]) -> List[Directory]:
        """根据父目录ID查找子目录"""
        query = self.db_session.query(DirectoryModel)
        
        if parent_id is None:
            query = query.filter(DirectoryModel.parent_id.is_(None))
        else:
            query = query.filter(DirectoryModel.parent_id == parent_id)
        
        models = query.order_by(DirectoryModel.sort_order, DirectoryModel.name).all()
        return [self._model_to_entity(model) for model in models]
    
    async def find_all_children(self, parent_id: UUID) -> List[Directory]:
        """查找所有子目录（递归）"""
        # 使用递归CTE查询所有子目录
        from sqlalchemy import text
        
        sql = text("""
            WITH RECURSIVE directory_tree AS (
                -- 基础查询：直接子目录
                SELECT id, name, path, full_path, parent_id, level, sort_order, 
                       description, metadata, created_at, updated_at
                FROM directories 
                WHERE parent_id = :parent_id
                
                UNION ALL
                
                -- 递归查询：子目录的子目录
                SELECT d.id, d.name, d.path, d.full_path, d.parent_id, d.level, d.sort_order,
                       d.description, d.metadata, d.created_at, d.updated_at
                FROM directories d
                INNER JOIN directory_tree dt ON d.parent_id = dt.id
            )
            SELECT * FROM directory_tree ORDER BY level, sort_order, name
        """)
        
        result = self.db_session.execute(sql, {"parent_id": str(parent_id)})
        directories = []
        
        for row in result:
            directory = Directory(
                id=UUID(row.id),
                name=row.name,
                path=DirectoryPath(row.path),
                full_path=row.full_path,
                parent_id=UUID(row.parent_id) if row.parent_id else None,
                level=row.level,
                sort_order=row.sort_order,
                description=row.description,
                metadata=row.metadata,
                created_at=row.created_at,
                updated_at=row.updated_at
            )
            directories.append(directory)
        
        return directories
    
    async def find_root_directories(self) -> List[Directory]:
        """查找根目录"""
        return await self.find_by_parent_id(None)
    
    async def exists_by_path(self, path: str) -> bool:
        """检查路径是否存在"""
        count = self.db_session.query(DirectoryModel).filter(
            DirectoryModel.path == path
        ).count()
        return count > 0
    
    async def exists_by_name_and_parent(self, name: str, parent_id: Optional[UUID]) -> bool:
        """检查同级目录中是否存在同名目录"""
        query = self.db_session.query(DirectoryModel).filter(
            DirectoryModel.name == name
        )
        
        if parent_id is None:
            query = query.filter(DirectoryModel.parent_id.is_(None))
        else:
            query = query.filter(DirectoryModel.parent_id == parent_id)
        
        count = query.count()
        return count > 0
    
    async def delete_by_id(self, directory_id: UUID) -> bool:
        """根据ID删除目录"""
        model = self.db_session.query(DirectoryModel).filter(
            DirectoryModel.id == directory_id
        ).first()
        
        if model:
            self.db_session.delete(model)
            self.db_session.commit()
            return True
        return False
    
    async def update_sort_orders(self, directories: List[Directory]) -> None:
        """批量更新排序顺序"""
        for directory in directories:
            model = self.db_session.query(DirectoryModel).filter(
                DirectoryModel.id == directory.id
            ).first()
            if model:
                model.sort_order = directory.sort_order
                model.updated_at = directory.updated_at
        
        self.db_session.commit()
    
    async def count_by_parent_id(self, parent_id: Optional[UUID]) -> int:
        """统计子目录数量"""
        query = self.db_session.query(DirectoryModel)
        
        if parent_id is None:
            query = query.filter(DirectoryModel.parent_id.is_(None))
        else:
            query = query.filter(DirectoryModel.parent_id == parent_id)
        
        return query.count()
    
    def _model_to_entity(self, model: DirectoryModel) -> Directory:
        """将模型转换为实体"""
        return Directory(
            id=model.id,
            name=model.name,
            path=DirectoryPath(model.path),
            full_path=model.full_path,
            parent_id=model.parent_id,
            level=model.level,
            sort_order=model.sort_order,
            description=model.description,
            metadata=model.meta_data,
            created_at=model.created_at,
            updated_at=model.updated_at
        )