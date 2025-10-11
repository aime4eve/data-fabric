#!/usr/bin/env python3
"""
前端环境变量生成器
根据端口配置文件动态生成前端环境变量
"""
import os
import sys
from pathlib import Path

# 导入端口配置管理模块
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'backend'))
from infrastructure.config.port_config import port_config


def generate_frontend_env():
    """生成前端环境变量配置"""
    
    # 获取端口配置
    config = port_config.get_all_config()
    
    # 构建环境变量内容
    env_content = f"""# 前端环境变量配置
# 端口配置从config/ports.yml统一管理
VITE_API_BASE_URL=http://localhost:{config['backend']['port']}/api/v1
"""
    
    return env_content


def main():
    """主函数"""
    # 生成前端环境变量配置
    env_content = generate_frontend_env()
    
    # 写入文件
    output_path = Path(__file__).parent.parent / 'src' / 'frontend' / '.env'
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(env_content)
    
    print(f"前端环境变量配置已生成到: {output_path}")


if __name__ == '__main__':
    main()