"""目录领域服务"""
import os
from typing import List, Optional
from uuid import UUID

from domain.entities.directory import Directory
from domain.value_objects.directory_path import DirectoryPath
from domain.repositories.directory_repository import DirectoryRepository
from domain.repositories.file_repository import FileRepository
from shared_kernel.exceptions.domain_exceptions import (
    DirectoryNotFoundError,
    DirectoryAlreadyExistsError,
    DirectoryNotEmptyError,
    InvalidDirectoryNameError
)


class DirectoryService:
    """目录领域服务"""
    
    def __init__(
        self,
        directory_repository: DirectoryRepository,
        file_repository: FileRepository,
        base_path: str = "/root/knowledge-base-app/company_knowledge_base"
    ):
        self.directory_repository = directory_repository
        self.file_repository = file_repository
        self.base_path = base_path
    
    async def create_directory(
        self,
        name: str,
        parent_id: Optional[UUID] = None,
        description: Optional[str] = None
    ) -> Directory:
        """创建目录"""
        # 验证目录名称
        self._validate_directory_name(name)
        
        # 获取父目录信息
        parent_directory = None
        if parent_id:
            parent_directory = await self.directory_repository.find_by_id(parent_id)
            if not parent_directory:
                raise DirectoryNotFoundError(f"父目录不存在: {parent_id}")
        
        # 检查同级目录中是否存在同名目录
        if await self.directory_repository.exists_by_name_and_parent(name, parent_id):
            raise DirectoryAlreadyExistsError(f"目录已存在: {name}")
        
        # 构建目录路径
        if parent_directory:
            relative_path = parent_directory.path.join(name).value
            level = parent_directory.level + 1
        else:
            relative_path = name
            level = 0
        
        full_path = os.path.join(self.base_path, relative_path)
        
        # 创建物理目录
        os.makedirs(full_path, exist_ok=True)
        
        # 创建目录实体
        directory = Directory.create(
            name=name,
            path=relative_path,
            full_path=full_path,
            parent_id=parent_id,
            level=level,
            description=description
        )
        
        # 保存到数据库
        return await self.directory_repository.save(directory)
    
    async def update_directory(
        self,
        directory_id: UUID,
        name: Optional[str] = None,
        description: Optional[str] = None
    ) -> Directory:
        """更新目录"""
        directory = await self.directory_repository.find_by_id(directory_id)
        if not directory:
            raise DirectoryNotFoundError(f"目录不存在: {directory_id}")
        
        old_name = directory.name
        old_path = directory.path.value
        old_full_path = directory.full_path
        
        # 更新名称
        if name and name != directory.name:
            self._validate_directory_name(name)
            
            # 检查同级目录中是否存在同名目录
            if await self.directory_repository.exists_by_name_and_parent(name, directory.parent_id):
                raise DirectoryAlreadyExistsError(f"目录已存在: {name}")
            
            # 更新目录名称和路径
            directory.update_name(name)
            
            # 重新计算路径
            if directory.parent_id:
                parent_directory = await self.directory_repository.find_by_id(directory.parent_id)
                new_relative_path = parent_directory.path.join(name).value
            else:
                new_relative_path = name
            
            new_full_path = os.path.join(self.base_path, new_relative_path)
            
            # 重命名物理目录
            if os.path.exists(old_full_path):
                os.rename(old_full_path, new_full_path)
            
            # 更新路径信息
            directory.path = DirectoryPath(new_relative_path)
            directory.full_path = new_full_path
            
            # 更新所有子目录的路径
            await self._update_children_paths(directory_id, old_path, new_relative_path)
        
        # 更新描述
        if description is not None:
            directory.update_description(description)
        
        return await self.directory_repository.save(directory)
    
    async def delete_directory(self, directory_id: UUID, force: bool = False) -> bool:
        """删除目录"""
        directory = await self.directory_repository.find_by_id(directory_id)
        if not directory:
            raise DirectoryNotFoundError(f"目录不存在: {directory_id}")
        
        # 检查目录是否为空
        if not force:
            children_count = await self.directory_repository.count_by_parent_id(directory_id)
            files_count = await self.file_repository.count_by_directory_id(directory_id)
            
            if children_count > 0 or files_count > 0:
                raise DirectoryNotEmptyError(f"目录不为空，无法删除: {directory.name}")
        
        # 递归删除子目录和文件
        if force:
            await self._delete_directory_recursive(directory_id)
        
        # 删除物理目录
        if os.path.exists(directory.full_path):
            try:
                os.rmdir(directory.full_path)
            except OSError:
                # 如果目录不为空，强制删除
                import shutil
                shutil.rmtree(directory.full_path)
        
        # 从数据库删除
        return await self.directory_repository.delete_by_id(directory_id)
    
    async def get_directory_tree(self, parent_id: Optional[UUID] = None) -> List[Directory]:
        """获取目录树"""
        return await self.directory_repository.find_by_parent_id(parent_id)
    
    async def get_directory_path_chain(self, directory_id: UUID) -> List[Directory]:
        """获取目录路径链（从根目录到当前目录）"""
        path_chain = []
        current_directory = await self.directory_repository.find_by_id(directory_id)
        
        while current_directory:
            path_chain.insert(0, current_directory)
            if current_directory.parent_id:
                current_directory = await self.directory_repository.find_by_id(current_directory.parent_id)
            else:
                break
        
        return path_chain
    
    def _validate_directory_name(self, name: str) -> None:
        """验证目录名称"""
        if not name or not name.strip():
            raise InvalidDirectoryNameError("目录名称不能为空")
        
        if len(name) > 255:
            raise InvalidDirectoryNameError("目录名称长度不能超过255个字符")
        
        # 检查非法字符
        invalid_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|']
        for char in invalid_chars:
            if char in name:
                raise InvalidDirectoryNameError(f"目录名称不能包含字符: {char}")
    
    async def _update_children_paths(self, parent_id: UUID, old_parent_path: str, new_parent_path: str) -> None:
        """更新子目录路径"""
        children = await self.directory_repository.find_all_children(parent_id)
        
        for child in children:
            # 更新相对路径
            old_child_path = child.path.value
            new_child_path = old_child_path.replace(old_parent_path, new_parent_path, 1)
            child.path = DirectoryPath(new_child_path)
            
            # 更新完整路径
            child.full_path = os.path.join(self.base_path, new_child_path)
            
            await self.directory_repository.save(child)
    
    async def _delete_directory_recursive(self, directory_id: UUID) -> None:
        """递归删除目录及其内容"""
        # 删除目录中的所有文件
        await self.file_repository.delete_by_directory_id(directory_id)
        
        # 递归删除子目录
        children = await self.directory_repository.find_by_parent_id(directory_id)
        for child in children:
            await self._delete_directory_recursive(child.id)
            await self.directory_repository.delete_by_id(child.id)