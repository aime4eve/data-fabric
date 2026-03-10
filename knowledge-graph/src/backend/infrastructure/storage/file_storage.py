"""
文件存储服务
"""
import os
import uuid
from typing import Optional, BinaryIO
from datetime import datetime
from minio import Minio
from minio.error import S3Error

from infrastructure.config.settings import get_config


class FileStorageService:
    """文件存储服务"""
    
    def __init__(self):
        config = get_config()
        self.client = Minio(
            endpoint=config.MINIO_ENDPOINT,
            access_key=config.MINIO_ACCESS_KEY,
            secret_key=config.MINIO_SECRET_KEY,
            secure=config.MINIO_SECURE
        )
        self.bucket_name = config.MINIO_BUCKET_NAME
        self._ensure_bucket_exists()
    
    def _ensure_bucket_exists(self):
        """确保存储桶存在"""
        try:
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)
        except S3Error as e:
            print(f"创建存储桶失败: {e}")
    
    def upload_file(self, file_data: BinaryIO, filename: str, content_type: str = None) -> str:
        """上传文件"""
        try:
            # 生成唯一文件名
            file_extension = os.path.splitext(filename)[1]
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            
            # 按日期组织文件路径
            date_path = datetime.now().strftime("%Y/%m/%d")
            object_name = f"documents/{date_path}/{unique_filename}"
            
            # 上传文件
            self.client.put_object(
                bucket_name=self.bucket_name,
                object_name=object_name,
                data=file_data,
                length=-1,  # 自动计算长度
                part_size=10*1024*1024,  # 10MB分片
                content_type=content_type
            )
            
            return object_name
            
        except S3Error as e:
            raise Exception(f"文件上传失败: {e}")
    
    def download_file(self, object_name: str) -> Optional[bytes]:
        """下载文件"""
        try:
            response = self.client.get_object(self.bucket_name, object_name)
            return response.read()
        except S3Error as e:
            print(f"文件下载失败: {e}")
            return None
    
    def delete_file(self, object_name: str) -> bool:
        """删除文件"""
        try:
            self.client.remove_object(self.bucket_name, object_name)
            return True
        except S3Error as e:
            print(f"文件删除失败: {e}")
            return False
    
    def get_file_url(self, object_name: str, expires: int = 3600) -> Optional[str]:
        """获取文件预签名URL"""
        try:
            return self.client.presigned_get_object(
                bucket_name=self.bucket_name,
                object_name=object_name,
                expires=expires
            )
        except S3Error as e:
            print(f"获取文件URL失败: {e}")
            return None
    
    def file_exists(self, object_name: str) -> bool:
        """检查文件是否存在"""
        try:
            self.client.stat_object(self.bucket_name, object_name)
            return True
        except S3Error:
            return False
    
    def get_file_info(self, object_name: str) -> Optional[dict]:
        """获取文件信息"""
        try:
            stat = self.client.stat_object(self.bucket_name, object_name)
            return {
                'size': stat.size,
                'etag': stat.etag,
                'last_modified': stat.last_modified,
                'content_type': stat.content_type
            }
        except S3Error as e:
            print(f"获取文件信息失败: {e}")
            return None