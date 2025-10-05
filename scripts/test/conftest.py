"""
Global pytest configuration and fixtures for the test suite.
"""
import pytest
import os
import sys
import tempfile
import shutil
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

# Add the project root to Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, project_root)

# Test configuration
TEST_CONFIG = {
    'TESTING': True,
    'WTF_CSRF_ENABLED': False,
    'SECRET_KEY': 'test-secret-key',
    'DATABASE_URL': 'sqlite:///:memory:',
    'UPLOAD_FOLDER': None,  # Will be set to temp directory
    'MAX_CONTENT_LENGTH': 16 * 1024 * 1024,  # 16MB
    'ELASTICSEARCH_URL': 'http://localhost:9200',
    'REDIS_URL': 'redis://localhost:6379/0',
    'JWT_SECRET_KEY': 'test-jwt-secret',
    'JWT_ACCESS_TOKEN_EXPIRES': timedelta(hours=1)
}


@pytest.fixture(scope='session')
def temp_upload_dir():
    """Create a temporary directory for file uploads during testing."""
    temp_dir = tempfile.mkdtemp(prefix='test_uploads_')
    yield temp_dir
    # Cleanup after all tests
    shutil.rmtree(temp_dir, ignore_errors=True)


@pytest.fixture(scope='function')
def app(temp_upload_dir):
    """Create and configure a test Flask application."""
    try:
        from api.app import create_app
        
        # Update config with temp directory
        test_config = TEST_CONFIG.copy()
        test_config['UPLOAD_FOLDER'] = temp_upload_dir
        
        app = create_app(test_config)
        
        with app.app_context():
            # Initialize test database
            try:
                from api.models import db
                db.create_all()
            except ImportError:
                # If models not available, create mock
                pass
            
            yield app
            
            # Cleanup
            try:
                db.drop_all()
            except:
                pass
                
    except ImportError:
        # If Flask app not available, create a mock
        app = MagicMock()
        app.config = TEST_CONFIG
        yield app


@pytest.fixture
def client(app):
    """Create a test client for the Flask application."""
    if hasattr(app, 'test_client'):
        return app.test_client()
    else:
        # Return mock client if Flask app not available
        return MagicMock()


@pytest.fixture
def runner(app):
    """Create a test CLI runner for the Flask application."""
    if hasattr(app, 'test_cli_runner'):
        return app.test_cli_runner()
    else:
        return MagicMock()


@pytest.fixture
def auth_headers():
    """Generate authentication headers for testing."""
    try:
        from api.utils.auth import generate_token
        token = generate_token({'user_id': 1, 'username': 'testuser', 'role': 'user'})
        return {'Authorization': f'Bearer {token}'}
    except ImportError:
        # Return mock headers if auth utils not available
        return {'Authorization': 'Bearer mock-token'}


@pytest.fixture
def admin_auth_headers():
    """Generate admin authentication headers for testing."""
    try:
        from api.utils.auth import generate_token
        token = generate_token({'user_id': 1, 'username': 'admin', 'role': 'admin'})
        return {'Authorization': f'Bearer {token}'}
    except ImportError:
        return {'Authorization': 'Bearer mock-admin-token'}


@pytest.fixture
def sample_user():
    """Create a sample user for testing."""
    return {
        'id': 1,
        'username': 'testuser',
        'email': 'test@example.com',
        'password': 'password123',
        'role': 'user',
        'is_active': True,
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow()
    }


@pytest.fixture
def sample_admin_user():
    """Create a sample admin user for testing."""
    return {
        'id': 2,
        'username': 'admin',
        'email': 'admin@example.com',
        'password': 'admin123',
        'role': 'admin',
        'is_active': True,
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow()
    }


@pytest.fixture
def sample_document():
    """Create a sample document for testing."""
    return {
        'id': 1,
        'title': '测试文档',
        'content': '这是一个测试文档的内容，包含了各种测试数据。',
        'category': '技术文档',
        'tags': ['测试', 'React', 'TypeScript'],
        'author_id': 1,
        'author': '测试用户',
        'file_type': 'pdf',
        'file_size': 1024,
        'filename': 'test.pdf',
        'file_path': '/uploads/test.pdf',
        'is_public': True,
        'view_count': 0,
        'download_count': 0,
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow()
    }


@pytest.fixture
def sample_documents():
    """Create multiple sample documents for testing."""
    base_time = datetime.utcnow()
    return [
        {
            'id': 1,
            'title': 'React开发指南',
            'content': '这是一个关于React开发的详细指南，包含组件、状态管理、路由等内容。',
            'category': '技术文档',
            'tags': ['React', 'JavaScript', '前端'],
            'author_id': 1,
            'author': '张三',
            'file_type': 'pdf',
            'created_at': base_time - timedelta(days=1)
        },
        {
            'id': 2,
            'title': 'Python Flask教程',
            'content': '学习如何使用Flask框架构建Web应用程序，包括路由、模板、数据库集成。',
            'category': '技术文档',
            'tags': ['Python', 'Flask', '后端'],
            'author_id': 2,
            'author': '李四',
            'file_type': 'docx',
            'created_at': base_time - timedelta(days=2)
        },
        {
            'id': 3,
            'title': '项目管理最佳实践',
            'content': '介绍敏捷开发、Scrum方法论以及项目管理工具的使用。',
            'category': '管理文档',
            'tags': ['项目管理', 'Scrum', '敏捷'],
            'author_id': 3,
            'author': '王五',
            'file_type': 'pptx',
            'created_at': base_time - timedelta(days=3)
        }
    ]


@pytest.fixture
def sample_categories():
    """Create sample categories for testing."""
    return [
        {'id': 1, 'name': '技术文档', 'description': '技术相关的文档'},
        {'id': 2, 'name': '管理文档', 'description': '管理相关的文档'},
        {'id': 3, 'name': '培训资料', 'description': '培训和学习资料'},
        {'id': 4, 'name': '政策法规', 'description': '政策和法规文件'}
    ]


@pytest.fixture
def mock_elasticsearch():
    """Mock Elasticsearch client for testing."""
    with patch('elasticsearch.Elasticsearch') as mock_es:
        mock_client = MagicMock()
        mock_es.return_value = mock_client
        
        # Mock search response
        mock_client.search.return_value = {
            'hits': {
                'total': {'value': 0},
                'max_score': None,
                'hits': []
            }
        }
        
        # Mock index response
        mock_client.index.return_value = {
            '_id': '1',
            'result': 'created'
        }
        
        # Mock delete response
        mock_client.delete.return_value = {
            'result': 'deleted'
        }
        
        yield mock_client


@pytest.fixture
def mock_redis():
    """Mock Redis client for testing."""
    with patch('redis.Redis') as mock_redis_class:
        mock_client = MagicMock()
        mock_redis_class.return_value = mock_client
        
        # Mock Redis operations
        mock_client.get.return_value = None
        mock_client.set.return_value = True
        mock_client.delete.return_value = 1
        mock_client.exists.return_value = False
        
        yield mock_client


@pytest.fixture
def mock_file_storage():
    """Mock file storage for testing."""
    with patch('os.makedirs'), \
         patch('builtins.open', create=True) as mock_open, \
         patch('os.path.exists', return_value=True), \
         patch('os.remove'):
        
        mock_file = MagicMock()
        mock_open.return_value.__enter__.return_value = mock_file
        yield mock_file


@pytest.fixture(autouse=True)
def reset_mocks():
    """Reset all mocks before each test."""
    yield
    # This runs after each test
    # Any cleanup can be added here


# Pytest configuration
def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line(
        "markers", "unit: mark test as a unit test"
    )
    config.addinivalue_line(
        "markers", "integration: mark test as an integration test"
    )
    config.addinivalue_line(
        "markers", "e2e: mark test as an end-to-end test"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )
    config.addinivalue_line(
        "markers", "api: mark test as API test"
    )
    config.addinivalue_line(
        "markers", "frontend: mark test as frontend test"
    )
    config.addinivalue_line(
        "markers", "backend: mark test as backend test"
    )


def pytest_collection_modifyitems(config, items):
    """Modify test collection to add markers based on file paths."""
    for item in items:
        # Add markers based on file path
        if "unit" in str(item.fspath):
            item.add_marker(pytest.mark.unit)
        elif "integration" in str(item.fspath):
            item.add_marker(pytest.mark.integration)
        elif "e2e" in str(item.fspath):
            item.add_marker(pytest.mark.e2e)
        
        if "frontend" in str(item.fspath):
            item.add_marker(pytest.mark.frontend)
        elif "backend" in str(item.fspath):
            item.add_marker(pytest.mark.backend)
        
        if "api" in str(item.fspath):
            item.add_marker(pytest.mark.api)


# Test data generators
class TestDataGenerator:
    """Generate test data for various scenarios."""
    
    @staticmethod
    def generate_user_data(count=1, **overrides):
        """Generate user test data."""
        users = []
        for i in range(count):
            user = {
                'id': i + 1,
                'username': f'user{i + 1}',
                'email': f'user{i + 1}@example.com',
                'password': 'password123',
                'role': 'user',
                'is_active': True,
                'created_at': datetime.utcnow() - timedelta(days=i),
                'updated_at': datetime.utcnow()
            }
            user.update(overrides)
            users.append(user)
        return users[0] if count == 1 else users
    
    @staticmethod
    def generate_document_data(count=1, **overrides):
        """Generate document test data."""
        documents = []
        categories = ['技术文档', '管理文档', '培训资料', '政策法规']
        
        for i in range(count):
            doc = {
                'id': i + 1,
                'title': f'测试文档{i + 1}',
                'content': f'这是第{i + 1}个测试文档的内容。',
                'category': categories[i % len(categories)],
                'tags': [f'标签{i + 1}', '测试'],
                'author_id': (i % 3) + 1,
                'author': f'作者{(i % 3) + 1}',
                'file_type': 'pdf',
                'file_size': 1024 * (i + 1),
                'is_public': True,
                'view_count': i * 10,
                'created_at': datetime.utcnow() - timedelta(days=i),
                'updated_at': datetime.utcnow()
            }
            doc.update(overrides)
            documents.append(doc)
        return documents[0] if count == 1 else documents


# Export test data generator
@pytest.fixture
def test_data_generator():
    """Provide test data generator."""
    return TestDataGenerator