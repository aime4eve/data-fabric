"""
Flask应用程序工厂模式入口文件
"""
import os
from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS

from infrastructure.config.settings import get_config
from infrastructure.config.port_config import port_config
from infrastructure.persistence.database import db
from presentation.api import api_bp


def create_app(config_name='development'):
    """应用工厂函数"""
    app = Flask(__name__)
    
    # 禁用严格的斜杠匹配，避免308重定向
    app.url_map.strict_slashes = False
    
    # 加载配置
    config = get_config(config_name)
    app.config.from_object(config)
    
    # 初始化扩展
    db.init_app(app)
    migrate = Migrate(app, db)
    jwt = JWTManager(app)
    CORS(app)
    
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