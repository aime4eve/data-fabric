#!/usr/bin/env python3
"""
Docker Compose配置生成器
根据端口配置文件动态生成docker-compose.yml
"""
import os
import sys
import yaml
from pathlib import Path

# 导入端口配置管理模块
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'backend'))
from infrastructure.config.port_config import port_config


def generate_docker_compose():
    """生成Docker Compose配置"""
    
    # 获取端口配置
    config = port_config.get_all_config()
    
    # 构建Docker Compose配置
    docker_compose_config = {
        'version': '3.8',
        'services': {
            # NebulaGraph图数据库
            'nebula-graph': {
                'image': 'vesoft/nebula-graphd:v3.8.0',
                'container_name': 'knowledge-base-nebula-graph',
                'ports': [
                    f"{config['graph_database']['nebula_graph']['port']}:{config['internal']['nebula_graph']['port']}"
                ],
                'volumes': [
                    'nebula_data:/data',
                    'nebula_logs:/logs'
                ],
                'networks': ['knowledge-base-network'],
                'environment': {'TZ': 'Asia/Shanghai'},
                'restart': 'unless-stopped'
            },
            
            # NebulaGraph存储服务
            'nebula-storaged': {
                'image': 'vesoft/nebula-storaged:v3.8.0',
                'container_name': 'knowledge-base-nebula-storaged',
                'ports': ['9779:9779'],
                'volumes': [
                    'nebula_storaged_data:/data',
                    'nebula_storaged_logs:/logs'
                ],
                'networks': ['knowledge-base-network'],
                'depends_on': ['nebula-graph'],
                'environment': {'TZ': 'Asia/Shanghai'},
                'restart': 'unless-stopped'
            },
            
            # NebulaGraph元数据服务
            'nebula-metad': {
                'image': 'vesoft/nebula-metad:v3.8.0',
                'container_name': 'knowledge-base-nebula-metad',
                'ports': ['9559:9559'],
                'volumes': [
                    'nebula_metad_data:/data',
                    'nebula_metad_logs:/logs'
                ],
                'networks': ['knowledge-base-network'],
                'environment': {'TZ': 'Asia/Shanghai'},
                'restart': 'unless-stopped'
            },
            
            # PostgreSQL数据库
            'postgres': {
                'image': 'postgres:15-alpine',
                'container_name': 'knowledge-base-postgres',
                'ports': [
                    f"{config['database']['postgres']['port']}:{config['internal']['postgres']['port']}"
                ],
                'volumes': ['postgres_data:/var/lib/postgresql/data'],
                'networks': ['knowledge-base-network'],
                'environment': {
                    'POSTGRES_DB': 'knowledge_base',
                    'POSTGRES_USER': 'admin',
                    'POSTGRES_PASSWORD': '123456',
                    'TZ': 'Asia/Shanghai'
                },
                'restart': 'unless-stopped'
            },
            
            # Redis缓存服务
            'redis': {
                'image': 'redis:7-alpine',
                'container_name': 'knowledge-base-redis',
                'ports': [
                    f"{config['database']['redis']['port']}:{config['internal']['redis']['port']}"
                ],
                'volumes': ['redis_data:/data'],
                'networks': ['knowledge-base-network'],
                'restart': 'unless-stopped'
            },
            
            # 后端API服务
            'backend': {
                'build': {'context': './src/backend'},
                'container_name': 'knowledge-base-backend',
                'restart': 'always',
                'ports': [
                    f"{config['backend']['port']}:{config['internal']['backend']['port']}"
                ],
                'volumes': [
                    './src/backend:/app',
                    './logs:/app/logs'
                ],
                'networks': ['knowledge-base-network'],
                'depends_on': {
                    'postgres': {'condition': 'service_started'},
                    'redis': {'condition': 'service_started'},
                    'nebula-graph': {'condition': 'service_started'},
                    'elasticsearch': {'condition': 'service_healthy'}
                },
                'environment': {
                    'FLASK_ENV': 'development',
                    'DATABASE_URL': f"postgresql://admin:123456@postgres:{config['internal']['postgres']['port']}/knowledge_base",
                    'REDIS_URL': f"redis://redis:{config['internal']['redis']['port']}/0",
                    'NEBULA_GRAPH_HOST': 'nebula-graph',
                    'NEBULA_GRAPH_PORT': str(config['internal']['nebula_graph']['port']),
                    'ELASTICSEARCH_HOST': 'elasticsearch',
                    'ELASTICSEARCH_PORT': str(config['internal']['elasticsearch']['port']),
                    'TZ': 'Asia/Shanghai',
                    'FLASK_APP': 'app',
                    'NEO4J_URI': f"bolt://nebula-graph:{config['internal']['nebula_graph']['port']}",
                    'NEO4J_USERNAME': 'root',
                    'NEO4J_PASSWORD': 'nebula',
                    'POSTGRES_DB': 'knowledge_base',
                    'POSTGRES_USER': 'user',
                    'POSTGRES_PASSWORD': 'password',
                    'POSTGRES_HOST': 'postgres',
                    'REDIS_HOST': 'redis',
                    'REDIS_PORT': str(config['internal']['redis']['port'])
                },
                'command': f"sh -c \"sleep 15 && gunicorn --bind 0.0.0.0:{config['internal']['backend']['port']} --workers 4 'app:create_app()'\""
            },
            
            # 前端服务
            'frontend': {
                'build': {
                    'context': './src/frontend',
                    'dockerfile': 'Dockerfile'
                },
                'container_name': 'knowledge-base-frontend',
                'ports': [
                    f"{config['frontend']['port']}:3000"
                ],
                'volumes': [
                    './src/frontend:/app',
                    '/app/node_modules'
                ],
                'networks': ['knowledge-base-network'],
                'depends_on': ['backend'],
                'environment': {
                    'NODE_ENV': 'development',
                    'REACT_APP_API_URL': f"http://localhost:{config['backend']['port']}",
                    'TZ': 'Asia/Shanghai'
                },
                'restart': 'unless-stopped'
            },
            
            # Prometheus监控
            'prometheus': {
                'image': 'prom/prometheus:latest',
                'container_name': 'knowledge-base-prometheus',
                'ports': [
                    f"{config['monitoring']['prometheus']['port']}:9090"
                ],
                'volumes': [
                    './config/prometheus.yml:/etc/prometheus/prometheus.yml',
                    'prometheus_data:/prometheus'
                ],
                'networks': ['knowledge-base-network'],
                'command': [
                    '--config.file=/etc/prometheus/prometheus.yml',
                    '--storage.tsdb.path=/prometheus',
                    '--web.console.libraries=/etc/prometheus/console_libraries',
                    '--web.console.templates=/etc/prometheus/consoles'
                ],
                'restart': 'unless-stopped'
            },
            
            # Grafana可视化
            'grafana': {
                'image': 'grafana/grafana:latest',
                'container_name': 'knowledge-base-grafana',
                'ports': [
                    f"{config['monitoring']['grafana']['port']}:{config['internal']['grafana']['port']}"
                ],
                'volumes': [
                    'grafana_data:/var/lib/grafana',
                    './config/grafana:/etc/grafana/provisioning'
                ],
                'networks': ['knowledge-base-network'],
                'depends_on': ['prometheus'],
                'environment': {
                    'GF_SECURITY_ADMIN_PASSWORD': 'admin',
                    'GF_USERS_ALLOW_SIGN_UP': 'false'
                },
                'restart': 'unless-stopped'
            },
            
            # Elasticsearch全文搜索引擎
            'elasticsearch': {
                'image': 'docker.elastic.co/elasticsearch/elasticsearch:8.11.0',
                'container_name': 'knowledge-base-elasticsearch',
                'ports': [
                    f"{config['search']['elasticsearch']['port']}:{config['internal']['elasticsearch']['port']}",
                    '9300:9300'
                ],
                'volumes': ['elasticsearch_data:/usr/share/elasticsearch/data'],
                'networks': ['knowledge-base-network'],
                'environment': {
                    'discovery.type': 'single-node',
                    'xpack.security.enabled': 'false'
                }
            }
        },
        'networks': {
            'knowledge-base-network': {
                'driver': 'bridge'
            }
        },
        'volumes': {
            'nebula_data': {},
            'nebula_logs': {},
            'nebula_storaged_data': {},
            'nebula_storaged_logs': {},
            'nebula_metad_data': {},
            'nebula_metad_logs': {},
            'postgres_data': {},
            'redis_data': {},
            'prometheus_data': {},
            'grafana_data': {},
            'elasticsearch_data': {}
        }
    }
    
    return docker_compose_config


def main():
    """主函数"""
    # 生成Docker Compose配置
    config = generate_docker_compose()
    
    # 写入文件
    output_path = Path(__file__).parent.parent / 'docker-compose.yml'
    with open(output_path, 'w', encoding='utf-8') as f:
        yaml.dump(config, f, default_flow_style=False, allow_unicode=True, indent=2)
    
    print(f"Docker Compose配置已生成到: {output_path}")


if __name__ == '__main__':
    main()