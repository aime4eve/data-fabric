#!/usr/bin/env python3
"""
配置更新脚本
用于在端口配置更改后重新生成所有相关配置
"""
import os
import sys
from pathlib import Path


def update_all_configs():
    """更新所有配置"""
    
    # 获取脚本目录
    scripts_dir = Path(__file__).parent
    project_root = scripts_dir.parent
    
    print("开始更新所有配置...")
    
    # 1. 生成Docker Compose配置
    print("1. 生成Docker Compose配置...")
    os.system(f"cd {project_root} && python {scripts_dir}/generate_docker_compose.py")
    
    # 2. 生成前端环境变量配置
    print("2. 生成前端环境变量配置...")
    os.system(f"cd {project_root} && python {scripts_dir}/generate_frontend_env.py")
    
    print("所有配置更新完成！")
    print("请运行以下命令重启服务以应用新配置：")
    print("docker-compose down")
    print("docker-compose up -d")


def main():
    """主函数"""
    update_all_configs()


if __name__ == '__main__':
    main()