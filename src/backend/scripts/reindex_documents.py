#!/usr/bin/env python3
"""
重新索引已存在的文档内容脚本
"""
import os
import sys
import logging
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from infrastructure.persistence.database import db
from infrastructure.persistence.models import DocumentModel
from application.services.document_service import DocumentService
from infrastructure.repositories.document_repository_impl import DocumentRepositoryImpl

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def read_file_content(file_path: str) -> tuple[str, str]:
    """读取文件内容"""
    try:
        if not os.path.exists(file_path):
            logger.warning(f"文件不存在: {file_path}")
            return "", ""
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # 生成摘要（取前500字符）
        summary = content[:500] if len(content) > 500 else content
        
        return content, summary
        
    except UnicodeDecodeError:
        try:
            # 尝试使用GBK编码
            with open(file_path, 'r', encoding='gbk') as f:
                content = f.read()
            summary = content[:500] if len(content) > 500 else content
            return content, summary
        except Exception as e:
            logger.error(f"读取文件失败 {file_path}: {str(e)}")
            return "", ""
    except Exception as e:
        logger.error(f"读取文件失败 {file_path}: {str(e)}")
        return "", ""


def reindex_document(doc_model: DocumentModel, base_path: str) -> bool:
    """重新索引单个文档"""
    try:
        # 构建完整文件路径
        if doc_model.content_path.startswith('/'):
            # 绝对路径
            full_path = doc_model.content_path
        else:
            # 相对路径，基于base_path构建
            full_path = os.path.join(base_path, doc_model.content_path)
        
        logger.info(f"正在索引文档: {doc_model.title} (路径: {full_path})")
        
        # 读取文件内容
        content_text, content_summary = read_file_content(full_path)
        
        if not content_text:
            logger.warning(f"文档内容为空，跳过索引: {doc_model.title}")
            return False
        
        # 更新数据库中的内容字段
        doc_model.content_text = content_text
        doc_model.content_summary = content_summary
        
        logger.info(f"成功索引文档: {doc_model.title} (内容长度: {len(content_text)})")
        return True
        
    except Exception as e:
        logger.error(f"索引文档失败 {doc_model.title}: {str(e)}")
        return False


def main():
    """主函数"""
    logger.info("开始重新索引文档内容...")
    
    # 初始化Flask应用上下文
    from app import create_app
    app = create_app()
    
    with app.app_context():
        try:
            # 获取所有文档
            documents = DocumentModel.query.all()
            logger.info(f"找到 {len(documents)} 个文档需要重新索引")
            
            if not documents:
                logger.info("没有找到需要索引的文档")
                return
            
            # 基础路径
            base_path = "/root/knowledge-base-app/company_knowledge_base"
            
            success_count = 0
            failed_count = 0
            
            for doc in documents:
                if reindex_document(doc, base_path):
                    success_count += 1
                else:
                    failed_count += 1
            
            # 提交数据库更改
            db.session.commit()
            
            logger.info(f"重新索引完成！成功: {success_count}, 失败: {failed_count}")
            
        except Exception as e:
            logger.error(f"重新索引过程中发生错误: {str(e)}")
            db.session.rollback()
            sys.exit(1)


if __name__ == "__main__":
    main()