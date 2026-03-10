#!/usr/bin/env python3
"""
为 users 表增加用户资料扩展字段的迁移脚本：
- full_name TEXT/VARCHAR(255)
- phone TEXT/VARCHAR(50)
- department TEXT/VARCHAR(100)
- position TEXT/VARCHAR(100)
- avatar_url TEXT/VARCHAR(512)

可重复执行，自动跳过已存在的列。
"""
import sys
import logging
from pathlib import Path
from typing import List

from sqlalchemy import text, inspect

# 添加项目根目录到Python路径（使得可以导入 app 和 infrastructure 模块）
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from init_db import create_app
from infrastructure.persistence.database import db


logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def get_existing_columns() -> List[str]:
    inspector = inspect(db.engine)
    columns = inspector.get_columns('users')
    return [col['name'] for col in columns]


def migrate_add_columns() -> None:
    app = create_app()
    with app.app_context():
        # 确保基础表结构已创建（首次运行时）
        try:
            db.create_all()
        except Exception:
            pass
        existing = set(get_existing_columns())
        logger.info(f"users 表现有列: {sorted(existing)}")

        dialect = db.engine.dialect.name
        logger.info(f"数据库方言: {dialect}")

        # 定义各字段类型（按方言）
        if dialect == 'postgresql':
            types = {
                'full_name': 'VARCHAR(255)',
                'phone': 'VARCHAR(50)',
                'department': 'VARCHAR(100)',
                'position': 'VARCHAR(100)',
                'avatar_url': 'VARCHAR(512)',
            }
        else:
            # sqlite/mysql 等使用 TEXT，长度由应用层控制
            types = {
                'full_name': 'TEXT',
                'phone': 'TEXT',
                'department': 'TEXT',
                'position': 'TEXT',
                'avatar_url': 'TEXT',
            }

        to_add = [
            ('full_name', types['full_name']),
            ('phone', types['phone']),
            ('department', types['department']),
            ('position', types['position']),
            ('avatar_url', types['avatar_url']),
        ]

        # 逐列增加（如果不存在）
        added_any = False
        for col_name, col_type in to_add:
            if col_name not in existing:
                sql = f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"
                logger.info(f"执行: {sql}")
                db.session.execute(text(sql))
                added_any = True
            else:
                logger.info(f"跳过: 列 {col_name} 已存在")

        if added_any:
            db.session.commit()
            logger.info("迁移完成，已提交更改。")
        else:
            logger.info("无需迁移，所有列均已存在。")


def main():
    try:
        migrate_add_columns()
    except Exception as e:
        logger.error(f"迁移失败: {e}")
        try:
            db.session.rollback()
        except Exception:
            pass
        sys.exit(1)


if __name__ == '__main__':
    main()