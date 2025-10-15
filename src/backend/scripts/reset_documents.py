#!/usr/bin/env python3
"""
重新初始化文档管理数据脚本
清空现有文档和分类数据，然后重新初始化
"""
import os
import sys
import logging
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from infrastructure.persistence.database import db
from infrastructure.persistence.models import DocumentModel, CategoryModel

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def reset_database():
    """清空文档和分类数据"""
    logger.info("开始清空文档管理数据...")
    
    # 删除所有文档记录
    documents_deleted = db.session.query(DocumentModel).delete()
    logger.info(f"删除文档记录: {documents_deleted} 条")
    
    # 删除所有分类记录（除了根目录）
    categories_deleted = db.session.query(CategoryModel).filter(CategoryModel.name != '根目录').delete()
    logger.info(f"删除分类记录: {categories_deleted} 条")
    
    # 提交更改
    db.session.commit()
    logger.info("数据清空完成！")

def main():
    """主函数"""
    from app import create_app
    app = create_app()
    
    with app.app_context():
        try:
            # 清空现有数据
            reset_database()
            
            # 重新初始化文档数据
            logger.info("开始重新初始化文档数据...")
            
            # 导入并执行文档初始化脚本
            from scripts.init_documents import init_knowledge_base_data
            init_knowledge_base_data()
            
            logger.info("文档管理数据重新初始化完成！")
            
        except Exception as e:
            logger.error(f"重新初始化过程中发生错误: {str(e)}")
            db.session.rollback()
            sys.exit(1)

if __name__ == "__main__":
    main()