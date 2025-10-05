"""
认证集成测试
测试前后端API交互、身份验证流程和CORS配置
"""
import pytest
import requests
import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from unittest.mock import patch


class TestAuthIntegration:
    """认证集成测试类"""

    @pytest.fixture(scope="class")
    def base_url(self):
        """API基础URL"""
        return "http://localhost:5000"

    @pytest.fixture(scope="class")
    def frontend_url(self):
        """前端URL"""
        return "http://localhost:3000"

    @pytest.fixture
    def test_user_data(self):
        """测试用户数据"""
        return {
            "username": f"testuser_{int(time.time())}",
            "email": f"test_{int(time.time())}@example.com",
            "password": "TestPassword123!"
        }

    @pytest.fixture
    def admin_user_data(self):
        """管理员用户数据"""
        return {
            "username": "admin",
            "email": "admin@test.com",
            "password": "123456"
        }

    @pytest.mark.integration
    class TestUserRegistrationFlow:
        """用户注册流程测试"""

        def test_complete_registration_flow(self, base_url, test_user_data):
            """测试完整注册流程"""
            # Step 1: 注册新用户
            register_response = requests.post(
                f"{base_url}/api/v1/auth/register",
                json=test_user_data,
                headers={"Content-Type": "application/json"}
            )
            
            assert register_response.status_code == 201
            register_data = register_response.json()
            assert register_data["message"] == "注册成功"
            assert register_data["user"]["username"] == test_user_data["username"]
            assert register_data["user"]["email"] == test_user_data["email"]
            assert "password" not in register_data["user"]  # 密码不应返回

            # Step 2: 使用新注册的用户登录
            login_response = requests.post(
                f"{base_url}/api/v1/auth/login",
                json={
                    "username": test_user_data["username"],
                    "password": test_user_data["password"]
                },
                headers={"Content-Type": "application/json"}
            )
            
            assert login_response.status_code == 200
            login_data = login_response.json()
            assert "access_token" in login_data
            assert "refresh_token" in login_data
            assert login_data["user"]["username"] == test_user_data["username"]

            # Step 3: 使用访问令牌获取用户资料
            access_token = login_data["access_token"]
            profile_response = requests.get(
                f"{base_url}/api/v1/auth/profile",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            assert profile_response.status_code == 200
            profile_data = profile_response.json()
            assert profile_data["user"]["username"] == test_user_data["username"]
            assert profile_data["user"]["email"] == test_user_data["email"]

        def test_duplicate_registration_prevention(self, base_url, test_user_data):
            """测试重复注册防护"""
            # 第一次注册
            first_response = requests.post(
                f"{base_url}/api/v1/auth/register",
                json=test_user_data,
                headers={"Content-Type": "application/json"}
            )
            
            # 第二次使用相同用户名注册
            second_response = requests.post(
                f"{base_url}/api/v1/auth/register",
                json=test_user_data,
                headers={"Content-Type": "application/json"}
            )
            
            assert second_response.status_code == 400
            error_data = second_response.json()
            assert "用户名已存在" in error_data["message"] or "邮箱已存在" in error_data["message"]

        def test_registration_input_validation(self, base_url):
            """测试注册输入验证"""
            # 测试无效邮箱格式
            invalid_email_response = requests.post(
                f"{base_url}/api/v1/auth/register",
                json={
                    "username": "testuser",
                    "email": "invalid-email",
                    "password": "ValidPassword123!"
                },
                headers={"Content-Type": "application/json"}
            )
            assert invalid_email_response.status_code == 400

            # 测试弱密码
            weak_password_response = requests.post(
                f"{base_url}/api/v1/auth/register",
                json={
                    "username": "testuser2",
                    "email": "test2@example.com",
                    "password": "123"
                },
                headers={"Content-Type": "application/json"}
            )
            assert weak_password_response.status_code == 400

            # 测试缺少必填字段
            missing_field_response = requests.post(
                f"{base_url}/api/v1/auth/register",
                json={
                    "username": "testuser3",
                    "password": "ValidPassword123!"
                    # 缺少email
                },
                headers={"Content-Type": "application/json"}
            )
            assert missing_field_response.status_code == 400

    @pytest.mark.integration
    class TestUserLoginFlow:
        """用户登录流程测试"""

        def test_successful_login_with_username(self, base_url, admin_user_data):
            """测试使用用户名成功登录"""
            response = requests.post(
                f"{base_url}/api/v1/auth/login",
                json={
                    "username": admin_user_data["username"],
                    "password": admin_user_data["password"]
                },
                headers={"Content-Type": "application/json"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "access_token" in data
            assert "refresh_token" in data
            assert data["user"]["username"] == admin_user_data["username"]

        def test_successful_login_with_email(self, base_url, admin_user_data):
            """测试使用邮箱成功登录"""
            response = requests.post(
                f"{base_url}/api/v1/auth/login",
                json={
                    "username": admin_user_data["email"],
                    "password": admin_user_data["password"]
                },
                headers={"Content-Type": "application/json"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "access_token" in data
            assert "refresh_token" in data

        def test_login_with_invalid_credentials(self, base_url):
            """测试无效凭据登录"""
            response = requests.post(
                f"{base_url}/api/v1/auth/login",
                json={
                    "username": "nonexistent",
                    "password": "wrongpassword"
                },
                headers={"Content-Type": "application/json"}
            )
            
            assert response.status_code == 401
            data = response.json()
            assert "用户名或密码错误" in data["message"]

        def test_login_input_validation(self, base_url):
            """测试登录输入验证"""
            # 测试空用户名
            response = requests.post(
                f"{base_url}/api/v1/auth/login",
                json={
                    "username": "",
                    "password": "password"
                },
                headers={"Content-Type": "application/json"}
            )
            assert response.status_code in [400, 401]

            # 测试空密码
            response = requests.post(
                f"{base_url}/api/v1/auth/login",
                json={
                    "username": "admin",
                    "password": ""
                },
                headers={"Content-Type": "application/json"}
            )
            assert response.status_code in [400, 401]

            # 测试缺少字段
            response = requests.post(
                f"{base_url}/api/v1/auth/login",
                json={
                    "username": "admin"
                    # 缺少password
                },
                headers={"Content-Type": "application/json"}
            )
            assert response.status_code == 400

    @pytest.mark.integration
    class TestTokenManagement:
        """令牌管理测试"""

        def test_token_refresh_flow(self, base_url, admin_user_data):
            """测试令牌刷新流程"""
            # Step 1: 登录获取令牌
            login_response = requests.post(
                f"{base_url}/api/v1/auth/login",
                json={
                    "username": admin_user_data["username"],
                    "password": admin_user_data["password"]
                },
                headers={"Content-Type": "application/json"}
            )
            
            assert login_response.status_code == 200
            login_data = login_response.json()
            refresh_token = login_data["refresh_token"]

            # Step 2: 使用刷新令牌获取新的访问令牌
            refresh_response = requests.post(
                f"{base_url}/api/v1/auth/refresh",
                json={"refresh_token": refresh_token},
                headers={"Content-Type": "application/json"}
            )
            
            assert refresh_response.status_code == 200
            refresh_data = refresh_response.json()
            assert "access_token" in refresh_data
            assert "refresh_token" in refresh_data
            
            # 新令牌应该与旧令牌不同
            assert refresh_data["access_token"] != login_data["access_token"]

        def test_invalid_refresh_token(self, base_url):
            """测试无效刷新令牌"""
            response = requests.post(
                f"{base_url}/api/v1/auth/refresh",
                json={"refresh_token": "invalid_token"},
                headers={"Content-Type": "application/json"}
            )
            
            assert response.status_code == 401
            data = response.json()
            assert "无效" in data["message"] or "token" in data["message"].lower()

        def test_expired_token_handling(self, base_url):
            """测试过期令牌处理"""
            # 使用明显过期的令牌
            expired_token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwiZXhwIjoxNjAwMDAwMDAwfQ.invalid"
            
            response = requests.get(
                f"{base_url}/api/v1/auth/profile",
                headers={"Authorization": f"Bearer {expired_token}"}
            )
            
            assert response.status_code == 401

        def test_malformed_token_handling(self, base_url):
            """测试格式错误的令牌处理"""
            malformed_tokens = [
                "invalid_token",
                "Bearer invalid_token",
                "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.invalid",
                ""
            ]
            
            for token in malformed_tokens:
                response = requests.get(
                    f"{base_url}/api/v1/auth/profile",
                    headers={"Authorization": f"Bearer {token}"}
                )
                assert response.status_code == 401

    @pytest.mark.integration
    class TestPasswordManagement:
        """密码管理测试"""

        def test_change_password_flow(self, base_url, test_user_data):
            """测试修改密码流程"""
            # Step 1: 注册用户
            register_response = requests.post(
                f"{base_url}/api/v1/auth/register",
                json=test_user_data,
                headers={"Content-Type": "application/json"}
            )
            assert register_response.status_code == 201

            # Step 2: 登录获取令牌
            login_response = requests.post(
                f"{base_url}/api/v1/auth/login",
                json={
                    "username": test_user_data["username"],
                    "password": test_user_data["password"]
                },
                headers={"Content-Type": "application/json"}
            )
            assert login_response.status_code == 200
            access_token = login_response.json()["access_token"]

            # Step 3: 修改密码
            new_password = "NewPassword123!"
            change_response = requests.post(
                f"{base_url}/api/v1/auth/change-password",
                json={
                    "old_password": test_user_data["password"],
                    "new_password": new_password
                },
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                }
            )
            assert change_response.status_code == 200

            # Step 4: 使用新密码登录
            new_login_response = requests.post(
                f"{base_url}/api/v1/auth/login",
                json={
                    "username": test_user_data["username"],
                    "password": new_password
                },
                headers={"Content-Type": "application/json"}
            )
            assert new_login_response.status_code == 200

            # Step 5: 确认旧密码不能使用
            old_login_response = requests.post(
                f"{base_url}/api/v1/auth/login",
                json={
                    "username": test_user_data["username"],
                    "password": test_user_data["password"]
                },
                headers={"Content-Type": "application/json"}
            )
            assert old_login_response.status_code == 401

        def test_change_password_with_wrong_old_password(self, base_url, admin_user_data):
            """测试使用错误旧密码修改密码"""
            # 登录获取令牌
            login_response = requests.post(
                f"{base_url}/api/v1/auth/login",
                json={
                    "username": admin_user_data["username"],
                    "password": admin_user_data["password"]
                },
                headers={"Content-Type": "application/json"}
            )
            access_token = login_response.json()["access_token"]

            # 使用错误的旧密码尝试修改
            response = requests.post(
                f"{base_url}/api/v1/auth/change-password",
                json={
                    "old_password": "wrong_old_password",
                    "new_password": "NewPassword123!"
                },
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                }
            )
            
            assert response.status_code == 400
            data = response.json()
            assert "旧密码错误" in data["message"]

    @pytest.mark.integration
    class TestCORSConfiguration:
        """CORS配置测试"""

        def test_cors_preflight_request(self, base_url, frontend_url):
            """测试CORS预检请求"""
            response = requests.options(
                f"{base_url}/api/v1/auth/login",
                headers={
                    "Origin": frontend_url,
                    "Access-Control-Request-Method": "POST",
                    "Access-Control-Request-Headers": "Content-Type, Authorization"
                }
            )
            
            assert response.status_code == 200
            assert "Access-Control-Allow-Origin" in response.headers
            assert "Access-Control-Allow-Methods" in response.headers
            assert "Access-Control-Allow-Headers" in response.headers

        def test_cors_actual_request(self, base_url, frontend_url):
            """测试CORS实际请求"""
            response = requests.post(
                f"{base_url}/api/v1/auth/login",
                json={
                    "username": "admin",
                    "password": "123456"
                },
                headers={
                    "Origin": frontend_url,
                    "Content-Type": "application/json"
                }
            )
            
            # 检查CORS头部
            assert "Access-Control-Allow-Origin" in response.headers
            cors_origin = response.headers.get("Access-Control-Allow-Origin")
            assert cors_origin == frontend_url or cors_origin == "*"

        def test_cors_credentials_support(self, base_url, frontend_url):
            """测试CORS凭据支持"""
            response = requests.post(
                f"{base_url}/api/v1/auth/login",
                json={
                    "username": "admin",
                    "password": "123456"
                },
                headers={
                    "Origin": frontend_url,
                    "Content-Type": "application/json"
                }
            )
            
            # 如果支持凭据，应该有相应的头部
            if "Access-Control-Allow-Credentials" in response.headers:
                assert response.headers["Access-Control-Allow-Credentials"] == "true"

    @pytest.mark.integration
    class TestErrorHandling:
        """错误处理测试"""

        def test_network_error_simulation(self, base_url):
            """测试网络错误模拟"""
            # 尝试连接不存在的端点
            try:
                response = requests.post(
                    f"{base_url}/api/v1/auth/nonexistent",
                    json={"test": "data"},
                    timeout=5
                )
                assert response.status_code == 404
            except requests.exceptions.RequestException:
                # 网络错误是预期的
                pass

        def test_malformed_json_handling(self, base_url):
            """测试格式错误的JSON处理"""
            response = requests.post(
                f"{base_url}/api/v1/auth/login",
                data="invalid json data",
                headers={"Content-Type": "application/json"}
            )
            
            assert response.status_code == 400

        def test_unsupported_content_type(self, base_url):
            """测试不支持的内容类型"""
            response = requests.post(
                f"{base_url}/api/v1/auth/login",
                data="username=admin&password=123456",
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            assert response.status_code in [400, 415]

        def test_request_size_limit(self, base_url):
            """测试请求大小限制"""
            # 创建超大请求
            large_data = {
                "username": "a" * 100000,
                "password": "b" * 100000
            }
            
            response = requests.post(
                f"{base_url}/api/v1/auth/login",
                json=large_data,
                headers={"Content-Type": "application/json"}
            )
            
            assert response.status_code in [400, 413]

    @pytest.mark.integration
    class TestConcurrentAccess:
        """并发访问测试"""

        def test_concurrent_login_attempts(self, base_url, admin_user_data):
            """测试并发登录尝试"""
            def login_request():
                return requests.post(
                    f"{base_url}/api/v1/auth/login",
                    json={
                        "username": admin_user_data["username"],
                        "password": admin_user_data["password"]
                    },
                    headers={"Content-Type": "application/json"}
                )

            # 并发执行多个登录请求
            with ThreadPoolExecutor(max_workers=10) as executor:
                futures = [executor.submit(login_request) for _ in range(10)]
                responses = [future.result() for future in as_completed(futures)]

            # 所有请求都应该成功
            for response in responses:
                assert response.status_code == 200
                data = response.json()
                assert "access_token" in data

        def test_concurrent_registration_attempts(self, base_url):
            """测试并发注册尝试"""
            base_timestamp = int(time.time())
            
            def register_request(index):
                return requests.post(
                    f"{base_url}/api/v1/auth/register",
                    json={
                        "username": f"user_{base_timestamp}_{index}",
                        "email": f"user_{base_timestamp}_{index}@test.com",
                        "password": "TestPassword123!"
                    },
                    headers={"Content-Type": "application/json"}
                )

            # 并发执行多个注册请求
            with ThreadPoolExecutor(max_workers=5) as executor:
                futures = [executor.submit(register_request, i) for i in range(5)]
                responses = [future.result() for future in as_completed(futures)]

            # 所有请求都应该成功（因为用户名不同）
            success_count = sum(1 for r in responses if r.status_code == 201)
            assert success_count == 5

        def test_concurrent_token_refresh(self, base_url, admin_user_data):
            """测试并发令牌刷新"""
            # 先登录获取刷新令牌
            login_response = requests.post(
                f"{base_url}/api/v1/auth/login",
                json={
                    "username": admin_user_data["username"],
                    "password": admin_user_data["password"]
                },
                headers={"Content-Type": "application/json"}
            )
            refresh_token = login_response.json()["refresh_token"]

            def refresh_request():
                return requests.post(
                    f"{base_url}/api/v1/auth/refresh",
                    json={"refresh_token": refresh_token},
                    headers={"Content-Type": "application/json"}
                )

            # 并发执行多个刷新请求
            with ThreadPoolExecutor(max_workers=5) as executor:
                futures = [executor.submit(refresh_request) for _ in range(5)]
                responses = [future.result() for future in as_completed(futures)]

            # 检查响应
            success_responses = [r for r in responses if r.status_code == 200]
            # 至少应该有一些成功的响应
            assert len(success_responses) > 0

    @pytest.mark.integration
    class TestAPIResponseFormat:
        """API响应格式测试"""

        def test_login_response_format(self, base_url, admin_user_data):
            """测试登录响应格式"""
            response = requests.post(
                f"{base_url}/api/v1/auth/login",
                json={
                    "username": admin_user_data["username"],
                    "password": admin_user_data["password"]
                },
                headers={"Content-Type": "application/json"}
            )
            
            assert response.status_code == 200
            data = response.json()
            
            # 检查必需字段
            required_fields = ["access_token", "refresh_token", "user"]
            for field in required_fields:
                assert field in data
            
            # 检查用户对象格式
            user = data["user"]
            user_fields = ["id", "username", "email", "role"]
            for field in user_fields:
                assert field in user
            
            # 确保敏感信息不在响应中
            assert "password" not in user
            assert "password_hash" not in user

        def test_error_response_format(self, base_url):
            """测试错误响应格式"""
            response = requests.post(
                f"{base_url}/api/v1/auth/login",
                json={
                    "username": "nonexistent",
                    "password": "wrongpassword"
                },
                headers={"Content-Type": "application/json"}
            )
            
            assert response.status_code == 401
            data = response.json()
            
            # 检查错误响应格式
            assert "message" in data
            assert isinstance(data["message"], str)
            assert len(data["message"]) > 0

        def test_validation_error_response_format(self, base_url):
            """测试验证错误响应格式"""
            response = requests.post(
                f"{base_url}/api/v1/auth/register",
                json={
                    "username": "",  # 无效用户名
                    "email": "invalid-email",  # 无效邮箱
                    "password": "123"  # 弱密码
                },
                headers={"Content-Type": "application/json"}
            )
            
            assert response.status_code == 400
            data = response.json()
            
            # 检查验证错误响应格式
            assert "message" in data
            # 可能包含详细的验证错误信息
            if "errors" in data:
                assert isinstance(data["errors"], (list, dict))

    @pytest.mark.integration
    class TestSecurityIntegration:
        """安全集成测试"""

        def test_sql_injection_protection(self, base_url):
            """测试SQL注入防护"""
            sql_payloads = [
                "admin'; DROP TABLE users; --",
                "admin' OR '1'='1",
                "admin' UNION SELECT * FROM users --",
                "'; DELETE FROM users WHERE '1'='1"
            ]
            
            for payload in sql_payloads:
                response = requests.post(
                    f"{base_url}/api/v1/auth/login",
                    json={
                        "username": payload,
                        "password": "password"
                    },
                    headers={"Content-Type": "application/json"}
                )
                
                # 应该返回认证失败，而不是服务器错误
                assert response.status_code == 401
                data = response.json()
                assert "用户名或密码错误" in data["message"]

        def test_xss_protection(self, base_url):
            """测试XSS防护"""
            xss_payloads = [
                "<script>alert('xss')</script>",
                "javascript:alert('xss')",
                "<img src=x onerror=alert('xss')>",
                "';alert('xss');//"
            ]
            
            for payload in xss_payloads:
                response = requests.post(
                    f"{base_url}/api/v1/auth/login",
                    json={
                        "username": payload,
                        "password": "password"
                    },
                    headers={"Content-Type": "application/json"}
                )
                
                # 检查响应中不包含脚本内容
                response_text = response.text
                assert "<script>" not in response_text
                assert "javascript:" not in response_text
                assert "alert(" not in response_text

        def test_csrf_protection(self, base_url, frontend_url):
            """测试CSRF防护"""
            # 测试没有正确Origin头的请求
            response = requests.post(
                f"{base_url}/api/v1/auth/login",
                json={
                    "username": "admin",
                    "password": "123456"
                },
                headers={
                    "Origin": "http://malicious-site.com",
                    "Content-Type": "application/json"
                }
            )
            
            # 根据CORS配置，可能会被拒绝或允许
            # 这里主要测试系统的行为是否一致
            assert response.status_code in [200, 403, 401]

        def test_rate_limiting_integration(self, base_url):
            """测试速率限制集成"""
            # 快速发送多个失败的登录请求
            responses = []
            for i in range(20):
                response = requests.post(
                    f"{base_url}/api/v1/auth/login",
                    json={
                        "username": "admin",
                        "password": "wrongpassword"
                    },
                    headers={"Content-Type": "application/json"}
                )
                responses.append(response)
                
                # 如果遇到速率限制，停止测试
                if response.status_code == 429:
                    break

            # 检查是否有速率限制响应
            status_codes = [r.status_code for r in responses]
            # 可能会有429状态码（Too Many Requests）
            has_rate_limit = 429 in status_codes
            # 或者所有请求都是401（认证失败）
            all_auth_failed = all(code == 401 for code in status_codes)
            
            assert has_rate_limit or all_auth_failed