#!/usr/bin/env python3
"""
测试文档统计功能修复
"""
import sys
import os

# 添加后端目录到Python路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src', 'backend'))

from app import app
from infrastructure.database.database import db
from infrastructure.persistence.models import DocumentModel
from domain.entities.document import DocumentStatus
from infrastructure.repositories.document_repository_impl import DocumentRepositoryImpl
from application.services.document_service import DocumentService

def test_document_statistics():
    """测试文档统计功能"""
    print("=== 测试文档统计功能 ===")
    
    with app.app_context():
        try:
            # 创建文档仓库和服务实例
            repository = DocumentRepositoryImpl()
            service = DocumentService(repository)
            
            # 测试数据库连接
            total_docs = DocumentModel.query.count()
            print(f"数据库连接正常，文档总数: {total_docs}")
            
            # 测试仓库层的统计方法
            print("\n=== 测试仓库层统计方法 ===")
            stats = repository.get_document_statistics()
            print(f"统计结果: {stats}")
            
            # 测试服务层的统计方法
            print("\n=== 测试服务层统计方法 ===")
            service_stats = service.get_document_statistics()
            print(f"服务统计结果: {service_stats}")
            
            # 测试按状态统计
            print("\n=== 测试按状态统计 ===")
            for status in [DocumentStatus.DRAFT, DocumentStatus.PUBLISHED, DocumentStatus.ARCHIVED]:
                count = repository.count_by_status(status)
                print(f"{status.value}文档数量: {count}")
            
            print("\n✅ 文档统计功能测试完成！")
            return True
            
        except Exception as e:
            print(f"❌ 测试失败: {e}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == "__main__":
    success = test_document_statistics()
    sys.exit(0 if success else 1)