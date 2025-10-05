"""
应用程序配置设置
"""
import os
from datetime import timedelta


class Config:
    """基础配置类"""
    
    # Flask基础配置
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # 数据库配置
    DATABASE_URL = os.environ.get('DATABASE_URL') or \
        'postgresql://admin:123456@localhost:5432/knowledge_base'
    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 20,
        'pool_timeout': 20,
        'pool_recycle': 3600,
        'max_overflow': 30,
        'pool_pre_ping': True
    }
    
    # JWT配置
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-string'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    
    # Redis配置
    REDIS_URL = os.environ.get('REDIS_URL') or 'redis://localhost:6379/0'
    
    # Elasticsearch配置
    ELASTICSEARCH_URL = os.environ.get('ELASTICSEARCH_URL') or 'http://localhost:9200'
    
    # NebulaGraph配置
    NEBULA_HOST = os.environ.get('NEBULA_HOST') or 'localhost'
    NEBULA_PORT = int(os.environ.get('NEBULA_PORT') or 9669)
    NEBULA_USER = os.environ.get('NEBULA_USER') or 'admin'
    NEBULA_PASSWORD = os.environ.get('NEBULA_PASSWORD') or '123456'
    NEBULA_SPACE = os.environ.get('NEBULA_SPACE') or 'knowledge_graph'
    
    # MinIO配置
    MINIO_ENDPOINT = os.environ.get('MINIO_ENDPOINT') or 'localhost:9000'
    MINIO_ACCESS_KEY = os.environ.get('MINIO_ACCESS_KEY') or 'admin'
    MINIO_SECRET_KEY = os.environ.get('MINIO_SECRET_KEY') or '123456'
    MINIO_BUCKET_NAME = os.environ.get('MINIO_BUCKET_NAME') or 'knowledge-base'
    MINIO_SECURE = os.environ.get('MINIO_SECURE', 'false').lower() == 'true'
    
    # Celery配置
    CELERY_BROKER_URL = REDIS_URL
    CELERY_RESULT_BACKEND = REDIS_URL
    
    # 文件上传配置
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100MB
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER') or '/tmp/uploads'
    ALLOWED_EXTENSIONS = {
        'txt', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'md'
    }
    
    # 日志配置
    LOG_LEVEL = os.environ.get('LOG_LEVEL') or 'INFO'


class DevelopmentConfig(Config):
    """开发环境配置"""
    DEBUG = True
    TESTING = False
    # 开发环境使用SQLite数据库
    SQLALCHEMY_DATABASE_URI = 'sqlite:///knowledge_base.db'


class ProductionConfig(Config):
    """生产环境配置"""
    DEBUG = False
    TESTING = False


class TestingConfig(Config):
    """测试环境配置"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'


def get_config(config_name='development'):
    """获取配置对象"""
    config_map = {
        'development': DevelopmentConfig,
        'production': ProductionConfig,
        'testing': TestingConfig,
        'default': DevelopmentConfig
    }
    return config_map.get(config_name, DevelopmentConfig)


def get_config(config_name='development'):
    """获取配置对象"""
    config_map = {
        'development': DevelopmentConfig,
        'production': ProductionConfig,
        'testing': TestingConfig,
        'default': DevelopmentConfig
    }
    return config_map.get(config_name, DevelopmentConfig)


# 配置映射
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}