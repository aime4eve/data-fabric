"""
API模块初始化
"""
from flask import Blueprint
from flask_restx import Api

from presentation.controllers.auth_controller import auth_ns

# 创建蓝图
api_bp = Blueprint('api', __name__, url_prefix='/api/v1')

# 创建API实例
api = Api(
    api_bp,
    version='1.0',
    title='企业知识库管理系统 API',
    description='企业知识库管理系统的RESTful API接口',
    doc='/docs/'
)

# 注册命名空间
api.add_namespace(auth_ns, path='/auth')

# 导入并注册文档控制器
from presentation.controllers.document_controller import document_ns
api.add_namespace(document_ns, path='/documents')

# 导入并注册分类控制器
from presentation.controllers.category_controller import category_ns
api.add_namespace(category_ns, path='/categories')

# 导入并注册用户控制器
from presentation.controllers.user_controller import user_ns
api.add_namespace(user_ns, path='/users')

# 导入并注册搜索控制器
from presentation.controllers.search_controller import search_ns
api.add_namespace(search_ns, path='/search')

# 导入并注册目录控制器
from presentation.controllers.directory_controller import directory_ns
api.add_namespace(directory_ns, path='/directories')

# 导入并注册文件控制器
from presentation.controllers.file_controller import file_ns
api.add_namespace(file_ns, path='/files')

# 导入并注册标签控制器
from presentation.controllers.tag_controller import tag_ns
api.add_namespace(tag_ns, path='/tags')

# 导入并注册权限控制器（占位）
from presentation.controllers.permission_controller import permission_ns
api.add_namespace(permission_ns, path='/permissions')

# 导入并注册审计控制器（占位）
from presentation.controllers.audit_controller import audit_ns
api.add_namespace(audit_ns, path='/audits')

# 导出API蓝图
__all__ = ['api_bp']