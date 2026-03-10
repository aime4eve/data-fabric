#!/bin/bash

# 数据库迁移脚本
# 用于管理NebulaGraph数据库的schema变更

set -e

echo "🚀 开始执行数据库迁移..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查nebula-graphd服务是否运行
if ! docker-compose ps | grep -q "nebula-graphd.*Up"; then
    echo -e "${RED}错误: NebulaGraph服务未运行，请先启动服务${NC}"
    echo "运行: docker-compose up -d"
    exit 1
fi

# 等待服务完全启动
echo "⏳ 等待NebulaGraph服务启动..."
sleep 10

# 连接到NebulaGraph
echo "🔗 连接到NebulaGraph..."
docker-compose exec nebula-graphd nebula -u root -p nebula -e "SHOW HOSTS;"

# 创建图空间
echo -e "${BLUE}📊 创建图空间...${NC}"
cat > /tmp/create_space.ngql << 'EOF'
-- 创建图空间
CREATE SPACE IF NOT EXISTS knowledge_base(
    partition_num=10,
    replica_factor=1,
    vid_type=FIXED_STRING(64)
);

-- 使用图空间
USE knowledge_base;

-- 创建标签：知识点
CREATE TAG IF NOT EXISTS Knowledge(
    id string,
    title string,
    content string,
    category string,
    tags string,
    created_at timestamp,
    updated_at timestamp,
    author_id string,
    status string
);

-- 创建标签：用户
CREATE TAG IF NOT EXISTS User(
    id string,
    username string,
    email string,
    password_hash string,
    role string,
    created_at timestamp,
    last_login timestamp,
    status string
);

-- 创建标签：分类
CREATE TAG IF NOT EXISTS Category(
    id string,
    name string,
    description string,
    parent_id string,
    level int,
    created_at timestamp
);

-- 创建边：知识点关联
CREATE EDGE IF NOT EXISTS RelatedTo(
    relationship_type string,
    strength double,
    created_at timestamp
);

-- 创建边：用户创建
CREATE EDGE IF NOT EXISTS Created(
    created_at timestamp,
    role string
);

-- 创建边：属于分类
CREATE EDGE IF NOT EXISTS BelongsTo(
    created_at timestamp
);

-- 创建索引
CREATE TAG INDEX IF NOT EXISTS knowledge_title_index ON Knowledge(title);
CREATE TAG INDEX IF NOT EXISTS knowledge_category_index ON Knowledge(category);
CREATE TAG INDEX IF NOT EXISTS user_username_index ON User(username);
CREATE TAG INDEX IF NOT EXISTS user_email_index ON User(email);
CREATE TAG INDEX IF NOT EXISTS category_name_index ON Category(name);
EOF

# 执行schema创建
docker-compose exec -T nebula-graphd nebula -u root -p nebula < /tmp/create_space.ngql

# 验证创建结果
echo -e "${BLUE}🔍 验证schema创建结果...${NC}"
docker-compose exec nebula-graphd nebula -u root -p nebula -e "USE knowledge_base; SHOW TAGS; SHOW EDGES; SHOW INDEXES;"

# 清理临时文件
rm -f /tmp/create_space.ngql

echo -e "${GREEN}✅ 数据库迁移完成！${NC}"
echo ""
echo "📊 已创建的schema:"
echo "  - 图空间: knowledge_base"
echo "  - 标签: Knowledge, User, Category"
echo "  - 边: RelatedTo, Created, BelongsTo"
echo "  - 索引: knowledge_title_index, knowledge_category_index等"
echo ""
echo "🎯 下一步:"
echo "  1. 运行 ./scripts/dev/seed/seed_knowledge.sh 填充测试数据"
echo "  2. 启动后端服务: cd src/backend && python app.py"
echo "  3. 启动前端服务: cd src/frontend && npm start"