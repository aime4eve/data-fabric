"""
端口配置管理模块
集中管理所有服务的端口配置，避免硬编码
"""
import os
import yaml
from typing import Dict, Any


class PortConfig:
    """端口配置管理类"""
    
    _instance = None
    _config = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(PortConfig, cls).__new__(cls)
            cls._instance._load_config()
        return cls._instance
    
    def _load_config(self):
        """加载端口配置文件"""
        config_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))),
            'config',
            'ports.yml'
        )
        
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                self._config = yaml.safe_load(f)
        except FileNotFoundError:
            # 如果配置文件不存在，使用默认配置
            self._config = self._get_default_config()
        except Exception as e:
            print(f"加载端口配置文件失败: {e}")
            self._config = self._get_default_config()
    
    def _get_default_config(self) -> Dict[str, Any]:
        """获取默认端口配置"""
        return {
            'frontend': {
                'port': 3000,
                'url': 'http://localhost:3000'
            },
            'backend': {
                'port': 5000,
                'url': 'http://localhost:5000',
                'api_base_url': 'http://localhost:5000/api/v1'
            },
            'database': {
                'postgres': {
                    'port': 5432,
                    'url': 'postgresql://admin:123456@localhost:5432/knowledge_base'
                },
                'redis': {
                    'port': 6379,
                    'url': 'redis://localhost:6379/0'
                }
            },
            'search': {
                'elasticsearch': {
                    'port': 9200,
                    'url': 'http://localhost:9200'
                }
            },
            'graph_database': {
                'nebula_graph': {
                    'port': 9669,
                    'url': 'bolt://localhost:9669'
                }
            },
            'monitoring': {
                'prometheus': {
                    'port': 9090,
                    'url': 'http://localhost:9090'
                },
                'grafana': {
                    'port': 3001,
                    'url': 'http://localhost:3001'
                }
            },
            'internal': {
                'backend': {'port': 5000},
                'postgres': {'port': 5432},
                'redis': {'port': 6379},
                'elasticsearch': {'port': 9200},
                'nebula_graph': {'port': 9669},
                'prometheus': {'port': 9090},
                'grafana': {'port': 3000}
            },
            'development': {
                'frontend_port': 3000,
                'backend_port': 5000,
                'api_base_url': 'http://localhost:5000/api/v1'
            },
            'production': {
                'frontend_port': 80,
                'backend_port': 5000,
                'api_base_url': 'http://localhost:5000/api/v1'
            }
        }
    
    def get_frontend_port(self) -> int:
        """获取前端端口"""
        return self._config['frontend']['port']
    
    def get_backend_port(self) -> int:
        """获取后端端口"""
        return self._config['backend']['port']
    
    def get_backend_url(self) -> str:
        """获取后端URL"""
        return self._config['backend']['url']
    
    def get_api_base_url(self) -> str:
        """获取API基础URL"""
        return self._config['backend']['api_base_url']
    
    def get_database_port(self, db_type: str) -> int:
        """获取数据库端口"""
        return self._config['database'][db_type]['port']
    
    def get_database_url(self, db_type: str) -> str:
        """获取数据库URL"""
        return self._config['database'][db_type]['url']
    
    def get_search_port(self) -> int:
        """获取搜索服务端口"""
        return self._config['search']['elasticsearch']['port']
    
    def get_search_url(self) -> str:
        """获取搜索服务URL"""
        return self._config['search']['elasticsearch']['url']
    
    def get_graph_database_port(self) -> int:
        """获取图数据库端口"""
        return self._config['graph_database']['nebula_graph']['port']
    
    def get_graph_database_url(self) -> str:
        """获取图数据库URL"""
        return self._config['graph_database']['nebula_graph']['url']
    
    def get_monitoring_port(self, service: str) -> int:
        """获取监控服务端口"""
        return self._config['monitoring'][service]['port']
    
    def get_monitoring_url(self, service: str) -> str:
        """获取监控服务URL"""
        return self._config['monitoring'][service]['url']
    
    def get_internal_port(self, service: str) -> int:
        """获取容器内部端口"""
        return self._config['internal'][service]['port']
    
    def get_development_config(self) -> Dict[str, Any]:
        """获取开发环境配置"""
        return self._config['development']
    
    def get_production_config(self) -> Dict[str, Any]:
        """获取生产环境配置"""
        return self._config['production']
    
    def get_all_config(self) -> Dict[str, Any]:
        """获取所有配置"""
        return self._config

    def validate_config(self):
        """验证端口配置"""
        config = self._config
        
        # 检查必需字段
        required_fields = [
            'frontend', 'backend', 'database', 'search', 
            'graph_database', 'monitoring', 'internal'
        ]
        
        for field in required_fields:
            if field not in config:
                raise ValueError(f"配置文件中缺少必需字段: {field}")
        
        # 检查端口冲突
        ports = {}
        
        # 收集所有外部端口
        external_ports = [
            ('frontend', config['frontend']['port']),
            ('backend', config['backend']['port']),
            ('database.postgres', config['database']['postgres']['port']),
            ('database.redis', config['database']['redis']['port']),
            ('search.elasticsearch', config['search']['elasticsearch']['port']),
            ('graph_database.nebula_graph', config['graph_database']['nebula_graph']['port']),
            ('monitoring.prometheus', config['monitoring']['prometheus']['port']),
            ('monitoring.grafana', config['monitoring']['grafana']['port'])
        ]
        
        for service, port in external_ports:
            if port in ports:
                raise ValueError(f"端口冲突: {service} 和 {ports[port]} 都使用端口 {port}")
            ports[port] = service
        
        return True

    def update_config(self, new_config):
        """更新端口配置"""
        # 合并配置
        merged_config = self._get_default_config()
        merged_config.update(new_config)
        
        # 验证新配置
        self._config = merged_config
        self.validate_config()
        
        # 获取配置文件路径
        config_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
            'config',
            'ports.yml'
        )
        
        # 确保配置目录存在
        os.makedirs(os.path.dirname(config_path), exist_ok=True)
        
        # 保存到文件
        with open(config_path, 'w', encoding='utf-8') as f:
            yaml.dump(merged_config, f, default_flow_style=False, allow_unicode=True, indent=2)
        
        return True


# 创建全局实例
port_config = PortConfig()