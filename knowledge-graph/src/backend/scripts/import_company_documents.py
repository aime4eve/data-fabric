#!/usr/bin/env python3
"""
导入company_knowledge_base目录中的所有文档到数据库
"""
import os
import sys
import logging
from pathlib import Path
from datetime import datetime
import uuid

# 添加项目根目录到Python路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app import create_app
from infrastructure.persistence.database import db
from infrastructure.persistence.models import DocumentModel, CategoryModel, UserModel

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 支持的文件扩展名
SUPPORTED_EXTENSIONS = {'.md', '.txt', '.docx', '.doc', '.pdf', '.json', '.xml', '.html'}


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


def get_or_create_category(category_name: str, parent_id: str = None) -> CategoryModel:
    """获取或创建分类"""
    category = CategoryModel.query.filter_by(name=category_name, parent_id=parent_id).first()
    if not category:
        # 构建路径
        if parent_id:
            parent_category = CategoryModel.query.get(parent_id)
            path = f"{parent_category.path}/{category_name}" if parent_category else category_name
        else:
            path = category_name
            
        category = CategoryModel(
            name=category_name,
            path=path,
            parent_id=parent_id,
            sort_order=0,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.session.add(category)
        db.session.flush()  # 获取ID
        logger.info(f"创建分类: {category_name}, 路径: {path}")
    return category


def create_document_from_file(file_path: Path, base_path: Path, system_user_id: str) -> bool:
    """从文件创建文档记录"""
    try:
        # 计算相对路径
        relative_path = file_path.relative_to(base_path)
        
        # 检查是否已存在
        existing_doc = DocumentModel.query.filter_by(content_path=str(relative_path)).first()
        if existing_doc:
            logger.info(f"文档已存在，跳过: {relative_path}")
            return True
        
        # 读取文件内容
        content_text, content_summary = read_file_content(str(file_path))
        
        # 根据路径创建分类层次结构
        path_parts = relative_path.parts[:-1]  # 排除文件名
        current_parent_id = None
        
        if path_parts:
            # 有子目录，创建分类层次结构
            for part in path_parts:
                category = get_or_create_category(part, current_parent_id)
                current_parent_id = category.id
        else:
            # 根目录文件，创建默认分类
            category = get_or_create_category("根目录文档", None)
            current_parent_id = category.id
            
        logger.info(f"文档 {relative_path} 的分类ID: {current_parent_id}, 类型: {type(current_parent_id)}")
        
        # 检查category_id是否为None
        if current_parent_id is None:
            logger.error(f"category_id为None，无法创建文档: {relative_path}")
            return False
        
        # 创建文档记录
        document = DocumentModel(
            title=file_path.stem,  # 文件名（不含扩展名）
            content_path=str(relative_path),
            content_text=content_text,
            content_summary=content_summary,
            category_id=current_parent_id,
            author_id=system_user_id,
            status="published",
            doc_metadata={
                "source": "company_knowledge_base",
                "file_extension": file_path.suffix,
                "file_size": file_path.stat().st_size,
                "imported_at": datetime.utcnow().isoformat()
            },
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.session.add(document)
        logger.info(f"创建文档: {document.title} (内容长度: {len(content_text)})")
        return True
        
    except Exception as e:
        logger.error(f"创建文档失败 {file_path}: {str(e)}")
        return False


def main():
    """主函数"""
    try:
        app = create_app()
        with app.app_context():
            base_path = Path("/root/knowledge-base-app/company_knowledge_base")
            
            if not base_path.exists():
                logger.error(f"目录不存在: {base_path}")
                return
            
            # 获取或创建系统用户
            system_user = UserModel.query.filter_by(username='admin').first()
            if not system_user:
                system_user = UserModel(
                    username='admin',
                    email='admin@system.com',
                    password_hash='system',
                    role='admin',
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.session.add(system_user)
                db.session.commit()
                logger.info("创建系统用户: admin")
            
            # 扫描并导入文档
            success_count = 0
            failed_count = 0
            
            for file_path in base_path.rglob("*"):
                if file_path.is_file() and file_path.suffix.lower() in SUPPORTED_EXTENSIONS:
                    try:
                        if create_document_from_file(file_path, base_path, system_user.id):
                            success_count += 1
                        else:
                            failed_count += 1
                    except Exception as e:
                        logger.error(f"处理文件失败 {file_path}: {str(e)}")
                        failed_count += 1
            
            # 提交所有更改
            db.session.commit()
            logger.info(f"导入完成: 成功 {success_count}, 失败 {failed_count}")
            
    except Exception as e:
        logger.error(f"导入过程出错: {str(e)}")
        if 'db' in locals():
            db.session.rollback()
        raise


if __name__ == "__main__":
    main()