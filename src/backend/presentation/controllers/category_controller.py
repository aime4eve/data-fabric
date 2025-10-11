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
        # 模拟数据
        mock_categories = [
            {
                'id': str(uuid.uuid4()),
                'name': '公司基本信息',
                'description': '公司基本信息相关文档',
                'parent_id': None,
                'level': 1,
                'sort_order': 1,
                'is_active': True,
                'created_at': '2024-01-01T00:00:00',
                'updated_at': '2024-01-01T00:00:00'
            },
            {
                'id': str(uuid.uuid4()),
                'name': '人力资源中心',
                'description': '人力资源管理相关文档',
                'parent_id': None,
                'level': 1,
                'sort_order': 2,
                'is_active': True,
                'created_at': '2024-01-01T00:00:00',
                'updated_at': '2024-01-01T00:00:00'
            }
        ]
        
        return {
            'data': mock_categories,
            'total': len(mock_categories),
            'page': 1,
            'per_page': 10
        }

    @category_ns.doc('创建新分类')
    @category_ns.expect(create_category_model)
    @category_ns.marshal_with(category_model)
    def post(self):
        """创建新分类"""
        data = request.get_json()
        
        # 模拟创建分类
        new_category = {
            'id': 999,
            'name': data.get('name'),
            'description': data.get('description', ''),
            'parent_id': data.get('parent_id'),
            'level': 1,
            'sort_order': data.get('sort_order', 0),
            'is_active': True,
            'created_at': '2024-01-01T00:00:00',
            'updated_at': '2024-01-01T00:00:00'
        }
        
        return new_category, 201

@category_ns.route('/tree/')
class CategoryTreeResource(Resource):
    @category_ns.doc('获取分类树结构')
    def get(self):
        """获取分类树结构"""
        # 返回与文档分类功能维护的真实分类数据
        mock_tree = [
            {
                'id': 1,
                'name': '公司基本信息',
                'description': '公司基本信息相关文档',
                'parent_id': None,
                'level': 1,
                'sort_order': 1,
                'is_active': True,
                'children': [
                    {
                        'id': 11,
                        'name': '企业文化和价值观',
                        'description': '企业文化和价值观相关文档',
                        'parent_id': 1,
                        'level': 2,
                        'sort_order': 1,
                        'is_active': True,
                        'children': []
                    },
                    {
                        'id': 12,
                        'name': '公司简介与发展历程',
                        'description': '公司简介与发展历程相关文档',
                        'parent_id': 1,
                        'level': 2,
                        'sort_order': 2,
                        'is_active': True,
                        'children': []
                    }
                ]
            },
            {
                'id': 2,
                'name': '人力资源中心',
                'description': '人力资源管理相关文档',
                'parent_id': None,
                'level': 1,
                'sort_order': 2,
                'is_active': True,
                'children': [
                    {
                        'id': 21,
                        'name': '人事档案管理',
                        'description': '人事档案管理相关文档',
                        'parent_id': 2,
                        'level': 2,
                        'sort_order': 1,
                        'is_active': True,
                        'children': []
                    },
                    {
                        'id': 22,
                        'name': '员工关系管理',
                        'description': '员工关系管理相关文档',
                        'parent_id': 2,
                        'level': 2,
                        'sort_order': 2,
                        'is_active': True,
                        'children': []
                    }
                ]
            },
            {
                'id': 3,
                'name': '财务管理中心',
                'description': '财务管理相关文档',
                'parent_id': None,
                'level': 1,
                'sort_order': 3,
                'is_active': True,
                'children': [
                    {
                        'id': 31,
                        'name': '财务制度与流程',
                        'description': '财务制度与流程相关文档',
                        'parent_id': 3,
                        'level': 2,
                        'sort_order': 1,
                        'is_active': True,
                        'children': []
                    },
                    {
                        'id': 32,
                        'name': '财务报表与分析',
                        'description': '财务报表与分析相关文档',
                        'parent_id': 3,
                        'level': 2,
                        'sort_order': 2,
                        'is_active': True,
                        'children': []
                    }
                ]
            },
            {
                'id': 4,
                'name': '技术研发中心',
                'description': '技术研发相关文档',
                'parent_id': None,
                'level': 1,
                'sort_order': 4,
                'is_active': True,
                'children': [
                    {
                        'id': 41,
                        'name': '产品规格书',
                        'description': '产品规格书相关文档',
                        'parent_id': 4,
                        'level': 2,
                        'sort_order': 1,
                        'is_active': True,
                        'children': []
                    },
                    {
                        'id': 42,
                        'name': '技术标准文档',
                        'description': '技术标准文档',
                        'parent_id': 4,
                        'level': 2,
                        'sort_order': 2,
                        'is_active': True,
                        'children': []
                    }
                ]
            }
        ]
        
        return mock_tree

@category_ns.route('/<int:category_id>')
class CategoryResource(Resource):
    @category_ns.doc('获取单个分类详情')
    @category_ns.marshal_with(category_model)
    def get(self, category_id):
        """获取单个分类详情"""
        # 模拟获取分类详情
        mock_category = {
            'id': category_id,
            'name': '公司基本信息',
            'description': '公司基本信息相关文档',
            'parent_id': None,
            'level': 1,
            'sort_order': 1,
            'is_active': True,
            'created_at': '2024-01-01T00:00:00',
            'updated_at': '2024-01-01T00:00:00'
        }
        
        return mock_category

    @category_ns.doc('更新分类')
    @category_ns.expect(update_category_model)
    @category_ns.marshal_with(category_model)
    def put(self, category_id):
        """更新分类"""
        data = request.get_json()
        
        # 模拟更新分类
        updated_category = {
            'id': category_id,
            'name': data.get('name', '公司基本信息'),
            'description': data.get('description', ''),
            'parent_id': data.get('parent_id'),
            'level': 1,
            'sort_order': data.get('sort_order', 0),
            'is_active': True,
            'created_at': '2024-01-01T00:00:00',
            'updated_at': '2024-01-01T00:00:00'
        }
        
        return updated_category

    @category_ns.doc('删除分类')
    def delete(self, category_id):
        """删除分类"""
        # 模拟删除分类
        return {'message': f'分类 {category_id} 已删除'}, 200

@category_ns.route('/stats/')
class CategoryStatsResource(Resource):
    @category_ns.doc('获取分类统计信息')
    def get(self):
        """获取分类统计信息"""
        # 模拟统计数据
        stats = {
            'total_categories': 10,
            'active_categories': 8,
            'inactive_categories': 2,
            'max_level': 3,
            'categories_by_level': {
                '1': 3,
                '2': 5,
                '3': 2
            }
        }
        
        return stats

@category_ns.route('/<int:category_id>/toggle-status')
class CategoryToggleStatusResource(Resource):
    @category_ns.doc('切换分类状态')
    def patch(self, category_id):
        """切换分类激活状态"""
        # 模拟切换状态
        return {
            'message': f'分类 {category_id} 状态已切换',
            'category_id': category_id,
            'is_active': True
        }
