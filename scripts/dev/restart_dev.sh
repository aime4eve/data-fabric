#!/bin/bash

# 开发环境重启脚本
# 一键重启所有开发服务

set -e

echo "🔄 开始重启开发环境..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 停止当前服务
echo -e "${BLUE}🛑 停止当前服务...${NC}"
./stop_dev.sh

# 等待服务完全停止
echo -e "${BLUE}⏳ 等待服务完全停止...${NC}"
sleep 3

# 重新启动服务
echo -e "${BLUE}🚀 重新启动服务...${NC}"
./start_dev.sh

echo ""
echo -e "${GREEN}🎉 开发环境重启完成！${NC}"
echo ""
echo "🎯 如果需要查看日志，请运行:"
echo "  tail -f logs/*.log"