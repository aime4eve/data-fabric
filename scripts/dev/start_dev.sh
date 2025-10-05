#!/bin/bash

# 快速启动脚本
# 一键启动所有开发服务

set -e

echo "🚀 开始启动开发环境..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查环境
echo -e "${BLUE}🔍 检查环境状态...${NC}"
if ! ./scripts/dev/check_env.sh > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  环境检查未通过，请先修复问题${NC}"
    echo "运行: ./scripts/dev/check_env.sh 查看详细信息"
    exit 1
fi

# 启动基础设施服务
echo -e "${BLUE}🐳 启动基础设施服务...${NC}"
docker-compose up -d

# 等待服务启动
echo -e "${BLUE}⏳ 等待服务启动...${NC}"
sleep 15

# 检查服务状态
echo -e "${BLUE}🔍 检查服务状态...${NC}"
if docker-compose ps | grep -q "nebula-graphd.*Up" && docker-compose ps | grep -q "redis.*Up"; then
    echo -e "${GREEN}✅ 基础设施服务启动成功${NC}"
else
    echo -e "${RED}❌ 基础设施服务启动失败${NC}"
    docker-compose ps
    exit 1
fi

# 激活Python虚拟环境
if [ -d "venv" ]; then
    echo -e "${BLUE}🐍 激活Python虚拟环境...${NC}"
    source venv/bin/activate
fi

# 启动后端服务
echo -e "${BLUE}⚡ 启动后端服务...${NC}"
cd src/backend
if [ -f "app.py" ]; then
    echo "启动后端API服务..."
    python app.py &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../../logs/backend.pid
    echo -e "${GREEN}✅ 后端服务已启动 (PID: $BACKEND_PID)${NC}"
else
    echo -e "${YELLOW}⚠️  后端应用文件不存在，跳过启动${NC}"
fi
cd ../..

# 启动前端服务
echo -e "${BLUE}🌐 启动前端服务...${NC}"
cd src/frontend
if [ -f "package.json" ]; then
    echo "启动前端开发服务器..."
    npm start &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../../logs/frontend.pid
    echo -e "${GREEN}✅ 前端服务已启动 (PID: $FRONTEND_PID)${NC}"
else
    echo -e "${YELLOW}⚠️  前端package.json不存在，跳过启动${NC}"
fi
cd ../..

# 等待服务完全启动
sleep 5

# 显示状态
echo ""
echo -e "${GREEN}🎉 开发环境启动完成！${NC}"
echo ""
echo "📋 服务状态:"
echo "  🐳 Docker服务:"
docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "  🚀 应用服务:"
if [ -f "logs/backend.pid" ]; then
    echo "  - 后端API: http://localhost:5000 (PID: $(cat logs/backend.pid))"
fi
if [ -f "logs/frontend.pid" ]; then
    echo "  - 前端应用: http://localhost:3000 (PID: $(cat logs/frontend.pid))"
fi
echo ""
echo "📊 监控面板:"
echo "  - Prometheus: http://localhost:9090"
echo "  - Grafana: http://localhost:3001"
echo ""
echo "🗄️ 数据库管理:"
echo "  - NebulaGraph: localhost:9669"
echo "  - Redis: localhost:6379"
echo ""
echo "🎯 常用命令:"
echo "  - 查看日志: tail -f logs/*.log"
echo "  - 停止服务: ./scripts/dev/stop_dev.sh"
echo "  - 重启服务: ./scripts/dev/restart_dev.sh"
echo "  - 检查状态: ./scripts/dev/check_env.sh"