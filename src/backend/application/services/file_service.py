"""文件应用服务"""
import os
import shutil
from typing import List, Optional, BinaryIO
from uuid import UUID, uuid4
from datetime import datetime
from pathlib import Path

from domain.entities.file import File
from domain.repositories.file_repository import FileRepository
from domain.repositories.directory_repository import DirectoryRepository
from infrastructure.repositories.file_repository_impl import FileRepositoryImpl
from infrastructure.repositories.directory_repository_impl import DirectoryRepositoryImpl
from shared_kernel.exceptions.domain_exceptions import (
    FileNotFoundError,
    FileAlreadyExistsError,
    InvalidFileNameError,
    FileSizeTooLargeError,
    UnsupportedFileTypeError,
    DirectoryNotFoundError
)


class FileService:
    """文件应用服务"""
    
    # 支持的文件类型
    ALLOWED_EXTENSIONS = {
        'txt', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
        'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg',
        'mp3', 'wav', 'mp4', 'avi', 'mov',
        'zip', 'rar', '7z', 'tar', 'gz',
        'json', 'xml', 'csv', 'md', 'html', 'css', 'js', 'py', 'java', 'cpp', 'c'
    }
    
    # 最大文件大小 (100MB)
    MAX_FILE_SIZE = 100 * 1024 * 1024
    
    # 基础存储路径
    BASE_STORAGE_PATH = "/root/knowledge-base-app/company_knowledge_base"
    
    def __init__(self, 
                 file_repository: FileRepository = None,
                 directory_repository: DirectoryRepository = None):
        self.file_repository = file_repository or FileRepositoryImpl()
        self.directory_repository = directory_repository or DirectoryRepositoryImpl()
    
    async def upload_file(self, 
                         file_data: BinaryIO,
                         original_filename: str,
                         directory_id: UUID,
                         description: str = None) -> File:
        """上传文件"""
        # 验证目录是否存在
        directory = await self.directory_repository.find_by_id(directory_id)
        if not directory:
            raise DirectoryNotFoundError(f"目录不存在: {directory_id}")
        
        # 验证文件名
        if not self._is_valid_filename(original_filename):
            raise InvalidFileNameError(f"无效的文件名: {original_filename}")
        
        # 获取文件扩展名
        file_extension = self._get_file_extension(original_filename)
        if not self._is_allowed_extension(file_extension):
            raise UnsupportedFileTypeError(f"不支持的文件类型: {file_extension}")
        
        # 检查文件大小
        file_data.seek(0, 2)  # 移动到文件末尾
        file_size = file_data.tell()
        file_data.seek(0)  # 重置到文件开头
        
        if file_size > self.MAX_FILE_SIZE:
            raise FileSizeTooLargeError(f"文件大小超过限制: {file_size} > {self.MAX_FILE_SIZE}")
        
        # 生成唯一文件名
        file_id = uuid4()
        unique_filename = f"{file_id}_{original_filename}"
        
        # 检查目录中是否已存在同名文件
        if await self.file_repository.exists_by_name_in_directory(unique_filename, directory_id):
            raise FileAlreadyExistsError(f"目录中已存在同名文件: {unique_filename}")
        
        # 构建文件路径
        relative_path = os.path.join(directory.path.value, unique_filename)
        full_path = os.path.join(self.BASE_STORAGE_PATH, relative_path)
        
        # 确保目录存在
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        
        # 保存文件到磁盘
        try:
            with open(full_path, 'wb') as f:
                shutil.copyfileobj(file_data, f)
        except Exception as e:
            raise Exception(f"文件保存失败: {str(e)}")
        
        # 创建文件实体
        file_entity = File.create(
            name=unique_filename,
            original_name=original_filename,
            file_path=relative_path,
            full_path=full_path,
            directory_id=directory_id,
            file_size=file_size,
            file_type=self._get_file_type(file_extension),
            file_extension=file_extension,
            description=description
        )
        
        # 保存到数据库
        return await self.file_repository.save(file_entity)
    
    async def get_file_by_id(self, file_id: UUID) -> File:
        """根据ID获取文件"""
        file_entity = await self.file_repository.find_by_id(file_id)
        if not file_entity:
            raise FileNotFoundError(f"文件不存在: {file_id}")
        return file_entity
    
    async def get_files_by_directory(self, directory_id: UUID) -> List[File]:
        """获取目录下的所有文件"""
        return await self.file_repository.find_by_directory_id(directory_id)
    
    async def search_files(self, 
                          pattern: str,
                          directory_id: Optional[UUID] = None,
                          file_type: Optional[str] = None,
                          extension: Optional[str] = None) -> List[File]:
        """搜索文件"""
        if file_type:
            return await self.file_repository.find_by_file_type(file_type, directory_id)
        elif extension:
            return await self.file_repository.find_by_extension(extension, directory_id)
        else:
            return await self.file_repository.find_by_name_pattern(pattern, directory_id)
    
    async def update_file_info(self, 
                              file_id: UUID,
                              name: str = None,
                              description: str = None) -> File:
        """更新文件信息"""
        file_entity = await self.get_file_by_id(file_id)
        
        if name and name != file_entity.name:
            # 验证新文件名
            if not self._is_valid_filename(name):
                raise InvalidFileNameError(f"无效的文件名: {name}")
            
            # 检查目录中是否已存在同名文件
            if await self.file_repository.exists_by_name_in_directory(name, file_entity.directory_id):
                raise FileAlreadyExistsError(f"目录中已存在同名文件: {name}")
            
            # 重命名磁盘文件
            old_path = file_entity.full_path
            new_filename = name
            new_relative_path = os.path.join(os.path.dirname(file_entity.file_path), new_filename)
            new_full_path = os.path.join(self.BASE_STORAGE_PATH, new_relative_path)
            
            try:
                os.rename(old_path, new_full_path)
                file_entity.update_name(new_filename)
                file_entity.update_file_path(new_relative_path)
                file_entity.update_full_path(new_full_path)
            except Exception as e:
                raise Exception(f"文件重命名失败: {str(e)}")
        
        if description is not None:
            file_entity.update_description(description)
        
        return await self.file_repository.save(file_entity)
    
    async def delete_file(self, file_id: UUID) -> bool:
        """删除文件"""
        file_entity = await self.get_file_by_id(file_id)
        
        # 删除磁盘文件
        try:
            if os.path.exists(file_entity.full_path):
                os.remove(file_entity.full_path)
        except Exception as e:
            raise Exception(f"文件删除失败: {str(e)}")
        
        # 从数据库删除
        return await self.file_repository.delete_by_id(file_id)
    
    async def delete_files_by_directory(self, directory_id: UUID) -> int:
        """删除目录下的所有文件"""
        files = await self.file_repository.find_by_directory_id(directory_id)
        
        # 删除磁盘文件
        for file_entity in files:
            try:
                if os.path.exists(file_entity.full_path):
                    os.remove(file_entity.full_path)
            except Exception:
                pass  # 忽略删除失败的文件
        
        # 从数据库删除
        return await self.file_repository.delete_by_directory_id(directory_id)
    
    async def get_directory_file_stats(self, directory_id: UUID) -> dict:
        """获取目录文件统计信息"""
        file_count = await self.file_repository.count_by_directory_id(directory_id)
        total_size = await self.file_repository.get_total_size_by_directory_id(directory_id)
        
        return {
            "file_count": file_count,
            "total_size": total_size,
            "formatted_size": self._format_file_size(total_size)
        }
    
    def _is_valid_filename(self, filename: str) -> bool:
        """验证文件名是否有效"""
        if not filename or len(filename.strip()) == 0:
            return False
        
        # 检查非法字符
        invalid_chars = ['<', '>', ':', '"', '|', '?', '*', '\\', '/']
        for char in invalid_chars:
            if char in filename:
                return False
        
        # 检查长度
        if len(filename) > 255:
            return False
        
        return True
    
    def _get_file_extension(self, filename: str) -> str:
        """获取文件扩展名"""
        return Path(filename).suffix.lower().lstrip('.')
    
    def _is_allowed_extension(self, extension: str) -> bool:
        """检查文件扩展名是否被允许"""
        return extension.lower() in self.ALLOWED_EXTENSIONS
    
    def _get_file_type(self, extension: str) -> str:
        """根据扩展名确定文件类型"""
        image_exts = {'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'}
        document_exts = {'txt', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'md'}
        audio_exts = {'mp3', 'wav'}
        video_exts = {'mp4', 'avi', 'mov'}
        archive_exts = {'zip', 'rar', '7z', 'tar', 'gz'}
        code_exts = {'html', 'css', 'js', 'py', 'java', 'cpp', 'c', 'json', 'xml'}
        
        extension = extension.lower()
        
        if extension in image_exts:
            return 'image'
        elif extension in document_exts:
            return 'document'
        elif extension in audio_exts:
            return 'audio'
        elif extension in video_exts:
            return 'video'
        elif extension in archive_exts:
            return 'archive'
        elif extension in code_exts:
            return 'code'
        else:
            return 'other'
    
    def _format_file_size(self, size_bytes: int) -> str:
        """格式化文件大小"""
        if size_bytes == 0:
            return "0 B"
        
        size_names = ["B", "KB", "MB", "GB", "TB"]
        i = 0
        size = float(size_bytes)
        
        while size >= 1024.0 and i < len(size_names) - 1:
            size /= 1024.0
            i += 1
        
        return f"{size:.1f} {size_names[i]}"