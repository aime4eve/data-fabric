#!/bin/bash

# 数据库回滚脚本
# 用于回滚NebulaGraph数据库的schema变更

set -e

echo "🔄 开始执行数据库回滚..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 警告提示
echo -e "${YELLOW}⚠️  警告: 此操作将删除所有数据！${NC}"
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

# 删除图空间
echo -e "${BLUE}🗑️  删除图空间...${NC}"
cat > /tmp/drop_space.ngql << 'EOF'
-- 删除图空间（这将删除所有数据）
DROP SPACE IF EXISTS knowledge_base;
EOF

# 执行删除操作
docker-compose exec -T nebula-graphd nebula -u root -p nebula < /tmp/drop_space.ngql

# 清理临时文件
rm -f /tmp/drop_space.ngql

echo -e "${GREEN}✅ 数据库回滚完成！${NC}"
echo ""
echo "🗑️  已删除:"
echo "  - 图空间: knowledge_base"
echo "  - 所有标签、边、索引"
echo "  - 所有数据"
echo ""
echo "🎯 如果需要重新创建schema，请运行:"
echo "  ./scripts/dev/migrate/migrate_up.sh"