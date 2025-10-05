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

# 导出API蓝图
__all__ = ['api_bp']