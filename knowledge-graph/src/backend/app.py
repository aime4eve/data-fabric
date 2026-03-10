"""
Flask应用程序工厂模式入口文件
"""
import os
import json
import uuid
from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
try:
    from flask_migrate import Migrate
except ImportError:
    Migrate = None
from flask_jwt_extended import JWTManager
from flask_cors import CORS

from infrastructure.config.settings import get_config
from infrastructure.config.port_config import port_config
from infrastructure.persistence.database import db
from presentation.api import api_bp


class UUIDEncoder(json.JSONEncoder):
    """自定义JSON编码器，处理UUID序列化"""
    def default(self, obj):
        if isinstance(obj, uuid.UUID):
            return str(obj)
        return super().default(obj)


def create_app(config_name='development'):
    """应用工厂函数"""
    app = Flask(__name__)
    
    # 禁用严格的斜杠匹配，避免308重定向
    app.url_map.strict_slashes = False
    
    # 设置自定义JSON编码器，处理UUID序列化
    app.json_encoder = UUIDEncoder
    
    # 加载配置
    config = get_config(config_name)
    app.config.from_object(config)
    
    # 初始化扩展
    db.init_app(app)
    # 在开发环境缺少 Flask-Migrate 时跳过迁移初始化
    if Migrate is not None:
        Migrate(app, db)
    jwt = JWTManager(app)
    CORS(app)
    
    # 配置JWT错误处理
    @jwt.unauthorized_loader
    def unauthorized_callback(callback):
        return jsonify({'msg': '未提供有效的认证令牌'}), 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(callback):
        return jsonify({'msg': '认证令牌无效'}), 401
    
    @jwt.expired_token_loader
    def expired_token_callback(callback):
        return jsonify({'msg': '认证令牌已过期'}), 401
    
    # 注册蓝图
    app.register_blueprint(api_bp)
    
    # 健康检查端点
    @app.route('/health')
    def health_check():
        return 'OK'

    return app


if __name__ == '__main__':
    app = create_app()
    # 使用端口配置管理模块获取端口，而不是硬编码
    backend_port = port_config.get_backend_port()
    app.run(host='0.0.0.0', port=backend_port, debug=True, use_reloader=False)