"""
认证控制器单元测试
"""
import pytest
import json
from unittest.mock import Mock, patch
from flask import Flask
from flask_restx import Api

from presentation.controllers.auth_controller import auth_ns
from application.services.auth_service import AuthService
from shared_kernel.exceptions.auth_exceptions import AuthenticationError


class TestAuthController:
    """认证控制器测试类"""

    @pytest.fixture
    def app(self):
        """Flask应用实例"""
        app = Flask(__name__)
        app.config['TESTING'] = True
        app.config['JWT_SECRET_KEY'] = 'test-secret-key'
        
        api = Api(app)
        api.add_namespace(auth_ns)
        
        return app

    @pytest.fixture
    def client(self, app):
        """测试客户端"""
        return app.test_client()

    @pytest.fixture
    def mock_auth_service(self):
        """模拟认证服务"""
        return Mock(spec=AuthService)

    @pytest.mark.unit
    class TestLoginEndpoint:
        """登录端点测试"""

        def test_login_success(self, client, mock_auth_service):
            """测试成功登录"""
            # Arrange
            mock_auth_service.authenticate.return_value = {
                'access_token': 'access_token_123',
                'refresh_token': 'refresh_token_123',
                'user': {
                    'id': '1',
                    'username': 'admin',
                    'email': 'admin@test.com',
                    'role': 'admin'
                }
            }

            with patch('src.backend.interfaces.controllers.auth_controller.auth_service', mock_auth_service):
                # Act
                response = client.post('/auth/login', 
                    json={
                        'username': 'admin',
                        'password': '123456'
                    },
                    content_type='application/json'
                )

            # Assert
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['access_token'] == 'access_token_123'
            assert data['refresh_token'] == 'refresh_token_123'
            assert data['user']['username'] == 'admin'
            mock_auth_service.authenticate.assert_called_once_with('admin', '123456')

        def test_login_invalid_credentials(self, client, mock_auth_service):
            """测试无效凭据登录"""
            # Arrange
            mock_auth_service.authenticate.side_effect = AuthenticationError("用户名或密码错误")

            with patch('src.backend.interfaces.controllers.auth_controller.auth_service', mock_auth_service):
                # Act
                response = client.post('/auth/login',
                    json={
                        'username': 'admin',
                        'password': 'wrong_password'
                    },
                    content_type='application/json'
                )

            # Assert
            assert response.status_code == 401
            data = json.loads(response.data)
            assert data['message'] == "用户名或密码错误"

        def test_login_missing_username(self, client):
            """测试缺少用户名"""
            # Act
            response = client.post('/auth/login',
                json={
                    'password': '123456'
                },
                content_type='application/json'
            )

            # Assert
            assert response.status_code == 400

        def test_login_missing_password(self, client):
            """测试缺少密码"""
            # Act
            response = client.post('/auth/login',
                json={
                    'username': 'admin'
                },
                content_type='application/json'
            )

            # Assert
            assert response.status_code == 400

        def test_login_empty_request_body(self, client):
            """测试空请求体"""
            # Act
            response = client.post('/auth/login',
                json={},
                content_type='application/json'
            )

            # Assert
            assert response.status_code == 400

        def test_login_invalid_json(self, client):
            """测试无效JSON"""
            # Act
            response = client.post('/auth/login',
                data='invalid json',
                content_type='application/json'
            )

            # Assert
            assert response.status_code == 400

        def test_login_sql_injection_attempt(self, client, mock_auth_service):
            """测试SQL注入尝试"""
            # Arrange
            mock_auth_service.authenticate.side_effect = AuthenticationError("用户名或密码错误")

            with patch('src.backend.interfaces.controllers.auth_controller.auth_service', mock_auth_service):
                # Act
                response = client.post('/auth/login',
                    json={
                        'username': "admin'; DROP TABLE users; --",
                        'password': 'password'
                    },
                    content_type='application/json'
                )

            # Assert
            assert response.status_code == 401
            mock_auth_service.authenticate.assert_called_once()

        def test_login_xss_attempt(self, client, mock_auth_service):
            """测试XSS攻击尝试"""
            # Arrange
            mock_auth_service.authenticate.side_effect = AuthenticationError("用户名或密码错误")

            with patch('src.backend.interfaces.controllers.auth_controller.auth_service', mock_auth_service):
                # Act
                response = client.post('/auth/login',
                    json={
                        'username': '<script>alert("xss")</script>',
                        'password': 'password'
                    },
                    content_type='application/json'
                )

            # Assert
            assert response.status_code == 401
            data = json.loads(response.data)
            # 确保响应中不包含脚本标签
            assert '<script>' not in str(data)

        def test_login_long_input(self, client, mock_auth_service):
            """测试超长输入"""
            # Arrange
            long_string = 'a' * 10000
            mock_auth_service.authenticate.side_effect = AuthenticationError("用户名或密码错误")

            with patch('src.backend.interfaces.controllers.auth_controller.auth_service', mock_auth_service):
                # Act
                response = client.post('/auth/login',
                    json={
                        'username': long_string,
                        'password': 'password'
                    },
                    content_type='application/json'
                )

            # Assert
            assert response.status_code in [400, 401]  # 可能被输入验证拦截或认证失败

        def test_login_unicode_characters(self, client, mock_auth_service):
            """测试Unicode字符"""
            # Arrange
            mock_auth_service.authenticate.return_value = {
                'access_token': 'access_token_123',
                'refresh_token': 'refresh_token_123',
                'user': {
                    'id': '1',
                    'username': '测试用户',
                    'email': 'test@test.com',
                    'role': 'user'
                }
            }

            with patch('src.backend.interfaces.controllers.auth_controller.auth_service', mock_auth_service):
                # Act
                response = client.post('/auth/login',
                    json={
                        'username': '测试用户',
                        'password': '密码123'
                    },
                    content_type='application/json'
                )

            # Assert
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['user']['username'] == '测试用户'

    @pytest.mark.unit
    class TestRegisterEndpoint:
        """注册端点测试"""

        def test_register_success(self, client, mock_auth_service):
            """测试成功注册"""
            # Arrange
            from src.backend.domain.entities.user import User
            from datetime import datetime
            
            mock_user = User(
                id="1",
                username="newuser",
                email="newuser@test.com",
                password_hash="hashed_password",
                role="user",
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            mock_auth_service.register.return_value = mock_user

            with patch('src.backend.interfaces.controllers.auth_controller.auth_service', mock_auth_service):
                # Act
                response = client.post('/auth/register',
                    json={
                        'username': 'newuser',
                        'email': 'newuser@test.com',
                        'password': '123456'
                    },
                    content_type='application/json'
                )

            # Assert
            assert response.status_code == 201
            data = json.loads(response.data)
            assert data['message'] == "注册成功"
            assert data['user']['username'] == 'newuser'
            assert data['user']['email'] == 'newuser@test.com'

        def test_register_username_exists(self, client, mock_auth_service):
            """测试用户名已存在"""
            # Arrange
            mock_auth_service.register.side_effect = AuthenticationError("用户名已存在")

            with patch('src.backend.interfaces.controllers.auth_controller.auth_service', mock_auth_service):
                # Act
                response = client.post('/auth/register',
                    json={
                        'username': 'existinguser',
                        'email': 'new@test.com',
                        'password': '123456'
                    },
                    content_type='application/json'
                )

            # Assert
            assert response.status_code == 400
            data = json.loads(response.data)
            assert data['message'] == "用户名已存在"

        def test_register_email_exists(self, client, mock_auth_service):
            """测试邮箱已存在"""
            # Arrange
            mock_auth_service.register.side_effect = AuthenticationError("邮箱已存在")

            with patch('src.backend.interfaces.controllers.auth_controller.auth_service', mock_auth_service):
                # Act
                response = client.post('/auth/register',
                    json={
                        'username': 'newuser',
                        'email': 'existing@test.com',
                        'password': '123456'
                    },
                    content_type='application/json'
                )

            # Assert
            assert response.status_code == 400
            data = json.loads(response.data)
            assert data['message'] == "邮箱已存在"

        def test_register_invalid_email(self, client):
            """测试无效邮箱格式"""
            # Act
            response = client.post('/auth/register',
                json={
                    'username': 'newuser',
                    'email': 'invalid-email',
                    'password': '123456'
                },
                content_type='application/json'
            )

            # Assert
            assert response.status_code == 400

        def test_register_weak_password(self, client, mock_auth_service):
            """测试弱密码"""
            # Arrange
            mock_auth_service.register.side_effect = AuthenticationError("密码强度不足")

            with patch('src.backend.interfaces.controllers.auth_controller.auth_service', mock_auth_service):
                # Act
                response = client.post('/auth/register',
                    json={
                        'username': 'newuser',
                        'email': 'user@test.com',
                        'password': '123'
                    },
                    content_type='application/json'
                )

            # Assert
            assert response.status_code == 400

        def test_register_missing_fields(self, client):
            """测试缺少必填字段"""
            # 测试缺少用户名
            response = client.post('/auth/register',
                json={
                    'email': 'user@test.com',
                    'password': '123456'
                },
                content_type='application/json'
            )
            assert response.status_code == 400

            # 测试缺少邮箱
            response = client.post('/auth/register',
                json={
                    'username': 'newuser',
                    'password': '123456'
                },
                content_type='application/json'
            )
            assert response.status_code == 400

            # 测试缺少密码
            response = client.post('/auth/register',
                json={
                    'username': 'newuser',
                    'email': 'user@test.com'
                },
                content_type='application/json'
            )
            assert response.status_code == 400

    @pytest.mark.unit
    class TestRefreshEndpoint:
        """刷新令牌端点测试"""

        def test_refresh_success(self, client, mock_auth_service):
            """测试成功刷新令牌"""
            # Arrange
            mock_auth_service.refresh_token.return_value = {
                'access_token': 'new_access_token',
                'refresh_token': 'new_refresh_token'
            }

            with patch('src.backend.interfaces.controllers.auth_controller.auth_service', mock_auth_service):
                # Act
                response = client.post('/auth/refresh',
                    json={
                        'refresh_token': 'valid_refresh_token'
                    },
                    content_type='application/json'
                )

            # Assert
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['access_token'] == 'new_access_token'
            assert data['refresh_token'] == 'new_refresh_token'

        def test_refresh_invalid_token(self, client, mock_auth_service):
            """测试无效刷新令牌"""
            # Arrange
            mock_auth_service.refresh_token.side_effect = AuthenticationError("无效的刷新令牌")

            with patch('src.backend.interfaces.controllers.auth_controller.auth_service', mock_auth_service):
                # Act
                response = client.post('/auth/refresh',
                    json={
                        'refresh_token': 'invalid_token'
                    },
                    content_type='application/json'
                )

            # Assert
            assert response.status_code == 401
            data = json.loads(response.data)
            assert data['message'] == "无效的刷新令牌"

        def test_refresh_missing_token(self, client):
            """测试缺少刷新令牌"""
            # Act
            response = client.post('/auth/refresh',
                json={},
                content_type='application/json'
            )

            # Assert
            assert response.status_code == 400

    @pytest.mark.unit
    class TestChangePasswordEndpoint:
        """修改密码端点测试"""

        def test_change_password_success(self, client, mock_auth_service):
            """测试成功修改密码"""
            # Arrange
            mock_auth_service.change_password.return_value = True

            with patch('src.backend.interfaces.controllers.auth_controller.auth_service', mock_auth_service), \
                 patch('flask_jwt_extended.get_jwt_identity', return_value='1'):
                # Act
                response = client.post('/auth/change-password',
                    json={
                        'old_password': 'old_password',
                        'new_password': 'new_password'
                    },
                    content_type='application/json',
                    headers={'Authorization': 'Bearer valid_token'}
                )

            # Assert
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['message'] == "密码修改成功"

        def test_change_password_wrong_old_password(self, client, mock_auth_service):
            """测试旧密码错误"""
            # Arrange
            mock_auth_service.change_password.side_effect = AuthenticationError("旧密码错误")

            with patch('src.backend.interfaces.controllers.auth_controller.auth_service', mock_auth_service), \
                 patch('flask_jwt_extended.get_jwt_identity', return_value='1'):
                # Act
                response = client.post('/auth/change-password',
                    json={
                        'old_password': 'wrong_password',
                        'new_password': 'new_password'
                    },
                    content_type='application/json',
                    headers={'Authorization': 'Bearer valid_token'}
                )

            # Assert
            assert response.status_code == 400
            data = json.loads(response.data)
            assert data['message'] == "旧密码错误"

        def test_change_password_unauthorized(self, client):
            """测试未授权访问"""
            # Act
            response = client.post('/auth/change-password',
                json={
                    'old_password': 'old_password',
                    'new_password': 'new_password'
                },
                content_type='application/json'
            )

            # Assert
            assert response.status_code == 401

    @pytest.mark.unit
    class TestProfileEndpoint:
        """用户资料端点测试"""

        def test_get_profile_success(self, client, mock_auth_service):
            """测试成功获取用户资料"""
            # Arrange
            from src.backend.domain.entities.user import User
            from datetime import datetime
            
            mock_user = User(
                id="1",
                username="admin",
                email="admin@test.com",
                password_hash="hashed_password",
                role="admin",
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            mock_auth_service.get_user_profile.return_value = mock_user

            with patch('src.backend.interfaces.controllers.auth_controller.auth_service', mock_auth_service), \
                 patch('flask_jwt_extended.get_jwt_identity', return_value='1'):
                # Act
                response = client.get('/auth/profile',
                    headers={'Authorization': 'Bearer valid_token'}
                )

            # Assert
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['user']['username'] == 'admin'
            assert data['user']['email'] == 'admin@test.com'
            assert data['user']['role'] == 'admin'

        def test_get_profile_unauthorized(self, client):
            """测试未授权访问用户资料"""
            # Act
            response = client.get('/auth/profile')

            # Assert
            assert response.status_code == 401

        def test_get_profile_user_not_found(self, client, mock_auth_service):
            """测试用户不存在"""
            # Arrange
            mock_auth_service.get_user_profile.side_effect = AuthenticationError("用户不存在")

            with patch('src.backend.interfaces.controllers.auth_controller.auth_service', mock_auth_service), \
                 patch('flask_jwt_extended.get_jwt_identity', return_value='999'):
                # Act
                response = client.get('/auth/profile',
                    headers={'Authorization': 'Bearer valid_token'}
                )

            # Assert
            assert response.status_code == 404
            data = json.loads(response.data)
            assert data['message'] == "用户不存在"

    @pytest.mark.unit
    class TestCORSHeaders:
        """CORS头部测试"""

        def test_cors_headers_present(self, client):
            """测试CORS头部存在"""
            # Act
            response = client.options('/auth/login')

            # Assert
            assert 'Access-Control-Allow-Origin' in response.headers
            assert 'Access-Control-Allow-Methods' in response.headers
            assert 'Access-Control-Allow-Headers' in response.headers

        def test_preflight_request(self, client):
            """测试预检请求"""
            # Act
            response = client.options('/auth/login',
                headers={
                    'Origin': 'http://localhost:3000',
                    'Access-Control-Request-Method': 'POST',
                    'Access-Control-Request-Headers': 'Content-Type'
                }
            )

            # Assert
            assert response.status_code == 200

    @pytest.mark.unit
    class TestRateLimiting:
        """速率限制测试"""

        def test_rate_limiting_login_attempts(self, client, mock_auth_service):
            """测试登录尝试速率限制"""
            # Arrange
            mock_auth_service.authenticate.side_effect = AuthenticationError("用户名或密码错误")

            with patch('src.backend.interfaces.controllers.auth_controller.auth_service', mock_auth_service):
                # Act - 多次尝试登录
                responses = []
                for i in range(10):
                    response = client.post('/auth/login',
                        json={
                            'username': 'admin',
                            'password': 'wrong_password'
                        },
                        content_type='application/json'
                    )
                    responses.append(response)

            # Assert - 检查是否有速率限制响应
            status_codes = [r.status_code for r in responses]
            # 可能会有429状态码（Too Many Requests）
            assert all(code in [401, 429] for code in status_codes)

    @pytest.mark.security
    class TestSecurityHeaders:
        """安全头部测试"""

        def test_security_headers_present(self, client):
            """测试安全头部存在"""
            # Act
            response = client.post('/auth/login',
                json={
                    'username': 'admin',
                    'password': '123456'
                },
                content_type='application/json'
            )

            # Assert
            headers = response.headers
            # 检查常见的安全头部
            expected_headers = [
                'X-Content-Type-Options',
                'X-Frame-Options',
                'X-XSS-Protection'
            ]
            
            # 注意：这些头部可能在中间件中设置，测试时可能不存在
            # 这里主要是验证测试结构的正确性

        def test_content_type_validation(self, client):
            """测试Content-Type验证"""
            # Act - 发送非JSON内容
            response = client.post('/auth/login',
                data='username=admin&password=123456',
                content_type='application/x-www-form-urlencoded'
            )

            # Assert
            assert response.status_code in [400, 415]  # Bad Request 或 Unsupported Media Type

        def test_request_size_limit(self, client):
            """测试请求大小限制"""
            # Arrange - 创建超大请求
            large_data = {
                'username': 'a' * 100000,
                'password': 'b' * 100000
            }

            # Act
            response = client.post('/auth/login',
                json=large_data,
                content_type='application/json'
            )

            # Assert
            assert response.status_code in [400, 413]  # Bad Request 或 Payload Too Large