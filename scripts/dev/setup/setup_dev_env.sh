#!/bin/bash

# 知识库应用开发环境搭建脚本
# Knowledge Base Application Development Environment Setup Script

set -e

echo "🚀 开始搭建知识库应用研发环境..."
echo "=================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的信息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 检查系统要求
check_requirements() {
    print_info "检查系统要求..."
    
    # 检查Python版本
    if command_exists python3; then
        PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
        print_success "Python 3 已安装: $PYTHON_VERSION"
    else
        print_error "Python 3 未安装，请先安装Python 3.11+"
        exit 1
    fi
    
    # 检查Node.js版本
    if command_exists node; then
        NODE_VERSION=$(node --version)
        print_success "Node.js 已安装: $NODE_VERSION"
    else
        print_error "Node.js 未安装，请先安装Node.js 18+"
        exit 1
    fi
    
    # 检查Docker
    if command_exists docker; then
        DOCKER_VERSION=$(docker --version)
        print_success "Docker 已安装: $DOCKER_VERSION"
    else
        print_warning "Docker 未安装，将跳过容器服务启动"
    fi
    
    # 检查Docker Compose
    if command_exists docker-compose; then
        COMPOSE_VERSION=$(docker-compose --version)
        print_success "Docker Compose 已安装: $COMPOSE_VERSION"
    else
        print_warning "Docker Compose 未安装，将跳过容器服务启动"
    fi
    
    print_success "系统要求检查完成"
}

# 创建虚拟环境
setup_python_env() {
    print_info "设置Python虚拟环境..."
    
    if [ ! -d "venv" ]; then
        print_info "创建Python虚拟环境..."
        python3 -m venv venv
        print_success "虚拟环境创建完成"
    else
        print_warning "虚拟环境已存在，跳过创建"
    fi
    
    print_info "激活虚拟环境..."
    source venv/bin/activate
    
    print_info "升级pip..."
    pip install --upgrade pip
    
    print_info "安装Python依赖..."
    if [ -f "src/backend/requirements.txt" ]; then
        pip install -r src/backend/requirements.txt
        print_success "Python依赖安装完成"
    else
        print_warning "requirements.txt 文件不存在，跳过Python依赖安装"
    fi
    
    deactivate
}

# 安装前端依赖
setup_node_env() {
    print_info "设置Node.js环境..."
    
    cd src/frontend
    
    if [ -f "package.json" ]; then
        print_info "安装前端依赖..."
        npm install
        print_success "前端依赖安装完成"
    else
        print_warning "package.json 文件不存在，跳过前端依赖安装"
    fi
    
    cd ../..
}

# 创建配置文件
setup_config_files() {
    print_info "创建配置文件..."
    
    # 创建后端环境变量文件
    if [ ! -f "src/backend/.env" ]; then
        print_info "创建后端环境变量文件..."
        cat > src/backend/.env << EOF
# Flask配置
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=your-secret-key-here

# 数据库配置
NEBULA_GRAPH_HOST=localhost
NEBULA_GRAPH_PORT=9669
NEBULA_GRAPH_USER=root
NEBULA_GRAPH_PASSWORD=nebula
NEBULA_GRAPH_SPACE=knowledge_base

# Redis配置
REDIS_URL=redis://localhost:6379/0

# API配置
API_TITLE=知识库API
API_VERSION=v1
API_DESCRIPTION=基于DDD的知识库管理系统API

# 日志配置
LOG_LEVEL=INFO
LOG_FILE=logs/app.log

# JWT配置
JWT_SECRET_KEY=your-jwt-secret-key
JWT_ACCESS_TOKEN_EXPIRES=3600
EOF
        print_success "后端环境变量文件创建完成"
    else
        print_warning "后端环境变量文件已存在，跳过创建"
    fi
    
    # 创建前端环境变量文件
    if [ ! -f "src/frontend/.env" ]; then
        print_info "创建前端环境变量文件..."
        cat > src/frontend/.env << EOF
# API配置
REACT_APP_API_URL=http://localhost:5000
REACT_APP_API_VERSION=v1

# 应用配置
REACT_APP_TITLE=知识库管理系统
REACT_APP_DESCRIPTION=基于DDD的现代知识库管理系统

# 环境配置
NODE_ENV=development
PORT=3000

# 功能开关
REACT_APP_ENABLE_ANALYTICS=false
REACT_APP_ENABLE_ERROR_REPORTING=false
EOF
        print_success "前端环境变量文件创建完成"
    else
        print_warning "前端环境变量文件已存在，跳过创建"
    fi
    
    # 创建日志目录
    if [ ! -d "logs" ]; then
        mkdir -p logs
        print_success "日志目录创建完成"
    fi
    
    # 创建数据目录
    if [ ! -d "data" ]; then
        mkdir -p data/{uploads,exports,backups}
        print_success "数据目录创建完成"
    fi
}

# 启动基础设施服务
start_infrastructure() {
    print_info "启动基础设施服务..."
    
    if command_exists docker-compose; then
        print_info "使用Docker Compose启动服务..."
        docker-compose up -d nebula-graph redis
        
        print_info "等待服务启动..."
        sleep 30
        
        # 检查服务状态
        if docker-compose ps | grep -q "Up"; then
            print_success "基础设施服务启动成功"
        else
            print_error "基础设施服务启动失败"
            exit 1
        fi
    else
        print_warning "Docker Compose 未安装，请手动启动NebulaGraph和Redis服务"
    fi
}

# 数据库初始化
setup_database() {
    print_info "初始化数据库..."
    
    if [ -f "scripts/dev/setup_database.py" ]; then
        print_info "运行数据库初始化脚本..."
        source venv/bin/activate
        python scripts/dev/setup_database.py
        deactivate
        print_success "数据库初始化完成"
    else
        print_warning "数据库初始化脚本不存在，跳过数据库初始化"
    fi
}

# 创建开发脚本
setup_dev_scripts() {
    print_info "创建开发脚本..."
    
    # 创建启动脚本
    cat > scripts/dev/start_dev.sh << 'EOF'
#!/bin/bash
# 开发环境启动脚本

echo "🚀 启动知识库应用开发环境..."

# 启动基础设施
docker-compose up -d nebula-graph redis

# 等待服务启动
sleep 10

# 启动后端服务
cd src/backend
source ../../venv/bin/activate
python main.py &
BACKEND_PID=$!
echo "后端服务PID: $BACKEND_PID"
cd ../..

# 启动前端服务
cd src/frontend
npm run dev &
FRONTEND_PID=$!
echo "前端服务PID: $FRONTEND_PID"
cd ../..

# 保存PID到文件
echo $BACKEND_PID > .backend.pid
echo $FRONTEND_PID > .frontend.pid

echo "✅ 开发环境启动完成！"
echo "📊 后端API: http://localhost:5000"
echo "🌐 前端应用: http://localhost:3000"
echo "📈 监控面板: http://localhost:3001"
echo ""
echo "使用 scripts/dev/stop_dev.sh 停止服务"
EOF

    # 创建停止脚本
    cat > scripts/dev/stop_dev.sh << 'EOF'
#!/bin/bash
# 开发环境停止脚本

echo "🛑 停止知识库应用开发环境..."

# 停止后端服务
if [ -f ".backend.pid" ]; then
    BACKEND_PID=$(cat .backend.pid)
    kill $BACKEND_PID 2>/dev/null
    rm .backend.pid
    echo "后端服务已停止"
fi

# 停止前端服务
if [ -f ".frontend.pid" ]; then
    FRONTEND_PID=$(cat .frontend.pid)
    kill $FRONTEND_PID 2>/dev/null
    rm .frontend.pid
    echo "前端服务已停止"
fi

# 停止基础设施服务
docker-compose down

echo "✅ 开发环境已停止"
EOF

    # 添加执行权限
    chmod +x scripts/dev/start_dev.sh scripts/dev/stop_dev.sh
    
    print_success "开发脚本创建完成"
}

# 显示使用说明
show_usage() {
    print_success "🎉 研发环境搭建完成！"
    echo ""
    echo "=================================="
    echo "📖 使用说明："
    echo ""
    echo "1. 启动开发环境："
    echo "   scripts/dev/start_dev.sh"
    echo ""
    echo "2. 停止开发环境："
    echo "   scripts/dev/stop_dev.sh"
    echo ""
    echo "3. 访问应用："
    echo "   📊 后端API: http://localhost:5000"
    echo "   🌐 前端应用: http://localhost:3000"
    echo "   📈 监控面板: http://localhost:3001"
    echo ""
    echo "4. 开发命令："
    echo "   # 后端开发"
    echo "   cd src/backend"
    echo "   source ../../venv/bin/activate"
    echo "   python main.py"
    echo ""
    echo "   # 前端开发"
    echo "   cd src/frontend"
    echo "   npm run dev"
    echo ""
    echo "5. 测试命令："
    echo "   # 后端测试"
    echo "   pytest tests/unit/"
    echo ""
    echo "   # 前端测试"
    echo "   cd src/frontend && npm test"
    echo ""
    echo "=================================="
}

# 主函数
main() {
    print_info "开始知识库应用研发环境搭建..."
    
    check_requirements
    setup_python_env
    setup_node_env
    setup_config_files
    start_infrastructure
    setup_database
    setup_dev_scripts
    show_usage
    
    print_success "🎉 研发环境搭建完成！"
}

# 运行主函数
main "$@"