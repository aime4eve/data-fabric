#!/bin/bash

# 企业知识库管理系统 - 统一开发环境启动脚本
# 整合了环境设置、依赖安装、基础设施启动、前后端服务启动等功能

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

# 显示启动横幅
echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                   企业知识库管理系统                         ║"
echo "║                   统一开发环境启动脚本 v2.0                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 创建日志目录
mkdir -p logs

# 检查必要的命令
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ 错误: $1 命令未找到，请先安装${NC}"
        exit 1
    fi
}

# 检查系统要求
check_system_requirements() {
    echo -e "${BLUE}🔍 检查系统要求...${NC}"
    
    # 检查Python版本
    if command_exists python3; then
        PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
        echo -e "${GREEN}✅ Python 3 已安装: $PYTHON_VERSION${NC}"
    else
        echo -e "${RED}❌ Python 3 未安装，请先安装Python 3.11+${NC}"
        exit 1
    fi
    
    # 检查Node.js版本
    if command_exists node; then
        NODE_VERSION=$(node --version)
        echo -e "${GREEN}✅ Node.js 已安装: $NODE_VERSION${NC}"
    else
        echo -e "${RED}❌ Node.js 未安装，请先安装Node.js 18+${NC}"
        exit 1
    fi
    
    # 检查Docker
    if command_exists docker; then
        DOCKER_VERSION=$(docker --version)
        echo -e "${GREEN}✅ Docker 已安装: $DOCKER_VERSION${NC}"
    else
        echo -e "${YELLOW}⚠️  Docker 未安装，将跳过容器服务启动${NC}"
    fi
    
    # 检查Docker Compose
    if command_exists docker-compose; then
        COMPOSE_VERSION=$(docker-compose --version)
        echo -e "${GREEN}✅ Docker Compose 已安装: $COMPOSE_VERSION${NC}"
    else
        echo -e "${YELLOW}⚠️  Docker Compose 未安装，将跳过容器服务启动${NC}"
    fi
    
    echo -e "${GREEN}✅ 系统要求检查完成${NC}"
}

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 检查是否是首次运行
is_first_run() {
    if [ ! -f "logs/.first_run_complete" ]; then
        return 0  # 首次运行
    else
        return 1  # 非首次运行
    fi
}

# 标记首次运行完成
mark_first_run_complete() {
    touch "logs/.first_run_complete"
    echo -e "${GREEN}✅ 首次运行设置完成${NC}"
}

# 检查端口占用
check_port() {
    local port=$1
    local service=$2
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  端口 $port 已被占用 ($service)${NC}"
        echo "请先停止占用端口的服务"
        return 1
    fi
    return 0
}

# 设置Python虚拟环境
setup_python_env() {
    echo -e "${BLUE}🐍 设置Python虚拟环境...${NC}"
    
    if [ ! -d "venv" ]; then
        echo -e "${YELLOW}📦 创建Python虚拟环境...${NC}"
        python3 -m venv venv
        echo -e "${GREEN}✅ 虚拟环境创建完成${NC}"
    else
        echo -e "${YELLOW}📦 虚拟环境已存在，跳过创建${NC}"
    fi
    
    # 激活虚拟环境
    source venv/bin/activate
    
    # 安装Python依赖
    echo -e "${YELLOW}📦 安装Python依赖...${NC}"
    cd src/backend
    
    if command -v poetry &> /dev/null; then
        poetry install
    else
        pip install -r requirements.txt 2>/dev/null || echo "requirements.txt not found, skipping pip install"
    fi
    
    cd ../..
    deactivate
    echo -e "${GREEN}✅ Python依赖安装完成${NC}"
}

# 设置前端环境
setup_frontend_env() {
    echo -e "${BLUE}🌐 设置前端环境...${NC}"
    
    cd src/frontend
    
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}📦 安装前端依赖...${NC}"
        npm install
        echo -e "${GREEN}✅ 前端依赖安装完成${NC}"
    else
        echo -e "${YELLOW}📦 前端依赖已存在，跳过安装${NC}"
    fi
    
    cd ../..
}

# 创建配置文件
setup_config_files() {
    echo -e "${BLUE}📝 创建配置文件...${NC}"
    
    # 创建后端环境变量文件
    if [ ! -f "src/backend/.env" ]; then
        echo -e "${YELLOW}📝 创建后端环境变量文件...${NC}"
        cat > src/backend/.env << EOF
# Flask配置
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

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# JWT配置
JWT_SECRET_KEY=your-secret-key-change-this-in-production
JWT_ACCESS_TOKEN_EXPIRES=3600

# 日志配置
LOG_LEVEL=INFO
LOG_FILE=logs/app.log
EOF
        echo -e "${GREEN}✅ 后端环境变量文件创建完成${NC}"
    else
        echo -e "${YELLOW}📝 后端环境变量文件已存在，跳过创建${NC}"
    fi
    
    # 创建前端环境变量文件
    if [ ! -f "src/frontend/.env" ]; then
        echo -e "${YELLOW}📝 创建前端环境变量文件...${NC}"
        cat > src/frontend/.env << EOF
# API配置
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
        echo -e "${GREEN}✅ 前端环境变量文件创建完成${NC}"
    else
        echo -e "${YELLOW}📝 前端环境变量文件已存在，跳过创建${NC}"
    fi
}

# 初始化数据库
init_database() {
    echo -e "${BLUE}🗄️ 初始化数据库...${NC}"
    
    cd src/backend
    
    if [ ! -f "knowledge_base.db" ]; then
        echo -e "${YELLOW}🗄️ 创建数据库...${NC}"
        source ../../venv/bin/activate
        python init_db.py
        deactivate
        echo -e "${GREEN}✅ 数据库初始化完成${NC}"
    else
        echo -e "${YELLOW}🗄️ 数据库已存在，跳过初始化${NC}"
    fi
    
    cd ../..
}

# 启动基础设施服务
start_infrastructure() {
    echo -e "${BLUE}🐳 启动基础设施服务...${NC}"
    
    if ! docker-compose up -d; then
        echo -e "${RED}❌ Docker服务启动失败${NC}"
        exit 1
    fi
    
    # 等待Docker服务启动
    echo -e "${BLUE}⏳ 等待基础设施服务启动...${NC}"
    sleep 15
    
    # 检查Docker服务状态
    echo -e "${BLUE}🔍 检查基础设施服务状态...${NC}"
    if ! docker-compose ps | grep -q "Up"; then
        echo -e "${RED}❌ 基础设施服务启动失败${NC}"
        docker-compose ps
        exit 1
    fi
    echo -e "${GREEN}✅ 基础设施服务启动成功${NC}"
}

# 启动后端服务
start_backend() {
    echo -e "${BLUE}⚡ 启动后端API服务...${NC}"
    
    cd src/backend
    
    # 激活虚拟环境
    source ../../venv/bin/activate
    
    # 启动后端服务
    echo -e "${GREEN}🚀 启动后端API服务...${NC}"
    nohup python app.py > ../../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../../logs/backend.pid
    echo -e "${GREEN}✅ 后端服务已启动 (PID: $BACKEND_PID, 端口: 5000)${NC}"
    
    cd ../..
}

# 启动前端服务
start_frontend() {
    echo -e "${BLUE}🌐 启动前端开发服务...${NC}"
    
    cd src/frontend
    
    # 启动前端服务
    echo -e "${GREEN}🚀 启动前端开发服务...${NC}"
    nohup npm run dev > ../../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../../logs/frontend.pid
    echo -e "${GREEN}✅ 前端服务已启动 (PID: $FRONTEND_PID, 端口: 3000)${NC}"
    
    cd ../..
}

# 健康检查
health_check() {
    echo -e "${BLUE}🔍 执行健康检查...${NC}"
    
    # 等待服务完全启动
    echo -e "${BLUE}⏳ 等待服务完全启动...${NC}"
    sleep 10
    
    # 检查后端健康状态
    if curl -s http://localhost:5000/health > /dev/null 2>&1; then
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
}

# 显示状态信息
show_status() {
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
    echo -e "${PURPLE}🗄️ 数据库连接:${NC}"
    echo "  🔗 NebulaGraph: localhost:9669"
    echo "  🔴 Redis: localhost:6379"
    echo ""
    echo -e "${PURPLE}📊 日志查看:${NC}"
    echo "  📄 后端日志: tail -f logs/backend.log"
    echo "  📄 前端日志: tail -f logs/frontend.log"
    echo "  📄 Docker日志: docker-compose logs -f"
    echo ""
    echo -e "${PURPLE}🎯 管理命令:${NC}"
    echo "  🛑 停止服务: ./scripts/dev/stop_dev.sh"
    echo "  🔄 重启服务: ./scripts/dev/restart_dev.sh"
    echo "  📊 查看状态: ./scripts/dev/status_dev.sh"
    echo ""
    echo -e "${CYAN}🚀 系统已就绪，开始使用吧！${NC}"
}

# 检查是否有服务在运行
check_existing_services() {
    echo -e "${BLUE}🔍 检查现有服务状态...${NC}"
    
    EXISTING_SERVICES=0
    
    # 检查前端服务
    if [ -f "logs/frontend.pid" ]; then
        FRONTEND_PID=$(cat logs/frontend.pid)
        if ps -p $FRONTEND_PID > /dev/null 2>&1; then
            echo -e "${YELLOW}⚠️  前端服务已在运行 (PID: $FRONTEND_PID)，请先停止服务${NC}"
            EXISTING_SERVICES=$((EXISTING_SERVICES + 1))
        else
            echo -e "${YELLOW}⚠️  前端服务PID文件存在但进程未运行，清理PID文件${NC}"
            rm -f logs/frontend.pid
        fi
    fi
    
    # 检查后端服务
    if [ -f "logs/backend.pid" ]; then
        BACKEND_PID=$(cat logs/backend.pid)
        if ps -p $BACKEND_PID > /dev/null 2>&1; then
            echo -e "${YELLOW}⚠️  后端服务已在运行 (PID: $BACKEND_PID)，请先停止服务${NC}"
            EXISTING_SERVICES=$((EXISTING_SERVICES + 1))
        else
            echo -e "${YELLOW}⚠️  后端服务PID文件存在但进程未运行，清理PID文件${NC}"
            rm -f logs/backend.pid
        fi
    fi
    
    # 检查基础设施服务
    if command -v docker-compose > /dev/null 2>&1 && [ -f "docker-compose.yml" ]; then
        if docker-compose ps | grep -q "Up"; then
            echo -e "${YELLOW}⚠️  基础设施服务已在运行，请先停止服务${NC}"
            EXISTING_SERVICES=$((EXISTING_SERVICES + 1))
        fi
    fi
    
    if [ $EXISTING_SERVICES -gt 0 ]; then
        echo -e "${RED}❌ 检测到 $EXISTING_SERVICES 个服务正在运行，请先运行 ./scripts/dev/stop_dev.sh 停止服务${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ 无现有服务运行，可以启动新服务${NC}"
}

# 主启动流程
main() {
    echo -e "${BLUE}🔍 检查系统环境...${NC}"
    check_command "docker"
    check_command "docker-compose"
    check_command "node"
    check_command "npm"
    check_command "python3"
    
    # 检查系统要求
    check_system_requirements
    
    echo -e "${BLUE}🔍 检查端口占用...${NC}"
    check_port 3000 "前端服务" || exit 1
    check_port 5000 "后端API" || exit 1
    
    # 检查是否有服务在运行
    check_existing_services
    
    # 检查是否是首次运行
    if is_first_run; then
        echo -e "${CYAN}🎯 检测到首次运行，执行完整环境设置...${NC}"
        
        # 环境设置
        setup_python_env
        setup_frontend_env
        setup_config_files
        init_database
        
        # 标记首次运行完成
        mark_first_run_complete
        
        echo -e "${GREEN}✅ 首次运行环境设置完成${NC}"
    else
        echo -e "${CYAN}🔄 非首次运行，跳过环境设置...${NC}"
        
        # 快速检查环境状态
        echo -e "${BLUE}🔍 快速检查环境状态...${NC}"
        
        # 检查Python虚拟环境
        if [ ! -d "venv" ]; then
            echo -e "${YELLOW}⚠️  虚拟环境不存在，重新创建...${NC}"
            setup_python_env
        fi
        
        # 检查前端依赖
        if [ ! -d "src/frontend/node_modules" ]; then
            echo -e "${YELLOW}⚠️  前端依赖不存在，重新安装...${NC}"
            setup_frontend_env
        fi
        
        # 检查配置文件
        if [ ! -f "src/backend/.env" ] || [ ! -f "src/frontend/.env" ]; then
            echo -e "${YELLOW}⚠️  配置文件不存在，重新创建...${NC}"
            setup_config_files
        fi
    fi
    
    # 启动服务
    start_infrastructure
    start_backend
    start_frontend
    
    # 健康检查和状态显示
    health_check
    show_status
}

# 运行主函数
main "$@"