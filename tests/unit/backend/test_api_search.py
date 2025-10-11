#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
# 添加后端源代码路径到Python路径
backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'src', 'backend')
sys.path.append(backend_path)

from flask import Flask, request
from infrastructure.persistence.database import db
from infrastructure.persistence.models import DocumentModel
from infrastructure.repositories.document_repository_impl import DocumentRepositoryImpl
from application.services.document_service import DocumentService
from presentation.controllers.document_controller import get_document_service
from domain.entities.document import DocumentStatus

# 创建Flask应用
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///knowledge_base.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# 初始化数据库
db.init_app(app)

with app.app_context():
    # 模拟API调用
    query = '项目'
    print(f"测试API搜索关键词: {query}")
    
    # 模拟请求参数
    class MockRequest:
        def __init__(self):
            self.args = {
                'query': query,
                'page': '1',
                'size': '10'
            }
        
        def get(self, key, default=''):
            return self.args.get(key, default)
    
    # 替换request对象
    original_request = request
    
    # 获取服务
    service = get_document_service()
    
    # 直接调用服务方法
    documents = service.search_documents(
        query=query,
        category_id=None,
        author_id=None,
        status=None,
        page=1,
        size=10
    )
    
    print(f"API服务搜索结果: {len(documents)} 个文档")
    
    # 获取总数
    total_documents = service.search_documents(
        query=query,
        category_id=None,
        author_id=None,
        status=None,
        page=None,
        size=None
    )
    
    print(f"API服务总搜索结果数: {len(total_documents)} 个文档")
    
    # 显示结果
    if documents:
        print("API搜索结果:")
        for i, doc in enumerate(documents[:3]):
            print(f"  {i+1}. {doc.title} - {doc.status.value}")
    else:
        print("API没有找到搜索结果")