#!/bin/bash

# 企业知识库管理系统 - 开发环境重启脚本
# 通过调用stop_dev.sh和start_dev.sh实现重启功能，避免代码冗余

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
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

# 显示重启横幅
echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                   企业知识库管理系统                         ║"
echo "║                   开发环境重启脚本                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 检查是否有服务在运行
check_running_status() {
    echo -e "${BLUE}🔍 检查当前运行状态...${NC}"
    
    RUNNING_SERVICES=0
    
    # 检查前端服务
    if [ -f "logs/frontend.pid" ]; then
        FRONTEND_PID=$(cat logs/frontend.pid)
        if ps -p $FRONTEND_PID > /dev/null 2>&1; then
            echo -e "${GREEN}✅ 前端服务: 运行中${NC}"
            RUNNING_SERVICES=$((RUNNING_SERVICES + 1))
        else
            echo -e "${YELLOW}⚠️  前端服务: PID文件存在但进程未运行${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  前端服务: 未运行${NC}"
    fi
    
    # 检查后端服务
    if [ -f "logs/backend.pid" ]; then
        BACKEND_PID=$(cat logs/backend.pid)
        if ps -p $BACKEND_PID > /dev/null 2>&1; then
            echo -e "${GREEN}✅ 后端服务: 运行中${NC}"
            RUNNING_SERVICES=$((RUNNING_SERVICES + 1))
        else
            echo -e "${YELLOW}⚠️  后端服务: PID文件存在但进程未运行${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  后端服务: 未运行${NC}"
    fi
    
    # 检查基础设施服务
    if command -v docker-compose > /dev/null 2>&1 && [ -f "docker-compose.yml" ]; then
        if docker-compose ps | grep -q "Up"; then
            echo -e "${GREEN}✅ 基础设施服务: 运行中${NC}"
            RUNNING_SERVICES=$((RUNNING_SERVICES + 1))
        else
            echo -e "${YELLOW}⚠️  基础设施服务: 未运行${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  基础设施服务: 配置不可用${NC}"
    fi
    
    return $RUNNING_SERVICES
}

# 显示重启完成状态
show_restart_status() {
    echo ""
    echo -e "${GREEN}🎉 企业知识库管理系统重启完成！${NC}"
    echo ""
    echo -e "${CYAN}📋 服务状态:${NC}"
    echo "┌─────────────────────────────────────────────────────────────┐"
    echo "│  🐳 基础设施服务                                            │"
    if command -v docker-compose > /dev/null 2>&1 && [ -f "docker-compose.yml" ]; then
        docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" | sed 's/^/│  /'
    else
        echo "│  ❌ 基础设施服务: 配置不可用                                │"
    fi
    echo "│                                                             │"
    echo "│  🚀 应用服务                                                │"
    if [ -f "logs/backend.pid" ]; then
        echo "│  - 后端API: http://localhost:5000 (PID: $(cat logs/backend.pid))        │"
    fi
    if [ -f "logs/frontend.pid" ]; then
        echo "│  - 前端应用: http://localhost:3000 (PID: $(cat logs/frontend.pid))       │"
    fi
    echo "└─────────────────────────────────────────────────────────────┘"
    echo ""
    echo -e "${PURPLE}🌐 访问地址:${NC}"
    echo "  📱 前端应用: http://localhost:3000"
    echo "  🔌 后端API: http://localhost:5000"
    echo "  📚 API文档: http://localhost:5000/docs"
    echo "  ❤️  健康检查: http://localhost:5000/health"
    echo ""
    echo -e "${PURPLE}🎯 管理命令:${NC}"
    echo "  🛑 停止服务: ./scripts/dev/stop_dev.sh"
    echo "  📊 查看状态: ./scripts/dev/status_dev.sh"
    echo ""
    echo -e "${CYAN}🚀 系统已重新启动，开始使用吧！${NC}"
}

# 主重启流程
main() {
    echo -e "${BLUE}🔍 检查当前运行状态...${NC}"
    
    check_running_status
    RUNNING_COUNT=$?
    
    if [ $RUNNING_COUNT -eq 0 ]; then
        echo -e "${YELLOW}⚠️  没有服务在运行，直接启动新服务...${NC}"
    else
        echo -e "${BLUE}🔄 重启 $RUNNING_COUNT 个运行中的服务...${NC}"
        echo -e "${BLUE}🛑 调用停止脚本...${NC}"
        ./scripts/dev/stop_dev.sh
        
        # 等待服务完全停止
        echo -e "${BLUE}⏳ 等待服务完全停止...${NC}"
        sleep 5
    fi
    
    echo -e "${BLUE}🚀 调用启动脚本...${NC}"
    ./scripts/dev/start_dev.sh
}

# 运行主函数
main "$@"