#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
# 添加后端源代码路径到Python路径
backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'src', 'backend')
sys.path.append(backend_path)

from flask import Flask
from infrastructure.persistence.database import db
from infrastructure.persistence.models import DocumentModel
from sqlalchemy import or_

# 创建Flask应用
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///knowledge_base.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# 初始化数据库
db.init_app(app)

with app.app_context():
    # 查询包含'政府'的文档
    query = '政府'
    documents = db.session.query(DocumentModel).filter(
        or_(
            DocumentModel.title.contains(query),
            DocumentModel.content_text.contains(query),
            DocumentModel.content_summary.contains(query),
            DocumentModel.content_path.contains(query)
        )
    ).all()

    print(f'找到 {len(documents)} 个包含 "{query}" 的文档:')
    for i, doc in enumerate(documents[:5]):
        print(f'{i+1}. 标题: {doc.title}')
        print(f'   路径: {doc.content_path}')
        print(f'   内容长度: {len(doc.content_text) if doc.content_text else 0}')
        print()
        
    # 查询包含'项目'的文档
    query2 = '项目'
    documents2 = db.session.query(DocumentModel).filter(
        or_(
            DocumentModel.title.contains(query2),
            DocumentModel.content_text.contains(query2),
            DocumentModel.content_summary.contains(query2),
            DocumentModel.content_path.contains(query2)
        )
    ).all()

    print(f'找到 {len(documents2)} 个包含 "{query2}" 的文档:')
    for i, doc in enumerate(documents2[:5]):
        print(f'{i+1}. 标题: {doc.title}')
        print(f'   路径: {doc.content_path}')
        print(f'   内容长度: {len(doc.content_text) if doc.content_text else 0}')
        print()