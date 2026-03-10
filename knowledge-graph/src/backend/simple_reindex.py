#!/usr/bin/env python3
"""
简单的重新索引脚本，直接操作数据库
"""
import os
import sqlite3
import logging

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


def main():
    """主函数"""
    logger.info("开始重新索引文档内容...")
    
    # 连接数据库
    db_path = "instance/knowledge_base.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # 获取所有文档
        cursor.execute("SELECT id, title, content_path FROM documents")
        documents = cursor.fetchall()
        
        logger.info(f"找到 {len(documents)} 个文档需要重新索引")
        
        if not documents:
            logger.info("没有找到需要索引的文档")
            return
        
        # 基础路径
        base_path = "/root/knowledge-base-app/company_knowledge_base"
        
        success_count = 0
        failed_count = 0
        
        for doc_id, title, content_path in documents:
            try:
                # 构建完整文件路径
                if content_path.startswith('/'):
                    # 绝对路径
                    full_path = content_path
                else:
                    # 相对路径，基于base_path构建
                    full_path = os.path.join(base_path, content_path)
                
                logger.info(f"正在索引文档: {title} (路径: {full_path})")
                
                # 读取文件内容
                content_text, content_summary = read_file_content(full_path)
                
                if not content_text:
                    logger.warning(f"文档内容为空，跳过索引: {title}")
                    failed_count += 1
                    continue
                
                # 更新数据库中的内容字段
                cursor.execute(
                    "UPDATE documents SET content_text = ?, content_summary = ? WHERE id = ?",
                    (content_text, content_summary, doc_id)
                )
                
                logger.info(f"成功索引文档: {title} (内容长度: {len(content_text)})")
                success_count += 1
                
            except Exception as e:
                logger.error(f"索引文档失败 {title}: {str(e)}")
                failed_count += 1
        
        # 提交数据库更改
        conn.commit()
        
        logger.info(f"重新索引完成！成功: {success_count}, 失败: {failed_count}")
        
    except Exception as e:
        logger.error(f"重新索引过程中发生错误: {str(e)}")
        conn.rollback()
    finally:
        conn.close()


if __name__ == "__main__":
    main()