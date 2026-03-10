#!/bin/bash

# 测试数据清理脚本
# 用于清理知识库中的测试数据

set -e

echo "🧹 开始清理测试数据..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 警告提示
echo -e "${YELLOW}⚠️  警告: 此操作将删除所有测试数据！${NC}"
echo -e "${YELLOW}请确保已备份重要数据${NC}"
echo ""
read -p "确定要继续吗? (yes/no): " confirm

if [[ "$confirm" != "yes" ]]; then
    echo -e "${GREEN}操作已取消${NC}"
    exit 0
fi

# 检查nebula-graphd服务是否运行
if ! docker-compose ps | grep -q "nebula-graphd.*Up"; then
    echo -e "${RED}错误: NebulaGraph服务未运行，请先启动服务${NC}"
    echo "运行: docker-compose up -d"
    exit 1
fi

# 清理数据
echo -e "${BLUE}🗑️  清理知识条目数据...${NC}"
cat > /tmp/clean_data.ngql << 'EOF'
USE knowledge_base;

-- 删除所有边
DELETE EDGE RelatedTo * -> *;
DELETE EDGE Created * -> *;
DELETE EDGE BelongsTo * -> *;

-- 删除所有顶点
DELETE VERTEX Knowledge *;
DELETE VERTEX User *;
DELETE VERTEX Category *;
EOF

# 执行清理操作
docker-compose exec -T nebula-graphd nebula -u root -p nebula < /tmp/clean_data.ngql

# 验证清理结果
echo -e "${BLUE}🔍 验证数据清理结果...${NC}"
docker-compose exec nebula-graphd nebula -u root -p nebula -e "USE knowledge_base; MATCH (v) RETURN count(v);"

# 清理临时文件
rm -f /tmp/clean_data.ngql

echo -e "${GREEN}✅ 测试数据清理完成！${NC}"
echo ""
echo "🗑️  已清理的数据:"
echo "  - 所有知识条目"
echo "  - 所有用户数据"
echo "  - 所有分类数据"
echo "  - 所有关系数据"
echo ""
echo "🎯 如果需要重新填充数据，请运行:"
echo "  ./scripts/dev/seed/seed_knowledge.sh"