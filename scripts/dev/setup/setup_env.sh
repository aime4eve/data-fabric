#!/bin/bash

# 开发环境设置脚本
# 用于初始化本地开发环境

set -e

echo "🚀 开始设置开发环境..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否在项目根目录
if [ ! -f "setup_dev_env.sh" ]; then
    echo -e "${RED}错误: 请在项目根目录运行此脚本${NC}"
    exit 1
fi

# 创建后端环境变量文件
echo "📝 创建后端环境变量文件..."
cat > src/backend/.env << EOF
# Flask 配置
FLASK_ENV=development
FLASK_DEBUG=True
FLASK_PORT=5000
FLASK_HOST=0.0.0.0

# 数据库配置
NEBULA_GRAPH_HOST=localhost
NEBULA_GRAPH_PORT=9669
NEBULA_GRAPH_USER=root
NEBULA_GRAPH_PASSWORD=nebula
NEBULA_GRAPH_SPACE=knowledge_base

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# JWT 配置
JWT_SECRET_KEY=your-secret-key-change-this-in-production
JWT_ACCESS_TOKEN_EXPIRES=3600

# 日志配置
LOG_LEVEL=INFO
LOG_FILE=logs/app.log
EOF

# 创建前端环境变量文件
echo "📝 创建前端环境变量文件..."
cat > src/frontend/.env << EOF
# API 配置
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_GRAPHQL_URL=http://localhost:5000/graphql
REACT_APP_WS_URL=ws://localhost:5000/ws

# 环境配置
REACT_APP_ENV=development
REACT_APP_DEBUG=true

# 功能开关
REACT_APP_ENABLE_ANALYTICS=false
REACT_APP_ENABLE_ERROR_REPORTING=false
EOF

# 创建日志目录
mkdir -p logs

# 创建上传目录
mkdir -p uploads

# 设置文件权限
chmod 644 src/backend/.env
chmod 644 src/frontend/.env

echo -e "${GREEN}✅ 开发环境设置完成！${NC}"
echo ""
echo "📋 已创建的文件:"
echo "  - src/backend/.env (后端配置)"
echo "  - src/frontend/.env (前端配置)"
echo "  - logs/ (日志目录)"
echo "  - uploads/ (上传目录)"
echo ""
echo "🎯 下一步:"
echo "  1. 运行 ./setup_dev_env.sh 安装依赖"
echo "  2. 运行 docker-compose up -d 启动基础设施服务"
echo "  3. 运行 ./scripts/dev/migrate/migrate_up.sh 执行数据库迁移"
echo "  4. 运行 ./scripts/dev/seed/seed_knowledge.sh 填充测试数据"