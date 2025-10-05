#!/bin/bash

# 企业知识库管理系统 - 重启服务脚本
# 快速重启所有服务

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

# 显示重启横幅
echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                   企业知识库管理系统                         ║"
echo "║                   重启服务脚本 v1.0                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${BLUE}🔄 开始重启所有服务...${NC}"

# 停止服务
echo -e "${YELLOW}🛑 第一步: 停止现有服务...${NC}"
./stop.sh

# 等待服务完全停止
echo -e "${BLUE}⏳ 等待服务完全停止...${NC}"
sleep 3

# 启动服务
echo -e "${YELLOW}🚀 第二步: 启动服务...${NC}"
./start.sh

echo -e "${GREEN}🎉 服务重启完成！${NC}"