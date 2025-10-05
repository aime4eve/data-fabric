#!/bin/bash

# 开发环境停止脚本
# 一键停止所有开发服务

set -e

echo "🛑 开始停止开发环境..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 停止应用服务
echo -e "${BLUE}🛑 停止应用服务...${NC}"

# 停止后端服务
if [ -f "logs/backend.pid" ]; then
    BACKEND_PID=$(cat logs/backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        echo "停止后端服务 (PID: $BACKEND_PID)..."
        kill $BACKEND_PID
        rm -f logs/backend.pid
        echo -e "${GREEN}✅ 后端服务已停止${NC}"
    else
        echo -e "${YELLOW}⚠️  后端服务未运行${NC}"
        rm -f logs/backend.pid
    fi
else
    echo -e "${YELLOW}⚠️  后端服务PID文件不存在${NC}"
fi

# 停止前端服务
if [ -f "logs/frontend.pid" ]; then
    FRONTEND_PID=$(cat logs/frontend.pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        echo "停止前端服务 (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID
        rm -f logs/frontend.pid
        echo -e "${GREEN}✅ 前端服务已停止${NC}"
    else
        echo -e "${YELLOW}⚠️  前端服务未运行${NC}"
        rm -f logs/frontend.pid
    fi
else
    echo -e "${YELLOW}⚠️  前端服务PID文件不存在${NC}"
fi

# 停止Docker服务
echo -e "${BLUE}🐳 停止Docker服务...${NC}"
if docker-compose ps | grep -q "Up"; then
    docker-compose down
    echo -e "${GREEN}✅ Docker服务已停止${NC}"
else
    echo -e "${YELLOW}⚠️  Docker服务未运行${NC}"
fi

# 清理临时文件
echo -e "${BLUE}🧹 清理临时文件...${NC}"
rm -f /tmp/*.ngql
rm -f /tmp/*.json

echo ""
echo -e "${GREEN}🎉 开发环境已完全停止！${NC}"
echo ""
echo "📋 状态摘要:"
echo "  - 后端服务: 已停止"
echo "  - 前端服务: 已停止"
echo "  - Docker服务: 已停止"
echo "  - 临时文件: 已清理"
echo ""
echo "🎯 如果需要重新启动，请运行:"
echo "  ./scripts/dev/start_dev.sh"