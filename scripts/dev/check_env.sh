#!/bin/bash

# 开发环境检查脚本
# 用于检查开发环境是否配置正确

set -e

echo "🔍 开始检查开发环境..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查函数
check_service() {
    local service_name=$1
    local check_command=$2
    local success_message=$3
    local error_message=$4
    
    echo -n "  检查 $service_name ... "
    if eval "$check_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $success_message${NC}"
        return 0
    else
        echo -e "${RED}❌ $error_message${NC}"
        return 1
    fi
}

# 检查Docker
echo -e "${BLUE}🐳 检查Docker环境...${NC}"
check_service "Docker" "docker --version" "Docker已安装" "Docker未安装"
check_service "Docker Compose" "docker-compose --version" "Docker Compose已安装" "Docker Compose未安装"

# 检查服务状态
echo -e "${BLUE}🚀 检查服务状态...${NC}"
check_service "NebulaGraph" "docker-compose ps | grep 'nebula-graphd.*Up'" "NebulaGraph运行中" "NebulaGraph未运行"
check_service "Redis" "docker-compose ps | grep 'redis.*Up'" "Redis运行中" "Redis未运行"

# 检查Python环境
echo -e "${BLUE}🐍 检查Python环境...${NC}"
if [ -d "venv" ]; then
    echo -e "  Python虚拟环境: ${GREEN}✅ 已创建${NC}"
else
    echo -e "  Python虚拟环境: ${YELLOW}⚠️  未创建${NC}"
fi

# 检查Node.js环境
echo -e "${BLUE}📦 检查Node.js环境...${NC}"
if [ -d "src/frontend/node_modules" ]; then
    echo -e "  Node.js依赖: ${GREEN}✅ 已安装${NC}"
else
    echo -e "  Node.js依赖: ${YELLOW}⚠️  未安装${NC}"
fi

# 检查配置文件
echo -e "${BLUE}📝 检查配置文件...${NC}"
if [ -f "src/backend/.env" ]; then
    echo -e "  后端配置文件: ${GREEN}✅ 存在${NC}"
else
    echo -e "  后端配置文件: ${YELLOW}⚠️  不存在${NC}"
fi

if [ -f "src/frontend/.env" ]; then
    echo -e "  前端配置文件: ${GREEN}✅ 存在${NC}"
else
    echo -e "  前端配置文件: ${YELLOW}⚠️  不存在${NC}"
fi

# 检查端口占用
echo -e "${BLUE}🔌 检查端口占用...${NC}"
check_port() {
    local port=$1
    local service=$2
    if netstat -tuln 2>/dev/null | grep -q ":$port "; then
        echo -e "  端口 $port ($service): ${RED}❌ 被占用${NC}"
    else
        echo -e "  端口 $port ($service): ${GREEN}✅ 可用${NC}"
    fi
}

check_port 3000 "前端服务"
check_port 5000 "后端API"
check_port 6379 "Redis"
check_port 9669 "NebulaGraph"

# 数据库连接测试
echo -e "${BLUE}🔗 测试数据库连接...${NC}"
echo -n "  NebulaGraph连接测试 ... "
if docker-compose exec -T nebula-graphd nebula -u root -p nebula -e "SHOW SPACES;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 连接成功${NC}"
else
    echo -e "${RED}❌ 连接失败${NC}"
fi

echo ""
echo "📋 环境检查完成！"
echo ""
echo "🎯 建议操作:"
echo "  1. 如果Docker服务未运行: docker-compose up -d"
echo "  2. 如果Python虚拟环境未创建: python3 -m venv venv"
echo "  3. 如果Node.js依赖未安装: cd src/frontend && npm install"
echo "  4. 如果配置文件不存在: ./scripts/dev/setup/setup_env.sh"
echo "  5. 如果端口被占用: 修改配置文件中的端口设置"