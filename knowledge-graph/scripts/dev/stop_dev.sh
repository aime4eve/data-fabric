#!/bin/bash

# 企业知识库管理系统 - 开发环境停止脚本

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

# 显示停止横幅
echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                   企业知识库管理系统                         ║"
echo "║                   开发环境停止脚本                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 停止前端服务
stop_frontend() {
    echo -e "${BLUE}🛑 停止前端服务...${NC}"
    
    # 首先检查端口是否被占用（可能PID文件不准确）
    PORT_PID=$(lsof -Pi :3000 -sTCP:LISTEN -t 2>/dev/null | head -1)
    
    if [ -f "logs/frontend.pid" ]; then
        FRONTEND_PID=$(cat logs/frontend.pid)
        if ps -p $FRONTEND_PID > /dev/null 2>&1; then
            echo -e "${YELLOW}🛑 停止前端服务 (PID: $FRONTEND_PID)...${NC}"
            kill $FRONTEND_PID
            sleep 2
            if ps -p $FRONTEND_PID > /dev/null 2>&1; then
                echo -e "${RED}❌ 前端服务未正常停止，强制终止...${NC}"
                kill -9 $FRONTEND_PID
            fi
            echo -e "${GREEN}✅ 前端服务已停止${NC}"
        else
            echo -e "${YELLOW}⚠️  前端服务PID文件存在但进程未运行${NC}"
            # 如果端口被占用但PID文件不匹配，清理端口进程
            if [ -n "$PORT_PID" ] && [ "$PORT_PID" != "$FRONTEND_PID" ]; then
                echo -e "${YELLOW}⚠️  检测到端口3000被其他进程占用 (PID: $PORT_PID)，清理中...${NC}"
                kill -9 $PORT_PID 2>/dev/null || true
            fi
        fi
        rm -f logs/frontend.pid
    else
        echo -e "${YELLOW}⚠️  前端服务PID文件不存在${NC}"
        # 如果端口被占用，清理端口进程
        if [ -n "$PORT_PID" ]; then
            echo -e "${YELLOW}⚠️  检测到端口3000被占用 (PID: $PORT_PID)，清理中...${NC}"
            kill -9 $PORT_PID 2>/dev/null || true
        fi
    fi
    
    # 最终检查端口是否被占用
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${RED}❌ 端口3000仍被占用，尝试强制清理所有相关进程...${NC}"
        lsof -ti:3000 | xargs kill -9 2>/dev/null || true
        sleep 1
        if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo -e "${RED}❌ 无法释放端口3000，请手动检查${NC}"
        else
            echo -e "${GREEN}✅ 端口3000已释放${NC}"
        fi
    else
        echo -e "${GREEN}✅ 端口3000已释放${NC}"
    fi
}

# 停止后端服务
stop_backend() {
    echo -e "${BLUE}🛑 停止后端服务...${NC}"
    
    # 首先检查端口是否被占用（可能PID文件不准确）
    PORT_PID=$(lsof -Pi :5000 -sTCP:LISTEN -t 2>/dev/null | head -1)
    
    if [ -f "logs/backend.pid" ]; then
        BACKEND_PID=$(cat logs/backend.pid)
        if ps -p $BACKEND_PID > /dev/null 2>&1; then
            echo -e "${YELLOW}🛑 停止后端服务 (PID: $BACKEND_PID)...${NC}"
            kill $BACKEND_PID
            sleep 2
            if ps -p $BACKEND_PID > /dev/null 2>&1; then
                echo -e "${RED}❌ 后端服务未正常停止，强制终止...${NC}"
                kill -9 $BACKEND_PID
            fi
            echo -e "${GREEN}✅ 后端服务已停止${NC}"
        else
            echo -e "${YELLOW}⚠️  后端服务PID文件存在但进程未运行${NC}"
            # 如果端口被占用但PID文件不匹配，清理端口进程
            if [ -n "$PORT_PID" ] && [ "$PORT_PID" != "$BACKEND_PID" ]; then
                echo -e "${YELLOW}⚠️  检测到端口5000被其他进程占用 (PID: $PORT_PID)，清理中...${NC}"
                kill -9 $PORT_PID 2>/dev/null || true
            fi
        fi
        rm -f logs/backend.pid
    else
        echo -e "${YELLOW}⚠️  后端服务PID文件不存在${NC}"
        # 如果端口被占用，清理端口进程
        if [ -n "$PORT_PID" ]; then
            echo -e "${YELLOW}⚠️  检测到端口5000被占用 (PID: $PORT_PID)，清理中...${NC}"
            kill -9 $PORT_PID 2>/dev/null || true
        fi
    fi
    
    # 最终检查端口是否被占用
    if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${RED}❌ 端口5000仍被占用，尝试强制清理所有相关进程...${NC}"
        lsof -ti:5000 | xargs kill -9 2>/dev/null || true
        sleep 1
        if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo -e "${RED}❌ 无法释放端口5000，请手动检查${NC}"
        else
            echo -e "${GREEN}✅ 端口5000已释放${NC}"
        fi
    else
        echo -e "${GREEN}✅ 端口5000已释放${NC}"
    fi
}

# 停止基础设施服务
stop_infrastructure() {
    echo -e "${BLUE}🐳 停止基础设施服务...${NC}"
    
    if command -v docker-compose > /dev/null 2>&1; then
        if [ -f "docker-compose.yml" ]; then
            echo -e "${YELLOW}🛑 停止Docker服务...${NC}"
            docker-compose down
            echo -e "${GREEN}✅ 基础设施服务已停止${NC}"
            
            # 清理可能残留的容器（处理容器名称冲突问题）
            echo -e "${YELLOW}🧹 清理残留容器...${NC}"
            if docker ps -a | grep -q "knowledge-base-"; then
                docker ps -a --format "table {{.Names}}" | grep "knowledge-base-" | while read container_name; do
                    if [ -n "$container_name" ]; then
                        echo -e "${YELLOW}🗑️  删除残留容器: $container_name${NC}"
                        docker rm -f "$container_name" 2>/dev/null || true
                    fi
                done
                echo -e "${GREEN}✅ 残留容器清理完成${NC}"
            else
                echo -e "${GREEN}✅ 无残留容器${NC}"
            fi
        else
            echo -e "${YELLOW}⚠️  docker-compose.yml文件不存在${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  docker-compose命令未找到${NC}"
    fi
}

# 清理临时文件
cleanup_temp_files() {
    echo -e "${BLUE}🧹 清理临时文件...${NC}"
    
    # 清理日志文件
    if [ -d "logs" ]; then
        echo -e "${YELLOW}🗑️  清理日志文件...${NC}"
        rm -f logs/*.pid
        echo -e "${GREEN}✅ 临时文件清理完成${NC}"
    else
        echo -e "${YELLOW}⚠️  日志目录不存在${NC}"
    fi
}

# 显示停止状态
show_stop_status() {
    echo ""
    echo -e "${GREEN}🎉 企业知识库管理系统已完全停止！${NC}"
    echo ""
    echo -e "${CYAN}📋 服务状态:${NC}"
    echo "┌─────────────────────────────────────────────────────────────┐"
    echo "│  🚀 应用服务状态                                            │"
    
    # 检查前端服务
    if [ -f "logs/frontend.pid" ]; then
        FRONTEND_PID=$(cat logs/frontend.pid)
        if ps -p $FRONTEND_PID > /dev/null 2>&1; then
            echo "│  ❌ 前端服务: 仍在运行 (PID: $FRONTEND_PID)                 │"
        else
            echo "│  ✅ 前端服务: 已停止                                    │"
        fi
    else
        echo "│  ✅ 前端服务: 已停止                                    │"
    fi
    
    # 检查后端服务
    if [ -f "logs/backend.pid" ]; then
        BACKEND_PID=$(cat logs/backend.pid)
        if ps -p $BACKEND_PID > /dev/null 2>&1; then
            echo "│  ❌ 后端服务: 仍在运行 (PID: $BACKEND_PID)                 │"
        else
            echo "│  ✅ 后端服务: 已停止                                    │"
        fi
    else
        echo "│  ✅ 后端服务: 已停止                                    │"
    fi
    
    # 检查Docker服务
    if command -v docker-compose > /dev/null 2>&1 && [ -f "docker-compose.yml" ]; then
        if docker-compose ps | grep -q "Up"; then
            echo "│  ❌ 基础设施: 仍在运行                                  │"
        else
            echo "│  ✅ 基础设施: 已停止                                    │"
        fi
    else
        echo "│  ✅ 基础设施: 已停止                                    │"
    fi
    
    echo "└─────────────────────────────────────────────────────────────┘"
    echo ""
    echo -e "${PURPLE}🎯 下次启动命令:${NC}"
    echo "  🚀 启动服务: ./scripts/dev/start_dev.sh"
    echo ""
    echo -e "${CYAN}👋 再见！${NC}"
}

# 主停止流程
main() {
    echo -e "${BLUE}🔍 检查运行状态...${NC}"
    
    # 停止服务
    stop_frontend
    stop_backend
    stop_infrastructure
    cleanup_temp_files
    
    # 显示停止状态
    show_stop_status
}

# 运行主函数
main "$@"