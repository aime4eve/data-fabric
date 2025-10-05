#!/bin/bash

# 企业知识库管理系统 - 停止服务脚本
# 优雅停止所有服务

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# 显示停止横幅
echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                   企业知识库管理系统                         ║"
echo "║                   停止服务脚本 v1.0                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${BLUE}🛑 开始停止所有服务...${NC}"

# 停止前端服务
if [ -f "logs/frontend.pid" ]; then
    FRONTEND_PID=$(cat logs/frontend.pid)
    echo -e "${YELLOW}🌐 停止前端服务 (PID: $FRONTEND_PID)...${NC}"
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        kill $FRONTEND_PID
        echo -e "${GREEN}✅ 前端服务已停止${NC}"
    else
        echo -e "${YELLOW}⚠️  前端服务进程不存在${NC}"
    fi
    rm -f logs/frontend.pid
else
    echo -e "${YELLOW}⚠️  未找到前端服务PID文件${NC}"
fi

# 停止后端服务
if [ -f "logs/backend.pid" ]; then
    BACKEND_PID=$(cat logs/backend.pid)
    echo -e "${YELLOW}⚡ 停止后端服务 (PID: $BACKEND_PID)...${NC}"
    if kill -0 $BACKEND_PID 2>/dev/null; then
        kill $BACKEND_PID
        echo -e "${GREEN}✅ 后端服务已停止${NC}"
    else
        echo -e "${YELLOW}⚠️  后端服务进程不存在${NC}"
    fi
    rm -f logs/backend.pid
else
    echo -e "${YELLOW}⚠️  未找到后端服务PID文件${NC}"
fi

# 停止Docker服务
echo -e "${BLUE}🐳 停止基础设施服务...${NC}"
if docker-compose ps | grep -q "Up"; then
    docker-compose down
    echo -e "${GREEN}✅ 基础设施服务已停止${NC}"
else
    echo -e "${YELLOW}⚠️  基础设施服务未运行${NC}"
fi

# 清理进程
echo -e "${BLUE}🧹 清理残留进程...${NC}"

# 查找并停止可能的残留进程
pkill -f "python.*app.py" 2>/dev/null || true
pkill -f "npm.*run.*dev" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

echo -e "${GREEN}✅ 进程清理完成${NC}"

# 显示停止完成信息
echo ""
echo -e "${GREEN}🎉 所有服务已成功停止！${NC}"
echo ""
echo -e "${PURPLE}📊 当前状态:${NC}"
echo "  🌐 前端服务: 已停止"
echo "  ⚡ 后端服务: 已停止"
echo "  🐳 Docker服务: 已停止"
echo ""
echo -e "${PURPLE}🎯 下次启动:${NC}"
echo "  🚀 启动服务: ./start.sh"
echo "  📊 查看状态: ./status.sh"
echo ""
echo -e "${CYAN}👋 再见！${NC}"