#!/usr/bin/env python3
"""
数据库初始化脚本
"""
import os
import sys
from flask import Flask
from werkzeug.security import generate_password_hash

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from infrastructure.config.settings import get_config
from infrastructure.persistence.database import db
from infrastructure.persistence.models import UserModel, CategoryModel


def create_app():
    """创建Flask应用"""
    app = Flask(__name__)
    config = get_config('development')
    app.config.from_object(config)
    db.init_app(app)
    return app


def init_database():
    """初始化数据库"""
    app = create_app()
    
    with app.app_context():
        # 创建所有表
        db.create_all()
        
        # 检查是否已有管理员用户
        admin_user = UserModel.query.filter_by(username='admin').first()
        if not admin_user:
            # 创建管理员用户
            admin_user = UserModel(
                username='admin',
                email='admin@example.com',
                password_hash=generate_password_hash('123456'),
                role='admin'
            )
            db.session.add(admin_user)
            
            # 创建默认分类
            root_category = CategoryModel(
                name='根目录',
                path='/',
                parent_id=None,
                sort_order=0
            )
            db.session.add(root_category)
            
            db.session.commit()
            print("数据库初始化完成！")
            print("管理员账户: admin / 123456")
        else:
            print("数据库已初始化，管理员用户已存在")


if __name__ == '__main__':
    init_database()