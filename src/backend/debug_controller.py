#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from flask import Flask
from infrastructure.persistence.database import db
from infrastructure.persistence.models import DocumentModel
from infrastructure.repositories.document_repository_impl import DocumentRepositoryImpl
from application.services.document_service import DocumentService
from domain.entities.document import DocumentStatus

# 创建Flask应用
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///knowledge_base.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# 初始化数据库
db.init_app(app)

with app.app_context():
    # 创建服务实例
    repo = DocumentRepositoryImpl()
    service = DocumentService(repo)
    
    # 测试搜索功能
    query = '项目'
    print(f"测试搜索关键词: {query}")
    
    # 使用服务搜索
    documents = service.search_documents(query=query, page=1, size=10)
    print(f"服务搜索结果: {len(documents)} 个文档")
    
    # 使用服务搜索（不指定状态）
    documents_no_status = service.search_documents(query=query, status=None, page=1, size=10)
    print(f"服务搜索结果（不指定状态）: {len(documents_no_status)} 个文档")
    
    # 获取总数（不分页）
    total_documents = service.search_documents(query=query, page=None, size=None)
    print(f"总搜索结果数: {len(total_documents)} 个文档")
    
    # 显示前几个结果
    if documents:
        print("搜索结果:")
        for i, doc in enumerate(documents[:3]):
            print(f"  {i+1}. {doc.title} - {doc.status.value}")
    else:
        print("没有找到搜索结果")