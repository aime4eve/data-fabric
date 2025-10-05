"""
认证相关异常
"""


class AuthenticationError(Exception):
    """认证错误"""
    
    def __init__(self, message: str = "认证失败"):
        self.message = message
        super().__init__(self.message)


class AuthorizationError(Exception):
    """授权错误"""
    
    def __init__(self, message: str = "权限不足"):
        self.message = message
        super().__init__(self.message)


class TokenExpiredError(Exception):
    """令牌过期错误"""
    
    def __init__(self, message: str = "令牌已过期"):
        self.message = message
        super().__init__(self.message)


class InvalidTokenError(Exception):
    """无效令牌错误"""
    
    def __init__(self, message: str = "无效令牌"):
        self.message = message
        super().__init__(self.message)