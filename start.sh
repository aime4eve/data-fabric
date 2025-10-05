#!/bin/bash

# 企业知识库管理系统 - 一键启动脚本
# 快速启动前后端服务

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

# 创建日志目录
mkdir -p logs

# 显示启动横幅
echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                   企业知识库管理系统                         ║"
echo "║                   一键启动脚本 v1.0                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 检查必要的命令
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ 错误: $1 命令未找到，请先安装${NC}"
        exit 1
    fi
}

echo -e "${BLUE}🔍 检查系统环境...${NC}"
check_command "docker"
check_command "docker-compose"
check_command "node"
check_command "npm"
check_command "python3"

# 检查端口占用
check_port() {
    local port=$1
    local service=$2
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  端口 $port 已被占用 ($service)${NC}"
        echo "请先停止占用端口的服务或使用 ./stop.sh 停止现有服务"
        return 1
    fi
    return 0
}

echo -e "${BLUE}🔍 检查端口占用...${NC}"
check_port 3000 "前端服务" || exit 1
check_port 5000 "后端API" || exit 1
check_port 8000 "后端API备用" || exit 1

# 启动Docker服务
echo -e "${BLUE}🐳 启动基础设施服务...${NC}"
if ! docker-compose up -d; then
    echo -e "${RED}❌ Docker服务启动失败${NC}"
    exit 1
fi

# 等待Docker服务启动
echo -e "${BLUE}⏳ 等待基础设施服务启动...${NC}"
sleep 10

# 检查Docker服务状态
echo -e "${BLUE}🔍 检查基础设施服务状态...${NC}"
if ! docker-compose ps | grep -q "Up"; then
    echo -e "${RED}❌ 基础设施服务启动失败${NC}"
    docker-compose ps
    exit 1
fi
echo -e "${GREEN}✅ 基础设施服务启动成功${NC}"

# 启动后端服务
echo -e "${BLUE}⚡ 启动后端API服务...${NC}"
cd src/backend

# 检查Python虚拟环境
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}📦 创建Python虚拟环境...${NC}"
    python3 -m venv venv
fi

# 激活虚拟环境
source venv/bin/activate

# 安装依赖
if [ ! -f "venv/.deps_installed" ]; then
    echo -e "${YELLOW}📦 安装Python依赖...${NC}"
    if command -v poetry &> /dev/null; then
        poetry install
    else
        pip install -r requirements.txt 2>/dev/null || echo "requirements.txt not found, skipping pip install"
    fi
    touch venv/.deps_installed
fi

# 初始化数据库
if [ ! -f "knowledge_base.db" ]; then
    echo -e "${YELLOW}🗄️ 初始化数据库...${NC}"
    python init_db.py
fi

# 启动后端服务
echo -e "${GREEN}🚀 启动后端API服务...${NC}"
nohup python app.py > ../../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../../logs/backend.pid
echo -e "${GREEN}✅ 后端服务已启动 (PID: $BACKEND_PID, 端口: 8000)${NC}"

cd ../..

# 启动前端服务
echo -e "${BLUE}🌐 启动前端开发服务...${NC}"
cd src/frontend

# 安装依赖
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 安装前端依赖...${NC}"
    npm install
fi

# 启动前端服务
echo -e "${GREEN}🚀 启动前端开发服务...${NC}"
nohup npm run dev > ../../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > ../../logs/frontend.pid
echo -e "${GREEN}✅ 前端服务已启动 (PID: $FRONTEND_PID, 端口: 3000)${NC}"

cd ../..

# 等待服务完全启动
echo -e "${BLUE}⏳ 等待服务完全启动...${NC}"
sleep 8

# 健康检查
echo -e "${BLUE}🔍 执行健康检查...${NC}"

# 检查后端健康状态
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 后端API服务健康检查通过${NC}"
else
    echo -e "${YELLOW}⚠️  后端API服务健康检查失败，请检查日志${NC}"
fi

# 检查前端服务
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 前端服务健康检查通过${NC}"
else
    echo -e "${YELLOW}⚠️  前端服务可能还在启动中...${NC}"
fi

# 显示启动完成信息
echo ""
echo -e "${GREEN}🎉 企业知识库管理系统启动完成！${NC}"
echo ""
echo -e "${CYAN}📋 服务状态:${NC}"
echo "┌─────────────────────────────────────────────────────────────┐"
echo "│  🐳 基础设施服务                                            │"
docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" | sed 's/^/│  /'
echo "│                                                             │"
echo "│  🚀 应用服务                                                │"
if [ -f "logs/backend.pid" ]; then
    echo "│  - 后端API: http://localhost:8000 (PID: $(cat logs/backend.pid))        │"
fi
if [ -f "logs/frontend.pid" ]; then
    echo "│  - 前端应用: http://localhost:3000 (PID: $(cat logs/frontend.pid))       │"
fi
echo "└─────────────────────────────────────────────────────────────┘"
echo ""
echo -e "${PURPLE}🌐 访问地址:${NC}"
echo "  📱 前端应用: http://localhost:3000"
echo "  🔌 后端API: http://localhost:8000"
echo "  📚 API文档: http://localhost:8000/docs"
echo "  ❤️  健康检查: http://localhost:8000/health"
echo ""
echo -e "${PURPLE}🗄️ 数据库连接:${NC}"
echo "  🔗 NebulaGraph: localhost:9669"
echo "  🔴 Redis: localhost:6379"
echo ""
echo -e "${PURPLE}📊 日志查看:${NC}"
echo "  📄 后端日志: tail -f logs/backend.log"
echo "  📄 前端日志: tail -f logs/frontend.log"
echo "  📄 Docker日志: docker-compose logs -f"
echo ""
echo -e "${PURPLE}🎯 常用命令:${NC}"
echo "  🛑 停止服务: ./stop.sh"
echo "  🔄 重启服务: ./restart.sh"
echo "  📊 查看状态: ./status.sh"
echo ""
echo -e "${CYAN}🚀 系统已就绪，开始使用吧！${NC}"