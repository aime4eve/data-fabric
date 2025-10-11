#!/usr/bin/env python3
"""
文档统计功能测试脚本（带应用上下文）
"""

import sys
import os

# 添加项目路径
sys.path.append(os.path.join(os.path.dirname(__file__), 'src', 'backend'))

from app import create_app
from infrastructure.persistence.database import db
from infrastructure.persistence.models import DocumentModel
from sqlalchemy import func

def test_database_connection():
    """测试数据库连接"""
    print("=== 测试数据库连接 ===")
    
    app = create_app()
    
    with app.app_context():
        try:
            # 测试数据库连接
            result = db.session.query(func.count(DocumentModel.id)).scalar()
            print(f'✅ 数据库连接成功，文档总数: {result}')
            
            # 测试按状态统计
            status_stats = db.session.query(
                DocumentModel.status,
                func.count(DocumentModel.id)
            ).group_by(DocumentModel.status).all()
            
            print('\n=== 按状态统计结果 ===')
            for status, count in status_stats:
                print(f'  {status}: {count}')
                
            return True
            
        except Exception as e:
            print(f'❌ 数据库连接或查询失败: {e}')
            import traceback
            traceback.print_exc()
            return False

def test_document_repository():
    """测试文档仓库的统计方法"""
    print("\n=== 测试文档仓库统计方法 ===")
    
    app = create_app()
    
    with app.app_context():
        try:
            from infrastructure.repositories.document_repository_impl import DocumentRepositoryImpl
            
            repo = DocumentRepositoryImpl()
            
            # 测试全局统计
            stats = repo.get_document_statistics()
            print(f'✅ 全局统计结果: {stats}')
            
            # 测试按状态统计
            from domain.entities.document import DocumentStatus
            draft_count = repo.count_by_status(DocumentStatus.DRAFT)
            published_count = repo.count_by_status(DocumentStatus.PUBLISHED)
            archived_count = repo.count_by_status(DocumentStatus.ARCHIVED)
            deleted_count = repo.count_by_status(DocumentStatus.DELETED)
            
            print(f'✅ 按状态统计:')
            print(f'  draft: {draft_count}')
            print(f'  published: {published_count}')
            print(f'  archived: {archived_count}')
            print(f'  deleted: {deleted_count}')
            
            return True
            
        except Exception as e:
            print(f'❌ 文档仓库统计方法测试失败: {e}')
            import traceback
            traceback.print_exc()
            return False

def test_document_service():
    """测试文档服务的统计方法"""
    print("\n=== 测试文档服务统计方法 ===")
    
    app = create_app()
    
    with app.app_context():
        try:
            from application.services.document_service import DocumentService
            from infrastructure.repositories.document_repository_impl import DocumentRepositoryImpl
            
            repo = DocumentRepositoryImpl()
            service = DocumentService(repo)
            
            # 测试全局统计
            stats = service.get_document_statistics()
            print(f'✅ 服务层全局统计结果: {stats}')
            
            # 测试用户统计（使用有效的UUID格式）
            # 注意：这里使用一个有效的UUID格式，但实际数据库中可能没有对应的用户
            # 在实际使用中，应该使用数据库中存在的用户ID
            user_stats = service.get_document_statistics(user_id='12345678-1234-5678-1234-567812345678')
            print(f'✅ 用户统计结果: {user_stats}')
            
            return True
            
        except Exception as e:
            print(f'❌ 文档服务统计方法测试失败: {e}')
            import traceback
            traceback.print_exc()
            return False

def main():
    """主测试函数"""
    print("开始测试文档统计功能...\n")
    
    # 测试数据库连接
    db_success = test_database_connection()
    
    # 测试文档仓库
    repo_success = test_document_repository()
    
    # 测试文档服务
    service_success = test_document_service()
    
    print("\n=== 测试总结 ===")
    print(f"数据库连接: {'✅ 成功' if db_success else '❌ 失败'}")
    print(f"文档仓库统计: {'✅ 成功' if repo_success else '❌ 失败'}")
    print(f"文档服务统计: {'✅ 成功' if service_success else '❌ 失败'}")
    
    if all([db_success, repo_success, service_success]):
        print("\n🎉 所有测试通过！文档统计功能修复成功。")
        return 0
    else:
        print("\n⚠️ 部分测试失败，需要进一步检查。")
        return 1

if __name__ == "__main__":
    sys.exit(main())