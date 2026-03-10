#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from flask import Flask
from infrastructure.persistence.database import db
from infrastructure.persistence.models import DocumentModel
from infrastructure.repositories.document_repository_impl import DocumentRepositoryImpl
from domain.entities.document import DocumentStatus
from sqlalchemy import or_

# 创建Flask应用
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///knowledge_base.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# 初始化数据库
db.init_app(app)

with app.app_context():
    # 创建仓储实例
    repo = DocumentRepositoryImpl()
    
    # 测试搜索功能
    query = '项目'
    print(f"测试搜索关键词: {query}")
    
    # 直接使用仓储搜索
    documents = repo.search_documents(query=query, page=1, size=10)
    print(f"仓储搜索结果: {len(documents)} 个文档")
    
    # 测试不同状态的搜索
    documents_all = repo.search_documents(query=query, status=None, page=1, size=10)
    print(f"不指定状态搜索结果: {len(documents_all)} 个文档")
    
    # 测试已发布状态的搜索
    documents_published = repo.search_documents(query=query, status=DocumentStatus.PUBLISHED, page=1, size=10)
    print(f"已发布状态搜索结果: {len(documents_published)} 个文档")
    
    # 查看数据库中的文档状态
    all_docs = DocumentModel.query.all()
    status_counts = {}
    for doc in all_docs:
        status = doc.status
        status_counts[status] = status_counts.get(status, 0) + 1
    
    print(f"数据库中文档状态统计: {status_counts}")
    
    # 查看包含'项目'的文档状态
    project_docs = db.session.query(DocumentModel).filter(
        or_(
            DocumentModel.title.contains(query),
            DocumentModel.content_text.contains(query),
            DocumentModel.content_summary.contains(query),
            DocumentModel.content_path.contains(query)
        )
    ).all()
    
    print(f"包含'{query}'的文档状态:")
    for doc in project_docs[:5]:
        print(f"  - {doc.title}: {doc.status}")