"""
依赖注入配置
"""
from infrastructure.repositories.directory_repository_impl import DirectoryRepositoryImpl
from infrastructure.repositories.file_repository_impl import FileRepositoryImpl
from infrastructure.repositories.tag_repository_impl import TagRepositoryImpl
from infrastructure.repositories.permission_repository_impl import PermissionRepositoryImpl
from infrastructure.repositories.audit_repository_impl import AuditRepositoryImpl
from domain.services.directory_service import DirectoryService
from domain.services.permission_service import PermissionService
from application.services.file_service import FileService
from application.services.tag_service import TagService
from application.services.audit_service import AuditService


class ServiceContainer:
    """服务容器，管理依赖注入"""
    
    def __init__(self):
        self._services = {}
        self._repositories = {}
        self._initialize_repositories()
        self._initialize_services()
    
    def _initialize_repositories(self):
        """初始化仓储实例"""
        self._repositories['directory_repository'] = DirectoryRepositoryImpl()
        self._repositories['file_repository'] = FileRepositoryImpl()
        self._repositories['tag_repository'] = TagRepositoryImpl()
        self._repositories['permission_repository'] = PermissionRepositoryImpl()
        self._repositories['audit_repository'] = AuditRepositoryImpl()
    
    def _initialize_services(self):
        """初始化服务实例"""
        self._services['directory_service'] = DirectoryService(
            self._repositories['directory_repository'],
            self._repositories['file_repository']
        )
        self._services['file_service'] = FileService(
            self._repositories['file_repository'],
            self._repositories['directory_repository']
        )
        self._services['tag_service'] = TagService(
            self._repositories['tag_repository']
        )
        self._services['permission_service'] = PermissionService(
            self._repositories['permission_repository']
        )
        self._services['audit_service'] = AuditService(
            self._repositories['audit_repository']
        )
    
    def get_service(self, service_name: str):
        """获取服务实例"""
        if service_name not in self._services:
            raise ValueError(f"Service '{service_name}' not found")
        return self._services[service_name]
    
    def get_repository(self, repository_name: str):
        """获取仓储实例"""
        if repository_name not in self._repositories:
            raise ValueError(f"Repository '{repository_name}' not found")
        return self._repositories[repository_name]


# 全局服务容器实例
service_container = ServiceContainer()


def get_directory_service() -> DirectoryService:
    """获取目录服务"""
    return service_container.get_service('directory_service')


def get_file_service() -> FileService:
    """获取文件服务"""
    return service_container.get_service('file_service')


def get_tag_service() -> TagService:
    """获取标签服务"""
    return service_container.get_service('tag_service')


def get_permission_service() -> PermissionService:
    """获取权限服务"""
    return service_container.get_service('permission_service')


def get_audit_service() -> AuditService:
    """获取审计服务"""
    return service_container.get_service('audit_service')