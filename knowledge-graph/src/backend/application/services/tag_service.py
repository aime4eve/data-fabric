"""标签应用服务"""
from typing import List, Optional
from uuid import UUID

from domain.entities.tag import Tag
from domain.repositories.tag_repository import TagRepository
from infrastructure.repositories.tag_repository_impl import TagRepositoryImpl
from shared_kernel.exceptions.domain_exceptions import (
    TagNotFoundError,
    TagAlreadyExistsError,
    InvalidTagNameError,
    TagAssociationError
)


class TagService:
    """标签应用服务"""
    
    def __init__(self, tag_repository: TagRepository = None):
        self.tag_repository = tag_repository or TagRepositoryImpl()
    
    async def create_tag(self, 
                        name: str,
                        color: str = "#1890ff",
                        description: str = None,
                        category: str = "default") -> Tag:
        """创建标签"""
        # 检查是否已存在同名标签
        if await self.tag_repository.exists_by_name(name):
            raise TagAlreadyExistsError(f"标签已存在: {name}")
        
        try:
            # 创建标签实体（会自动验证名称和颜色）
            tag = Tag.create(
                name=name,
                color=color,
                description=description,
                category=category
            )
        except ValueError as e:
            raise InvalidTagNameError(str(e))
        
        return await self.tag_repository.save(tag)
    
    async def get_tag_by_id(self, tag_id: UUID) -> Tag:
        """根据ID获取标签"""
        tag = await self.tag_repository.find_by_id(tag_id)
        if not tag:
            raise TagNotFoundError(f"标签不存在: {tag_id}")
        return tag
    
    async def get_tag_by_name(self, name: str) -> Optional[Tag]:
        """根据名称获取标签"""
        return await self.tag_repository.find_by_name(name)
    
    async def get_tags_by_category(self, category: str) -> List[Tag]:
        """根据分类获取标签"""
        return await self.tag_repository.find_by_category(category)
    
    async def search_tags(self, pattern: str) -> List[Tag]:
        """搜索标签"""
        return await self.tag_repository.find_by_name_pattern(pattern)
    
    async def get_all_tags(self) -> List[Tag]:
        """获取所有标签"""
        return await self.tag_repository.find_all()
    
    async def update_tag(self, 
                        tag_id: UUID,
                        name: str = None,
                        color: str = None,
                        description: str = None,
                        category: str = None) -> Tag:
        """更新标签"""
        tag = await self.get_tag_by_id(tag_id)
        
        if name and name != tag.name:
            # 检查是否已存在同名标签
            if await self.tag_repository.exists_by_name(name):
                raise TagAlreadyExistsError(f"标签已存在: {name}")
            
            try:
                tag.update_name(name)
            except ValueError as e:
                raise InvalidTagNameError(str(e))
        
        if color and color != tag.color:
            try:
                tag.update_color(color)
            except ValueError as e:
                raise InvalidTagNameError(str(e))
        
        if description is not None:
            tag.update_description(description)
        
        if category and category != tag.category:
            tag.update_category(category)
        
        return await self.tag_repository.save(tag)
    
    async def delete_tag(self, tag_id: UUID) -> bool:
        """删除标签"""
        # 检查标签是否存在
        await self.get_tag_by_id(tag_id)
        
        # 删除标签（会自动删除所有关联关系）
        return await self.tag_repository.delete_by_id(tag_id)
    
    # 目录标签关联方法
    async def add_directory_tag(self, directory_id: UUID, tag_id: UUID) -> bool:
        """为目录添加标签"""
        # 验证标签是否存在
        await self.get_tag_by_id(tag_id)
        
        try:
            return await self.tag_repository.add_directory_tag(directory_id, tag_id)
        except Exception as e:
            raise TagAssociationError(f"添加目录标签失败: {str(e)}")
    
    async def remove_directory_tag(self, directory_id: UUID, tag_id: UUID) -> bool:
        """移除目录标签"""
        try:
            return await self.tag_repository.remove_directory_tag(directory_id, tag_id)
        except Exception as e:
            raise TagAssociationError(f"移除目录标签失败: {str(e)}")
    
    async def get_directory_tags(self, directory_id: UUID) -> List[Tag]:
        """获取目录的所有标签"""
        return await self.tag_repository.find_tags_by_directory_id(directory_id)
    
    async def get_directories_by_tag(self, tag_id: UUID) -> List[UUID]:
        """获取使用该标签的所有目录"""
        # 验证标签是否存在
        await self.get_tag_by_id(tag_id)
        
        return await self.tag_repository.find_directories_by_tag_id(tag_id)
    
    # 文件标签关联方法
    async def add_file_tag(self, file_id: UUID, tag_id: UUID) -> bool:
        """为文件添加标签"""
        # 验证标签是否存在
        await self.get_tag_by_id(tag_id)
        
        try:
            return await self.tag_repository.add_file_tag(file_id, tag_id)
        except Exception as e:
            raise TagAssociationError(f"添加文件标签失败: {str(e)}")
    
    async def remove_file_tag(self, file_id: UUID, tag_id: UUID) -> bool:
        """移除文件标签"""
        try:
            return await self.tag_repository.remove_file_tag(file_id, tag_id)
        except Exception as e:
            raise TagAssociationError(f"移除文件标签失败: {str(e)}")
    
    async def get_file_tags(self, file_id: UUID) -> List[Tag]:
        """获取文件的所有标签"""
        return await self.tag_repository.find_tags_by_file_id(file_id)
    
    async def get_files_by_tag(self, tag_id: UUID) -> List[UUID]:
        """获取使用该标签的所有文件"""
        # 验证标签是否存在
        await self.get_tag_by_id(tag_id)
        
        return await self.tag_repository.find_files_by_tag_id(tag_id)
    
    async def batch_add_tags(self, 
                            target_type: str,  # 'directory' 或 'file'
                            target_id: UUID,
                            tag_ids: List[UUID]) -> List[bool]:
        """批量添加标签"""
        results = []
        
        for tag_id in tag_ids:
            try:
                if target_type == 'directory':
                    result = await self.add_directory_tag(target_id, tag_id)
                elif target_type == 'file':
                    result = await self.add_file_tag(target_id, tag_id)
                else:
                    raise ValueError(f"不支持的目标类型: {target_type}")
                
                results.append(result)
            except Exception:
                results.append(False)
        
        return results
    
    async def batch_remove_tags(self, 
                               target_type: str,  # 'directory' 或 'file'
                               target_id: UUID,
                               tag_ids: List[UUID]) -> List[bool]:
        """批量移除标签"""
        results = []
        
        for tag_id in tag_ids:
            try:
                if target_type == 'directory':
                    result = await self.remove_directory_tag(target_id, tag_id)
                elif target_type == 'file':
                    result = await self.remove_file_tag(target_id, tag_id)
                else:
                    raise ValueError(f"不支持的目标类型: {target_type}")
                
                results.append(result)
            except Exception:
                results.append(False)
        
        return results
    
    async def get_tag_statistics(self) -> dict:
        """获取标签统计信息"""
        total_tags = await self.tag_repository.count_all()
        
        # 按分类统计
        categories = {}
        all_tags = await self.get_all_tags()
        
        for tag in all_tags:
            category = tag.category or 'default'
            if category not in categories:
                categories[category] = 0
            categories[category] += 1
        
        return {
            "total_tags": total_tags,
            "categories": categories,
            "most_used_category": max(categories.items(), key=lambda x: x[1])[0] if categories else None
        }