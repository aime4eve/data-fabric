#!/bin/bash

# 企业知识库管理系统 - 开发环境状态查看脚本

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

# 显示状态横幅
echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                   企业知识库管理系统                         ║"
echo "║                   开发环境状态查看脚本                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 检查前端服务状态
check_frontend_status() {
    echo -e "${BLUE}🌐 检查前端服务状态...${NC}"
    
    if [ -f "logs/frontend.pid" ]; then
        FRONTEND_PID=$(cat logs/frontend.pid)
        if ps -p $FRONTEND_PID > /dev/null 2>&1; then
            echo -e "${GREEN}✅ 前端服务: 运行中 (PID: $FRONTEND_PID)${NC}"
            
            # 检查端口连接
            if curl -s http://localhost:3000 > /dev/null 2>&1; then
                echo -e "${GREEN}   📍 端口 3000: 可访问${NC}"
            else
                echo -e "${YELLOW}   ⚠️  端口 3000: 不可访问${NC}"
            fi
            
            # 检查进程资源使用
            if command -v ps > /dev/null 2>&1; then
                CPU_USAGE=$(ps -p $FRONTEND_PID -o %cpu --no-headers 2>/dev/null || echo "N/A")
                MEM_USAGE=$(ps -p $FRONTEND_PID -o %mem --no-headers 2>/dev/null || echo "N/A")
                echo -e "${BLUE}   📊 资源使用: CPU ${CPU_USAGE}%, 内存 ${MEM_USAGE}%${NC}"
            fi
            
            return 0
        else
            echo -e "${RED}❌ 前端服务: 进程不存在 (PID文件: $FRONTEND_PID)${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️  前端服务: 未启动 (PID文件不存在)${NC}"
        return 2
    fi
}

# 检查后端服务状态
check_backend_status() {
    echo -e "${BLUE}⚡ 检查后端服务状态...${NC}"
    
    if [ -f "logs/backend.pid" ]; then
        BACKEND_PID=$(cat logs/backend.pid)
        if ps -p $BACKEND_PID > /dev/null 2>&1; then
            echo -e "${GREEN}✅ 后端服务: 运行中 (PID: $BACKEND_PID)${NC}"
            
            # 检查端口连接
            if curl -s http://localhost:5000/health > /dev/null 2>&1; then
                echo -e "${GREEN}   📍 端口 5000: 健康检查通过${NC}"
            else
                echo -e "${YELLOW}   ⚠️  端口 5000: 健康检查失败${NC}"
            fi
            
            # 检查API文档
            if curl -s http://localhost:5000/docs > /dev/null 2>&1; then
                echo -e "${GREEN}   📚 API文档: 可访问${NC}"
            else
                echo -e "${YELLOW}   ⚠️  API文档: 不可访问${NC}"
            fi
            
            # 检查进程资源使用
            if command -v ps > /dev/null 2>&1; then
                CPU_USAGE=$(ps -p $BACKEND_PID -o %cpu --no-headers 2>/dev/null || echo "N/A")
                MEM_USAGE=$(ps -p $BACKEND_PID -o %mem --no-headers 2>/dev/null || echo "N/A")
                echo -e "${BLUE}   📊 资源使用: CPU ${CPU_USAGE}%, 内存 ${MEM_USAGE}%${NC}"
            fi
            
            return 0
        else
            echo -e "${RED}❌ 后端服务: 进程不存在 (PID文件: $BACKEND_PID)${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️  后端服务: 未启动 (PID文件不存在)${NC}"
        return 2
    fi
}

# 检查基础设施服务状态
check_infrastructure_status() {
    echo -e "${BLUE}🐳 检查基础设施服务状态...${NC}"
    
    if command -v docker-compose > /dev/null 2>&1 && [ -f "docker-compose.yml" ]; then
        echo -e "${BLUE}🔍 检查Docker服务状态...${NC}"
        
        if docker-compose ps | grep -q "Up"; then
            echo -e "${GREEN}✅ 基础设施服务: 运行中${NC}"
            
            # 显示各个服务状态
            echo -e "${BLUE}   📋 服务详情:${NC}"
            docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" | sed 's/^/     /'
            
            # 检查NebulaGraph连接
            if command -v nc > /dev/null 2>&1; then
                if nc -z localhost 9669 2>/dev/null; then
                    echo -e "${GREEN}   🔗 NebulaGraph: 端口 9669 可连接${NC}"
                else
                    echo -e "${YELLOW}   ⚠️  NebulaGraph: 端口 9669 不可连接${NC}"
                fi
            fi
            
            # 检查Redis连接
            if command -v nc > /dev/null 2>&1; then
                if nc -z localhost 6379 2>/dev/null; then
                    echo -e "${GREEN}   🔴 Redis: 端口 6379 可连接${NC}"
                else
                    echo -e "${YELLOW}   ⚠️  Redis: 端口 6379 不可连接${NC}"
                fi
            fi
            
            return 0
        else
            echo -e "${RED}❌ 基础设施服务: 未运行${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️  基础设施服务: 配置不可用${NC}"
        return 2
    fi
}

# 检查系统资源
check_system_resources() {
    echo -e "${BLUE}💻 检查系统资源...${NC}"
    
    if command -v free > /dev/null 2>&1; then
        MEM_INFO=$(free -h | grep Mem: | awk '{print "总内存: " $2 ", 已用: " $3 ", 可用: " $4}')
        echo -e "${BLUE}   💾 内存: $MEM_INFO${NC}"
    fi
    
    if command -v df > /dev/null 2>&1; then
        DISK_INFO=$(df -h . | tail -1 | awk '{print "磁盘: " $3 "/" $2 " 已用 (" $5 ")"}')
        echo -e "${BLUE}   💽 磁盘: $DISK_INFO${NC}"
    fi
    
    if command -v uptime > /dev/null 2>&1; then
        LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}')
        echo -e "${BLUE}   📈 负载: $LOAD_AVG${NC}"
    fi
}

# 显示总体状态
show_overall_status() {
    echo ""
    echo -e "${CYAN}📊 总体状态摘要:${NC}"
    echo "┌─────────────────────────────────────────────────────────────┐"
    
    # 前端状态
    check_frontend_status
    FRONTEND_STATUS=$?
    
    # 后端状态
    check_backend_status
    BACKEND_STATUS=$?
    
    # 基础设施状态
    check_infrastructure_status
    INFRA_STATUS=$?
    
    echo "├─────────────────────────────────────────────────────────────┤"
    
    # 系统资源
    check_system_resources
    
    echo "├─────────────────────────────────────────────────────────────┤"
    
    # 访问信息
    echo -e "${PURPLE}🌐 访问地址:${NC}"
    echo "  📱 前端应用: http://localhost:3000"
    echo "  🔌 后端API: http://localhost:5000"
    echo "  📚 API文档: http://localhost:5000/docs"
    echo "  ❤️  健康检查: http://localhost:5000/health"
    
    echo "├─────────────────────────────────────────────────────────────┤"
    
    # 管理命令
    echo -e "${PURPLE}🎯 管理命令:${NC}"
    echo "  🚀 启动服务: ./scripts/dev/start_dev.sh"
    echo "  🛑 停止服务: ./scripts/dev/stop_dev.sh"
    echo "  🔄 重启服务: ./scripts/dev/restart_dev.sh"
    
    echo "├─────────────────────────────────────────────────────────────┤"
    
    # 日志查看
    echo -e "${PURPLE}📊 日志查看:${NC}"
    echo "  📄 后端日志: tail -f logs/backend.log"
    echo "  📄 前端日志: tail -f logs/frontend.log"
    echo "  📄 Docker日志: docker-compose logs -f"
    
    echo "└─────────────────────────────────────────────────────────────┘"
    
    # 总体健康状态
    if [ $FRONTEND_STATUS -eq 0 ] && [ $BACKEND_STATUS -eq 0 ] && [ $INFRA_STATUS -eq 0 ]; then
        echo ""
        echo -e "${GREEN}🎉 系统运行正常，所有服务健康！${NC}"
    else
        echo ""
        echo -e "${YELLOW}⚠️  系统存在异常，请检查相关服务${NC}"
    fi
}

# 主状态检查流程
main() {
    echo -e "${BLUE}🔍 检查系统状态...${NC}"
    
    show_overall_status
}

# 运行主函数
main "$@"