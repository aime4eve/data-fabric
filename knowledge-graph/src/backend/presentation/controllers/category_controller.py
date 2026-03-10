from flask import request, jsonify
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity
import uuid

# 创建分类命名空间
category_ns = Namespace('categories', description='分类管理相关操作')

# 分类模型定义（移除循环引用的children字段）
category_model = category_ns.model('Category', {
    'id': fields.String(required=True, description='分类ID'),
    'name': fields.String(required=True, description='分类名称'),
    'description': fields.String(description='分类描述'),
    'parent_id': fields.Integer(description='父分类ID'),
    'level': fields.Integer(description='分类层级'),
    'sort_order': fields.Integer(description='排序顺序'),
    'is_active': fields.Boolean(description='是否激活'),
    'created_at': fields.DateTime(description='创建时间'),
    'updated_at': fields.DateTime(description='更新时间')
})

# 创建分类请求模型
create_category_model = category_ns.model('CreateCategory', {
    'name': fields.String(required=True, description='分类名称'),
    'description': fields.String(description='分类描述'),
    'parent_id': fields.Integer(description='父分类ID'),
    'sort_order': fields.Integer(description='排序顺序', default=0)
})

# 更新分类请求模型
update_category_model = category_ns.model('UpdateCategory', {
    'name': fields.String(description='分类名称'),
    'description': fields.String(description='分类描述'),
    'parent_id': fields.Integer(description='父分类ID'),
    'sort_order': fields.Integer(description='排序顺序')
})

# 分类列表响应模型
category_list_response = category_ns.model('CategoryListResponse', {
    'data': fields.List(fields.Nested(category_model)),
    'total': fields.Integer(description='总数量'),
    'page': fields.Integer(description='当前页码'),
    'per_page': fields.Integer(description='每页数量')
})

@category_ns.route('/')
class CategoryListResource(Resource):
    @category_ns.doc('获取分类列表')
    @category_ns.marshal_with(category_list_response)
    def get(self):
        """获取分类列表"""
        # TODO: 实现从数据库获取分类列表的逻辑
        return {
            'data': [],
            'total': 0,
            'page': 1,
            'per_page': 10
        }

    @category_ns.doc('创建新分类')
    @category_ns.expect(create_category_model)
    @category_ns.marshal_with(category_model)
    def post(self):
        """创建新分类"""
        data = request.get_json()
        
        # TODO: 实现创建分类的逻辑
        return {
            'id': str(uuid.uuid4()),
            'name': data.get('name', ''),
            'description': data.get('description', ''),
            'parent_id': data.get('parent_id'),
            'level': 1,
            'sort_order': data.get('sort_order', 0),
            'is_active': True,
            'created_at': '2024-01-01T00:00:00',
            'updated_at': '2024-01-01T00:00:00'
        }, 201

@category_ns.route('/tree/')
class CategoryTreeResource(Resource):
    @category_ns.doc('获取分类树结构')
    def get(self):
        """获取分类树结构"""
        # TODO: 实现从数据库获取分类树结构的逻辑
        return []

@category_ns.route('/<int:category_id>')
class CategoryResource(Resource):
    @category_ns.doc('获取单个分类详情')
    @category_ns.marshal_with(category_model)
    def get(self, category_id):
        """获取单个分类详情"""
        # TODO: 实现从数据库获取分类详情的逻辑
        return {
            'id': str(category_id),
            'name': '',
            'description': '',
            'parent_id': None,
            'level': 1,
            'sort_order': 0,
            'is_active': True,
            'created_at': '2024-01-01T00:00:00',
            'updated_at': '2024-01-01T00:00:00'
        }

    @category_ns.doc('更新分类')
    @category_ns.expect(update_category_model)
    @category_ns.marshal_with(category_model)
    def put(self, category_id):
        """更新分类"""
        data = request.get_json()
        
        # TODO: 实现更新分类的逻辑
        return {
            'id': str(category_id),
            'name': data.get('name', ''),
            'description': data.get('description', ''),
            'parent_id': data.get('parent_id'),
            'level': 1,
            'sort_order': data.get('sort_order', 0),
            'is_active': True,
            'created_at': '2024-01-01T00:00:00',
            'updated_at': '2024-01-01T00:00:00'
        }

    @category_ns.doc('删除分类')
    def delete(self, category_id):
        """删除分类"""
        # TODO: 实现删除分类的逻辑
        return {'message': f'分类 {category_id} 已删除'}, 200

@category_ns.route('/stats/')
class CategoryStatsResource(Resource):
    @category_ns.doc('获取分类统计信息')
    def get(self):
        """获取分类统计信息"""
        # TODO: 实现获取分类统计信息的逻辑
        return {
            'total_categories': 0,
            'active_categories': 0,
            'inactive_categories': 0,
            'max_level': 0,
            'categories_by_level': {}
        }

@category_ns.route('/<int:category_id>/toggle-status')
class CategoryToggleStatusResource(Resource):
    @category_ns.doc('切换分类状态')
    def patch(self, category_id):
        """切换分类激活状态"""
        # TODO: 实现切换分类状态的逻辑
        return {
            'message': f'分类 {category_id} 状态已切换',
            'category_id': category_id,
            'is_active': True
        }
