#!/usr/bin/env python3
"""
端口配置管理工具
用于查看和修改端口配置
"""
import os
import sys
import argparse
import yaml
from pathlib import Path

# 导入端口配置管理模块
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'backend'))
from infrastructure.config.port_config import port_config


def show_config():
    """显示当前端口配置"""
    config = port_config.get_all_config()
    
    print("当前端口配置:")
    print("=" * 50)
    
    print("\n前端服务:")
    print(f"  前端端口: {config['frontend']['port']}")
    
    print("\n后端服务:")
    print(f"  后端端口: {config['backend']['port']}")
    
    print("\n数据库服务:")
    print(f"  PostgreSQL端口: {config['database']['postgres']['port']}")
    print(f"  Redis端口: {config['database']['redis']['port']}")
    
    print("\n搜索服务:")
    print(f"  Elasticsearch端口: {config['search']['elasticsearch']['port']}")
    
    print("\n图数据库服务:")
    print(f"  NebulaGraph端口: {config['graph_database']['nebula_graph']['port']}")
    
    print("\n监控服务:")
    print(f"  Prometheus端口: {config['monitoring']['prometheus']['port']}")
    print(f"  Grafana端口: {config['monitoring']['grafana']['port']}")
    
    print("\n内部端口:")
    print(f"  后端内部端口: {config['internal']['backend']['port']}")
    print(f"  PostgreSQL内部端口: {config['internal']['postgres']['port']}")
    print(f"  Redis内部端口: {config['internal']['redis']['port']}")
    print(f"  Elasticsearch内部端口: {config['internal']['elasticsearch']['port']}")
    print(f"  NebulaGraph内部端口: {config['internal']['nebula_graph']['port']}")
    print(f"  Grafana内部端口: {config['internal']['grafana']['port']}")


def update_config(service, port):
    """更新端口配置"""
    # 解析服务类型
    service_parts = service.split('.')
    
    if len(service_parts) == 1:
        # 顶级服务
        if service_parts[0] not in ['frontend', 'backend']:
            print(f"错误: 不支持的服务类型: {service}")
            return False
        
        new_config = {service_parts[0]: {'port': int(port)}}
    elif len(service_parts) == 2:
        # 二级服务
        if service_parts[0] not in ['database', 'search', 'graph_database', 'monitoring']:
            print(f"错误: 不支持的服务类型: {service}")
            return False
        
        new_config = {service_parts[0]: {service_parts[1]: {'port': int(port)}}}
    else:
        print(f"错误: 不支持的服务格式: {service}")
        return False
    
    try:
        port_config.update_config(new_config)
        print(f"成功更新 {service} 端口为 {port}")
        return True
    except ValueError as e:
        print(f"更新失败: {e}")
        return False


def validate_config():
    """验证端口配置"""
    try:
        port_config.validate_config()
        print("端口配置验证通过")
        return True
    except ValueError as e:
        print(f"端口配置验证失败: {e}")
        return False


def generate_configs():
    """生成所有配置"""
    import sys
    import yaml
    from pathlib import Path
    
    # 导入配置生成器
    scripts_dir = Path(__file__).parent
    sys.path.insert(0, str(scripts_dir))
    
    try:
        # 生成Docker Compose配置
        from generate_docker_compose import generate_docker_compose
        
        config = generate_docker_compose()
        output_path = scripts_dir.parent / 'docker-compose.yml'
        with open(output_path, 'w', encoding='utf-8') as f:
            yaml.dump(config, f, default_flow_style=False, allow_unicode=True, indent=2)
        print(f"Docker Compose配置已生成到: {output_path}")
        
        # 生成前端环境变量配置
        from generate_frontend_env import generate_frontend_env
        
        env_content = generate_frontend_env()
        output_path = scripts_dir.parent / 'src' / 'frontend' / '.env'
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(env_content)
        print(f"前端环境变量配置已生成到: {output_path}")
        
        print("所有配置生成完成！")
        return True
    except Exception as e:
        print(f"配置生成失败: {e}")
        import traceback
        print(traceback.format_exc())
        return False


def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='端口配置管理工具')
    subparsers = parser.add_subparsers(dest='command', help='子命令')
    
    # show命令
    show_parser = subparsers.add_parser('show', help='显示当前端口配置')
    
    # update命令
    update_parser = subparsers.add_parser('update', help='更新端口配置')
    update_parser.add_argument('service', help='服务名称 (如: frontend, backend, database.postgres, monitoring.prometheus)')
    update_parser.add_argument('port', type=int, help='端口号')
    
    # validate命令
    validate_parser = subparsers.add_parser('validate', help='验证端口配置')
    
    # generate命令
    generate_parser = subparsers.add_parser('generate', help='生成所有配置')
    
    args = parser.parse_args()
    
    if args.command == 'show':
        show_config()
    elif args.command == 'update':
        update_config(args.service, args.port)
    elif args.command == 'validate':
        validate_config()
    elif args.command == 'generate':
        generate_configs()
    else:
        parser.print_help()


if __name__ == '__main__':
    main()