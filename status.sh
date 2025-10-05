#!/bin/bash

# 企业知识库管理系统 - 状态检查脚本
# 查看所有服务运行状态

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

# 显示状态横幅
echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                   企业知识库管理系统                         ║"
echo "║                   服务状态检查 v1.0                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 检查服务状态函数
check_service_status() {
    local service_name=$1
    local pid_file=$2
    local port=$3
    local url=$4
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            if [ -n "$url" ] && curl -s "$url" > /dev/null 2>&1; then
                echo -e "  ${GREEN}✅ $service_name: 运行中 (PID: $pid, 端口: $port)${NC}"
                return 0
            else
                echo -e "  ${YELLOW}⚠️  $service_name: 进程存在但服务不可用 (PID: $pid, 端口: $port)${NC}"
                return 1
            fi
        else
            echo -e "  ${RED}❌ $service_name: 进程不存在 (端口: $port)${NC}"
            return 1
        fi
    else
        echo -e "  ${RED}❌ $service_name: PID文件不存在 (端口: $port)${NC}"
        return 1
    fi
}

# 检查端口占用
check_port_usage() {
    local port=$1
    local service_name=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        local pid=$(lsof -Pi :$port -sTCP:LISTEN -t)
        echo -e "  ${GREEN}🔌 端口 $port ($service_name): 被进程 $pid 占用${NC}"
        return 0
    else
        echo -e "  ${RED}🔌 端口 $port ($service_name): 未被占用${NC}"
        return 1
    fi
}

echo -e "${BLUE}📊 检查应用服务状态...${NC}"

# 检查前端服务
check_service_status "前端服务" "logs/frontend.pid" "3000" "http://localhost:3000"
FRONTEND_STATUS=$?

# 检查后端服务
check_service_status "后端API服务" "logs/backend.pid" "8000" "http://localhost:8000/health"
BACKEND_STATUS=$?

echo ""
echo -e "${BLUE}🐳 检查基础设施服务状态...${NC}"

# 检查Docker服务
if command -v docker-compose &> /dev/null; then
    if docker-compose ps | grep -q "Up"; then
        echo -e "${GREEN}✅ Docker基础设施服务:${NC}"
        docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" | sed 's/^/  /'
        DOCKER_STATUS=0
    else
        echo -e "${RED}❌ Docker基础设施服务: 未运行${NC}"
        DOCKER_STATUS=1
    fi
else
    echo -e "${RED}❌ Docker Compose: 未安装${NC}"
    DOCKER_STATUS=1
fi

echo ""
echo -e "${BLUE}🔌 检查端口占用情况...${NC}"

# 检查关键端口
check_port_usage "3000" "前端服务"
check_port_usage "8000" "后端API"
check_port_usage "5000" "后端API备用"
check_port_usage "9669" "NebulaGraph"
check_port_usage "6379" "Redis"

echo ""
echo -e "${BLUE}🌐 检查服务连通性...${NC}"

# 健康检查
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "  ${GREEN}✅ 后端API健康检查: 通过${NC}"
    BACKEND_HEALTH=0
else
    echo -e "  ${RED}❌ 后端API健康检查: 失败${NC}"
    BACKEND_HEALTH=1
fi

if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "  ${GREEN}✅ 前端服务连通性: 正常${NC}"
    FRONTEND_HEALTH=0
else
    echo -e "  ${RED}❌ 前端服务连通性: 异常${NC}"
    FRONTEND_HEALTH=1
fi

# 总体状态评估
echo ""
echo -e "${CYAN}📋 系统状态总览:${NC}"
echo "┌─────────────────────────────────────────────────────────────┐"

if [ $FRONTEND_STATUS -eq 0 ] && [ $BACKEND_STATUS -eq 0 ] && [ $DOCKER_STATUS -eq 0 ]; then
    echo -e "│  ${GREEN}🎉 系统状态: 全部服务正常运行${NC}                        │"
    OVERALL_STATUS="healthy"
elif [ $FRONTEND_STATUS -eq 0 ] || [ $BACKEND_STATUS -eq 0 ]; then
    echo -e "│  ${YELLOW}⚠️  系统状态: 部分服务运行异常${NC}                        │"
    OVERALL_STATUS="partial"
else
    echo -e "│  ${RED}❌ 系统状态: 服务未启动或异常${NC}                        │"
    OVERALL_STATUS="down"
fi

echo "│                                                             │"
echo "│  服务详情:                                                  │"
echo "│  - 前端服务: $([ $FRONTEND_STATUS -eq 0 ] && echo -e "${GREEN}正常${NC}" || echo -e "${RED}异常${NC}")                                          │"
echo "│  - 后端服务: $([ $BACKEND_STATUS -eq 0 ] && echo -e "${GREEN}正常${NC}" || echo -e "${RED}异常${NC}")                                          │"
echo "│  - 基础设施: $([ $DOCKER_STATUS -eq 0 ] && echo -e "${GREEN}正常${NC}" || echo -e "${RED}异常${NC}")                                          │"
echo "└─────────────────────────────────────────────────────────────┘"

echo ""
echo -e "${PURPLE}🌐 访问地址:${NC}"
echo "  📱 前端应用: http://localhost:3000"
echo "  🔌 后端API: http://localhost:8000"
echo "  📚 API文档: http://localhost:8000/docs"
echo "  ❤️  健康检查: http://localhost:8000/health"

echo ""
echo -e "${PURPLE}🎯 管理命令:${NC}"
if [ "$OVERALL_STATUS" = "healthy" ]; then
    echo "  🛑 停止服务: ./stop.sh"
    echo "  🔄 重启服务: ./restart.sh"
elif [ "$OVERALL_STATUS" = "partial" ]; then
    echo "  🔄 重启服务: ./restart.sh"
    echo "  🛑 停止服务: ./stop.sh"
    echo "  🚀 启动服务: ./start.sh"
else
    echo "  🚀 启动服务: ./start.sh"
fi

echo "  📄 查看日志: tail -f logs/*.log"

echo ""
if [ "$OVERALL_STATUS" = "healthy" ]; then
    echo -e "${GREEN}🚀 系统运行正常，可以开始使用！${NC}"
elif [ "$OVERALL_STATUS" = "partial" ]; then
    echo -e "${YELLOW}⚠️  系统部分异常，建议重启服务${NC}"
else
    echo -e "${RED}❌ 系统未启动，请运行 ./start.sh 启动服务${NC}"
fi